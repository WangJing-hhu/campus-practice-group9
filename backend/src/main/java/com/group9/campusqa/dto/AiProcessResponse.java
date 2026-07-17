package com.group9.campusqa.dto;


public class AiProcessResponse {


    private Long docId;


    private Integer chunkCount;


    private String status;



    public Long getDocId() {
        return docId;
    }


    public void setDocId(Long docId) {
        this.docId = docId;
    }



    public Integer getChunkCount() {
        return chunkCount;
    }


    public void setChunkCount(Integer chunkCount) {
        this.chunkCount = chunkCount;
    }



    public String getStatus() {
        return status;
    }


    public void setStatus(String status) {
        this.status = status;
    }

}