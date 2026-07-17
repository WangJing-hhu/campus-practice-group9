package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AiProcessRequest {

    @JsonProperty("doc_id") // 必须加
    private Long docId;

    @JsonProperty("path")
    private String path;

    @JsonProperty("title")
    private String title;

    @JsonProperty("callback_url") // 必须加
    private String callbackUrl;

    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCallbackUrl() { return callbackUrl; }
    public void setCallbackUrl(String callbackUrl) { this.callbackUrl = callbackUrl; }

    // ... 原有的 docId, path 等字段保留 ...

    @JsonProperty("file_name")
    private String fileName;

    @JsonProperty("source_url")
    private String sourceUrl;

    @JsonProperty("source_site")
    private String sourceSite;

    @JsonProperty("category")
    private String category;

    @JsonProperty("published_at")
    private String publishedAt;

    @JsonProperty("crawled_at")
    private String crawledAt;
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public String getSourceSite() { return sourceSite; }
    public void setSourceSite(String sourceSite) { this.sourceSite = sourceSite; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getPublishedAt() { return publishedAt; }
    public void setPublishedAt(String publishedAt) { this.publishedAt = publishedAt; }
    public String getCrawledAt() { return crawledAt; }
    public void setCrawledAt(String crawledAt) { this.crawledAt = crawledAt; }

}
