from functools import lru_cache
from typing import List
from pydantic import BaseModel
import json, os

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./carsense.db")
    CORS_ORIGINS_RAW: str = os.getenv(
        "CORS_ORIGINS",
        '["http://localhost","http://127.0.0.1:5500","http://localhost:5173","*"]'
    )

    @property
    def CORS_ORIGINS(self) -> List[str]:
        try:
            return list(json.loads(self.CORS_ORIGINS_RAW))
        except Exception:
            return ["*"]

@lru_cache
def get_settings() -> Settings:
    return Settings()
