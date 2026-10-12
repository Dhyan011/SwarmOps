import base64
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import main
import tools.byok as byok
from auth import Principal
from models.schemas import ProviderConfigRequest, ProviderKeyRequest, ProviderTestRequest


def configure_encryption_key(monkeypatch):
    monkeypatch.setenv("BYOK_ENCRYPTION_KEY", base64.urlsafe_b64encode(b"K" * 32).decode().rstrip("="))


def test_encryption_binds_ciphertext_to_owner_and_never_stores_plaintext(monkeypatch):
    configure_encryption_key(monkeypatch)
    secret = "sk-private-user-a-credential"
    stored = byok.encrypt_provider_key(secret, "user-a")
    assert secret not in stored
    assert byok.decrypt_provider_key(stored, "user-a") == secret
    with pytest.raises(HTTPException) as error:
        byok.decrypt_provider_key(stored, "user-b")
    assert error.value.status_code == 503
    tampered = stored[:-2] + ("AA" if stored[-2:] != "AA" else "BB")
    with pytest.raises(HTTPException):
        byok.decrypt_provider_key(tampered, "user-a")


def test_encryption_fails_closed_without_valid_master_key(monkeypatch):
    monkeypatch.delenv("BYOK_ENCRYPTION_KEY", raising=False)
    with pytest.raises(HTTPException) as error:
        byok.encrypt_provider_key("key", "user-a")
    assert error.value.status_code == 503
    monkeypatch.setenv("BYOK_ENCRYPTION_KEY", "not-a-32-byte-key")
    with pytest.raises(HTTPException):
        byok.encrypt_provider_key("key", "user-a")


@pytest.mark.asyncio
async def test_owner_provider_resolver_never_falls_back_or_crosses_tenants(monkeypatch):
    configure_encryption_key(monkeypatch)
    encrypted = byok.encrypt_provider_key("only-user-a", "user-a")

    class Store:
        async def get_ai_provider_credential(self, owner_id):
            if owner_id == "user-a":
                return {"provider": "openai", "model": "m-a", "encrypted_key": encrypted}
            return None

    monkeypatch.setattr(main, "db", Store())
    assert await main.require_user_provider("user-a") == {
        "provider": "openai", "model": "m-a", "api_key": "only-user-a"
    }
    with pytest.raises(HTTPException) as error:
        await main.require_user_provider("user-b")
    assert error.value.status_code == 428
    assert "shared" not in error.value.detail.lower()


@pytest.mark.asyncio
async def test_model_discovery_uses_fixed_provider_endpoints_and_secret_headers(monkeypatch):
    calls = []

    class Response:
        status_code = 200
        def json(self):
            return {"models": [
                {"name": "models/gemini-2.5-flash", "supportedGenerationMethods": ["generateContent"]},
                {"name": "models/gemini-embedding", "supportedGenerationMethods": ["embedContent"]},
            ]}

    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return None
        async def get(self, url, *, headers):
            calls.append((url, headers))
            return Response()

    monkeypatch.setattr(byok.httpx, "AsyncClient", lambda **kwargs: Client())
    models = await byok.list_models("gemini", "user-gemini-key")
    assert models == [{"id": "gemini-2.5-flash", "name": "gemini-2.5-flash"}]
    assert calls == [(
        "https://generativelanguage.googleapis.com/v1beta/models",
        {"x-goog-api-key": "user-gemini-key"},
    )]
    with pytest.raises(HTTPException) as error:
        await byok.list_models("https://attacker.invalid", "secret")
    assert error.value.status_code == 422


@pytest.mark.asyncio
async def test_anthropic_model_discovery_uses_anthropic_auth_not_bearer(monkeypatch):
    calls = []

    class Response:
        status_code = 200
        def json(self): return {"data": [{"id": "claude-sonnet-test"}]}

    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return None
        async def get(self, url, *, headers):
            calls.append((url, headers))
            return Response()

    monkeypatch.setattr(byok.httpx, "AsyncClient", lambda **kwargs: Client())
    assert await byok.list_models("anthropic", "ant-secret") == [
        {"id": "claude-sonnet-test", "name": "claude-sonnet-test"}
    ]
    assert calls[0][0] == "https://api.anthropic.com/v1/models"
    assert calls[0][1] == {"x-api-key": "ant-secret", "anthropic-version": "2023-06-01"}


