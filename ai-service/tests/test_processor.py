import pytest
from pathlib import Path
from ai_service.processor import processor, _validate_path
from ai_service.vector_store import vector_store
from ai_service.embedding import embedding_service

FIXTURES = Path(__file__).parent / "fixtures"

# 将测试 fixtures 目录注入处理器的允许目录列表
processor.extra_allowed_dirs.append(FIXTURES.resolve())


def test_process_txt():
    doc_id = 90001
    path = str(FIXTURES / "test.txt")
    count = processor.process(doc_id, path, "TXT测试")
    assert count > 0
    assert vector_store.size > 0


def test_process_docx():
    doc_id = 90002
    path = str(FIXTURES / "test.docx")
    count = processor.process(doc_id, path, "DOCX测试")
    assert count > 0


def test_process_pdf():
    doc_id = 90003
    path = str(FIXTURES / "test.pdf")
    count = processor.process(doc_id, path, "PDF测试")
    assert count > 0


def test_search():
    doc_id = 90004
    path = str(FIXTURES / "test.txt")
    processor.process(doc_id, path, "检索测试")
    vec = embedding_service.embed_query("河海大学")
    results = vector_store.search(vec, 3)
    assert len(results) > 0


def test_id_no_reuse():
    if vector_store.metadata:
        before = max(m["vector_id"] for m in vector_store.metadata)
    else:
        before = 0
    vector_store.remove_by_doc_id(90001)
    path = str(FIXTURES / "test.txt")
    processor.process(90001, path, "ID重复测试")
    after = max(m["vector_id"] for m in vector_store.metadata)
    assert after > before


def test_invalid_path():
    with pytest.raises(ValueError):
        _validate_path("C:/Windows/System32/xxx.txt")


def test_delete_idempotent():
    deleted = vector_store.remove_by_doc_id(99999)
    assert deleted >= 0


def test_delete_actually_removed():
    doc_id = 90005
    processor.process(doc_id, str(FIXTURES / "test.txt"), "删除验证")
    vector_store.remove_by_doc_id(doc_id)
    remaining = [m for m in vector_store.metadata if m["doc_id"] == doc_id]
    assert len(remaining) == 0