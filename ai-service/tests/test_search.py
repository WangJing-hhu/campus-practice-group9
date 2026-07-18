"""Day5 检索接口测试：向量层行为 + HTTP 层参数校验。"""
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from ai_service.main import app
from ai_service.embedding import embedding_service
from ai_service.vector_store import vector_store
from ai_service.processor import processor
from ai_service.settings import settings

FIXTURES = Path(__file__).parent / "fixtures"
processor.extra_allowed_dirs.append(FIXTURES.resolve())

client = TestClient(app)

# ── 内部 Token  ──────────────────────────────────────────
VALID_TOKEN = settings.callback_token


@pytest.fixture(autouse=True, scope="session")
def cleanup_before_all():
    """会话开始前清理旧测试残留数据。"""
    for doc_id in [90001, 90002, 90003, 90004, 90005, 90006, 90007]:
        vector_store.remove_by_doc_id(doc_id)


@pytest.fixture(autouse=True)
def cleanup_test_docs():
    """每个测试后清理全部测试文档向量。"""
    yield
    for doc_id in [90001, 90002, 90003, 90004, 90005, 90006, 90007,
                   91001, 91002, 91003, 91004, 91005, 91006, 91007]:
        vector_store.remove_by_doc_id(doc_id)


# ═══════════════════════════════════════════════════════════
#  HTTP 层参数校验测试
# ═══════════════════════════════════════════════════════════

class TestSearchApiValidation:
    """FastAPI TestClient 接口层校验"""

    def _post(self, body: dict):
        return client.post(
            "/search",
            json=body,
            headers={"X-Internal-Token": VALID_TOKEN},
        )

    # ── 非法参数 → 422 ──────────────────────

    def test_empty_question_422(self):
        resp = self._post({"question": "", "top_k": 5})
        assert resp.status_code == 422, f"空问题应 422，实际 {resp.status_code}"

    def test_whitespace_question_422(self):
        resp = self._post({"question": "   ", "top_k": 5})
        assert resp.status_code == 422, f"全空格问题应 422，实际 {resp.status_code}"

    def test_top_k_zero_422(self):
        resp = self._post({"question": "河海大学", "top_k": 0})
        assert resp.status_code == 422, f"top_k=0 应 422，实际 {resp.status_code}"

    def test_top_k_negative_422(self):
        resp = self._post({"question": "河海大学", "top_k": -1})
        assert resp.status_code == 422, f"top_k=-1 应 422，实际 {resp.status_code}"

    def test_top_k_21_422(self):
        resp = self._post({"question": "河海大学", "top_k": 21})
        assert resp.status_code == 422, f"top_k=21 应 422，实际 {resp.status_code}"

    def test_threshold_above_one_422(self):
        resp = self._post({"question": "河海大学", "score_threshold": 1.1})
        assert resp.status_code == 422, f"阈值 1.1 应 422，实际 {resp.status_code}"

    def test_threshold_below_minus_one_422(self):
        resp = self._post({"question": "河海大学", "score_threshold": -1.1})
        assert resp.status_code == 422, f"阈值 -1.1 应 422，实际 {resp.status_code}"

    # ── 鉴权 ──────────────────────────────────

    def test_missing_token_401(self):
        resp = client.post("/search", json={"question": "河海大学"})
        assert resp.status_code == 401, f"缺 Token 应 401，实际 {resp.status_code}"

    def test_wrong_token_401(self):
        resp = client.post(
            "/search",
            json={"question": "河海大学"},
            headers={"X-Internal-Token": "wrong-token"},
        )
        assert resp.status_code == 401, f"错 Token 应 401，实际 {resp.status_code}"

    # ── 合法请求 → 200 ──────────────────────

    def test_valid_request_200_with_full_source_fields(self):
        """合法请求返回 200 且包含完整来源字段。"""
        doc_id = 91001
        processor.process(
            doc_id, str(FIXTURES / "official_source.txt"), "官方来源文档",
            source_url="https://www.hhu.edu.cn/about",
            source_site="河海大学官网",
            category="学校概况",
            published_at="2026-03-15",
            crawled_at="2026-07-17 22:00:00",
        )

        resp = self._post({"question": "河海大学", "top_k": 5, "score_threshold": 0.0})
        assert resp.status_code == 200, f"合法请求应 200，实际 {resp.status_code}"

        data = resp.json()
        assert "results" in data
        assert "total" in data
        assert data["total"] > 0, "应有检索结果"

        r = data["results"][0]
        for field in ["doc_id", "chunk_idx", "title", "file_name",
                       "content", "score", "source_url", "source_site",
                       "category", "published_at", "crawled_at"]:
            assert field in r, f"缺少字段: {field}"

    # ── 默认阈值真实文档可检索 ──────────────────

    def test_default_threshold_returns_results(self):
        """导入河海大学相关文档后，默认阈值 0.70 应至少返回 1 条结果。"""
        doc_id = 91002
        processor.process(
            doc_id, str(FIXTURES / "official_source.txt"), "河海大学学校介绍",
            source_url="https://www.hhu.edu.cn/about",
            source_site="河海大学官网",
            category="学校概况",
        )

        # 使用默认 threshold=0.70（不传）
        resp = self._post({"question": "河海大学历史", "top_k": 5})
        assert resp.status_code == 200

        data = resp.json()
        assert data["total"] > 0, (
            f"默认阈值 0.70 下应至少返回 1 条结果，实际 {data['total']} 条。"
            f"如果真实知识库中大量正确问题返回空，需要调整阈值。"
        )


