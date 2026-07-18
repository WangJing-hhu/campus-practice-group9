package com.group9.campusqa.service.impl;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.group9.campusqa.ai.LlmClient;
import com.group9.campusqa.ai.PromptBuilder;
import com.group9.campusqa.client.AiClient;
import com.group9.campusqa.dto.AiSearchRequest; // 正确的 Request 导包
import com.group9.campusqa.dto.chat.AiSearchResponse; // 正确的 Response 导包 (专供 PromptBuilder)
import com.group9.campusqa.dto.chat.ChatRequest;
import com.group9.campusqa.entity.QaConversation;
import com.group9.campusqa.entity.QaRecord;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.service.ChatHistoryService;
import com.group9.campusqa.service.RagService;
import com.group9.campusqa.vo.chat.ChatResponse;
import com.group9.campusqa.vo.chat.SourceVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class RagServiceImpl implements RagService {

    private static final Logger log = LoggerFactory.getLogger(RagServiceImpl.class);

    private final AiClient aiClient;
    private final ChatHistoryService chatHistoryService;
    private final PromptBuilder promptBuilder;
    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    // 为 SSE 流式输出提供一个线程池
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    public RagServiceImpl(AiClient aiClient,
                          ChatHistoryService chatHistoryService,
                          PromptBuilder promptBuilder,
                          LlmClient llmClient) {
        this.aiClient = aiClient;
        this.chatHistoryService = chatHistoryService;
        this.promptBuilder = promptBuilder;
        this.llmClient = llmClient;
        // 初始化 JSON 映射器，用于解决两人同名类的冲突
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * 第一部分：准备通用数据（创建记录、检索、组装上下文）
     */
    private RagContext prepareContext(ChatRequest request, Long userId) {
        RagContext context = new RagContext();
        context.question = request.getQuestion();

        // 1. 获取或创建会话
       // 在 RagServiceImpl.java 的 prepareContext 方法中
    if (request.getConversationId() != null) {
    QaConversation conversation = chatHistoryService.getById(request.getConversationId());
    // 必须加上这个判断
    if (conversation == null || !conversation.getUserId().equals(userId)) {
        throw new BizException(403, "无权访问此会话");
    }
    context.conversationId = request.getConversationId();
     }else {
    // ✅ 必须补上这一行，否则 context 里没有 ID！
    QaConversation newConversation = chatHistoryService.createConversation(userId);
    context.conversationId = newConversation.getId();
}
        // 2. 初始化一条 PENDING 状态的聊天记录
        QaRecord record = new QaRecord();
        record.setUserId(userId);
        record.setConversationId(context.conversationId);
        record.setQuestion(request.getQuestion());
        record.setStatus("PENDING");
        record.setTopK(5);
        record.setScoreThreshold(0.70);
        record = chatHistoryService.saveRecord(record);
        context.record = record;

        // 3. 调用 Python 检索
        AiSearchRequest searchReq = new AiSearchRequest();
        searchReq.setQuestion(request.getQuestion());
        searchReq.setTopK(5);
        searchReq.setScoreThreshold(0.70);
        try {
            // 🌟 核心修复：AiClient 返回的是 dto 下的类，而 PromptBuilder 需要 dto.chat 下的类
            // 我们通过 ObjectMapper 将其无缝转换为需要的结构，彻底解决类型不兼容
            Object rawRes = aiClient.search(searchReq);
            AiSearchResponse searchRes = objectMapper.convertValue(rawRes, AiSearchResponse.class);
            context.searchResults = searchRes != null ? searchRes.getResults() : new ArrayList<>();
        } catch (Exception e) {
            log.error("调用 Python 检索失败", e);
            record.setStatus("FAILED");
            record.setErrorMessage("检索服务不可用");
            chatHistoryService.updateRecord(record);
            throw new BizException(500, "检索服务不可用，请稍后再试");
        }

        // 4. 将检索结果转换为 SourceVO 存入 Context
        context.sourceVOs = convertToSourceVOs(context.searchResults);

        // 5. 获取最近 3 轮历史
       context.recentHistory = chatHistoryService.getRecentHistory(userId, context.conversationId, 3);


        return context;
    }

    /**
     * 第二部分：实现同步问答
     */
    @Override
    public ChatResponse chat(ChatRequest request, Long userId) {
        long startTime = System.currentTimeMillis();
        RagContext context = prepareContext(request, userId);

        String answer;
        if (!promptBuilder.hasValidSources(context.searchResults)) {
            answer = LlmClient.NO_DATA_ANSWER;
        } else {
            List<PromptBuilder.PromptMessage> messages = promptBuilder.build(context.searchResults, context.recentHistory, context.question);
            try {
                answer = llmClient.chatSync(messages);
            } catch (LlmClient.LlmException e) {
                context.record.setStatus("FAILED");
                context.record.setErrorMessage(e.getMessage());
                chatHistoryService.saveRecord(context.record);
                throw new BizException(500, e.getMessage());
            }
        }

        // 🌟 核心修复：明确转换为 int，解决 long 无法转换为 java.lang.Integer
        int latency = (int) (System.currentTimeMillis() - startTime);
        context.record.setAnswer(answer);
        context.record.setStatus("COMPLETED");
        context.record.setLatencyMs(latency);
        chatHistoryService.updateRecord(context.record);

        ChatResponse response = new ChatResponse();
        response.setConversationId(context.conversationId);
        response.setRecordId(context.record.getId());
        response.setAnswer(answer);
        response.setSources(context.sourceVOs);

        return response;
    }

    /**
     * 第三部分：实现 SSE 流式问答
     */
    @Override
    public SseEmitter streamChat(ChatRequest request, Long userId) {
        SseEmitter emitter = new SseEmitter(120000L);
        long startTime = System.currentTimeMillis();

        executorService.execute(() -> {
            RagContext context = null;
            try {
                context = prepareContext(request, userId);

                Map<String, Object> metaData = Map.of(
                        "conversationId", context.conversationId,
                        "recordId", context.record.getId(),
                        "sources", context.sourceVOs
                );
                emitter.send(SseEmitter.event().name("meta").data(metaData));

                if (!promptBuilder.hasValidSources(context.searchResults)) {
                    emitter.send(SseEmitter.event().name("token").data(Map.of("text", LlmClient.NO_DATA_ANSWER)));
                    emitter.send(SseEmitter.event().name("done").data(Map.of("recordId", context.record.getId())));
                    
                    context.record.setAnswer(LlmClient.NO_DATA_ANSWER);
                    context.record.setStatus("COMPLETED");
                    context.record.setLatencyMs((int) (System.currentTimeMillis() - startTime));
                    chatHistoryService.updateRecord(context.record);
                    emitter.complete();
                    return;
                }

                List<PromptBuilder.PromptMessage> messages = promptBuilder.build(context.searchResults, context.recentHistory, context.question);
                
                // 🌟 核心修复：找回不小心被删掉的 streamResult 变量
                LlmClient.StreamResult streamResult = llmClient.chatStream(
                        messages,
                        token -> {
                            try {
                                emitter.send(SseEmitter.event().name("token").data(Map.of("text", token)));
                            } catch (IOException e) {
                                throw new RuntimeException("客户端已断开连接", e);
                            }
                        },
                        () -> false 
                );

                emitter.send(SseEmitter.event().name("done").data(Map.of("recordId", context.record.getId())));

                context.record.setAnswer(streamResult.getText());
                context.record.setStatus(streamResult.isInterrupted() ? "INTERRUPTED" : "COMPLETED");
                context.record.setLatencyMs((int) (System.currentTimeMillis() - startTime));
                chatHistoryService.updateRecord(context.record);
                
                emitter.complete();

            } catch (Exception e) {
                log.error("流式回答异常", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data(Map.of("message", e.getMessage() != null ? e.getMessage() : "流式生成发生错误")));
                } catch (IOException ioException) {
                    log.error("发送 error 事件失败", ioException);
                }
                
                if (context != null && context.record != null) {
                    context.record.setStatus("FAILED");
                    context.record.setErrorMessage(e.getMessage());
                    chatHistoryService.saveRecord(context.record);
                }
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private List<SourceVO> convertToSourceVOs(List<AiSearchResponse.SearchResult> results) {
        List<SourceVO> vos = new ArrayList<>();
        if (results == null) return vos;
        
        for (int i = 0; i < results.size(); i++) {
            AiSearchResponse.SearchResult res = results.get(i);
            SourceVO vo = new SourceVO();
            vo.setIndex(i + 1); 
            vo.setDocId(res.getDocId());
            vo.setTitle(res.getTitle());
            vo.setFileName(res.getFileName());
            vo.setScore(res.getScore());
            vo.setContent(res.getContent());
            
            vo.setSourceUrl(res.getSourceUrl());
            vo.setSourceSite(res.getSourceSite());
            vo.setCategory(res.getCategory());
            vo.setPublishedAt(res.getPublishedAt() != null ? res.getPublishedAt().toString() : null);
            vo.setCrawledAt(res.getCrawledAt() != null ? res.getCrawledAt().toString() : null);
            
            vos.add(vo);
        }
        return vos;
    }

    private static class RagContext {
        Long conversationId;
        String question;
        QaRecord record;
        List<AiSearchResponse.SearchResult> searchResults;
        List<SourceVO> sourceVOs;
        List<QaRecord> recentHistory;
    }
}