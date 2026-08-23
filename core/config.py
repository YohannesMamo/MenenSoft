# File: core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "MERP Student Assistant API"
    DATABASE_URL: str
    SECRET_KEY: str
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    TEXTBOOKS_PATH: str = "Textbooks"

    # Payment verification
    VERIFIER_API_KEY: str = ""
    VERIFIER_BASE_URL: str = "https://verifyapi.leulzenebe.pro"
    VERIFIER_TIMEOUT: int = 15

    # Telebirr (Ethio Telecom)
    TELEBIRR_APP_ID: str = ""
    TELEBIRR_APP_KEY: str = ""
    TELEBIRR_PUBLIC_KEY: str = ""
    TELEBIRR_SHORT_CODE: str = ""
    TELEBIRR_API_URL: str = "https://app.ethiomobilemoney.et/api/hybrid"
    TELEBIRR_CALLBACK_URL: str = ""

    # CBE Birr (Commercial Bank of Ethiopia)
    CBE_MERCHANT_CODE: str = ""
    CBE_API_KEY: str = ""
    CBE_API_URL: str = "https://pay.cbe.com.et/api"
    CBE_CALLBACK_URL: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

# This creates a single, global instance of your settings to be used throughout the app
settings = Settings()
