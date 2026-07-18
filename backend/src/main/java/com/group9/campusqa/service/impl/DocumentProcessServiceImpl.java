package com.group9.campusqa.service.impl;

import com.group9.campusqa.client.AiClient;
import com.group9.campusqa.dto.AiProcessRequest;
import com.group9.campusqa.dto.AiProcessResponse;
import com.group9.campusqa.dto.AiSearchRequest;
import com.group9.campusqa.dto.AiSearchResponse;
import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.mapper.KbDocumentMapper;
import com.group9.campusqa.service.DocumentProcessService;
import com.group9.campusqa.vo.AiSearchResultVO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DocumentProcessServiceImpl implements DocumentProcessService {

    private final KbDocumentMapper mapper;
    private final AiClient aiClient;

    @Value("${campus-qa.ai.callback-url:http://localhost:8081/api/doc/callback}") // 建议提取到配置
    private String callbackUrl;

    public DocumentProcessServiceImpl(KbDocumentMapper mapper, AiClient aiClient){
        this.mapper = mapper;
        this.aiClient = aiClient;
    }

    @Async // 保证异步执行
    @Override
    public void processDocument(Long docId){
        KbDocument doc = mapper.selectById(docId);
        if (doc == null) return;

        // 严格按照文档枚举修改状态
        doc.setStatus("PROCESSING");
        doc.setProcessStage("EXTRACTING"); // 进入提取阶段
        mapper.updateById(doc);

       AiProcessRequest request = new AiProcessRequest();
        request.setDocId(doc.getId());
        request.setPath(doc.getFilePath());
        
        // 🌟 把文件原始名和新增的官网元数据一并传给 Python
        request.setFileName(doc.getOriginalName()); 
        request.setSourceUrl(doc.getSourceUrl());
        request.setSourceSite(doc.getSourceSite());
        request.setCategory(doc.getCategory());
        
        // 注意：将 LocalDate / LocalDateTime 转为 String 传给 Python
        request.setPublishedAt(doc.getPublishedAt() != null ? doc.getPublishedAt().toString() : null);
        request.setCrawledAt(doc.getCrawledAt() != null ? doc.getCrawledAt().toString() : null);

        aiClient.process(request);
        try {
            // 调用 Python (此过程可能较长，Python通过callback通知进度)
            AiProcessResponse response = aiClient.process(request);

            doc.setStatus(response.getStatus());
            doc.setChunkCount(response.getChunkCount());
            doc.setProcessStage("DONE"); // 成功
            mapper.updateById(doc);

        } catch(Exception e){
            // 出现异常，打印堆栈
            // 组长要求：异常均由 Java 将 status 置为 FAILED
            // TODO: 请加上日志打印 e.g., log.error("...", e);
            System.err.println("处理文档异常: " + e.getMessage()); 
            
            doc.setStatus("FAILED");
            // 注意：FAILED 不是 processStage，如果失败，stage可以保留在失败那一刻
            doc.setErrorMessage(e.getMessage());
            mapper.updateById(doc);
        }
    }

    /**
     * 新增：调用 AI 服务进行语义检索
     */
    // 假设你在接口里定义了这个方法
    public List<AiSearchResultVO> semanticSearch(String question, Integer topK) {
        AiSearchRequest request = new AiSearchRequest();
        request.setQuestion(question);
        request.setTopK(topK != null ? topK : 5);
        
        AiSearchResponse response = aiClient.search(request);
        return response.getResults(); 
    }
}