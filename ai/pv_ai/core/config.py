"""Service settings from PV_AI_* environment variables (and an optional .env file)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PV_AI_", env_file=".env", extra="ignore")

    port: int = 8200
    internal_token: str = ""
    provider: str = "anthropic"  # anthropic | openai
    model: str = "claude-haiku-4-5-20251001"
    base_url: str = ""
    api_key: str = ""
    # Second provider tried once when the first fails
    # (new architecture: "LLM gateway, OpenAI / Anthropic fallback").
    fallback_provider: str = ""
    fallback_model: str = ""
    fallback_api_key: str = ""
    fallback_base_url: str = ""
    timeout_s: float = 60
    embed_base_url: str = "https://api.openai.com/v1"
    embed_model: str = "text-embedding-3-small"
    embed_api_key: str = ""
    vector_store: str = "qdrant"  # qdrant | pinecone | memory
    qdrant_url: str = "http://localhost:6333"
    pinecone_api_key: str = ""
    pinecone_index: str = "pv-nodes"
    prompts_dir: str = ""  # empty = <repo>/contracts/prompts/v2
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
