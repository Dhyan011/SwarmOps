"""Import legacy incidents.json records without modifying or deleting the source.

Run from backend/ after applying Alembic migrations:
    DATABASE_URL=... python migrate_legacy_json.py [path/to/incidents.json]
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from db import db
from models.schemas import IncidentReport


async def migrate(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"Legacy source file does not exist: {path}")
    with path.open("r", encoding="utf-8") as source:
        raw = json.load(source)
    if not isinstance(raw, dict):
        raise ValueError("Legacy JSON must contain an object keyed by incident identifier")

    imported = 0
    duplicates: list[str] = []
    rejected: list[dict[str, str]] = []
    seen: set[str] = set()
    for legacy_key, value in raw.items():
        if not isinstance(value, dict):
            rejected.append({"id": str(legacy_key), "reason": "record is not an object"})
            continue
        candidate = dict(value)
        candidate.setdefault("incident_id", str(legacy_key))
        # JSON was not protected by authenticated ownership controls; do not
        # trust or preserve any legacy owner claim as an authorization fact.
        candidate["owner_id"] = ""
        incident_id = str(candidate.get("incident_id", legacy_key))
        if incident_id in seen:
            duplicates.append(incident_id)
            continue
        seen.add(incident_id)
        try:
            report = IncidentReport.model_validate(candidate)
        except Exception as exc:
            rejected.append({"id": incident_id, "reason": f"schema validation failed: {type(exc).__name__}"})
            continue
        if await db.exists(report.incident_id):
            duplicates.append(report.incident_id)
            continue
        # Older records have no trusted owner. They remain unowned and therefore
        # invisible to authenticated user queries until ownership is reconciled.
        await db.set(report.incident_id, report)
        imported += 1
    return {
        "source": str(path),
        "imported": imported,
        "duplicates": duplicates,
        "rejected": rejected,
        "source_preserved": True,
    }


async def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "data" / "incidents.json"
    result = await migrate(source)
    print(json.dumps(result, indent=2))
    await db.close()


if __name__ == "__main__":
    asyncio.run(main())
