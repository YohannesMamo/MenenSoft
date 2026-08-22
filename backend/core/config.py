# File: core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "MERP Student Assistant API"
    DATABASE_URL: str
    SECRET_KEY: str
    BACKEND_URL: str = "http://localhost:8000"
    TEXTBOOKS_PATH: str = "Textbooks"

    VERIFIER_API_KEY: str = ""
    VERIFIER_BASE_URL: str = "https://verifyapi.leulzenebe.pro"
    VERIFIER_TIMEOUT: int = 15

    class Config:
        env_file = ".env"
        extra = "ignore"

# This creates a single, global instance of your settings to be used throughout the app
settings = Settings()