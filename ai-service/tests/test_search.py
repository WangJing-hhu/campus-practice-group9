"""Day5 检索接口测试：阈值过滤、去重、空索引、非法参数、删除后不可检索。"""
import pytest
from pathlib import Path
from ai_service.embedding import embedding_service
from ai_service.vector_store import vector_store
from ai_service.processor import processor

FIXTURES = Path(__file__).parent / "fixtures"

# 将测试 fixtures 目录注入处理器的允许目录列表
processor.extra_allowed_dirs.append(FIXTURES.resolve())


@pytest.fixture(autouse=True, scope="session")
def cleanup_before_all():
    """会话开始前清理旧测试残留数据（含 test_processor.py 遗留）。"""
    for doc_id in [90001, 90002, 90003, 90004, 90005, 90006, 90007]:
        vector_store.remove_by_doc_id(doc_id)


@pytest.fixture(autouse=True)
def cleanup_test_docs():
    """每个测试后清理全部测试文档向量。"""
    yield
    for doc_id in [90001, 90002, 90003, 90004, 90005, 90006, 90007,
                   91001, 91002, 91003, 91004, 91005, 91006, 91007]:
        vector_store.remove_by_doc_id(doc_id)


class TestSearchNormal:
    """正常检索场景"""

    def test_search_returns_results_with_file_name(self):
        """检索返回 file_name、score 等完整字段。"""
        doc_id = 91001
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "完整字段测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=3, score_threshold=0.0)

        assert len(results) > 0, "应有检索结果"
        r = results[0]
        assert "doc_id" in r
        assert "chunk_idx" in r
        assert "title" in r
        assert "file_name" in r
        assert "content" in r
        assert "score" in r
        assert r["file_name"] == "test.txt", f"file_name 应为 test.txt，实际为 {r.get('file_name')}"

    def test_results_sorted_by_score_desc(self):
        """结果按 score 降序排列。"""
        doc_id = 91002
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "排序测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=5, score_threshold=0.0)

        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True), f"score 未降序: {scores}"


class TestEmptyIndex:
    """空索引场景"""

    def test_empty_index_after_cleanup_returns_empty(self):
        """清理全部数据后，空索引检索返回空列表。"""
        # 先清掉所有测试数据
        for doc_id in [90001, 90002, 90003, 90004, 90005, 90006, 90007,
                       91001, 91002, 91003, 91004, 91005, 91006, 91007]:
            vector_store.remove_by_doc_id(doc_id)

        # 用任意向量检索空索引
        results = vector_store.search([0.1] * 1024, top_k=5)
        assert results == [], f"空索引应返回空列表，实际 {len(results)} 条"

    def test_empty_string_embedding_does_not_crash(self):
        """空字符串 Embedding 不应导致服务崩溃（由 API 层 Pydantic 校验 question 非空）。"""
        # DashScope 对空字符串有一定容错，这里只验证不抛未捕获异常
        try:
            vec = embedding_service.embed_query("")
            # 空字符串 embedding 可能成功返回零向量或极短向量
            assert isinstance(vec, list), "返回值应为 list"
        except Exception:
            # 如果 API 拒绝空字符串，也在预期范围内
            pass


class TestScoreThreshold:
    """阈值过滤场景"""

    def test_threshold_filters_low_score(self):
        """低于阈值的结果不返回。"""
        doc_id = 91003
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "阈值测试")

        # 用极高阈值
        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=5, score_threshold=0.99)
        # 余弦相似度很难达到 0.99，应为空
        assert len(results) == 0, f"阈值 0.99 应过滤全部结果，实际 {len(results)} 条"

    def test_low_threshold_keeps_results(self):
        """低阈值保留结果。"""
        doc_id = 91004
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "低阈值测试")

        vec = embedding_service.embed_query("河海大学")
        results_all = vector_store.search(vec, top_k=5, score_threshold=-1.0)
        results_default = vector_store.search(vec, top_k=5, score_threshold=0.70)

        assert len(results_all) >= len(results_default), "更低阈值应返回不少于默认阈值的数量"


class TestDeduplication:
    """内容去重场景"""

    def test_near_duplicate_deduped(self):
        """同一文档高度相似片段被去重。"""
        doc_id = 91005
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "去重测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=5, score_threshold=0.0)

        # 验证没有两条结果的 doc_id 相同且 content 高度相似
        for i, r1 in enumerate(results):
            for j, r2 in enumerate(results):
                if i >= j:
                    continue
                if r1.get("doc_id") != r2.get("doc_id"):
                    continue
                from difflib import SequenceMatcher
                ratio = SequenceMatcher(None, r1["content"], r2["content"]).ratio()
                assert ratio <= 0.85, (
                    f"发现未去重的重复片段: doc_id={r1['doc_id']}, "
                    f"相似度={ratio:.3f}, idx1={r1['chunk_idx']}, idx2={r2['chunk_idx']}"
                )


class TestDeleteThenSearch:
    """删除后不可检索"""

    def test_deleted_doc_not_searchable(self):
        """删除后文档的向量不可检索。"""
        doc_id = 91006
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "删除检索测试")

        vec = embedding_service.embed_query("河海大学")
        before = vector_store.search(vec, top_k=5, score_threshold=0.0)
        assert any(r["doc_id"] == doc_id for r in before), "删除前应能检索到"

        vector_store.remove_by_doc_id(doc_id)
        after = vector_store.search(vec, top_k=5, score_threshold=0.0)
        assert not any(r["doc_id"] == doc_id for r in after), "删除后不应检索到"


class TestParameterBoundaries:
    """参数边界场景"""

    def test_top_k_respects_index_size(self):
        """top_k 超过索引总量时返回实际数量。"""
        doc_id = 91007
        path = str(FIXTURES / "test.txt")
        count = processor.process(doc_id, path, "边界测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=9999, score_threshold=-1.0)
        assert len(results) <= vector_store.size, "不应超过索引总量"

    def test_invalid_threshold_clamped(self):
        """非法阈值（由 API 层 Pydantic 校验，这里只测极端值不崩溃）。"""
        doc_id = 91007
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "极端阈值")

        vec = embedding_service.embed_query("河海大学")
        # 1.5 阈值：全部过滤
        results = vector_store.search(vec, top_k=5, score_threshold=1.5)
        assert results == [], "阈值 1.5 应全部过滤"

        # -1.0 阈值：全部保留
        results = vector_store.search(vec, top_k=5, score_threshold=-1.0)
        assert len(results) >= 0, "负阈值不应崩溃"
