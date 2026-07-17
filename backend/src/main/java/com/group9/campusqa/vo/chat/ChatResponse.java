package com.group9.campusqa.vo.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * 聊天响应 VO——同步 /api/chat 和 SSE meta 事件共用。
 *
 * <p>字段冻结后由杨熙杰的 ChatController 使用。</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatResponse {

    private Long conversationId;
    private Long recordId;
    private String answer;
    private List<SourceVO> sources;

    // ── Getter / Setter ──────────────────────────────────

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long recordId) { this.recordId = recordId; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public List<SourceVO> getSources() { return sources; }
    public void setSources(List<SourceVO> sources) { this.sources = sources; }
}
