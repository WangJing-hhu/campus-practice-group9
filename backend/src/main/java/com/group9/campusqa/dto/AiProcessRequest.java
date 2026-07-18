package com.group9.campusqa.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AiProcessRequest {

    @JsonProperty("doc_id") // 必须加
    private Long docId;

    @JsonProperty("path")
    private String path;

    @JsonProperty("title")
    private String title;

    @JsonProperty("callback_url") // 必须加
    private String callbackUrl;

    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCallbackUrl() { return callbackUrl; }
    public void setCallbackUrl(String callbackUrl) { this.callbackUrl = callbackUrl; }
}
