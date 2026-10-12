from copy import deepcopy

import pytest
from fastapi import HTTPException

import main
from auth import Principal
from models.schemas import ContributionPublishRequest, ContributionScanRequest


SOURCE_SHA = "a" * 40
PATCH = "--- a/src/example.py\n+++ b/src/example.py\n@@ -1 +1 @@\n-return False\n+return True\n"


def candidate_data():
    return {
        "category": "correctness",
        "priority": "medium",
        "confidence": 92,
        "issue_title": "Handle an empty response safely",
        "issue_body": "The current branch returns a false value for this case.\n\nTests were not run by SwarmOps.",
        "pull_request_title": "Handle an empty response safely",
        "pull_request_body": "Apply the minimal correction. Tests were not run by SwarmOps.",
        "summary": "The function returns the wrong result for the evidenced input.",
        "affected_files": ["src/example.py"],
        "patch": PATCH,
        "test_plan": ["Run the focused unit tests for this function."],
    }


def reviewer():
    return Principal("user-a", {"sub": "user-a", "app_metadata": {"roles": ["security_reviewer"]}})


def test_non_reviewer_cannot_publish_before_store_or_provider_access():
    with pytest.raises(HTTPException) as error:
        import asyncio
        asyncio.run(main.publish_contribution.__wrapped__(
            None, "12345678-1234-1234-1234-123456789abc",
            ContributionPublishRequest(
                confirmed=True, issue_title="A concrete issue title", issue_body="Issue body",
                pull_request_title="A concrete PR title", pull_request_body="PR body", patch=PATCH,
            ),
            Principal("user-a", {"sub": "user-a"}),
        ))
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_scan_persists_exact_commit_and_disables_invalid_or_low_confidence_patch(monkeypatch):
    stored = {}
    async def user_provider(owner_id):
        assert owner_id == "user-a"
        return {"provider": "openrouter", "model": "test-model", "api_key": "user-owned-test-key"}
    monkeypatch.setattr(main, "require_user_provider", user_provider)

    async def fetch_snapshot(url):
        assert url == "https://github.com/acme/project"
        return {
            "repository": "acme/project", "target_url": url, "default_branch": "main",
            "source_sha": SOURCE_SHA, "source_url": f"{url}/tree/{SOURCE_SHA}",
            "included_files": 1, "redactions": 1, "context": "repository source",
            "source_files": {"src/example.py": "return False\n"},
        }

    class FakeScanner:
        def __init__(self, sio):
            pass

        async def scan(self, context):
            assert context["source_sha"] == SOURCE_SHA
            assert context["provider_config"]["api_key"] == "user-owned-test-key"
            return {"summary": "One concrete improvement.", "candidate": candidate_data(), "_agent": "Contribution Scanner"}

    class FakeDB:
        async def save_contribution_scan(self, **kwargs):
            stored.update(kwargs)

    monkeypatch.setattr(main, "fetch_github_repository_snapshot", fetch_snapshot)
    monkeypatch.setattr(main, "ContributionScanner", FakeScanner)
    monkeypatch.setattr(main, "db", FakeDB())

    result = await main.scan_public_repository.__wrapped__(
        None,
        ContributionScanRequest(repository_url="https://github.com/acme/project"),
        reviewer(),
    )
    assert result["status"] == "ready"
    assert result["result"]["source_sha"] == SOURCE_SHA
    assert result["result"]["candidate"]["publication_allowed"] is True
    assert stored["owner_id"] == "user-a"
    assert stored["result_json"]["source_url"].endswith(SOURCE_SHA)


@pytest.mark.asyncio
async def test_contribution_detail_is_tenant_scoped(monkeypatch):
    class FakeDB:
        async def get_contribution_scan(self, scan_id, owner_id):
            assert owner_id == "user-b"
            return None

    monkeypatch.setattr(main, "db", FakeDB())
    with pytest.raises(HTTPException) as error:
        await main.get_contribution_scan("12345678-1234-1234-1234-123456789abc", Principal("user-b", {"sub": "user-b"}))
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_publication_retry_reuses_pr_and_completes_issue_once(monkeypatch):
    scan_id = "12345678-1234-1234-1234-123456789abc"
    request = ContributionPublishRequest(
        confirmed=True,
        issue_title="Handle an empty response safely",
        issue_body="The current branch returns a false value. Tests were not run by SwarmOps.",
        pull_request_title="Handle an empty response safely",
        pull_request_body="Apply the minimal correction. Tests were not run by SwarmOps.",
        patch=PATCH,
    )
    original_result = {
        "status": "ready",
        "repository": "acme/project",
        "target_url": "https://github.com/acme/project",
        "default_branch": "main",
        "source_sha": SOURCE_SHA,
        "candidate": {**candidate_data(), "publication_allowed": True},
    }

    class FakeDB:
        def __init__(self):
            self.status = "ready"
            self.result = deepcopy(original_result)
            self.audit = []
            self.claims = 0

        async def get_contribution_scan(self, requested_id, owner_id):
            assert requested_id == scan_id and owner_id == "user-a"
            return {
                "scan_id": scan_id, "owner_id": owner_id, "repository": "acme/project",
                "target_url": "https://github.com/acme/project", "default_branch": "main",
                "source_sha": SOURCE_SHA, "status": self.status, "result": deepcopy(self.result),
            }

        async def claim_contribution_publication(self, *, scan_id, owner_id):
            assert scan_id == "12345678-1234-1234-1234-123456789abc"
            assert self.status in {"ready", "pr_created_issue_failed"}
            self.status = "publishing"
            self.claims += 1

        async def update_contribution_scan(self, *, scan_id, owner_id, status, result_json):
            self.status = status
            self.result = deepcopy(result_json)

        async def append_audit_event(self, **kwargs):
            self.audit.append(kwargs)

    store = FakeDB()
    monkeypatch.setattr(main, "db", store)

    async def fetch_snapshot(_url):
        return {
            "source_sha": SOURCE_SHA,
            "source_files": {"src/example.py": "return False\n"},
        }

    pr_calls = []

    async def create_pr(**kwargs):
        pr_calls.append(kwargs)
        return {"url": "https://github.com/acme/project/pull/7", "number": 7, "branch": "swarmops-contribution-x"}

    issue_calls = []

    async def create_issue(**kwargs):
        issue_calls.append(kwargs)
        if len(issue_calls) == 1:
            raise HTTPException(status_code=503, detail="GitHub is temporarily unavailable.")
        return {"url": "https://github.com/acme/project/issues/8", "number": 8, "title": kwargs["title"], "created": True}

    monkeypatch.setattr(main, "fetch_github_repository_snapshot", fetch_snapshot)
    monkeypatch.setattr(main, "create_github_pr", create_pr)
    monkeypatch.setattr(main, "create_github_issue", create_issue)

    first = await main.publish_contribution.__wrapped__(None, scan_id, request, reviewer())
    assert first.status_code == 207
    assert store.status == "pr_created_issue_failed"
    assert store.result["publication"]["pull_request"]["number"] == 7
    assert len(pr_calls) == 1

    second = await main.publish_contribution.__wrapped__(None, scan_id, request, reviewer())
    assert second["status"] == "published"
    assert second["issue"]["number"] == 8
    assert second["pull_request"]["number"] == 7
    assert len(pr_calls) == 1
    assert len(issue_calls) == 2
    assert store.status == "published"
