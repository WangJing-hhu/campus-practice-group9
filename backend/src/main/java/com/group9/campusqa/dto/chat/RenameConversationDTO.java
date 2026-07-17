package com.group9.campusqa.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 重命名会话请求 DTO。
 */
public class RenameConversationDTO {

    @NotBlank(message = "标题不能为空")
    @Size(max = 200, message = "标题长度不能超过200字符")
    private String title;

    // ── Getter / Setter ──────────────────────────────────

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}
