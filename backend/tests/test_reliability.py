import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import main
from models.schemas import IncidentCreate


PROVIDER = {"provider": "openai", "model": "test-model", "api_key": "user-key"}


@pytest.mark.asyncio
async def test_investigation_runs_under_limit_and_releases_capacity(monkeypatch):
    semaphore = asyncio.Semaphore(1)
    monkeypatch.setattr(main, "max_concurrent_investigations", semaphore)
    monkeypatch.setattr(main, "INVESTIGATION_QUEUE_WAIT_SECONDS", 0.2)
    monkeypatch.setattr(main, "INVESTIGATION_TIMEOUT_SECONDS", 0.2)

    class FakeOrchestrator:
        async def investigate(self, incident, *, provider_config, owner_id):
            assert provider_config == PROVIDER
            assert owner_id == "user-a"
            return SimpleNamespace(incident_id="INC-1")

    monkeypatch.setattr(main, "orchestrator", FakeOrchestrator())
    result = await main.run_limited_investigation(
        IncidentCreate(description="test", service="api", severity="low"), PROVIDER, "user-a"
    )
    assert result.incident_id == "INC-1"
    assert await asyncio.wait_for(semaphore.acquire(), timeout=0.01)
    semaphore.release()


@pytest.mark.asyncio
async def test_full_capacity_fails_fast_with_retry_after(monkeypatch):
    monkeypatch.setattr(main, "max_concurrent_investigations", asyncio.Semaphore(0))
    monkeypatch.setattr(main, "INVESTIGATION_QUEUE_WAIT_SECONDS", 0.01)
    with pytest.raises(HTTPException) as error:
        await main.run_limited_investigation(
            IncidentCreate(description="test", service="api", severity="low"), PROVIDER, "user-a"
        )
    assert error.value.status_code == 429
    assert error.value.headers["Retry-After"] == "1"


@pytest.mark.asyncio
async def test_deadline_cancels_investigation_and_releases_capacity(monkeypatch):
    semaphore = asyncio.Semaphore(1)
    monkeypatch.setattr(main, "max_concurrent_investigations", semaphore)
    monkeypatch.setattr(main, "INVESTIGATION_QUEUE_WAIT_SECONDS", 0.1)
    monkeypatch.setattr(main, "INVESTIGATION_TIMEOUT_SECONDS", 0.01)

    class SlowOrchestrator:
        async def investigate(self, *args, **kwargs):
            await asyncio.Event().wait()

    monkeypatch.setattr(main, "orchestrator", SlowOrchestrator())
    with pytest.raises(HTTPException) as error:
        await main.run_limited_investigation(
            IncidentCreate(description="test", service="api", severity="low"), PROVIDER, "user-a"
        )
    assert error.value.status_code == 504
    assert await asyncio.wait_for(semaphore.acquire(), timeout=0.01)
    semaphore.release()
