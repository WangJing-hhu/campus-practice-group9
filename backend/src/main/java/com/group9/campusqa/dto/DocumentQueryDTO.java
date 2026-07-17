package com.group9.campusqa.dto;

/**
 * 文档列表查询 DTO。
 *
 * <p>前端 GET /api/doc/list 的请求参数。
 * 支持按关键词搜索、按状态筛选、分页。</p>
 */
public class DocumentQueryDTO {

    /** 页码（从 1 开始） */
    private long page = 1;

    /** 每页条数 */
    private long size = 10;

    /** 搜索关键词（匹配 title 或 original_name） */
    private String keyword;

    /** 处理状态筛选：PENDING / PROCESSING / COMPLETED / FAILED */
    private String status;

    // ── Getter / Setter ──────────────────────────────────

    public long getPage() { return page; }
    public void setPage(long page) { this.page = page; }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
