-- ============================================================
-- Day5 官网知识库增强: kb_document 表新增官网来源字段
-- 所有新增字段均为可选（DEFAULT NULL），不影响普通上传
-- ============================================================
ALTER TABLE kb_document
    ADD COLUMN IF NOT EXISTS source_url     VARCHAR(1024) NULL COMMENT '官网原文链接',
    ADD COLUMN IF NOT EXISTS source_site    VARCHAR(100)  NULL COMMENT '来源站点名称',
    ADD COLUMN IF NOT EXISTS category       VARCHAR(50)   NULL COMMENT '内容分类',
    ADD COLUMN IF NOT EXISTS published_at   DATE          NULL COMMENT '官网发布日期',
    ADD COLUMN IF NOT EXISTS crawled_at     TIMESTAMP     NULL COMMENT '抓取时间';

-- 按 source_url 去重（可选，配合 Java 端 DocumentService 使用）
CREATE INDEX IF NOT EXISTS idx_kb_source_url ON kb_document(source_url(255));
