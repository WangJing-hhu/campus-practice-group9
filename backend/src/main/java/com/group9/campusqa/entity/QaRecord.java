package com.group9.campusqa.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/**
 * 问答记录实体，对应 qa_record 表。
 *
 * <p>每条记录保存一次问答的完整信息：问题、回答、检索来源、
 * 模型、耗时和状态。source_docs 以 JSON 文本存储，
 * Service 层负责序列化/反序列化。</p>
 */
@TableName("qa_record")
public class QaRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属会话 ID */
    private Long conversationId;

    /** 用户 ID（冗余字段，便于按用户查询和权限校验） */
    private Long userId;

    /** 用户问题 */
    private String question;

    /** 助手回答 */
    private String answer;

    /** 检索来源文档（JSON 字符串） */
    private String sourceDocs;

    /** 状态：PENDING / COMPLETED / FAILED / INTERRUPTED */
    private String status;

    /** 使用的 LLM 模型 */
    private String model;

    /** 检索 TopK */
    private Integer topK;

    /** 检索阈值 */
    private Double scoreThreshold;

    /** 总耗时（毫秒） */
    private Integer latencyMs;

    /** 失败原因 */
    private String errorMessage;

    /** 逻辑删除标记（0-正常 1-已删除） */
    @TableLogic
    private Integer deleted;

    /** 创建时间（自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    // ── Getter / Setter ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public String getSourceDocs() { return sourceDocs; }
    public void setSourceDocs(String sourceDocs) { this.sourceDocs = sourceDocs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getTopK() { return topK; }
    public void setTopK(Integer topK) { this.topK = topK; }

    public Double getScoreThreshold() { return scoreThreshold; }
    public void setScoreThreshold(Double scoreThreshold) { this.scoreThreshold = scoreThreshold; }

    public Integer getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Integer latencyMs) { this.latencyMs = latencyMs; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
}
