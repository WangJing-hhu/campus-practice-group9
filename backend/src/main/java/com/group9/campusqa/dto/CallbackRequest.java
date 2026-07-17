package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CallbackRequest {

    @JsonProperty("doc_id")
    private Long docId;

    @JsonProperty("stage")
    private String stage;

    @JsonProperty("status")
    private String status;

    @JsonProperty("error_message")
    private String errorMessage;

    @JsonProperty("chunk_count")
    private Integer chunkCount;
}