"""
SwarmOps — Configuration Module
Loads environment variables from .env and exposes them as module-level constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env from the project root (one level above backend/) ──
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

# ── GitHub Configuration (AI provider credentials are user-owned BYOK records) ──
GITHUB_APP_ID: str = os.getenv("GITHUB_APP_ID", "")
GITHUB_APP_SLUG: str = os.getenv("GITHUB_APP_SLUG", "")
GITHUB_APP_PRIVATE_KEY: str = os.getenv("GITHUB_APP_PRIVATE_KEY", "").replace("\\n", "\n")
PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
APP_STATE_SECRET: str = os.getenv("APP_STATE_SECRET", "")
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWT_AUDIENCE: str = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
APP_ENV: str = os.getenv("APP_ENV", "development")


def _bounded_number(name: str, default: str, *, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, default))
    except ValueError as exc:
        raise ValueError(f"{name} must be numeric.") from exc
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} is outside the allowed range.")
    return value


def _bounded_integer(name: str, default: str, *, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, default))
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer.") from exc
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} is outside the allowed range.")
    return value


MAX_CONCURRENT_INVESTIGATIONS: int = _bounded_integer(
    "MAX_CONCURRENT_INVESTIGATIONS", "3", minimum=1, maximum=100
)
INVESTIGATION_QUEUE_WAIT_SECONDS: float = _bounded_number(
    "INVESTIGATION_QUEUE_WAIT_SECONDS", "5", minimum=0.1, maximum=300
)
INVESTIGATION_TIMEOUT_SECONDS: float = _bounded_number(
    "INVESTIGATION_TIMEOUT_SECONDS", "900", minimum=5, maximum=3600
)
_default_origins = (
    "" if APP_ENV.lower() == "production"
    else "http://localhost:5173,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS: list[str] = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", _default_origins,
    ).split(",")
    if origin.strip()
]

# ── Azure Log Analytics ──
AZURE_LOG_ANALYTICS_WORKSPACE_ID: str = os.getenv("AZURE_LOG_ANALYTICS_WORKSPACE_ID", "")

# ── Azure AI Search ──
AZURE_AI_SEARCH_ENDPOINT: str = os.getenv("AZURE_AI_SEARCH_ENDPOINT", "")
AZURE_AI_SEARCH_KEY: str = os.getenv("AZURE_AI_SEARCH_KEY", "")

# ── Azure Service Principal ──
AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
