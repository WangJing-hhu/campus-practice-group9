package com.group9.campusqa.dto;


public class AiSearchRequest {

    private String question;

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