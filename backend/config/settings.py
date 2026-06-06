import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    # OpenRouter Models
    ORCHESTRATOR_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    AGENT_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
