package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class DeleteResponse {

    @JsonProperty("doc_id")
    private Long docId;

    @JsonProperty("deleted_vectors")
    private Integer deletedVectors;

    @JsonProperty("status")
    private String status;
}