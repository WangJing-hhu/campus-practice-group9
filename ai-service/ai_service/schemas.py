from pydantic import BaseModel
from typing import Optional

class ProcessRequest(BaseModel):
    doc_id: int
    path: str
    title: str
    callback_url: Optional[str] = None

class ProcessResponse(BaseModel):
    doc_id: int
    chunk_count: int
    status: str

class SearchRequest(BaseModel):
    question: str
    top_k: int = 5

class SearchResult(BaseModel):
    content: str
    doc_id: int
    chunk_idx: int
    title: str
    score: float

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

class CallbackRequest(BaseModel):
    doc_id: int
    stage: str
    status: str
    error_message: Optional[str] = None
    chunk_count: Optional[int] = None