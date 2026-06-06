from database.db import query_kb
import json

def search_history(query: str, time_range: str) -> str:
    """Searches past incident history for similar symptoms or root causes."""
    results = query_kb(f"incident {query}", n_results=2)
    if not results:
        return "No matching past incidents found."
    return "Found past incidents: " + json.dumps(results)

def get_runbook(service: str, alert_type: str) -> str:
    """Retrieves standard operating procedures and runbooks for specific alert types."""
    results = query_kb(f"runbook {service} {alert_type}", n_results=1)
    if not results:
        return "No runbook found."
    return "Recommended Runbook: " + json.dumps(results)
