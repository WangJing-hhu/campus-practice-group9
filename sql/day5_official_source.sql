-- ============================================================
-- Day5 官网知识库增强: kb_document 表新增官网来源字段
-- MySQL 8 兼容：使用存储过程检测列/索引是否存在后再创建
-- ============================================================

DELIMITER $$

-- 新增来源字段（若不存在）
CREATE PROCEDURE IF NOT EXISTS add_official_source_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'kb_document'
                     AND COLUMN_NAME = 'source_url') THEN
        ALTER TABLE kb_document
            ADD COLUMN source_url     VARCHAR(1024) NULL COMMENT '官网原文链接',
            ADD COLUMN source_site    VARCHAR(100)  NULL COMMENT '来源站点名称',
            ADD COLUMN category       VARCHAR(50)   NULL COMMENT '内容分类',
            ADD COLUMN published_at   DATE          NULL COMMENT '官网发布日期',
            ADD COLUMN crawled_at     TIMESTAMP     NULL COMMENT '抓取时间';
    END IF;
END$$

-- 创建去重索引（若不存在）
CREATE PROCEDURE IF NOT EXISTS add_official_source_index()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'kb_document'
                     AND INDEX_NAME = 'idx_kb_source_url') THEN
        CREATE INDEX idx_kb_source_url ON kb_document(source_url(255));
    END IF;
END$$

DELIMITER ;

-- 执行
CALL add_official_source_columns();
CALL add_official_source_index();

-- 清理存储过程
DROP PROCEDURE IF EXISTS add_official_source_columns;
DROP PROCEDURE IF EXISTS add_official_source_index;
