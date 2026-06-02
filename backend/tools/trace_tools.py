import httpx
import logging

logger = logging.getLogger(__name__)

def fetch_traces(trace_id: str) -> str:
    """Fetches detailed trace information for a specific distributed trace ID."""
    try:
        response = httpx.get("http://localhost:4000/metrics", timeout=2.0)
        error_rate = response.json().get("error_rate_percentage", 0)
        if error_rate > 5:
            return f"Trace {trace_id}: Failed at payment_gateway span. db_connection timeout. {error_rate}% of traces failing."
        return f"Trace {trace_id}: 10/10 spans successful."
    except Exception as e:
        return f"Error fetching trace: {e}"

def list_spans(service: str, time: str) -> str:
    """Lists spans associated with a service within a specific time window."""
    return fetch_traces("mock-trace-123")