@pytest.mark.asyncio
async def test_test_completion_routes_to_provider_endpoint_and_validates_response(monkeypatch):
    calls = []

    class Response:
        status_code = 200
        def json(self): return {"content": [{"type": "text", "text": "OK"}]}

    class Client:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return None
        async def post(self, url, *, headers, json):
            calls.append((url, headers, json))
            return Response()

    monkeypatch.setattr(byok.httpx, "AsyncClient", lambda **kwargs: Client())
    await byok.test_completion("anthropic", "anthropic-user-key", "claude-test")
    assert calls[0][0] == "https://api.anthropic.com/v1/messages"
    assert calls[0][1]["x-api-key"] == "anthropic-user-key"
    assert calls[0][2]["model"] == "claude-test"
    assert calls[0][2]["max_tokens"] == 8


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "provider,base_url,api_key",
    [
        ("openrouter", "https://openrouter.ai/api/v1", "or-user-key"),
        ("openai", "https://api.openai.com/v1", "oa-user-key"),
        ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "gm-user-key"),
    ],
)
async def test_openai_compatible_providers_use_only_selected_fixed_endpoint(monkeypatch, provider, base_url, api_key):
    from openai import AsyncOpenAI

    calls = []

    class Delta:
        content = '{"ok":true}'

    class Chunk:
        choices = [SimpleNamespace(delta=Delta())]

    class Completion:
        async def create(self, **kwargs):
            calls.append(kwargs)
            async def chunks():
                yield Chunk()
            return chunks()

    class Client:
        def __init__(self, *, api_key, base_url, **kwargs):
            calls.append({"client_api_key": api_key, "base_url": base_url})
            self.chat = SimpleNamespace(completions=Completion())
        async def close(self):
            pass

    monkeypatch.setattr("openai.AsyncOpenAI", Client)
    result = await byok.complete_chat(
        provider=provider, api_key=api_key, model="selected-model",
        messages=[{"role": "user", "content": "safe test"}], max_tokens=10, temperature=0,
    )
    assert result == '{"ok":true}'
    assert calls[0] == {"client_api_key": api_key, "base_url": base_url}
    assert calls[1]["model"] == "selected-model"


@pytest.mark.asyncio
async def test_config_is_persisted_only_after_real_test_and_never_returns_key(monkeypatch):
    configure_encryption_key(monkeypatch)
    secret = "user-openrouter-key"
    saved = {}
    calls = []

    class Store:
        async def save_ai_provider_credential(self, **kwargs):
            saved.update(kwargs)

    async def models(provider, api_key):
        calls.append(("models", provider, api_key))
        return [{"id": "model-a", "name": "Model A"}]

    async def test(provider, api_key, model):
        calls.append(("test", provider, api_key, model))

    monkeypatch.setattr(main, "db", Store())
    monkeypatch.setattr(main, "list_models", models)
    monkeypatch.setattr(main, "test_completion", test)
    response = await main.save_ai_config(
        ProviderConfigRequest(provider="openrouter", model="model-a", api_key=secret),
        Principal("user-a", {"sub": "user-a"}),
    )
    assert response == {"configured": True, "provider": "openrouter", "model": "model-a"}
    assert "api_key" not in response and secret not in repr(response)
    assert calls == [("models", "openrouter", secret), ("test", "openrouter", secret, "model-a")]
    assert saved["owner_id"] == "user-a"
    assert secret not in saved["encrypted_key"]
    assert byok.decrypt_provider_key(saved["encrypted_key"], "user-a") == secret


