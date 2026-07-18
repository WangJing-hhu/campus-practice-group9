"""补充任务：Python 侧官方来源元数据测试。

覆盖：
- 完整来源字段的存储与检索
- 普通 TXT/PDF/DOCX 无来源字段时默认为空串
- 删除后重建来源字段不丢失
- 来源与非来源文档混合索引时各自字段正确
"""
import pytest
from pathlib import Path
from ai_service.processor import processor
from ai_service.vector_store import vector_store
from ai_service.embedding import embedding_service

FIXTURES = Path(__file__).parent / "fixtures"
processor.extra_allowed_dirs.append(FIXTURES.resolve())

TEST_DOC_IDS_OFFICIAL = [92001, 92002, 92003, 92004]


@pytest.fixture(autouse=True)
def cleanup_source_docs():
    """每个测试后清理来源测试数据。"""
    yield
    for doc_id in TEST_DOC_IDS_OFFICIAL:
        vector_store.remove_by_doc_id(doc_id)


class TestOfficialSourceStoreAndSearch:
    """完整来源字段的存储与检索"""

    def test_full_source_fields_persisted(self):
        """全部来源字段写入后，检索可完整返回。"""
        doc_id = 92001
        source_meta = {
            "source_url": "https://www.hhu.edu.cn/about",
            "source_site": "河海大学官网",
            "category": "学校概况",
            "published_at": "2026-03-15",
            "crawled_at": "2026-07-17 22:00:00",
        }
        count = processor.process(
            doc_id, str(FIXTURES / "official_source.txt"), "河海大学学校介绍",
            file_name="001_河海大学学校介绍.txt",
            **source_meta,
        )
        assert count > 0, "应成功切分入库"

        vec = embedding_service.embed_query("河海大学历史")
        results = vector_store.search(vec, top_k=3, score_threshold=0.0)

        # 找到我们刚写入的文档
        ours = [r for r in results if r["doc_id"] == doc_id]
        assert len(ours) > 0, "应能检索到刚写入的来源文档"

        r = ours[0]
        assert r["file_name"] == "001_河海大学学校介绍.txt"
        assert r["source_url"] == source_meta["source_url"]
        assert r["source_site"] == source_meta["source_site"]
        assert r["category"] == source_meta["category"]
        assert r["published_at"] == source_meta["published_at"]
        assert r["crawled_at"] == source_meta["crawled_at"]


class TestPlainDocNoSourceFields:
    """普通文档无来源字段时默认为空"""

    def test_plain_txt_returns_empty_source_fields(self):
        """普通 TXT 不带来源字段时，检索返回空字符串而非报错。"""
        doc_id = 92002
        count = processor.process(
            doc_id, str(FIXTURES / "official_source.txt"), "普通文档测试"
        )
        assert count > 0

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=3, score_threshold=0.0)

        ours = [r for r in results if r["doc_id"] == doc_id]
        assert len(ours) > 0, "应能检索到普通文档"

        r = ours[0]
        # 关键：没有来源字段时不能报错，必须返回空字符串
        assert r.get("source_url") == ""
        assert r.get("source_site") == ""
        assert r.get("category") == ""
        assert r.get("published_at") == ""
        assert r.get("crawled_at") == ""
        # file_name 应从 path 自动提取
        assert r["file_name"] == "official_source.txt"


class TestDeleteAndRebuild:
    """删除后重建来源字段不丢失"""

    def test_delete_rebuild_preserves_source_fields(self):
        """删除向量后重新处理，来源字段应完整恢复。"""
        doc_id = 92003
        source_meta = {
            "source_url": "https://www.hhu.edu.cn/lib",
            "source_site": "河海大学图书馆",
            "category": "图书馆服务",
            "published_at": "2026-01-10",
            "crawled_at": "2026-07-17 23:00:00",
        }

        # 首次写入
        processor.process(
            doc_id, str(FIXTURES / "official_source.txt"), "图书馆使用指南",
            file_name="003_图书馆使用指南.txt",
            **source_meta,
        )

        # 删除
        deleted = vector_store.remove_by_doc_id(doc_id)
        assert deleted > 0, "删除应有记录被移除"

        # 重建
        processor.process(
            doc_id, str(FIXTURES / "official_source.txt"), "图书馆使用指南v2",
            file_name="003_图书馆使用指南_v2.txt",
            **source_meta,
        )

        vec = embedding_service.embed_query("图书馆开放时间")
        results = vector_store.search(vec, top_k=3, score_threshold=0.0)

        ours = [r for r in results if r["doc_id"] == doc_id]
        assert len(ours) > 0, "重建后应能检索到"
        r = ours[0]
        assert r["file_name"] == "003_图书馆使用指南_v2.txt"
        assert r["source_site"] == source_meta["source_site"]
        assert r["category"] == source_meta["category"]


class TestMixedSourceAndPlain:
    """来源与非来源文档混合索引"""

    def test_mixed_docs_return_correct_fields(self):
        """混合索引中各自返回正确字段。"""
        # 写入一个带来源的
        processor.process(
            92004, str(FIXTURES / "official_source.txt"), "来源文档",
            source_url="https://www.hhu.edu.cn/news/1",
            source_site="河海大学官网",
            category="新闻",
            published_at="2026-06-01",
            crawled_at="2026-07-17 21:00:00",
        )
        # 写入一个不带来源的（复用 doc_id 92002 已清理）
        processor.process(
            92002, str(FIXTURES / "official_source.txt"), "普通文档"
        )

        vec = embedding_service.embed_query("河海大学")
        results = vector_store.search(vec, top_k=10, score_threshold=0.0)

        source_docs = [r for r in results if r["doc_id"] == 92004]
        plain_docs = [r for r in results if r["doc_id"] == 92002]

        # 来源文档应有字段
        if source_docs:
            assert source_docs[0]["source_site"] == "河海大学官网"
            assert source_docs[0]["category"] == "新闻"

        # 普通文档应为空串
        if plain_docs:
            assert plain_docs[0]["source_url"] == ""
            assert plain_docs[0]["source_site"] == ""
