package com.group9.campusqa.controller;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.context.UserContext;
import com.group9.campusqa.dto.chat.ChatRequest;
import com.group9.campusqa.vo.chat.ChatResponse;
import com.group9.campusqa.service.RagService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final RagService ragService;

    public ChatController(RagService ragService) {
        this.ragService = ragService;
    }

    /**
     * 1. 同步问答接口
     */
    @PostMapping
    public Result<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        Long userId = UserContext.get().id();
        ChatResponse response = ragService.chat(request, userId);
        return Result.success(response);
    }

    /**
     * 2. 流式问答接口 (SSE)
     * 规范警告：Content-Type 必须为 text/event-stream;charset=UTF-8，且禁止套 Result 外壳！
     */
    @PostMapping(value = "/stream", produces = "text/event-stream;charset=UTF-8")
    public SseEmitter streamChat(@Valid @RequestBody ChatRequest request) {
        Long userId = UserContext.get().id();
        return ragService.streamChat(request, userId);
    }
}