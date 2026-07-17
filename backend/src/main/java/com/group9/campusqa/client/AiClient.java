package com.group9.campusqa.client;

import com.group9.campusqa.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class AiClient {

    private final RestTemplate restTemplate = new RestTemplate();

    // 修改：对齐配置文件路径
    @Value("${campus-qa.ai.base-url}")
    private String aiBaseUrl;

    // 修改：对齐配置文件路径
    @Value("${campus-qa.ai.callback-token}")
    private String internalToken;

    private HttpHeaders headers(){
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 修改：使用 Bearer 传递 Token 以防 Python FastAPI 配置了 OAuth2PasswordBearer
        headers.set("Authorization", "Bearer " + internalToken);
        return headers;
    }

    /**
     * 文档处理
     */
    public AiProcessResponse process(AiProcessRequest request){
        HttpEntity<AiProcessRequest> entity = new HttpEntity<>(request, headers());
        return restTemplate.postForObject(aiBaseUrl + "/process", entity, AiProcessResponse.class);
    }

    /**
     * 检索
     */
    public AiSearchResponse search(AiSearchRequest request){
        HttpEntity<AiSearchRequest> entity = new HttpEntity<>(request, headers());
        return restTemplate.postForObject(aiBaseUrl + "/search", entity, AiSearchResponse.class);
    }

    /**
     * 删除向量
     */
    public DeleteResponse delete(Long docId){
        HttpEntity<Void> entity = new HttpEntity<>(headers());
        return restTemplate.exchange(
                aiBaseUrl + "/document/" + docId,
                HttpMethod.DELETE,
                entity,
                DeleteResponse.class
        ).getBody();
    }

    /**
     * 健康检查
     */
    public HealthResponse health(){
        return restTemplate.getForObject(aiBaseUrl + "/health", HealthResponse.class);
    }
}