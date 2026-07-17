package com.group9.campusqa.dto;

/**
 * 文档更新 DTO。
 *
 * <p>PUT /api/doc/{id} 的请求体。
 * title 可选——不传则保持原标题；
 * file 可选——不传则仅对原有文件重新处理。</p>
 */
public class DocumentUpdateDTO {

    /** 新的展示标题（可选） */
    private String title;

    // ── Getter / Setter ──────────────────────────────────

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}
