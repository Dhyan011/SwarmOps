def read_config(service: str, env: str) -> str:
    """Reads the current configuration or environment variables for a service."""
    return f"Mock config for {service} in {env}: DB_MAX_CONNECTIONS=10"

def diff_config(v1: str, v2: str) -> str:
    """Compares two configuration versions and returns the difference."""
    return f"Mock config diff between {v1} and {v2}: -DB_MAX_CONNECTIONS=50 +DB_MAX_CONNECTIONS=10"
