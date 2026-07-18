package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AiSearchRequest {

    private String question;

    @JsonProperty("top_k")
    private Integer topK;

    // 🌟 新增：对应陆奥琪的阈值参数
    @JsonProperty("score_threshold")
    private Double scoreThreshold;

    public String getQuestion() { 
        return question; 
    }
    public void setQuestion(String question) { 
        this.question = question; 
    }

    public Integer getTopK() { 
        return topK; 
    }
    public void setTopK(Integer topK) { 
        this.topK = topK; 
    }

    public Double getScoreThreshold() { 
        return scoreThreshold; 
    }
    public void setScoreThreshold(Double scoreThreshold) { 
        this.scoreThreshold = scoreThreshold; 
    }
}