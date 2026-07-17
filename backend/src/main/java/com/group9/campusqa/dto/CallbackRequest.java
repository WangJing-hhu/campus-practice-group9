package com.group9.campusqa.dto;

import lombok.Data;

@Data
public class CallbackRequest {

    private Long docId;

    private String stage;

    private String status;

    private String errorMessage;

    private Integer chunkCount;
}