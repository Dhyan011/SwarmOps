from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from db import Base, IncidentDB
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


@pytest.mark.asyncio
async def test_database_requires_explicit_url():
    store = IncidentDB(database_url="")
    with pytest.raises(HTTPException) as error:
        await store.get_all(owner_id="user-a")
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_incident_persistence_tenant_scope_and_version(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'incidents.db'}"
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

    first = IncidentDB(database_url=url)
    await first.set("INC-1", report())
    assert (await first.get("INC-1", owner_id="user-a")).incident_id == "INC-1"
    assert await first.get("INC-1", owner_id="user-b") is None
    assert [item.incident_id for item in await first.get_all("user-a")] == ["INC-1"]
    assert await first.get_all("user-b") == []

    updated = report()
    updated.status = "awaiting_review"
    await first.set("INC-1", updated)
    await first.close()

    reopened = IncidentDB(database_url=url)
    persisted = await reopened.get("INC-1", owner_id="user-a")
    assert persisted is not None
    assert persisted.status == "awaiting_review"
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
