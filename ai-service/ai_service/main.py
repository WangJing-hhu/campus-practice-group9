from fastapi import FastAPI, HTTPException, Header, Depends
from .schemas import (
    ProcessRequest,
    ProcessResponse,
    SearchRequest,
    SearchResponse,
    DeleteResponse,
    HealthResponse,
)
from .processor import processor
from .embedding import embedding_service
from .vector_store import vector_store
from .settings import settings

app = FastAPI(title="AI Service", version="1.0.0")


def verify_internal_token(x_internal_token: str = Header(None)):
    if x_internal_token != settings.callback_token:
        raise HTTPException(status_code=401, detail="未授权")


@app.post("/process", response_model=ProcessResponse, dependencies=[Depends(verify_internal_token)])
def process(req: ProcessRequest):
    try:
        count = processor.process(
            req.doc_id, req.path, req.title, req.callback_url
        )
        return ProcessResponse(doc_id=req.doc_id, chunk_count=count, status="COMPLETED")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse, dependencies=[Depends(verify_internal_token)])
def search(req: SearchRequest):
    vec = embedding_service.embed_query(req.question)
    results = vector_store.search(vec, req.top_k)
    return SearchResponse(
        results=[
            {
                "content": r["content"],
                "doc_id": r["doc_id"],
                "chunk_idx": r["chunk_idx"],
                "title": r["title"],
                "score": r["score"],
            }
            for r in results
        ],
        total=len(results),
    )


@app.delete("/document/{doc_id}", response_model=DeleteResponse, dependencies=[Depends(verify_internal_token)])
def delete_document(doc_id: int):
    count = vector_store.remove_by_doc_id(doc_id)
    return DeleteResponse(doc_id=doc_id, deleted_vectors=count, status="OK")


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="OK",
        model=settings.embedding_model,
        index_size=vector_store.size,
    )