# ═══════════════════════════════════════════════════════════
#  向量层行为测试
# ═══════════════════════════════════════════════════════════

class TestSearchNormal:
    """正常检索场景"""

    def test_search_returns_results_with_file_name(self):
        doc_id = 91001
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "完整字段测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=3, score_threshold=0.0)

        assert len(results) > 0
        r = results[0]
        for field in ["doc_id", "chunk_idx", "title", "file_name", "content", "score"]:
            assert field in r, f"缺少字段: {field}"
        assert r["file_name"] == "test.txt"

    def test_results_sorted_by_score_desc(self):
        doc_id = 91002
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "排序测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=5, score_threshold=0.0)

        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True), f"score 未降序: {scores}"


class TestEmptyIndex:
    """空索引场景"""

    def test_empty_index_returns_empty(self):
        for doc_id in [90001, 90002, 90003, 90004, 90005, 90006, 90007,
                       91001, 91002, 91003, 91004, 91005, 91006, 91007]:
            vector_store.remove_by_doc_id(doc_id)

        results = vector_store.search([0.1] * 1024, top_k=5)
        assert results == [], f"空索引应返回空列表，实际 {len(results)} 条"


class TestScoreThreshold:
    """阈值过滤场景"""

    def test_threshold_filters_low_score(self):
        doc_id = 91003
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "阈值测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=5, score_threshold=0.99)
        assert len(results) == 0, f"阈值 0.99 应过滤全部结果，实际 {len(results)} 条"

    def test_low_threshold_keeps_results(self):
        doc_id = 91004
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "低阈值测试")

        vec = embedding_service.embed_query("河海大学")
        results_all = vector_store.search(vec, top_k=5, score_threshold=-1.0)
        results_default = vector_store.search(vec, top_k=5, score_threshold=0.70)

        assert len(results_all) >= len(results_default)


class TestDeduplication:
    """内容去重场景"""

    def test_near_duplicate_deduped(self):
        doc_id = 91005
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "去重测试")

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=5, score_threshold=0.0)

        from difflib import SequenceMatcher
        for i, r1 in enumerate(results):
            for j, r2 in enumerate(results):
                if i >= j:
                    continue
                if r1.get("doc_id") != r2.get("doc_id"):
                    continue
                ratio = SequenceMatcher(None, r1["content"], r2["content"]).ratio()
                assert ratio <= 0.85, (
                    f"未去重: doc_id={r1['doc_id']}, "
                    f"相似度={ratio:.3f}, idx1={r1['chunk_idx']}, idx2={r2['chunk_idx']}"
                )


class TestDeleteThenSearch:
    """删除后不可检索"""

    def test_deleted_doc_not_searchable(self):
        doc_id = 91006
        path = str(FIXTURES / "test.txt")
        processor.process(doc_id, path, "删除检索测试")

        vec = embedding_service.embed_query("河海大学")
        before = vector_store.search(vec, top_k=5, score_threshold=0.0)
        assert any(r["doc_id"] == doc_id for r in before), "删除前应能检索到"

        vector_store.remove_by_doc_id(doc_id)
        after = vector_store.search(vec, top_k=5, score_threshold=0.0)
        assert not any(r["doc_id"] == doc_id for r in after), "删除后不应检索到"
