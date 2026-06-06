import httpx
import json
import logging

logger = logging.getLogger(__name__)

def query_logs(service: str, query: str, start: str, end: str) -> str:
    """Searches application logs for a specific service matching a query."""
    try:
        response = httpx.get("http://localhost:4000/logs", timeout=2.0)
        response.raise_for_status()
        logs = response.json()
        matching = [l for l in logs if query.lower() in l.get("message", "").lower() or query == "*"]
        return json.dumps(matching[-10:])
    except Exception as e:
        logger.error(f"Failed to fetch logs: {e}")
        return f"Error fetching logs: {e}"

def grep_pattern(service: str, pattern: str) -> str:
    """Uses regex to grep logs for specific error patterns."""
    return query_logs(service, pattern, "", "")
