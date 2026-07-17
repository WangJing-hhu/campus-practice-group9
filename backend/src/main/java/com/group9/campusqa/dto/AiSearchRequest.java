package com.group9.campusqa.dto;


import com.fasterxml.jackson.annotation.JsonProperty;


public class AiSearchRequest {


    private String question;


    @JsonProperty("top_k")
    private Integer topK = 5;



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

}