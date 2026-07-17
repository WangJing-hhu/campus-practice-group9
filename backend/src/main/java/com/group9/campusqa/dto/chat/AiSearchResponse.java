package com.group9.campusqa.dto.chat;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Python AI 检索响应。
 *
 * <p>映射 Python /search 接口的返回体，由杨熙杰的
 * AiSearchClient 使用，字段冻结后不得自行修改。</p>
 */
public class AiSearchResponse {

    private List<SearchResult> results;

    public List<SearchResult> getResults() { return results; }
    public void setResults(List<SearchResult> results) { this.results = results; }

    /**
     * 单条检索结果。
     */
    public static class SearchResult {
        @JsonProperty("doc_id")
        private Long docId;
        private String title;
        @JsonProperty("file_name")
        private String fileName;
        @JsonProperty("chunk_idx")
        private Integer chunkIdx;
        private String content;
        private Double score;

        public Long getDocId() { return docId; }
        public void setDocId(Long docId) { this.docId = docId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }

        public Integer getChunkIdx() { return chunkIdx; }
        public void setChunkIdx(Integer chunkIdx) { this.chunkIdx = chunkIdx; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }

        public Double getScore() { return score; }
        public void setScore(Double score) { this.score = score; }
    }
}
