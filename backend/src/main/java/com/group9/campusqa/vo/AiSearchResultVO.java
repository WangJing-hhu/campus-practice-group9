package com.group9.campusqa.vo;

import lombok.Data;

@Data
public class AiSearchResultVO {

    private String content;

    private Long docId;

    private Integer chunkIdx;

    private String title;

    private Double score;
}