package com.group9.campusqa.client;

import com.group9.campusqa.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class AiClient {

    private final RestTemplate restTemplate;

    @Value("${campus-qa.ai.base-url}")
    private String aiBaseUrl;

    @Value("${campus-qa.ai.callback-token}")
    private String internalToken;

    // 🌟 修复 8：增加连接和响应超时
    public AiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000); // 15秒连接超时
        factory.setReadTimeout(60000);    // 60秒响应超时
        this.restTemplate = new RestTemplate(factory);
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 🌟 修复 1：改为 X-Internal-Token
        headers.set("X-Internal-Token", internalToken);
        return headers;
    }

    public AiProcessResponse process(AiProcessRequest request) {
        HttpEntity<AiProcessRequest> entity = new HttpEntity<>(request, headers());
        return restTemplate.postForObject(aiBaseUrl + "/process", entity, AiProcessResponse.class);
    }

    public AiSearchResponse search(AiSearchRequest request) {
        HttpEntity<AiSearchRequest> entity = new HttpEntity<>(request, headers());
        return restTemplate.postForObject(aiBaseUrl + "/search", entity, AiSearchResponse.class);
    }

    public DeleteResponse delete(Long docId) {
        HttpEntity<Void> entity = new HttpEntity<>(headers());
        return restTemplate.exchange(
                aiBaseUrl + "/document/" + docId,
                HttpMethod.DELETE,
                entity,
                DeleteResponse.class
        ).getBody();
    }
}