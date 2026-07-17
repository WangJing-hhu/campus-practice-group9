package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.group9.campusqa.vo.AiSearchResultVO;
import lombok.Data;

import java.util.List;

@Data
public class AiSearchResponse {

    @JsonProperty("results")
    private List<AiSearchResultVO> results;

    @JsonProperty("total")
    private Integer total;

    
    public List<AiSearchResultVO> getResults() {
        return results;
    }
}