@pytest.mark.asyncio
async def test_invalid_model_is_not_saved(monkeypatch):
    configure_encryption_key(monkeypatch)
    saved = False

    class Store:
        async def save_ai_provider_credential(self, **kwargs):
            nonlocal saved
            saved = True

    async def models(provider, api_key):
        return [{"id": "allowed-model", "name": "allowed-model"}]

    monkeypatch.setattr(main, "db", Store())
    monkeypatch.setattr(main, "list_models", models)
    payload = ProviderConfigRequest(provider="openai", model="not-listed", api_key="user-key")
    with pytest.raises(HTTPException) as error:
        await main.save_ai_config(payload, Principal("user-a", {"sub": "user-a"}))
    assert error.value.status_code == 422
    assert not saved


def test_provider_requests_use_secret_typed_key_without_plaintext_repr():
    request = ProviderTestRequest(provider="openai", model="gpt-test", api_key="secret-never-render")
    assert "secret-never-render" not in repr(request)
    assert "secret-never-render" not in request.model_dump_json()
    assert request.api_key.get_secret_value() == "secret-never-render"
    with pytest.raises(Exception):
        ProviderKeyRequest(provider="openai", api_key="x", unexpected="field")


@pytest.mark.asyncio
async def test_configuration_status_returns_metadata_only(monkeypatch):
    class Store:
        async def get_ai_provider_credential(self, owner_id):
            assert owner_id == "user-a"
            return {
                "owner_id": "user-a", "provider": "openrouter", "model": "some-model",
                "encrypted_key": "v1:opaque-private-ciphertext",
            }

    monkeypatch.setattr(main, "db", Store())
    result = await main.get_ai_config(Principal("user-a", {"sub": "user-a"}))
    assert result == {"configured": True, "provider": "openrouter", "model": "some-model"}
    assert "encrypted_key" not in result and "ciphertext" not in repr(result)


@pytest.mark.asyncio
async def test_incident_ai_fails_closed_without_this_users_credential(monkeypatch):
    class Store:
        async def get_ai_provider_credential(self, owner_id):
            return None

    monkeypatch.setattr(main, "db", Store())
    with pytest.raises(HTTPException) as error:
        await main.create_incident.__wrapped__(
            None,
            __import__("models.schemas", fromlist=["IncidentCreate"]).IncidentCreate(
                description="test", service="api", severity="low"
            ),
            Principal("user-b", {"sub": "user-b"}),
        )
    assert error.value.status_code == 428
    assert "provider" in error.value.detail.lower()


@pytest.mark.asyncio
async def test_readiness_requires_valid_bytok_encryption_key(monkeypatch):
    class Store:
        async def health(self):
            return True

    monkeypatch.setattr(main, "db", Store())
    monkeypatch.delenv("BYOK_ENCRYPTION_KEY", raising=False)
    with pytest.raises(HTTPException) as error:
        await main.readiness_check()
    assert error.value.status_code == 503
    configure_encryption_key(monkeypatch)
    assert await main.readiness_check() == {"status": "ready"}


@pytest.mark.asyncio
async def test_failed_provider_test_does_not_persist_candidate_key(monkeypatch):
    configure_encryption_key(monkeypatch)
    saved = False

    class Store:
        async def save_ai_provider_credential(self, **kwargs):
            nonlocal saved
            saved = True

    async def models(provider, api_key):
        return [{"id": "model-a", "name": "Model A"}]

    async def failed_test(provider, api_key, model):
        raise HTTPException(status_code=400, detail="Provider connection test failed.")

    monkeypatch.setattr(main, "db", Store())
    monkeypatch.setattr(main, "list_models", models)
    monkeypatch.setattr(main, "test_completion", failed_test)
    payload = ProviderConfigRequest(provider="openai", model="model-a", api_key="candidate-secret")
    with pytest.raises(HTTPException) as error:
        await main.save_ai_config(payload, Principal("user-a", {"sub": "user-a"}))
    assert error.value.status_code == 400
    assert saved is False
