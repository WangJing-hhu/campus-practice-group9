package com.group9.campusqa.service;

import com.group9.campusqa.dto.chat.ChatRequest;
import com.group9.campusqa.vo.chat.ChatResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * RAG 核心编排服务
 */
public interface RagService {
    
    /**
     * 同步问答处理
     */
    ChatResponse chat(ChatRequest request, Long userId);

    /**
     * SSE 流式问答处理
     */
    SseEmitter streamChat(ChatRequest request, Long userId);
}