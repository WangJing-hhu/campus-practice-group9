package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AiProcessResponse {

    @JsonProperty("doc_id")
    private Long docId;

    @JsonProperty("chunk_count")
    private Integer chunkCount;

    @JsonProperty("status")
    private String status;

    // Getter 和 Setter (如果你用了 @Data 注解，这一块可以不写，如果报错请保留)
    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }
    
    public Integer getChunkCount() { return chunkCount; }
    public void setChunkCount(Integer chunkCount) { this.chunkCount = chunkCount; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}