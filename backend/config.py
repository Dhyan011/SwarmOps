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

# ── OpenRouter & GitHub Configuration ──
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
LLM_MODEL: str = os.getenv("LLM_MODEL", "openrouter/free")
GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

# ── Azure Log Analytics ──
AZURE_LOG_ANALYTICS_WORKSPACE_ID: str = os.getenv("AZURE_LOG_ANALYTICS_WORKSPACE_ID", "")

# ── Azure AI Search ──
AZURE_AI_SEARCH_ENDPOINT: str = os.getenv("AZURE_AI_SEARCH_ENDPOINT", "")
AZURE_AI_SEARCH_KEY: str = os.getenv("AZURE_AI_SEARCH_KEY", "")

# ── Azure Service Principal ──
AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
