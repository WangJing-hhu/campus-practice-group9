from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    dashscope_api_key: str = ""
    ai_service_port: int = 8000
    embedding_model: str = "text-embedding-v3"
    embedding_dim: int = 1024
    chunk_size: int = 500
    chunk_overlap: int = 50
    top_k_default: int = 5
    data_dir: str = "data"
    callback_token: str = "ai-service-internal-token"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()