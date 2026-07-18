from pydantic import BaseModel, Field, field_validator
from typing import Optional


class ProcessRequest(BaseModel):
    doc_id: int
    path: str
    title: str
    callback_url: Optional[str] = None
    # 官方来源元数据（全部可选，普通 TXT/PDF/DOCX 不传时不影响）
    file_name: Optional[str] = None
    source_url: Optional[str] = None
    source_site: Optional[str] = None
    category: Optional[str] = None
    published_at: Optional[str] = None
    crawled_at: Optional[str] = None


class ProcessResponse(BaseModel):
    doc_id: int
    chunk_count: int
    status: str


class SearchRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    score_threshold: float = Field(default=0.70, ge=-1.0, le=1.0)

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("question不能为空")
        return value


class SearchResult(BaseModel):
    content: str
    doc_id: int
    chunk_idx: int
    title: str
    file_name: str
    score: float
    # 官方来源元数据（普通文档字段为空字符串）
    source_url: str = ""
    source_site: str = ""
    category: str = ""
    published_at: str = ""
    crawled_at: str = ""


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int


class DeleteResponse(BaseModel):
    doc_id: int
    deleted_vectors: int
    status: str


class HealthResponse(BaseModel):
    status: str
    model: str
    index_size: int
    key_configured: bool


class CallbackRequest(BaseModel):
    doc_id: int
    stage: str
    status: str
    error_message: Optional[str] = None
    chunk_count: Optional[int] = None