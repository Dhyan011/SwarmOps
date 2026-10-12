import json
from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import create_async_engine

import migrate_legacy_json
from db import Base, IncidentDB


def legacy_record(incident_id):
    return {
        "incident_id": incident_id,
        "owner_id": "must-not-be-trusted",
        "description": "legacy record",
        "service": "api",
        "severity": "medium",
        "status": "resolved",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "phases": [],
        "agent_findings": [],
        "root_cause": "cause",
        "confidence": 60,
        "recommended_fix": "fix",
        "code_patch": "",
        "validation_result": "needs_review",
        "resolution_time_ms": 5,
    }


@pytest.mark.asyncio
async def test_legacy_import_is_repeat_safe_and_preserves_source(tmp_path, monkeypatch):
    database_url = f"sqlite+aiosqlite:///{tmp_path / 'legacy.db'}"
    engine = create_async_engine(database_url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

    store = IncidentDB(database_url)
    monkeypatch.setattr(migrate_legacy_json, "db", store)
    legacy_path = tmp_path / "incidents.json"
    original = {
        "one": legacy_record("legacy-1"),
        "duplicate": legacy_record("legacy-1"),
        "invalid": {"description": "not enough fields"},
    }
    original_text = json.dumps(original)
    legacy_path.write_text(original_text, encoding="utf-8")

    first = await migrate_legacy_json.migrate(legacy_path)
    assert first["imported"] == 1
    assert first["duplicates"] == ["legacy-1"]
    assert len(first["rejected"]) == 1
    assert first["source_preserved"] is True
    assert legacy_path.read_text(encoding="utf-8") == original_text

    imported = await store.get("legacy-1", owner_id="")
    assert imported is not None
    assert imported.owner_id == ""
    assert await store.get("legacy-1", owner_id="must-not-be-trusted") is None

    second = await migrate_legacy_json.migrate(legacy_path)
    assert second["imported"] == 0
    assert second["duplicates"] == ["legacy-1", "legacy-1"]
    await store.close()
