package com.group9.campusqa.dto;


public class AiProcessRequest {

    private Long docId;

    private String path;

    private String title;

    private String callbackUrl;


    public Long getDocId() {
        return docId;
    }

    public void setDocId(Long docId) {
        this.docId = docId;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCallbackUrl() {
        return callbackUrl;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }
    


}

