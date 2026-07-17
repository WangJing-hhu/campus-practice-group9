package com.group9.campusqa.vo.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 会话详情 VO——包含会话元数据和完整问答记录。
 * 用于 GET /api/chat/conversations/{id}。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConversationDetailVO {

    private Long id;
    private String title;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private List<RecordVO> records;

    // ── Getter / Setter ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }

    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }

    public List<RecordVO> getRecords() { return records; }
    public void setRecords(List<RecordVO> records) { this.records = records; }
}
