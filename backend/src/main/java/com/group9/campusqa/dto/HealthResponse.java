package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class HealthResponse {

    @JsonProperty("status")
    private String status;

    @JsonProperty("model")
    private String model;

    @JsonProperty("index_size")
    private Integer indexSize;
}