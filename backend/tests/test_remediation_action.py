from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

import main
from auth import Principal
from models.schemas import IncidentReport


class FakeSocket:
    async def emit(self, *args, **kwargs):
        return None


class FakeStore:
    def __init__(self, report):
        self.report = report
        self.saved = 0
        self.audit = []

    async def get(self, incident_id, owner_id):
        return self.report if self.report.incident_id == incident_id and self.report.owner_id == owner_id else None

    async def set(self, incident_id, report):
        self.saved += 1
        self.report = report

    async def append_audit_event(self, **kwargs):
        self.audit.append(kwargs)

    async def claim_pr_creation(self, *, incident_id, owner_id, actor_id, report):
        assert report.status == "awaiting_review"
        report.status = "pr_creating"
        report.pr_action_started_at = "now"
        self.audit.append({"outcome": "started"})


def report():
    return IncidentReport(
        incident_id="INC-1", owner_id="user-a", description="incident", service="api", severity="high",
        status="awaiting_review", created_at=datetime.now(timezone.utc).isoformat(), phases=[],
        agent_findings=[], root_cause="cause", confidence=90, recommended_fix="fix", code_patch="diff",
        validation_result="approved", validation_state="validation_passed", policy_state="passed",
        policy_findings=[], tests_executed=False, resolution_time_ms=10,
        target_url="https://github.com/acme/project", target_branch="main",
    )


@pytest.mark.asyncio
async def test_approval_requires_security_reviewer_role(monkeypatch):
    store = FakeStore(report())
    monkeypatch.setattr(main, "db", store)
    with pytest.raises(HTTPException) as error:
        await main.handle_incident_action(
            "INC-1", main.ActionRequest(action="approve"), Principal("user-a", {"sub": "user-a"})
        )
    assert error.value.status_code == 403
    assert store.saved == 0


@pytest.mark.asyncio
async def test_success_state_is_persisted_only_after_verified_pr(monkeypatch):
    store = FakeStore(report())
    monkeypatch.setattr(main, "db", store)
    monkeypatch.setattr(main, "sio", FakeSocket())

    async def create_pr(**kwargs):
        assert kwargs["target_url"] == "https://github.com/acme/project"
        assert kwargs["owner_id"] == "user-a"
        return {"url": "https://github.com/acme/project/pull/42", "number": 42}

    monkeypatch.setattr("tools.github_pr.create_github_pr", create_pr)
    result = await main.handle_incident_action(
        "INC-1",
        main.ActionRequest(action="approve"),
        Principal("user-a", {"sub": "user-a", "app_metadata": {"roles": ["security_reviewer"]}}),
    )
    assert result["status"] == "pr_created"
    assert result["pr_url"] == "https://github.com/acme/project/pull/42"
    assert store.report.status == "pr_created"
    assert store.report.pr_number == 42
    assert store.saved == 1
    assert store.audit[-1]["outcome"] == "success"


@pytest.mark.asyncio
async def test_provider_failure_does_not_mark_report_as_success(monkeypatch):
    store = FakeStore(report())
    monkeypatch.setattr(main, "db", store)

    async def create_pr(**kwargs):
        raise HTTPException(status_code=503, detail="GitHub unavailable")

    monkeypatch.setattr("tools.github_pr.create_github_pr", create_pr)
    with pytest.raises(HTTPException) as error:
        await main.handle_incident_action(
            "INC-1",
            main.ActionRequest(action="approve"),
            Principal("user-a", {"sub": "user-a", "app_metadata": {"roles": "administrator"}}),
        )
    assert error.value.status_code == 503
    assert store.report.status == "awaiting_review"
    assert store.saved == 1
    assert store.audit[-1]["outcome"] == "failed"
