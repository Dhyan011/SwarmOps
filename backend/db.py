import json
import os
import asyncio
from datetime import datetime, timezone
from models.schemas import IncidentReport

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DATA_DIR, "incidents.json")

class IncidentDB:
    def __init__(self):
        self._lock = asyncio.Lock()
        os.makedirs(DATA_DIR, exist_ok=True)
        self.incidents: dict[str, IncidentReport] = {}
        self.events: dict = {}
        self.load()

    def load(self):
        """Loads incidents from the persistent JSON file on startup."""
        if os.path.exists(DB_PATH):
            try:
                with open(DB_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self.incidents[k] = IncidentReport(**v)
            except Exception as e:
                print(f"Failed to load DB: {e}")
                self.incidents = {}
        else:
            self.incidents = {}

    def _save(self):
        """Internal save method. Should be called with lock acquired."""
        try:
            with open(DB_PATH, "w", encoding="utf-8") as f:
                data = {k: v.model_dump() for k, v in self.incidents.items()}
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Failed to save DB: {e}")

    def save(self):
        """Legacy sync save, used carefully"""
        self._save()

    def get_all(self):
        return list(reversed(self.incidents.values()))

    def get(self, incident_id: str):
        return self.incidents.get(incident_id)

    async def set(self, incident_id: str, report: IncidentReport):
        """Set a report with an async lock and save to disk."""
        async with self._lock:
            self.incidents[incident_id] = report
            self._save()

    def append_event(self, incident_id: str, event: dict):
        if incident_id not in self.events:
            self.events[incident_id] = []
        self.events[incident_id].append(event)
        
    def get_events(self, incident_id: str) -> list:
        return self.events.get(incident_id, [])

    def append_audit_log(self, incident_id: str, action: str, user: str):
        """Append to the multi-user audit log."""
        self.append_event(incident_id, {
            "type": "audit", "action": action, "user": user, 
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    def search(self, query: str) -> list:
        """Full-text search across description + root_cause + service."""
        q = query.lower()
        return [
            inc for inc in self.incidents.values()
            if (q in (inc.description or "").lower()
                or q in (inc.root_cause or "").lower()
                or q in (inc.service or "").lower())
        ]

db = IncidentDB()
