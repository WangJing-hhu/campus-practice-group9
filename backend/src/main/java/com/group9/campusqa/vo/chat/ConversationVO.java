package com.group9.campusqa.vo.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

/**
 * 会话列表项 VO。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConversationVO {

    private Long id;
    private String title;

    /** 最近一条记录的时间（用于列表排序和展示） */
    private LocalDateTime lastRecordTime;

    /** 会话内问答记录总数（前端 PR #23 需要） */
    private Integer recordCount;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;

    // ── Getter / Setter ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDateTime getLastRecordTime() { return lastRecordTime; }
    public void setLastRecordTime(LocalDateTime lastRecordTime) { this.lastRecordTime = lastRecordTime; }

    public Integer getRecordCount() { return recordCount; }
    public void setRecordCount(Integer recordCount) { this.recordCount = recordCount; }

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }

    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
}
