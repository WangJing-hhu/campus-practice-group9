import numpy as np
from dashscope import TextEmbedding
from .settings import settings

class EmbeddingService:
    def __init__(self):
        self.model = settings.embedding_model
        self.dim = settings.embedding_dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        resp = TextEmbedding.call(
            model=self.model,
            input=texts,
            api_key=settings.dashscope_api_key,
            text_type="document",
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Embedding失败: {resp.message}")
        embeddings = []
        for emb in resp.output.get("embeddings", []):
            vec = np.array(emb["embedding"], dtype=np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings

    def embed_query(self, text: str) -> list[float]:
        resp = TextEmbedding.call(
            model=self.model,
            input=[text],
            api_key=settings.dashscope_api_key,
            text_type="query",
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Embedding失败: {resp.message}")
        vec = np.array(resp.output["embeddings"][0]["embedding"], dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

embedding_service = EmbeddingService()
