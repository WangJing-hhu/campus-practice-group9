package com.group9.campusqa.client;

import com.group9.campusqa.dto.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class AiClient {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String AI_URL = "http://localhost:8000";


    /**
     * 文档处理
     */
    public AiProcessResponse process(AiProcessRequest request) {

        return restTemplate.postForObject(
                AI_URL + "/process",
                request,
                AiProcessResponse.class
        );
    }


    /**
     * 检索
     */
    public AiSearchResponse search(AiSearchRequest request){

        return restTemplate.postForObject(
                AI_URL + "/search",
                request,
                AiSearchResponse.class
        );
    }


    /**
     * 删除向量
     */
    public DeleteResponse delete(Long docId){

        return restTemplate.exchange(
                AI_URL + "/document/" + docId,
                org.springframework.http.HttpMethod.DELETE,
                null,
                DeleteResponse.class
        ).getBody();
    }


    /**
     * 健康检查
     */
    public HealthResponse health(){

        return restTemplate.getForObject(
                AI_URL + "/health",
                HealthResponse.class
        );
    }

}