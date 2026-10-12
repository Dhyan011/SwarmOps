"""Owner-scoped BYOK encryption and provider operations.

Provider hosts are fixed here; neither the browser nor database can supply an
arbitrary request URL. Plaintext credentials are only accepted in a request or
held transiently in process memory and are never returned by these functions.
"""
from __future__ import annotations

import base64
import os
import re
from typing import Any

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException

PROVIDERS: dict[str, dict[str, str]] = {
    "openrouter": {"label": "OpenRouter", "base_url": "https://openrouter.ai/api/v1", "kind": "openai"},
    "openai": {"label": "OpenAI", "base_url": "https://api.openai.com/v1", "kind": "openai"},
    "anthropic": {"label": "Anthropic", "base_url": "https://api.anthropic.com/v1", "kind": "anthropic"},
    "gemini": {"label": "Google Gemini", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai", "kind": "openai"},
}


def _encryption_key() -> bytes:
    encoded = os.getenv("BYOK_ENCRYPTION_KEY", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}=?", encoded):
        raise HTTPException(status_code=503, detail="Encrypted provider-key storage is not configured.")
    try:
        key = base64.b64decode(encoded + "=" * (-len(encoded) % 4), altchars=b"-_", validate=True)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Encrypted provider-key storage is not configured.") from exc
    if len(key) != 32:
        raise HTTPException(status_code=503, detail="Encrypted provider-key storage is not configured.")
    return key


def validate_encryption_key() -> None:
    """Fail-closed deployment preflight without returning any key bytes."""
    _encryption_key()


def encrypt_provider_key(plaintext: str, owner_id: str) -> str:
    if not isinstance(plaintext, str) or not plaintext.strip() or len(plaintext) > 4096:
        raise HTTPException(status_code=422, detail="Enter a valid provider API key.")
    nonce = os.urandom(12)
    ciphertext = AESGCM(_encryption_key()).encrypt(nonce, plaintext.strip().encode(), owner_id.encode())
    return "v1." + base64.urlsafe_b64encode(nonce + ciphertext).decode().rstrip("=")


def decrypt_provider_key(ciphertext: str, owner_id: str) -> str:
    try:
        if not ciphertext.startswith("v1."):
            raise ValueError("unsupported encrypted credential format")
        raw = base64.urlsafe_b64decode(ciphertext[3:] + "=" * (-len(ciphertext[3:]) % 4))
        return AESGCM(_encryption_key()).decrypt(raw[:12], raw[12:], owner_id.encode()).decode()
    except HTTPException:
        raise
    except Exception as exc:
        # Do not include the blob, underlying exception, or key in user-visible errors.
        raise HTTPException(status_code=503, detail="Stored provider credentials could not be decrypted.") from exc


def validate_provider(provider: str) -> dict[str, str]:
    value = PROVIDERS.get(provider)
    if value is None:
        raise HTTPException(status_code=422, detail="Unsupported AI provider.")
    return value


def _safe_models(payload: Any, provider: str) -> list[dict[str, str]]:
    if provider == "anthropic":
        entries = payload.get("data", []) if isinstance(payload, dict) else []
        ids = [entry.get("id") for entry in entries if isinstance(entry, dict)]
    elif provider == "gemini":
        entries = payload.get("models", []) if isinstance(payload, dict) else []
        ids = [
            entry.get("name") for entry in entries
            if isinstance(entry, dict)
            and "generateContent" in entry.get("supportedGenerationMethods", [])
        ]
    else:
        entries = payload.get("data", []) if isinstance(payload, dict) else []
        ids = [entry.get("id") for entry in entries if isinstance(entry, dict)]
    result = []
    for model_id in ids:
        if isinstance(model_id, str) and 0 < len(model_id) <= 200:
            clean_id = model_id.removeprefix("models/") if provider == "gemini" else model_id
            if clean_id and clean_id not in {item["id"] for item in result}:
                result.append({"id": clean_id, "name": clean_id})
    return sorted(result, key=lambda item: item["id"].casefold())[:1000]


async def list_models(provider: str, api_key: str) -> list[dict[str, str]]:
    config = validate_provider(provider)
    headers = {"Authorization": f"Bearer {api_key}"}
    if provider == "anthropic":
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
    elif provider == "gemini":
        headers = {"x-goog-api-key": api_key}
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models"
        if provider == "gemini"
        else f"{config['base_url']}/models"
    )
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
            response = await client.get(endpoint, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Provider rejected the key or model-list request.")
        models = _safe_models(response.json(), provider)
        if not models:
            raise HTTPException(status_code=400, detail="Provider returned no selectable models for this key.")
        return models
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not retrieve models from the selected provider.") from exc


async def test_completion(provider: str, api_key: str, model: str) -> None:
    config = validate_provider(provider)
    if not model or len(model) > 200 or any(char.isspace() for char in model):
        raise HTTPException(status_code=422, detail="Select a valid model returned by the provider.")
    headers: dict[str, str]
    if provider == "anthropic":
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        endpoint = f"{config['base_url']}/messages"
        body = {"model": model, "max_tokens": 8, "messages": [{"role": "user", "content": "Reply only with OK."}]}
    else:
        headers = {"Authorization": f"Bearer {api_key}", "content-type": "application/json"}
        endpoint = f"{config['base_url']}/chat/completions"
        token_limit = {"max_completion_tokens": 8} if provider == "openai" else {"max_tokens": 8}
        body = {"model": model, **token_limit, "messages": [{"role": "user", "content": "Reply only with OK."}]}
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
            response = await client.post(endpoint, headers=headers, json=body)
        if response.status_code < 200 or response.status_code >= 300:
            raise HTTPException(status_code=400, detail="Provider connection test failed. Check the key, model, and account access.")
        payload = response.json()
        if provider == "anthropic":
            content = payload.get("content") if isinstance(payload, dict) else None
            valid = isinstance(content, list) and any(isinstance(part, dict) and isinstance(part.get("text"), str) for part in content)
        else:
            choices = payload.get("choices") if isinstance(payload, dict) else None
            valid = isinstance(choices, list) and bool(choices) and isinstance(choices[0], dict)
        if not valid:
            raise HTTPException(status_code=502, detail="Provider response did not contain a valid completion.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Provider connection test failed; response details were withheld.") from exc


async def complete_chat(*, provider: str, api_key: str, model: str, messages: list[dict[str, str]], max_tokens: int, temperature: float) -> str:
    config = validate_provider(provider)
    if provider == "anthropic":
        system = "\n\n".join(message["content"] for message in messages if message["role"] == "system")
        conversation = [message for message in messages if message["role"] != "system"]
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        body = {"model": model, "max_tokens": max_tokens, "temperature": temperature, "system": system, "messages": conversation}
        endpoint = f"{config['base_url']}/messages"
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=False) as client:
                response = await client.post(endpoint, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            return "\n".join(part.get("text", "") for part in data.get("content", []) if isinstance(part, dict))
        except Exception as exc:
            raise RuntimeError("Selected AI provider request failed.") from exc
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key, base_url=config["base_url"], timeout=60.0, max_retries=0)
    try:
        token_limit = {"max_completion_tokens": max_tokens} if provider == "openai" else {"max_tokens": max_tokens}
        if provider != "openai":
            token_limit["temperature"] = temperature
        response = await client.chat.completions.create(
            model=model, messages=messages, **token_limit, stream=True,
        )
        parts: list[str] = []
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                parts.append(delta)
        return "".join(parts)
    except Exception as exc:
        raise RuntimeError("Selected AI provider request failed.") from exc
    finally:
        await client.close()
