package com.group9.campusqa.dto.chat;

/**
 * 会话列表查询 DTO。
 */
public class ConversationQueryDTO {

    private long page = 1;
    private long size = 20;
    private String keyword;

    // ── Getter / Setter ──────────────────────────────────

    public long getPage() { return page; }
    public void setPage(long page) { this.page = page; }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
}
