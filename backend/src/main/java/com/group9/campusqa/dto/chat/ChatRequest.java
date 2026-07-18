package com.group9.campusqa.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 聊天请求 DTO。
 *
 * <p>conversationId 为空表示新建会话；非空则继续已有会话。
 * 由杨熙杰的 ChatController 使用，字段冻结后不得自行修改。</p>
 */
public class ChatRequest {

    /** 会话 ID（新建会话时为 null） */
    private Long conversationId;

    /** 用户问题 */
    @NotBlank(message = "问题不能为空")
    @Size(max = 2000, message = "问题长度不能超过2000字符")
    private String question;

    // ── Getter / Setter ──────────────────────────────────

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
}
