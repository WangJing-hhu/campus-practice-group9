package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AiSearchRequest {

    @JsonProperty("question")
    private String question;

    @JsonProperty("top_k") // 必须加
    private Integer topK = 5;
    // 🌟 新增：对齐 Python 的 /search 接口
    @JsonProperty("score_threshold")
    private Double scoreThreshold = 0.70;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public Integer getTopK() { return topK; }
    public void setTopK(Integer topK) { this.topK = topK; }
    public Double getScoreThreshold() { return scoreThreshold; }
    public void setScoreThreshold(Double scoreThreshold) { this.scoreThreshold = scoreThreshold;}
}