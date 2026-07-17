import pytest
from pathlib import Path
from ai_service.processor import processor
from ai_service.vector_store import vector_store

def test_process_txt():
    doc_id = 99901
    path = str(Path(__file__).parent / "fixtures" / "test.txt")
    count = processor.process(doc_id, path, "测试文档")
    assert count > 0
    assert vector_store.size > 0

def test_delete():
    doc_id = 99901
    deleted = vector_store.remove_by_doc_id(doc_id)
    assert deleted >= 0
    remaining = [m for m in vector_store.metadata if m.get("doc_id") == doc_id]
    assert len(remaining) == 0
