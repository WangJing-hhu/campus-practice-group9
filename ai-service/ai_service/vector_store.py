import json
from difflib import SequenceMatcher
import numpy as np
import faiss
import threading
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
        self._next_id = 0
        self._load()

    def _load(self):
        if self.index_path.exists():
            self.index = faiss.read_index(str(self.index_path))
        else:
            base = faiss.IndexFlatIP(self.dim)
            self.index = faiss.IndexIDMap2(base)
        if self.meta_path.exists():
            self.metadata = json.loads(self.meta_path.read_text(encoding="utf-8"))
            if self.metadata:
                self._next_id = max(m["vector_id"] for m in self.metadata) + 1

    def _save(self):
        faiss.write_index(self.index, str(self.index_path))
        self.meta_path.write_text(
            json.dumps(self.metadata, ensure_ascii=False), encoding="utf-8"
        )

    def add(self, vectors: list[list[float]], metas: list[dict]) -> int:
        with self.lock:
            ids = list(range(self._next_id, self._next_id + len(vectors)))
            self._next_id += len(vectors)
            mat = np.array(vectors, dtype=np.float32)
            self.index.add_with_ids(mat, np.array(ids, dtype=np.int64))
            for i, meta in enumerate(metas):
                meta["vector_id"] = ids[i]
                self.metadata.append(meta)
            self._save()
            return len(vectors)

    def search(self, query_vec: list[float], top_k: int,
               score_threshold: float = 0.70) -> list[dict]:
        """检索 top_k 条结果，按 score 降序，低于阈值则过滤，并去除同一文档内高度重复的片段。"""
        with self.lock:
            if self.index.ntotal == 0:
                return []

            # 取更多的候选，给过滤留余量
            fetch_k = min(top_k * 3, self.index.ntotal)
            mat = np.array([query_vec], dtype=np.float32)
            scores, ids = self.index.search(mat, fetch_k)

            # 收集原始结果
            raw = []
            for score, vid in zip(scores[0], ids[0]):
                if vid < 0:
                    continue
                for m in self.metadata:
                    if m.get("vector_id") == int(vid):
                        raw.append({**m, "score": float(score)})
                        break

            # 1. 阈值过滤
            filtered = [r for r in raw if r["score"] >= score_threshold]

            # 2. 按 score 降序（FAISS IndexFlatIP 已近似有序，再排一次保证）
            filtered.sort(key=lambda r: r["score"], reverse=True)

            # 3. 同文档内容去重：相同 doc_id 且文本相似度 > 0.85，只保留高分那条
            deduped = []
            for r in filtered:
                is_dup = False
                for kept in deduped:
                    if r.get("doc_id") != kept.get("doc_id"):
                        continue
                    ratio = SequenceMatcher(
                        None, r["content"], kept["content"]
                    ).ratio()
                    if ratio > 0.85:
                        is_dup = True
                        break
                if not is_dup:
                    deduped.append(r)

            # 4. 截断到 top_k
            return deduped[:top_k]

    def remove_by_doc_id(self, doc_id: int) -> int:
        with self.lock:
            ids_to_remove = [
                m["vector_id"]
                for m in self.metadata
                if m.get("doc_id") == doc_id
            ]
            if ids_to_remove:
                self.index.remove_ids(np.array(ids_to_remove, dtype=np.int64))
                self.metadata = [
                    m for m in self.metadata if m.get("doc_id") != doc_id
                ]
                self._save()
            return len(ids_to_remove)

    @property
    def size(self) -> int:
        return self.index.ntotal if self.index else 0

vector_store = VectorStore()