"""RAG engine backed by LlamaIndex.

Components:
- VectorStoreIndex + FaissVectorStore
- DashScopeEmbedding (text-embedding-v3)
- DashScope LLM (qwen-turbo)
- CondensePlusContextChatEngine for multi-turn chat
- HHUMarkdownReader for the knowledge-base corpus
"""

from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import Any
import random
import threading
import time

import faiss
from llama_index.core import Settings, StorageContext, VectorStoreIndex
from llama_index.core.chat_engine import CondensePlusContextChatEngine
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import Document, MetadataMode
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.vector_stores.faiss import FaissVectorStore

from .config import settings
from .database import connect, utc_now
from .hhu_reader import HHUMarkdownReader
from .rag import extract_text


class OpenAICompatibleLLM(OpenAI):
    """OpenAI 兼容接口的 LLM 封装。

    绕过 llama_index 对模型名的校验，让 qwen-turbo 等自定义模型
    也能通过 OpenAI 兼容端点调用。
    """

    def _get_model_name(self) -> str:
        # 仅用于本地 metadata / context_window 计算，不影响实际请求
        return "gpt-3.5-turbo"


HHU_SYSTEM_PROMPT = """你是河海大学校园问答助手，专门回答关于河海大学的各类问题。

【回答要求】
1. 只根据提供的参考资料回答，资料不足时明确说明"根据现有资料，暂未找到相关信息"
2. 使用简洁、专业的中文回答
3. 在回答中引用资料来源，使用 [1]、[2] 等标注
4. 回答末尾可附上"如需了解更多，请访问河海大学官网：www.hhu.edu.cn"
5. 对于招生、录取等时效性问题，建议用户核实最新信息"""


