import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from backend directory or project root
base_dir = Path(__file__).resolve().parent.parent
env_path = base_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    root_env = base_dir.parent / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)

class Settings(BaseModel):
    APP_NAME: str = "CipherVault"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS", 
            "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",") if origin.strip()
    ]
    
    # Master Key (32 bytes = 256 bits, represented as 64 hex characters)
    CIPHERVAULT_MASTER_KEY_HEX: str = os.getenv(
        "CIPHERVAULT_MASTER_KEY",
        "4a8e9d3c5b2f1a0e7d6c8b4a2f9e1d3c5b7a9e0f2d4c6b8a1e3f5d7c9b0a2e4f"
    )
    
    # Lab Test Key (distinct 32-byte key for demonstration / playground)
    CIPHERVAULT_TEST_KEY_HEX: str = os.getenv(
        "CIPHERVAULT_TEST_KEY",
        "d1f2e3a4b5c67890123456789abcdef0123456789abcdef0123456789abcdef0"
    )
    
    # SQLite Database
    DB_PATH: str = os.getenv("DB_PATH", str(base_dir / "ciphervault.db"))
    
    # Session Management
    SESSION_EXPIRE_HOURS: int = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))
    COOKIE_NAME: str = "ciphervault_session"
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "False").lower() in ("true", "1")
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    @property
    def master_key_bytes(self) -> bytes:
        hex_key = self.CIPHERVAULT_MASTER_KEY_HEX.strip()
        if len(hex_key) != 64:
            raise ValueError(f"CIPHERVAULT_MASTER_KEY must be exactly 64 hex characters (32 bytes). Found {len(hex_key)}.")
        return bytes.fromhex(hex_key)

    @property
    def test_key_bytes(self) -> bytes:
        hex_key = self.CIPHERVAULT_TEST_KEY_HEX.strip()
        if len(hex_key) != 64:
            raise ValueError(f"CIPHERVAULT_TEST_KEY must be exactly 64 hex characters (32 bytes). Found {len(hex_key)}.")
        return bytes.fromhex(hex_key)

settings = Settings()
