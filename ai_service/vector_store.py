import json
import os
import threading
import numpy as np
import faiss
from pathlib import Path
from .settings import settings

class VectorStore:
    def __init__(self):
        self.data_dir = Path(settings.data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.data_dir / "faiss.index"
        self.meta_path = self.data_dir / "metadata.json"
        self.dim = settings.embedding_dim
        self.lock = threading.Lock()
        self.index: faiss.IndexIDMap2 | None = None
        self.metadata: list[dict] = []
        self._load()

    def _load(self):
        if self.index_path.exists():
            self.index = faiss.read_index(str(self.index_path))
        else:
            base = faiss.IndexFlatIP(self.dim)
            self.index = faiss.IndexIDMap2(base)
        if self.meta_path.exists():
            self.metadata = json.loads(self.meta_path.read_text(encoding="utf-8"))

    def _save(self):
        faiss.write_index(self.index, str(self.index_path))
        self.meta_path.write_text(json.dumps(self.metadata, ensure_ascii=False), encoding="utf-8")

    def add(self, vectors: list[list[float]], metas: list[dict]) -> int:
        with self.lock:
            start_id = self.index.ntotal
            ids = list(range(start_id, start_id + len(vectors)))
            mat = np.array(vectors, dtype=np.float32)
            self.index.add_with_ids(mat, np.array(ids, dtype=np.int64))
            for i, meta in enumerate(metas):
                meta["vector_id"] = ids[i]
                self.metadata.append(meta)
            self._save()
            return len(vectors)

    def search(self, query_vec: list[float], top_k: int) -> list[dict]:
        with self.lock:
            if self.index.ntotal == 0:
                return []
            mat = np.array([query_vec], dtype=np.float32)
            scores, ids = self.index.search(mat, min(top_k, self.index.ntotal))
            results = []
            for score, vid in zip(scores[0], ids[0]):
                if vid < 0:
                    continue
                for m in self.metadata:
                    if m.get("vector_id") == int(vid):
                        results.append({**m, "score": float(score)})
                        break
            return results

    def remove_by_doc_id(self, doc_id: int) -> int:
        with self.lock:
            ids_to_remove = [
                m["vector_id"] for m in self.metadata if m.get("doc_id") == doc_id
            ]
            if ids_to_remove:
                self.index.remove_ids(np.array(ids_to_remove, dtype=np.int64))
                self.metadata = [m for m in self.metadata if m.get("doc_id") != doc_id]
                self._save()
            return len(ids_to_remove)

    @property
    def size(self) -> int:
        return self.index.ntotal if self.index else 0

vector_store = VectorStore()
