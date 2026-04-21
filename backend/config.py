from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str = ""
    dust_api_key: str = ""
    next_public_api_url: str = "http://localhost:3001"
    supabase_url: str = ""
    supabase_key: str = ""

    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
