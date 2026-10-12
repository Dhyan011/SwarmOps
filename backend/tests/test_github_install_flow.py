from itsdangerous import URLSafeTimedSerializer
import pytest
from fastapi import HTTPException

import main
from auth import Principal
from tools.github_app import GitHubAppClient


@pytest.mark.asyncio
async def test_install_callback_binds_verified_installation_to_signed_user(monkeypatch):
    secret = "test-install-state-secret-with-more-than-32-bytes"
    monkeypatch.setattr(main, "APP_STATE_SECRET", secret)
    monkeypatch.setattr(main, "PUBLIC_BASE_URL", "")

    class FakeStore:
        def __init__(self):
            self.record = None

        async def save_repository_connection(self, **kwargs):
            self.record = kwargs

    class FakeApp:
        async def verify_installation(self, installation_id):
            assert installation_id == "12345"
            return {"account_login": "acme", "account_type": "Organization"}

    store = FakeStore()
    monkeypatch.setattr(main, "db", store)
    monkeypatch.setattr(main, "GitHubAppClient", FakeApp)
    serializer = URLSafeTimedSerializer(secret, salt="swarmops-github-install")
    state = serializer.dumps({"sub": "user-a"})

    result = await main.github_install_callback("12345", "install", state)
    assert result == {"status": "installed", "account_login": "acme"}
    assert store.record == {
        "owner_id": "user-a",
        "installation_id": "12345",
        "account_login": "acme",
        "account_type": "Organization",
    }


@pytest.mark.asyncio
async def test_install_callback_rejects_tampered_state_before_provider_call(monkeypatch):
    monkeypatch.setattr(main, "APP_STATE_SECRET", "test-install-state-secret-with-more-than-32-bytes")

    class NeverCalledApp:
        def verify_installation(self, installation_id):
            raise AssertionError("must not call provider for tampered state")

    monkeypatch.setattr(main, "GitHubAppClient", NeverCalledApp)
    with pytest.raises(HTTPException) as error:
        await main.github_install_callback("12345", "install", "forged-state")
    assert error.value.status_code == 400


def test_github_app_fails_closed_when_private_credentials_are_missing():
    app_client = GitHubAppClient(app_id="", private_key="", slug="")
    with pytest.raises(HTTPException) as error:
        app_client.app_jwt()
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_install_link_is_bound_to_authenticated_subject(monkeypatch):
    monkeypatch.setattr(main, "APP_STATE_SECRET", "test-install-state-secret-with-more-than-32-bytes")

    class FakeApp:
        def install_url(self, state):
            payload = URLSafeTimedSerializer(
                main.APP_STATE_SECRET, salt="swarmops-github-install"
            ).loads(state)
            assert payload["sub"] == "user-a"
            return "https://github.com/apps/test-app/installations/new?state=opaque"

    monkeypatch.setattr(main, "GitHubAppClient", FakeApp)
    result = await main.github_install_url(Principal(user_id="user-a", claims={"sub": "user-a"}))
    assert result["url"].startswith("https://github.com/apps/")


@pytest.mark.asyncio
async def test_repository_access_returns_single_repository_scoped_token():
    class FakeApp(GitHubAppClient):
        def __init__(self):
            self.issued = []

        async def installation_token(self, installation_id, repository_ids=None, permissions=None):
            self.issued.append((installation_id, repository_ids, permissions))
            return "listing-token" if repository_ids is None else "repository-scoped-token"

        async def installation_repositories(self, token):
            assert token == "listing-token"
            return [{"id": 98765, "full_name": "acme/project"}, {"id": 87654, "full_name": "acme/other"}]

    class FakeStore:
        async def get_repository_connections(self, owner_id):
            assert owner_id == "user-a"
            return [{"installation_id": "12345"}]

    client = FakeApp()
    result = await client.token_for_repository("user-a", "acme", "project", FakeStore())
    assert result == "repository-scoped-token"
    assert client.issued == [
        ("12345", None, {"metadata": "read"}),
        ("12345", [98765], {"metadata": "read", "contents": "write", "pull_requests": "write"}),
    ]


@pytest.mark.asyncio
async def test_repository_issue_token_has_issues_write_without_contents_write():
    class FakeApp(GitHubAppClient):
        def __init__(self):
            self.issued = []

        async def installation_token(self, installation_id, repository_ids=None, permissions=None):
            self.issued.append((repository_ids, permissions))
            return "listing-token" if repository_ids is None else "issue-token"

        async def installation_repositories(self, token):
            return [{"id": 98765, "full_name": "acme/project"}]

    class FakeStore:
        async def get_repository_connections(self, owner_id):
            return [{"installation_id": "12345"}]

    client = FakeApp()
    token = await client.token_for_repository(
        "user-a", "acme", "project", FakeStore(),
        permission_scope={"metadata": "read", "issues": "write"},
    )
    assert token == "issue-token"
    assert client.issued == [
        (None, {"metadata": "read"}),
        ([98765], {"metadata": "read", "issues": "write"}),
    ]