class HHURAGEngine:
    """基于 LlamaIndex 的 RAG 引擎，使用 OpenAI 兼容接口对接百炼/DashScope。"""

    _instance: HHURAGEngine | None = None

    def __new__(cls) -> HHURAGEngine:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return
        self._initialized = True

        self._configure_settings()
        self._index_lock = threading.RLock()

        self.persist_dir = settings.data_dir / "llama_index_storage"
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self.index = self._load_or_build_index()
        self._ingestion_pipeline = self._build_ingestion_pipeline()

    # ------------------------------------------------------------------
    # 配置
    # ------------------------------------------------------------------
    def _configure_settings(self) -> None:
        if not settings.dashscope_api_key:
            raise RuntimeError(
                "DASHSCOPE_API_KEY 未配置；本项目需要联网使用 DashScope Embedding 与 LLM"
            )
        # 统一使用 OpenAI 兼容接口，支持自定义百炼工作空间_HOST
        api_base = settings.llm_base_url
        api_key = settings.dashscope_api_key or settings.llm_api_key
        # OpenAIEmbedding 会校验 model 枚举值，用 model_name 传实际模型名来绕过
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-ada-002",
            model_name=settings.embedding_model,
            api_base=api_base,
            api_key=api_key,
            embed_batch_size=10,
        )
        Settings.llm = OpenAICompatibleLLM(
            model=settings.llm_model,
            api_base=api_base,
            api_key=api_key,
            temperature=0.1,
            max_tokens=1024,
        )
        Settings.node_parser = SentenceSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            paragraph_separator="\n\n",
        )
        Settings.context_window = 8192

    def _build_ingestion_pipeline(self) -> IngestionPipeline:
        return IngestionPipeline(
            transformations=[
                SentenceSplitter(
                    chunk_size=settings.chunk_size,
                    chunk_overlap=settings.chunk_overlap,
                    paragraph_separator="\n\n",
                ),
                Settings.embed_model,
            ]
        )

    # ------------------------------------------------------------------
    # 索引加载 / 构建
    # ------------------------------------------------------------------
    def _create_faiss_index(self, dimension: int) -> faiss.Index:
        # FaissVectorStore 内部自行维护 ID 映射，传入裸 IndexFlatIP 即可
        return faiss.IndexFlatIP(dimension)

    def _load_or_build_index(self) -> VectorStoreIndex:
        docstore_path = self.persist_dir / "docstore.json"
        faiss_path = self.persist_dir / "faiss.index"
        index_store_path = self.persist_dir / "index_store.json"
        from llama_index.core.storage.docstore import SimpleDocumentStore
        from llama_index.core.storage.index_store import SimpleIndexStore

        # 优先加载已有索引；加载失败时不覆盖已有 docstore，避免数据丢失
        if docstore_path.exists():
            try:
                docstore = SimpleDocumentStore.from_persist_path(str(docstore_path))
                if faiss_path.exists() and index_store_path.exists():
                    index_store = SimpleIndexStore.from_persist_path(
                        str(index_store_path)
                    )
                    faiss_index = faiss.read_index(str(faiss_path))
                    vector_store = FaissVectorStore(faiss_index=faiss_index)
                    storage_context = StorageContext.from_defaults(
                        docstore=docstore,
                        index_store=index_store,
                        vector_store=vector_store,
                    )
                    from llama_index.core import load_index_from_storage

                    index_structs = index_store.index_structs()
                    if len(index_structs) == 1:
                        index = load_index_from_storage(storage_context)
                    else:
                        index = load_index_from_storage(
                            storage_context, index_id=index_structs[0].index_id
                        )
                    print(
                        f"✅ LlamaIndex 索引已加载: {len(index.docstore.docs)} 个节点"
                    )
                    return index
                # 仅有 docstore 时，从 docstore 重建向量索引
                print("⚠️ 向量索引文件缺失，从 docstore 重建")
                return self._build_index_from_docstore(docstore)
            except Exception as exc:
                print(f"⚠️ LlamaIndex 索引加载失败: {exc}")
                raise

        dimension = self._get_embedding_dimension()
        faiss_index = self._create_faiss_index(dimension)
        vector_store = FaissVectorStore(faiss_index=faiss_index)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex(
            nodes=[],
            storage_context=storage_context,
            store_nodes_override=True,
        )
        print(f"✅ 已创建空 LlamaIndex 索引 (维度 {dimension})")
        return index

    def _get_embedding_dimension(self) -> int:
        # text-embedding-v3 固定 1024 维
        if settings.embedding_model == "text-embedding-v3":
            return 1024
        # 兜底：用空文本探测一次
        embedding = Settings.embed_model.get_text_embedding("dimension probe")
        return len(embedding)

    def _persist(self, index: VectorStoreIndex | None = None) -> None:
        with self._index_lock:
            target = index or self.index
            self.persist_dir.mkdir(parents=True, exist_ok=True)
            # 分别持久化 docstore / index_store / faiss index
            target.docstore.persist(
                persist_path=str(self.persist_dir / "docstore.json")
            )
            target.storage_context.index_store.persist(
                persist_path=str(self.persist_dir / "index_store.json")
            )
            faiss.write_index(
                target.storage_context.vector_store._faiss_index,
                str(self.persist_dir / "faiss.index"),
            )

    def save_index(self) -> None:
        """显式持久化索引（供外部事务提交后调用）。"""
        self._persist()

    # ------------------------------------------------------------------
    # 文档管理
    # ------------------------------------------------------------------
    def _is_retryable_network_error(self, exc: Exception) -> bool:
        name = type(exc).__name__.lower()
        msg = str(exc).lower()
        return (
            "connection" in name
            or "timeout" in name
            or "connectionreset" in msg
            or "connection aborted" in msg
            or "connection reset" in msg
        )

    def _insert_with_retry(self, doc: Document, max_retries: int = 3) -> None:
        """调用 index.insert 并针对网络类错误重试。"""
        for attempt in range(max_retries):
            try:
                with self._index_lock:
                    self.index.insert(doc)
                return
            except Exception as exc:
                if (
                    not self._is_retryable_network_error(exc)
                    or attempt == max_retries - 1
                ):
                    raise
                wait = 2**attempt + random.random()
                print(
                    f"⚠️ 插入文档网络错误（第 {attempt + 1}/{max_retries} 次）: {exc}，{wait:.1f}s 后重试..."
                )
                time.sleep(wait)

    def add_document(
        self,
        file_path: Path | str,
        document_id: int,
        title: str = "",
        category: str = "其他",
        source_url: str = "",
        db: sqlite3.Connection | None = None,
    ) -> int:
        """为单个文档建立/更新索引，返回 chunk 数量。"""
        file_path = Path(file_path)
        document = self._build_document(
            file_path=file_path,
            document_id=document_id,
            title=title or file_path.stem,
            category=category,
            source_url=source_url,
        )
        if not document.text.strip():
            return 0

        # 同名/同 ID 文档先删除旧节点
        self.delete_document(document_id, persist=False)

        self._insert_with_retry(document)
        self._persist()

        # 统计实际生成的节点数
        node_count = self._count_nodes_by_document_id(document_id)

        if db is not None:
            db.execute(
                """
                UPDATE documents
                SET chunk_count = ?, status = 'READY', error = NULL, updated_at = ?
                WHERE id = ?
                """,
                (node_count, utc_now(), document_id),
            )
        return node_count

    def _build_document(
        self,
        file_path: Path,
        document_id: int,
        title: str,
        category: str,
        source_url: str,
    ) -> Document:
        suffix = file_path.suffix.lower()
        if suffix in {".md"}:
            # Markdown 使用 HHUMarkdownReader 清洗
            docs = HHUMarkdownReader().load_data(file_path)
            if docs:
                doc = docs[0]
                doc.metadata["document_id"] = str(document_id)
                doc.metadata["stored_name"] = file_path.name
                doc.metadata.setdefault("title", title)
                doc.metadata.setdefault(
                    "category", category or doc.metadata.get("category", "其他")
                )
                doc.metadata.setdefault(
                    "source_url", source_url or doc.metadata.get("source_url", "")
                )
                return doc

        data = file_path.read_bytes()
        text = extract_text(data, file_path.name)
        return Document(
            text=text,
            metadata={
                "document_id": str(document_id),
                "title": title,
                "category": category,
                "source_url": source_url,
                "stored_name": file_path.name,
                "file_path": str(file_path),
            },
        )

    def _count_nodes_by_document_id(self, document_id: int) -> int:
        target = str(document_id)
        with self._index_lock:
            return sum(
                1
                for node in self.index.docstore.docs.values()
                if node.metadata.get("document_id") == target
            )

    def _build_index_from_docstore(
        self, docstore: Any | None = None
    ) -> VectorStoreIndex:
        """根据 docstore 中的节点重建 FAISS 索引，返回新索引。"""
        from llama_index.core.storage.index_store import SimpleIndexStore

        target_docstore = docstore or self.index.docstore
        nodes = list(target_docstore.docs.values())
        dimension = self._get_embedding_dimension()
        faiss_index = self._create_faiss_index(dimension)
        vector_store = FaissVectorStore(faiss_index=faiss_index)
        # 新建空的 index_store，避免旧的 index_struct 不断累积
        storage_context = StorageContext.from_defaults(
            docstore=target_docstore,
            index_store=SimpleIndexStore(),
            vector_store=vector_store,
        )
        return VectorStoreIndex(
            nodes=nodes,
            storage_context=storage_context,
            store_nodes_override=True,
        )

    def _rebuild_index_from_docstore(self) -> None:
        """根据当前 docstore 中的节点重建 FAISS 索引。"""
        self.index = self._build_index_from_docstore()

    def delete_document(self, document_id: int, persist: bool = True) -> bool:
        """删除与 document_id 关联的所有节点（FaissVectorStore 不支持单点删除，故重建索引）。"""
        with self._index_lock:
            target = str(document_id)
            node_ids = [
                node_id
                for node_id, node in self.index.docstore.docs.items()
                if node.metadata.get("document_id") == target
            ]
            if not node_ids:
                return False
            for node_id in node_ids:
                self.index.docstore.delete_document(node_id)
            self._rebuild_index_from_docstore()
            if persist:
                self._persist()
            return True

    def reprocess_document(
        self,
        file_path: Path | str,
        document_id: int,
        title: str = "",
        category: str = "其他",
        source_url: str = "",
        db: sqlite3.Connection | None = None,
    ) -> int:
        """重新处理文档：先删除旧节点，再重新插入。"""
        self.delete_document(document_id, persist=False)
        return self.add_document(
            file_path=file_path,
            document_id=document_id,
            title=title,
            category=category,
            source_url=source_url,
            db=db,
        )

    def rebuild_index(self) -> None:
        """全量重建索引：清空后重新加载所有 READY 文档。"""
        with self._index_lock:
            dimension = self._get_embedding_dimension()
            faiss_index = self._create_faiss_index(dimension)
            vector_store = FaissVectorStore(faiss_index=faiss_index)
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            self.index = VectorStoreIndex(
                nodes=[],
                storage_context=storage_context,
                store_nodes_override=True,
            )
            with connect() as db:
                rows = db.execute(
                    "SELECT id, stored_name, title, category, source_url FROM documents WHERE status = 'READY'"
                ).fetchall()
                for row in rows:
                    path = settings.upload_dir / row["stored_name"]
                    if not path.exists():
                        continue
                    self.add_document(
                        file_path=path,
                        document_id=row["id"],
                        title=row["title"] or "",
                        category=row["category"] or "其他",
                        source_url=row["source_url"] or "",
                    )
            self._persist()

    # ------------------------------------------------------------------
    # 知识库加载
    # ------------------------------------------------------------------
    def load_knowledge_base(
        self, directory: Path | str | None = None, uploaded_by: int = 1
    ) -> int:
        """加载河海知识库目录到索引，返回新增/更新文档数。"""
        directory = Path(directory or settings.knowledge_base_dir)
        if not directory.exists():
            print(f"⚠️ 知识库目录不存在: {directory}")
            return 0

        reader = HHUMarkdownReader()
        docs = reader.load_data_from_directory(directory)
        print(f"📚 从 {directory} 加载了 {len(docs)} 篇有效文档")

        # 已索引的文件名集合（按 stored_name / file_name）
        with self._index_lock:
            indexed_names = {
                node.metadata.get("stored_name") or node.metadata.get("file_name", "")
                for node in self.index.docstore.docs.values()
            }

        added = 0
        skipped = 0
        failed = 0
        batch_size = 20

        db = connect()
        try:
            for batch_start in range(0, len(docs), batch_size):
                batch = docs[batch_start : batch_start + batch_size]
                for doc in batch:
                    original_path = doc.metadata.get(
                        "original_path"
                    ) or doc.metadata.get("file_path", "")
                    file_name = doc.metadata.get("file_name", "")
                    title = doc.metadata.get("title") or file_name or "未命名"
                    source_url = doc.metadata.get("source_url", "")
                    category = doc.metadata.get("category", "")

                    if file_name in indexed_names:
                        skipped += 1
                        continue

                    # 按 original_path / file_name 去重
                    existing = db.execute(
                        "SELECT id FROM documents WHERE original_path = ? OR stored_name = ?",
                        (original_path, file_name),
                    ).fetchone()

                    if existing:
                        document_id = existing["id"]
                        self.delete_document(document_id, persist=False)
                    else:
                        now = utc_now()
                        cursor = db.execute(
                            """
                            INSERT INTO documents(
                                title, filename, stored_name, mime_type, size, status,
                                chunk_count, source_url, category, original_path,
                                uploaded_by, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, 'READY', 0, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                title,
                                file_name,
                                file_name,
                                "text/markdown",
                                len(doc.text.encode("utf-8")),
                                source_url,
                                category,
                                original_path,
                                uploaded_by,
                                now,
                                now,
                            ),
                        )
                        document_id = int(cursor.lastrowid)

                    doc.metadata["document_id"] = str(document_id)
                    doc.metadata["stored_name"] = file_name

                    try:
                        self._insert_with_retry(doc)
                        indexed_names.add(file_name)
                        added += 1
                    except Exception as exc:
                        print(f"⚠️ 插入文档失败 {file_name}: {exc}")
                        failed += 1

                # 每批结束后提交并持久化，避免全部丢失
                db.commit()
                self._persist()
                print(
                    f"🔄 进度: {min(batch_start + batch_size, len(docs))}/{len(docs)} "
                    f"(新增 {added}, 跳过 {skipped}, 失败 {failed})"
                )
        finally:
            db.close()

        print(
            f"✅ 知识库加载完成，新增 {added} 篇，跳过 {skipped} 篇，失败 {failed} 篇"
        )
        return added

    # ------------------------------------------------------------------
    # 检索与生成
    # ------------------------------------------------------------------
    def _format_sources(self, source_nodes: list[Any]) -> list[dict[str, Any]]:
        sources = []
        for i, node in enumerate(source_nodes, start=1):
            metadata = node.metadata or {}
            sources.append(
                {
                    "index": i,
                    "title": metadata.get("title", "未知来源"),
                    "source_url": metadata.get("source_url", ""),
                    "category": metadata.get("category", ""),
                    "score": round(float(node.score or 0.0), 4),
                    "content": node.get_content(
                        metadata_mode=MetadataMode.NONE
                    ).strip(),
                }
            )
        return sources

    def query(
        self, question: str, conversation_id: int | None = None
    ) -> dict[str, Any]:
        """单次非流式查询。"""
        with self._index_lock:
            chat_history = self._load_chat_history(conversation_id)
            retriever = self.index.as_retriever(similarity_top_k=settings.top_k)
            chat_engine = CondensePlusContextChatEngine.from_defaults(
                retriever=retriever,
                memory=ChatMemoryBuffer.from_defaults(),
                chat_history=chat_history,
                system_prompt=HHU_SYSTEM_PROMPT,
            )
            response = chat_engine.chat(question)
            sources = self._format_sources(response.source_nodes)
            return {"answer": str(response), "sources": sources}

    def stream_query(
        self,
        question: str,
        conversation_id: int | None = None,
        top_k: int | None = None,
    ) -> Iterator[str]:
        """流式查询（SSE 格式）。"""
        with self._index_lock:
            chat_history = self._load_chat_history(conversation_id)
            retriever = self.index.as_retriever(
                similarity_top_k=top_k or settings.top_k
            )
            chat_engine = CondensePlusContextChatEngine.from_defaults(
                retriever=retriever,
                memory=ChatMemoryBuffer.from_defaults(),
                chat_history=chat_history,
                system_prompt=HHU_SYSTEM_PROMPT,
            )
            response = chat_engine.stream_chat(question)

            sources = self._format_sources(response.source_nodes)
            yield f'event: meta\ndata: {json.dumps({"sources": sources}, ensure_ascii=False)}\n\n'

            for token in response.response_gen:
                delta = token.delta if hasattr(token, "delta") else str(token)
                payload = json.dumps({"text": delta}, ensure_ascii=False)
                yield f"event: token\ndata: {payload}\n\n"

        yield "event: done\ndata: {}\n\n"

    def _load_chat_history(self, conversation_id: int | None) -> list[ChatMessage]:
        if not conversation_id:
            return []
        with connect() as db:
            rows = db.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id",
                (conversation_id,),
            ).fetchall()
        return [
            ChatMessage(
                role=(
                    MessageRole.USER if row["role"] == "USER" else MessageRole.ASSISTANT
                ),
                content=row["content"],
            )
            for row in rows
        ]


# 全局 RAG 引擎实例
rag_engine = HHURAGEngine()
