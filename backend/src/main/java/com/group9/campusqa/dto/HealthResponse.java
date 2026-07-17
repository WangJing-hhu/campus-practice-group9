package com.group9.campusqa.dto;

import lombok.Data;

@Data
public class HealthResponse {

    private String status;

    private String model;

    private Integer indexSize;
}