package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 官网来源元数据 DTO——由批量导入脚本传给 Java 上传接口。
 *
 * <p>所有字段均为可选：普通 TXT/PDF/DOCX 上传不携带这些字段
 * 时不影响现有流程。仅官网来源文档携带以贯通前端展示。</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OfficialSourceMetadataDTO {

    /** 官网原文链接（http/https） */
    private String sourceUrl;

    /** 来源站点名称，如"河海大学官网" */
    private String sourceSite;

    /** 内容分类，如"学校概况" */
    private String category;

    /** 官网发布日期 */
    private LocalDate publishedAt;

    /** 抓取时间 */
    private LocalDateTime crawledAt;

    /** 时效性：static / annual / historical / dynamic */
    private String freshness;

    /** 审核备注 */
    private String reviewNote;

    // ── Getter / Setter ──────────────────────────────────

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public String getSourceSite() { return sourceSite; }
    public void setSourceSite(String sourceSite) { this.sourceSite = sourceSite; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDate getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDate publishedAt) { this.publishedAt = publishedAt; }

    public LocalDateTime getCrawledAt() { return crawledAt; }
    public void setCrawledAt(LocalDateTime crawledAt) { this.crawledAt = crawledAt; }

    public String getFreshness() { return freshness; }
    public void setFreshness(String freshness) { this.freshness = freshness; }

    public String getReviewNote() { return reviewNote; }
    public void setReviewNote(String reviewNote) { this.reviewNote = reviewNote; }
}
