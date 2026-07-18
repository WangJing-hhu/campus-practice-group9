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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentProcessServiceImpl implements DocumentProcessService {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessServiceImpl.class);

    private final KbDocumentMapper mapper;
    private final AiClient aiClient;

    @Value("${campus-qa.ai.callback-url:http://localhost:8081/api/doc/callback}") 
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
        
        // 🌟 修复：补齐缺失的标题和回调地址
        request.setTitle(doc.getTitle());
        request.setCallbackUrl(callbackUrl);
        
        // 🌟 把文件原始名和新增的官网元数据一并传给 Python
        request.setFileName(doc.getOriginalName()); 
        request.setSourceUrl(doc.getSourceUrl());
        request.setSourceSite(doc.getSourceSite());
        request.setCategory(doc.getCategory());
        
        // 注意：将 LocalDate / LocalDateTime 转为 String 传给 Python
        request.setPublishedAt(doc.getPublishedAt() != null ? doc.getPublishedAt().toString() : null);
        request.setCrawledAt(doc.getCrawledAt() != null ? doc.getCrawledAt().toString() : null);

        try {
            // 🌟 修复：去掉了外面重复的 aiClient.process(request)，保留 try 块内的正常调用
            AiProcessResponse response = aiClient.process(request);

            if (response != null) {
                doc.setStatus(response.getStatus());
                doc.setChunkCount(response.getChunkCount());
                doc.setProcessStage("DONE"); // 成功
                mapper.updateById(doc);
            }

        } catch(Exception e){
            // 🌟 修复：使用规范的日志打印，替换掉 System.err
            log.error("处理文档异常, docId: {}", docId, e);
            
            doc.setStatus("FAILED");
            // 注意：FAILED 不是 processStage，如果失败，stage可以保留在失败那一刻
            doc.setErrorMessage(e.getMessage());
            mapper.updateById(doc);
        }
    }

    /**
     * 调用 AI 服务进行语义检索
     */
    @Override
    public List<AiSearchResultVO> semanticSearch(String question, Integer topK) {
        AiSearchRequest req = new AiSearchRequest();
        req.setQuestion(question);
        req.setTopK(topK);
        // 设置默认阈值参数（匹配陆奥琪的测试）
        req.setScoreThreshold(0.70); 

        // 1. 获取 Python 端的返回结果
        AiSearchResponse response = aiClient.search(req);
        List<AiSearchResponse.SearchResult> results = response != null ? response.getResults() : null;

        // 2. 手动将 SearchResult 转换为 AiSearchResultVO
        List<AiSearchResultVO> vos = new ArrayList<>();
        if (results != null) {
            for (AiSearchResponse.SearchResult res : results) {
                AiSearchResultVO vo = new AiSearchResultVO();
                // 自动把两个类里同名的字段（比如 docId, content, score, fileName 等）拷贝过去
                org.springframework.beans.BeanUtils.copyProperties(res, vo);
                vos.add(vo);
            }
        }
        return vos;
    }
}