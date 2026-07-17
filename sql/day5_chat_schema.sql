-- ============================================================
-- Day5 聊天模块建表脚本
-- 数据库: campus_qa
-- 说明: 可重复执行（IF NOT EXISTS），索引完整
-- ============================================================

-- 会话表
CREATE TABLE IF NOT EXISTS qa_conversation (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL COMMENT '用户ID',
    title       VARCHAR(200) NOT NULL DEFAULT '新会话' COMMENT '会话标题',
    create_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted     TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标记（0-正常 1-已删除）',
    INDEX idx_conv_user_id (user_id),
    INDEX idx_conv_user_deleted (user_id, deleted),
    INDEX idx_conv_update_time (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='问答会话表';

-- 问答记录表
CREATE TABLE IF NOT EXISTS qa_record (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id   BIGINT       NOT NULL COMMENT '所属会话ID',
    user_id           BIGINT       NOT NULL COMMENT '用户ID（冗余，便于按用户查询和权限校验）',
    question          TEXT         NOT NULL COMMENT '用户问题',
    answer            MEDIUMTEXT   NULL COMMENT '助手回答',
    source_docs       JSON         NULL COMMENT '检索来源文档（JSON数组）',
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING / PROCESSING / COMPLETED / FAILED / INTERRUPTED',
    model             VARCHAR(50)  NULL COMMENT '使用的LLM模型',
    top_k             INT          NOT NULL DEFAULT 5 COMMENT '检索TopK',
    score_threshold   DOUBLE       NOT NULL DEFAULT 0.70 COMMENT '检索阈值',
    latency_ms        INT          NULL COMMENT '总耗时（毫秒）',
    error_message     VARCHAR(500) NULL COMMENT '失败原因',
    create_time       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted           TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除标记（0-正常 1-已删除）',
    INDEX idx_rec_conv_id (conversation_id),
    INDEX idx_rec_user_id (user_id),
    INDEX idx_rec_conv_user (conversation_id, user_id),
    INDEX idx_rec_conv_deleted (conversation_id, deleted),
    INDEX idx_rec_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='问答记录表';
