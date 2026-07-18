package com.group9.campusqa.vo.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 问答记录 VO。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecordVO {

    private Long id;
    private Long conversationId;
    private String question;
    private String answer;
    /** 检索来源文档列表（字段名 sourceDocs 与前端 PR #23 一致） */
    private List<SourceVO> sourceDocs;
    private String status;
    private String model;
    private Integer latencyMs;
    private String errorMessage;
    private LocalDateTime createTime;

    // ── Getter / Setter ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public List<SourceVO> getSourceDocs() { return sourceDocs; }
    public void setSourceDocs(List<SourceVO> sourceDocs) { this.sourceDocs = sourceDocs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getLatencyMs() { return latencyMs; }
    public void setLatencyMs(Integer latencyMs) { this.latencyMs = latencyMs; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
}
