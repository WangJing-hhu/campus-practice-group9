package com.group9.campusqa.dto;

import com.group9.campusqa.vo.AiSearchResultVO;
import lombok.Data;

import java.util.List;

@Data
public class AiSearchResponse {

    private List<AiSearchResultVO> results;

    private Integer total;
}