import pytest
from fastapi import HTTPException

from tools.github_issue import create_github_issue


@pytest.mark.asyncio
async def test_issue_creation_uses_issue_only_scope_and_adds_retry_marker():
    class FakeApp:
        def __init__(self):
            self.calls = []

        async def token_for_repository(self, owner_id, repo_owner, repo_name, store, permission_scope=None):
            assert (owner_id, repo_owner, repo_name) == ("user-a", "acme", "project")
            assert permission_scope == {"metadata": "read", "issues": "write"}
            return "short-lived-issues-token"

        async def _request(self, method, path, token, *, json_body=None, params=None):
            assert token == "short-lived-issues-token"
            self.calls.append((method, path, json_body, params))
            if method == "GET" and path == "/repos/acme/project":
                return {"full_name": "acme/project"}
            if method == "GET" and path == "/repos/acme/project/issues":
                return []
            if method == "POST" and path == "/repos/acme/project/issues":
                assert "<!-- swarmops-contribution:12345678-1234-1234-1234-123456789abc -->" in json_body["body"]
                return {"number": 12, "html_url": "https://github.com/acme/project/issues/12", "title": json_body["title"]}
            raise AssertionError((method, path))

    app = FakeApp()
    result = await create_github_issue(
        target_url="https://github.com/acme/project",
        title="Document deterministic retry behavior",
        body="Describe the retry-safe contribution workflow.",
        scan_id="12345678-1234-1234-1234-123456789abc",
        owner_id="user-a",
        store=object(),
        app_client=app,
    )
    assert result == {
        "number": 12,
        "url": "https://github.com/acme/project/issues/12",
        "title": "Document deterministic retry behavior",
        "created": True,
    }
    assert sum(call[0] == "POST" for call in app.calls) == 1


@pytest.mark.asyncio
async def test_issue_retry_returns_existing_marker_without_posting_again():
    class FakeApp:
        async def token_for_repository(self, *args, **kwargs):
            return "token"

        async def _request(self, method, path, token, *, json_body=None, params=None):
            if method == "GET" and path == "/repos/acme/project":
                return {"full_name": "acme/project"}
            if method == "GET" and path == "/repos/acme/project/issues":
                return [{
                    "number": 12,
                    "html_url": "https://github.com/acme/project/issues/12",
                    "title": "Already created",
                    "body": "<!-- swarmops-contribution:12345678-1234-1234-1234-123456789abc -->",
                }]
            raise AssertionError("retry must not create a duplicate issue")

    result = await create_github_issue(
        target_url="https://github.com/acme/project",
        title="A contribution issue",
        body="Proposal.",
        scan_id="12345678-1234-1234-1234-123456789abc",
        owner_id="user-a",
        store=object(),
        app_client=FakeApp(),
    )
    assert result["created"] is False
    assert result["number"] == 12


@pytest.mark.asyncio
async def test_issue_text_with_credential_like_content_is_rejected_before_provider_call():
    class NeverCalled:
        async def token_for_repository(self, *args, **kwargs):
            raise AssertionError("must reject before provider call")

    with pytest.raises(HTTPException) as error:
        await create_github_issue(
            target_url="https://github.com/acme/project",
            title="Please rotate this API key",
            body='api_key="plaintext-super-secret-12345"',
            scan_id="12345678-1234-1234-1234-123456789abc",
            owner_id="user-a",
            store=object(),
            app_client=NeverCalled(),
        )
    assert error.value.status_code == 422
