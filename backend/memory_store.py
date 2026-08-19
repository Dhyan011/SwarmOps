import json
import os
from datetime import datetime, timezone

MEMORY_FILE = os.path.join(os.path.dirname(__file__), "data", "memory.json")

class MemoryStore:
    def __init__(self):
        self.memories = []
        self._load()

    def _load(self):
        if os.path.exists(MEMORY_FILE):
            try:
                with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                    self.memories = json.load(f)
            except Exception:
                self.memories = []
        else:
            self.memories = []

    def _save(self):
        os.makedirs(os.path.dirname(MEMORY_FILE), exist_ok=True)
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(self.memories, f, indent=4)

    def extract_and_save(self, incident_report):
        """Extracts patterns from a resolved incident and saves them."""
        # Only save if we actually found a fix or root cause
        root_cause = getattr(incident_report, "root_cause", None)
        fix = getattr(incident_report, "recommended_fix", None)
        
        if not root_cause or not fix:
            return

        memory = {
            "incident_id": incident_report.incident_id,
            "service": incident_report.service,
            "description": incident_report.description,
            "root_cause": root_cause,
            "fix_pattern": fix,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.memories.append(memory)
        self._save()

    def get_past_patterns(self, service: str) -> list:
        """Returns past patterns for the specific service."""
        patterns = []
        for m in self.memories:
            if m.get("service", "").lower() == service.lower():
                patterns.append({
                    "description": m["description"],
                    "root_cause": m["root_cause"],
                    "fix_pattern": m["fix_pattern"]
                })
        return patterns[-5:] # Return last 5 patterns for context limits

memory_store = MemoryStore()
