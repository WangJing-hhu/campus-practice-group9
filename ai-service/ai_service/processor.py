import httpx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from .file_reader import file_reader
from .embedding import embedding_service
from .vector_store import vector_store
from .settings import settings

class DocumentProcessor:
    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
        )

    def process(self, doc_id: int, path: str, title: str, callback_url: str | None = None):
        # 1. 清理旧向量
        vector_store.remove_by_doc_id(doc_id)

        # 2. 回调：提取中
        self._callback(callback_url, doc_id, "EXTRACTING", "PROCESSING")

        # 3. 读取文本
        try:
            text = file_reader.extract(path)
        except Exception as e:
            self._callback(callback_url, doc_id, "EXTRACTING", "FAILED", str(e))
            raise

        if not text or len(text.strip()) < 10:
            self._callback(callback_url, doc_id, "EXTRACTING", "FAILED", "文本内容为空")
            raise ValueError("文本内容为空")

        # 4. 回调：切分中
        self._callback(callback_url, doc_id, "SPLITTING", "PROCESSING")

        # 5. 切分
        chunks = self.splitter.split_text(text)
        if not chunks:
            self._callback(callback_url, doc_id, "SPLITTING", "FAILED", "切分结果为空")
            raise ValueError("切分结果为空")

        # 6. 回调：向量化中
        self._callback(callback_url, doc_id, "EMBEDDING", "PROCESSING")

        # 7. 批量向量化
        batch_size = 20
        all_vectors = []
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            vecs = embedding_service.embed(batch)
            all_vectors.extend(vecs)

        # 8. 回调：索引中
        self._callback(callback_url, doc_id, "INDEXING", "PROCESSING")

        # 9. 入库
        metas = [
            {
                "doc_id": doc_id,
                "chunk_idx": i,
                "content": chunk,
                "title": title,
            }
            for i, chunk in enumerate(chunks)
        ]
        vector_store.add(all_vectors, metas)

        # 10. 回调：完成
        self._callback(callback_url, doc_id, "DONE", "COMPLETED", chunk_count=len(chunks))
        return len(chunks)

    def _callback(self, url: str | None, doc_id: int, stage: str, status: str,
                  error: str = None, chunk_count: int = None):
        if not url:
            return
        try:
            payload = {
                "doc_id": doc_id,
                "stage": stage,
                "status": status,
            }
            if error:
                payload["error_message"] = error
            if chunk_count is not None:
                payload["chunk_count"] = chunk_count
            httpx.post(url, json=payload, timeout=10,
                       headers={"Authorization": f"Bearer {settings.callback_token}"})
        except Exception:
            pass

processor = DocumentProcessor()
