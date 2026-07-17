package com.group9.campusqa.dto;

import lombok.Data;

@Data
public class DeleteResponse {

    private Long docId;

    private Integer deletedVectors;

    private String status;
}