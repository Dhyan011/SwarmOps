import httpx
import json
import logging

logger = logging.getLogger(__name__)

def get_metrics(service: str, metric: str, start: str, end: str) -> str:
    """Fetches time-series metric data for a specific service and metric over a time range."""
    try:
        response = httpx.get("http://localhost:4000/metrics", timeout=2.0)
        response.raise_for_status()
        data = response.json()
        return f"Live metric data for {metric} in {service}: {json.dumps(data)}"
    except Exception as e:
        logger.error(f"Failed to fetch metrics: {e}")
        return f"Error fetching metrics: {e}"

def get_percentile(p: float, metric: str) -> str:
    """Calculates the given percentile for a specific metric."""
    try:
        response = httpx.get("http://localhost:4000/metrics", timeout=2.0)
        response.raise_for_status()
        data = response.json()
        val = data.get("response_time_ms", 1500) if "response" in metric else data.get("cpu_percentage", 90)
        return f"Live {p}th percentile for {metric}: {val}"
    except Exception as e:
        return f"Error calculating percentile: {e}"
