from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Accounting OS"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./sql_app.db" # Defaulting to SQLite for self-contained clone
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Fix for SQLAlchemy requiring postgresql:// instead of postgres://
    @property
    def SYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

    class Config:
        case_sensitive = True

settings = Settings()
