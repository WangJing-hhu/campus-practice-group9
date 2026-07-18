package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class AiSearchResponse {

    private List<SearchResult> results;

    public List<SearchResult> getResults() {
        return results;
    }

    public void setResults(List<SearchResult> results) {
        this.results = results;
    }

    // 内部类：检索结果项
    public static class SearchResult {

        @JsonProperty("doc_id")
        private Long docId;

        @JsonProperty("chunk_idx")
        private Integer chunkIdx;

        private String title;
        private String content;
        private Double score;

        // 🌟 下面全部是对齐陆奥琪 Python 接口的新增元数据字段 🌟

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

        // ------------- Getter 和 Setter -------------

        public Long getDocId() { return docId; }
        public void setDocId(Long docId) { this.docId = docId; }

        public Integer getChunkIdx() { return chunkIdx; }
        public void setChunkIdx(Integer chunkIdx) { this.chunkIdx = chunkIdx; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }

        public Double getScore() { return score; }
        public void setScore(Double score) { this.score = score; }

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
}