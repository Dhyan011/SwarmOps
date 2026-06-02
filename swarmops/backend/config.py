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

# ── OpenRouter LLM Provider ──
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

# ── Azure Log Analytics ──
AZURE_LOG_ANALYTICS_WORKSPACE_ID: str = os.getenv("AZURE_LOG_ANALYTICS_WORKSPACE_ID", "")

# ── Azure AI Search ──
AZURE_AI_SEARCH_ENDPOINT: str = os.getenv("AZURE_AI_SEARCH_ENDPOINT", "")
AZURE_AI_SEARCH_KEY: str = os.getenv("AZURE_AI_SEARCH_KEY", "")

# ── Azure Service Principal ──
AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
