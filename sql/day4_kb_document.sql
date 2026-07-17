-- ============================================================
-- Day4 知识库文档表 kb_document
-- 第9组 · 校园问答助手
-- 使用数据库: campus_qa
-- 创建人: 王雨淇
-- 日期: 2026-07-17
-- ============================================================

-- 如果表已存在则删除（仅开发环境，生产慎用）
-- DROP TABLE IF EXISTS kb_document;

CREATE TABLE IF NOT EXISTS kb_document (
    -- 文档主键 ID
    id              BIGINT          AUTO_INCREMENT  PRIMARY KEY    COMMENT '文档ID',

    -- 展示标题（用户可自定义，默认取原文件名）
    title           VARCHAR(255)    NOT NULL                        COMMENT '展示标题',

    -- 上传时的原始文件名
    original_name   VARCHAR(255)    NOT NULL                        COMMENT '上传原文件名',

    -- UUID 重命名后的存储文件名
    stored_name     VARCHAR(255)    NOT NULL                        COMMENT 'UUID存储名',

    -- 文件在服务器上的绝对路径（Java 与 Python 均可读取）
    file_path       VARCHAR(500)    NOT NULL                        COMMENT '文件绝对路径',

    -- 文件类型扩展名（小写）
    file_type       VARCHAR(20)     NOT NULL                        COMMENT '文件类型: pdf/doc/docx/txt',

    -- 文件大小（字节数）
    file_size       BIGINT          NOT NULL    DEFAULT 0           COMMENT '文件字节数',

    -- 切分后的文本块数量（处理完成后由回调写入）
    chunk_count     INT             NOT NULL    DEFAULT 0           COMMENT '切分块数',

    -- 处理状态：PENDING / PROCESSING / COMPLETED / FAILED
    status          VARCHAR(30)     NOT NULL    DEFAULT 'PENDING'   COMMENT '处理状态',

    -- 处理阶段（详细步骤）：UPLOADED / EXTRACTING / SPLITTING / EMBEDDING / INDEXING / DONE
    process_stage   VARCHAR(30)     NULL        DEFAULT 'UPLOADED'  COMMENT '当前处理阶段',

    -- 失败原因（status=FAILED 时记录人类可读的错误信息）
    error_message   VARCHAR(1000)   NULL                            COMMENT '失败原因',

    -- 上传该文档的管理员用户 ID（关联 sys_user.id）
    create_user_id  BIGINT          NOT NULL                        COMMENT '上传管理员ID',

    -- 创建时间（自动填充）
    create_time     DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP   COMMENT '创建时间',

    -- 更新时间（自动填充）
    update_time     DATETIME        NOT NULL    DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP                     COMMENT '更新时间',

    -- 逻辑删除标记（0-正常 1-已删除）
    deleted         TINYINT         NOT NULL    DEFAULT 0           COMMENT '逻辑删除',

    -- ========== 索引 ==========
    INDEX idx_kb_document_status (status),
    INDEX idx_kb_document_file_type (file_type),
    INDEX idx_kb_document_create_user_id (create_user_id),
    INDEX idx_kb_document_create_time (create_time),
    INDEX idx_kb_document_deleted (deleted)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='知识库文档表 - Day4 文档元数据';
