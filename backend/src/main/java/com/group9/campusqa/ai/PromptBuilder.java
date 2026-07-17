package com.group9.campusqa.ai;

import com.group9.campusqa.dto.chat.AiSearchResponse.SearchResult;
import com.group9.campusqa.entity.QaRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Prompt 构建器——负责拼接系统角色、参考资料、历史对话和当前问题。
 *
 * <p>由王雨淇统一维护。杨熙杰的 RagService 调用 {@link #build(List, List, String)}
 * 获取消息列表，再传给 {@link LlmClient}。</p>
 *
 * <p>设计原则（见 PDF §7.4）：
 * <ul>
 *   <li>System：你是河海大学校园问答助手，只能根据提供的参考资料回答。</li>
 *   <li>资料不足时固定拒答，不得编造。</li>
 *   <li>Context 按 [1][2] 编号，控制在约 6000 tokens。</li>
 *   <li>History 只加入最近 3 轮，明确区分用户与助手。</li>
 *   <li>有来源时回答正文使用 [1][2] 引用。</li>
 * </ul></p>
 */
@Component
public class PromptBuilder {

    private static final Logger log = LoggerFactory.getLogger(PromptBuilder.class);

    /** 上下文 token 上限（约 6000 tokens，中文约 1.5 字/token） */
    private static final int MAX_CONTEXT_CHARS = 9000;

    /** 无资料时的固定回答 */
    public static final String NO_DATA_ANSWER = "根据现有资料，暂未找到相关信息";

    private final String systemPrompt;
    private final String noSourcesInstruction;

    public PromptBuilder(
            @Value("${campus-qa.prompt.system:你是河海大学校园问答助手，只能根据提供的参考资料回答。"
                    + "请严格依据参考资料中的信息作答，不得补充任何未在资料中出现的事实、数据或推测。}") String systemPrompt,
            @Value("${campus-qa.prompt.no-sources-instruction:当前没有可用的参考资料，"
                    + "请直接回复\"根据现有资料，暂未找到相关信息\"，不要做任何额外解释。}") String noSourcesInstruction) {
        this.systemPrompt = systemPrompt;
        this.noSourcesInstruction = noSourcesInstruction;
    }

    /**
     * 构建完整的消息列表，供 LLM 调用。
     *
     * @param searchResults  检索来源（已去重、降序、过滤）
     * @param recentHistory  最近 N 轮历史（COMPLETED 状态，按时间升序）
     * @param currentQuestion 当前用户问题
     * @return 消息列表（system + context user + history + question user）
     */
    public List<PromptMessage> build(List<SearchResult> searchResults,
                                     List<QaRecord> recentHistory,
                                     String currentQuestion) {
        List<PromptMessage> messages = new ArrayList<>();

        // 1. System
        messages.add(new PromptMessage("system", systemPrompt));

        // 2. Context（参考资料）
        if (searchResults != null && !searchResults.isEmpty()) {
            String context = buildContext(searchResults);
            String contextInstruction = "以下是参考资料，请严格依据资料内容回答用户问题。"
                    + "回答中引用资料时请使用 [1][2] 等编号标注来源。";
            messages.add(new PromptMessage("user", contextInstruction + "\n\n" + context));
        } else {
            // 无资料时追加拒答指令
            messages.add(new PromptMessage("user", noSourcesInstruction));
        }

        // 3. History（最近 N 轮）
        if (recentHistory != null && !recentHistory.isEmpty()) {
            for (QaRecord record : recentHistory) {
                // 用户问题
                messages.add(new PromptMessage("user", record.getQuestion()));
                // 助手回答
                if (record.getAnswer() != null) {
                    messages.add(new PromptMessage("assistant", record.getAnswer()));
                }
            }
        }

        // 4. Current question
        messages.add(new PromptMessage("user", currentQuestion));

        log.debug("Prompt 构建完成: sources={}, history={}, totalMessages={}",
                searchResults != null ? searchResults.size() : 0,
                recentHistory != null ? recentHistory.size() : 0,
                messages.size());
        return messages;
    }

    /**
     * 构建参考资料上下文。
     *
     * <p>按 [1][2] 编号，每条包含标题、文件名和正文；
     * 控制总长在 MAX_CONTEXT_CHARS 以内，超长时从低分片截断。</p>
     */
    String buildContext(List<SearchResult> results) {
        StringBuilder sb = new StringBuilder();
        int totalChars = 0;

        for (int i = 0; i < results.size(); i++) {
            SearchResult result = results.get(i);
            int index = i + 1;

            String header = "\n[" + index + "] 《" + safeStr(result.getTitle()) + "》"
                    + " (" + safeStr(result.getFileName()) + ")"
                    + " 相似度:" + String.format("%.2f", result.getScore()) + "\n";
            String body = safeStr(result.getContent()) + "\n";

            int entrySize = header.length() + body.length();

            // 超长截断
            if (totalChars + entrySize > MAX_CONTEXT_CHARS) {
                int remaining = MAX_CONTEXT_CHARS - totalChars;
                if (remaining > header.length() + 50) {
                    // 当前条目部分截断
                    sb.append(header);
                    sb.append(body, 0, remaining - header.length());
                    sb.append("...[截断]");
                    log.debug("上下文达到 {} chars，截断于第 {} 条", MAX_CONTEXT_CHARS, index);
                }
                break;
            }

            sb.append(header);
            sb.append(body);
            totalChars += entrySize;
        }

        return sb.toString();
    }

    private String safeStr(String s) {
        return s == null ? "" : s.trim();
    }

    /**
     * 判断是否有有效来源。
     */
    public boolean hasSources(List<SearchResult> results) {
        return results != null && !results.isEmpty();
    }

    // ── 内部类 ──────────────────────────────────────────

    /**
     * 单条 Prompt 消息，与 OpenAI Chat Completions 格式对齐。
     */
    public static class PromptMessage {
        private String role;
        private String content;

        public PromptMessage() {}

        public PromptMessage(String role, String content) {
            this.role = role;
            this.content = content;
        }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}
