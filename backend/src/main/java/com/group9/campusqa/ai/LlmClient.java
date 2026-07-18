package com.group9.campusqa.ai;

import com.group9.campusqa.ai.PromptBuilder.PromptMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * LLM 客户端——通过 WebClient 调用 DashScope OpenAI 兼容接口。
 *
 * <p>同时支持同步和流式调用。流式使用 {@link ServerSentEvent} 正式解析
 * SSE 帧，避免 {@code bodyToFlux(String.class)} 丢失 {@code data:} 前缀。</p>
 *
 * <p>DashScope OpenAI 兼容端点：
 * POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions</p>
 */
@Component
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);

    private final WebClient llmWebClient;
    private final String model;
    private final double temperature;
    private final int maxTokens;
    private final Duration timeout;

    /** 拒答固定文本 */
    public static final String NO_DATA_ANSWER = "根据现有资料，暂未找到相关信息";

    public LlmClient(
            @Value("${campus-qa.llm.base-url:https://dashscope.aliyuncs.com/compatible-mode/v1}") String baseUrl,
            @Value("${campus-qa.llm.api-key:}") String apiKey,
            @Value("${campus-qa.llm.model:qwen-plus}") String model,
            @Value("${campus-qa.llm.temperature:0.30}") double temperature,
            @Value("${campus-qa.llm.max-tokens:1024}") int maxTokens,
            @Value("${campus-qa.llm.connect-timeout:10}") int connectTimeout,
            @Value("${campus-qa.llm.response-timeout:60}") int responseTimeout) {

        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        this.timeout = Duration.ofSeconds(responseTimeout);

        this.llmWebClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();

        log.info("LlmClient 初始化: baseUrl={}, model={}, temperature={}, maxTokens={}, timeout={}s",
                baseUrl, model, temperature, maxTokens, responseTimeout);
    }

    // ── 同步调用 ──────────────────────────────────────────

    /**
     * 同步调用 LLM，返回完整回答文本。
     *
     * @param messages Prompt 消息列表
     * @return LLM 返回的文本
     * @throws LlmException 调用失败时抛出
     */
    public String chatSync(List<PromptMessage> messages) {
        log.debug("同步 LLM 调用: model={}, messages={}", model, messages.size());
        Map<String, Object> body = buildRequestBody(messages, false);

        try {
            Map<String, Object> response = llmWebClient.post()
                    .uri("/chat/completions")
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .map(msg -> new LlmException(
                                            "LLM 调用失败 (HTTP " + clientResponse.statusCode().value() + ")", msg)))
                    .bodyToMono(Map.class)
                    .timeout(timeout)
                    .block();

            if (response == null) {
                throw new LlmException("LLM 返回为空", null);
            }

            String answer = extractContent(response);
            log.debug("LLM 同步返回: length={}", answer != null ? answer.length() : 0);
            return answer;

        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            log.error("LLM 调用异常", e);
            String errorMsg = e.getMessage();
            if (errorMsg != null && errorMsg.contains("timeout")) {
                throw new LlmException("大模型调用超时，请稍后重试", null);
            }
            throw new LlmException("大模型服务暂时不可用，请稍后重试", null);
        }
    }

    // ── 流式调用 ──────────────────────────────────────────

    /**
     * 流式调用 LLM 结果。
     *
     * <p>{@code interrupted=true} 表示用户主动中断（应标记 INTERRUPTED），
     * {@code interrupted=false} 表示自然结束（应标记 COMPLETED）。</p>
     */
    public static class StreamResult {
        private final String text;
        private final boolean interrupted;

        public StreamResult(String text, boolean interrupted) {
            this.text = text;
            this.interrupted = interrupted;
        }

        public String getText() { return text; }
        public boolean isInterrupted() { return interrupted; }
    }

    /**
     * 流式调用 LLM，使用 {@link ServerSentEvent} 正式解析 SSE，
     * 每个 token 通过 onToken 回调通知调用方。
     *
     * @param messages    Prompt 消息列表
     * @param onToken     token 回调
     * @param onInterrupt 中断检查（返回 true 时停止读取）
     * @return StreamResult（完整文本 + 是否被中断）
     * @throws LlmException 调用失败时抛出
     */
    public StreamResult chatStream(List<PromptMessage> messages,
                                   Consumer<String> onToken,
                                   java.util.function.BooleanSupplier onInterrupt) {
        log.debug("流式 LLM 调用: model={}, messages={}", model, messages.size());
        Map<String, Object> body = buildRequestBody(messages, true);

        StringBuilder fullAnswer = new StringBuilder();
        AtomicBoolean interrupted = new AtomicBoolean(false);

        try {
            llmWebClient.post()
                    .uri("/chat/completions")
                    .bodyValue(body)
                    .accept(MediaType.TEXT_EVENT_STREAM)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .map(msg -> new LlmException(
                                            "LLM 流式调用失败 (HTTP " + clientResponse.statusCode().value() + ")", msg)))
                    .bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})
                    .timeout(timeout)
                    .takeUntil(event -> {
                        if (onInterrupt != null && onInterrupt.getAsBoolean()) {
                            interrupted.set(true);
                            return true;
                        }
                        return false;
                    })
                    .doOnNext(event -> {
                        String data = event.data();
                        if (data == null || "[DONE]".equals(data.trim())) {
                            return;
                        }
                        String token = extractStreamToken(data);
                        if (token != null && !token.isEmpty()) {
                            fullAnswer.append(token);
                            onToken.accept(token);
                        }
                    })
                    .doOnComplete(() -> log.debug("LLM 流式结束: interrupted={}, totalLength={}",
                            interrupted.get(), fullAnswer.length()))
                    .doOnError(e -> log.error("LLM 流式异常", e))
                    .blockLast();

        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            log.error("LLM 流式调用异常", e);
            String errorMsg = e.getMessage();
            if (errorMsg != null && errorMsg.contains("timeout")) {
                throw new LlmException("大模型调用超时，请稍后重试", null);
            }
            throw new LlmException("大模型服务暂时不可用，请稍后重试", null);
        }

        return new StreamResult(fullAnswer.toString(), interrupted.get());
    }

    // ── 内部方法 ──────────────────────────────────────────

    private Map<String, Object> buildRequestBody(List<PromptMessage> messages, boolean stream) {
        return Map.of(
                "model", model,
                "messages", messages,
                "temperature", temperature,
                "max_tokens", maxTokens,
                "stream", stream
        );
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> response) {
        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                if (message != null) {
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            log.warn("解析 LLM 响应失败", e);
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private String extractStreamToken(String json) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> chunk = mapper.readValue(json, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) chunk.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> delta = (Map<String, Object>) choices.get(0).get("delta");
                if (delta != null) {
                    String content = (String) delta.get("content");
                    if (content != null) {
                        return content;
                    }
                }
            }
        } catch (Exception e) {
            log.trace("解析流式 token 失败: {}", json.substring(0, Math.min(100, json.length())));
        }
        return null;
    }

    // ── 异常类 ──────────────────────────────────────────

    /**
     * LLM 调用异常——仅暴露可读信息给上层。
     */
    public static class LlmException extends RuntimeException {
        private final String detail;

        public LlmException(String message, String detail) {
            super(message);
            this.detail = detail;
        }

        public String getDetail() { return detail; }
    }
}
