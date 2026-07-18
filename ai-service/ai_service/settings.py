import os
from pathlib import Path

_ENV_PATH = Path(__file__).parent.parent / ".env"
if _ENV_PATH.exists():
    with open(_ENV_PATH, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

class Settings:
    def __init__(self):
        self.dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", "")
        self.ai_service_port: int = 8000
        self.embedding_model: str = "text-embedding-v3"
        self.embedding_dim: int = 1024
        self.chunk_size: int = 500
        self.chunk_overlap: int = 50
        self.top_k_default: int = 5
        self.data_dir: str = "data"
        self.upload_dir: str = os.getenv("UPLOAD_DIR", "../storage/uploads")
        self.callback_token: str = os.getenv("AI_CALLBACK_TOKEN", "day4-internal-callback-token")

settings = Settings()