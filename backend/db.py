import json
import os
from models.schemas import IncidentReport

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DATA_DIR, "incidents.json")

class IncidentDB:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.incidents: dict[str, IncidentReport] = {}
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

    def save(self):
        """Saves all incidents to the persistent JSON file."""
        try:
            with open(DB_PATH, "w", encoding="utf-8") as f:
                # Convert Pydantic models to dicts
                data = {k: v.model_dump() for k, v in self.incidents.items()}
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Failed to save DB: {e}")

    def get_all(self):
        return list(reversed(self.incidents.values()))

    def get(self, incident_id: str):
        return self.incidents.get(incident_id)

    def set(self, incident_id: str, report: IncidentReport):
        self.incidents[incident_id] = report
        self.save()

db = IncidentDB()
