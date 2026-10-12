from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from db import AuditEvent, Base, IncidentDB
from models.schemas import IncidentReport


def report(incident_id="INC-1", owner_id="user-a"):
    return IncidentReport(
        incident_id=incident_id,
        owner_id=owner_id,
        description="database regression test",
        service="api",
        severity="low",
        status="resolved",
        created_at=datetime.now(timezone.utc).isoformat(),
        phases=[],
        agent_findings=[],
        root_cause="cause",
        confidence=75,
        recommended_fix="fix",
        code_patch="",
        validation_result="needs_review",
        resolution_time_ms=10,
    )


def test_legacy_report_defaults_to_no_retained_evidence():
    data = report().model_dump(mode="json")
    data.pop("user_supplied_evidence")
    restored = IncidentReport.model_validate(data)
    assert restored.user_supplied_evidence == ""


@pytest.mark.asyncio
async def test_database_requires_explicit_url():
    store = IncidentDB(database_url="")
    with pytest.raises(HTTPException) as error:
        await store.get_all(owner_id="user-a")
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_database_readiness_detects_missing_migrations(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'readiness.db'}"
    store = IncidentDB(database_url=url)
    with pytest.raises(OperationalError):
        await store.health()
    await store.close()

    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()
    migrated = IncidentDB(database_url=url)
    assert await migrated.health() is True
    await migrated.close()


@pytest.mark.asyncio
async def test_incident_persistence_tenant_scope_and_version(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'incidents.db'}"
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

    first = IncidentDB(database_url=url)
    original = report()
    original.user_supplied_evidence = "user-supplied, redacted log line"
    await first.set("INC-1", original)
    assert (await first.get("INC-1", owner_id="user-a")).incident_id == "INC-1"
    assert (await first.get("INC-1", owner_id="user-a")).user_supplied_evidence == "user-supplied, redacted log line"
    assert await first.get("INC-1", owner_id="user-b") is None
    assert [item.incident_id for item in await first.get_all("user-a")] == ["INC-1"]
    assert await first.get_all("user-b") == []

    updated = report()
    updated.status = "awaiting_review"
    updated.user_supplied_evidence = original.user_supplied_evidence
    await first.set("INC-1", updated)
    await first.close()

    reopened = IncidentDB(database_url=url)
    persisted = await reopened.get("INC-1", owner_id="user-a")
    assert persisted is not None
    assert persisted.status == "awaiting_review"
    assert persisted.user_supplied_evidence == "user-supplied, redacted log line"
    assert await reopened.exists("INC-1")
    await reopened.close()


@pytest.mark.asyncio
async def test_owner_cannot_be_changed_on_update(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'owner.db'}"
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()
    store = IncidentDB(database_url=url)
    await store.set("INC-1", report(owner_id="user-a"))
    with pytest.raises(HTTPException) as error:
        await store.set("INC-1", report(owner_id="user-b"))
    assert error.value.status_code == 403
    await store.close()


@pytest.mark.asyncio
async def test_pr_creation_claim_is_atomic_audited_and_recovers_after_timeout(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'pr-claim.db'}"
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()
    store = IncidentDB(database_url=url)
    eligible_report = report()
    eligible_report.status = "awaiting_review"
    await store.set("INC-1", eligible_report)

    candidate = await store.get("INC-1", owner_id="user-a")
    await store.claim_pr_creation(
        incident_id="INC-1", owner_id="user-a", actor_id="user-a", report=candidate
    )
    assert candidate.status == "pr_creating"
    assert candidate.pr_action_started_at

    duplicate = await store.get("INC-1", owner_id="user-a")
    with pytest.raises(HTTPException) as error:
        await store.claim_pr_creation(
            incident_id="INC-1", owner_id="user-a", actor_id="user-a", report=duplicate
        )
    assert error.value.status_code == 409

    duplicate.pr_action_started_at = (datetime.now(timezone.utc) - timedelta(minutes=11)).isoformat()
    await store.set("INC-1", duplicate)
    await store.claim_pr_creation(
        incident_id="INC-1", owner_id="user-a", actor_id="user-a", report=duplicate
    )
    assert duplicate.status == "pr_creating"

    sessions = store._session_factory()
    async with sessions() as session:
        events = (await session.execute(select(AuditEvent).where(AuditEvent.incident_id == "INC-1"))).scalars().all()
    assert len(events) == 2
    assert all(event.action == "github_pr_create" and event.outcome == "started" for event in events)
    await store.close()


@pytest.mark.asyncio
async def test_contribution_scan_is_owner_scoped_and_publication_claim_is_retryable(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'contributions.db'}"
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

    scan_id = "12345678-1234-1234-1234-123456789abc"
    store = IncidentDB(database_url=url)
    result = {"status": "ready", "summary": "A concrete proposal", "candidate": {"publication_allowed": True}}
    await store.save_contribution_scan(
        scan_id=scan_id,
        owner_id="user-a",
        repository="acme/project",
        target_url="https://github.com/acme/project",
        default_branch="main",
        source_sha="a" * 40,
        result_json=result,
    )
    assert (await store.get_contribution_scan(scan_id, "user-a"))["result"] == result
    assert await store.get_contribution_scan(scan_id, "user-b") is None

    await store.claim_contribution_publication(scan_id=scan_id, owner_id="user-a")
    with pytest.raises(HTTPException) as error:
        await store.claim_contribution_publication(scan_id=scan_id, owner_id="user-a")
    assert error.value.status_code == 409

    partial = {**result, "publication": {"status": "pr_created_issue_failed"}}
    await store.update_contribution_scan(
        scan_id=scan_id, owner_id="user-a", status="pr_created_issue_failed", result_json=partial
    )
    persisted = await store.get_contribution_scan(scan_id, "user-a")
    assert persisted["status"] == "pr_created_issue_failed"
    assert persisted["result"]["publication"]["status"] == "pr_created_issue_failed"
    await store.claim_contribution_publication(scan_id=scan_id, owner_id="user-a")
    await store.close()
