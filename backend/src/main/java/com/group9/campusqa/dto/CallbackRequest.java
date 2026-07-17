package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CallbackRequest {

    @JsonProperty("doc_id")
    private Long docId;

    @JsonProperty("status")
    private String status;

    @JsonProperty("chunk_count")
    private Integer chunkCount;

    @JsonProperty("error_message")
    private String errorMessage;

    @JsonProperty("stage")
    private String stage;

    // 手动补充 Getter，防止 Lombok 不生效导致找不到符号
    public Long getDocId() { return docId; }
    public String getStatus() { return status; }
    public Integer getChunkCount() { return chunkCount; }
    public String getErrorMessage() { return errorMessage; }
    public String getStage() { return stage; }
    
    // 顺手补上 Setter
    public void setDocId(Long docId) { this.docId = docId; }
    public void setStatus(String status) { this.status = status; }
    public void setChunkCount(Integer chunkCount) { this.chunkCount = chunkCount; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public void setStage(String stage) { this.stage = stage; }
}