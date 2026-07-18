package com.group9.campusqa.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.group9.campusqa.common.Result;
import com.group9.campusqa.context.UserContext;
import com.group9.campusqa.dto.chat.ConversationQueryDTO;
import com.group9.campusqa.dto.chat.RenameConversationDTO;
import com.group9.campusqa.entity.QaConversation;
import com.group9.campusqa.service.ChatHistoryService;
import com.group9.campusqa.vo.chat.ConversationDetailVO;
import com.group9.campusqa.vo.chat.ConversationVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 聊天历史接口控制器。
 *
 * <p>所有接口需要 JWT 认证，用户只能操作自己的会话和记录。
 * 接口路径与第 3.5 节约定完全一致。</p>
 */
@RestController
@RequestMapping("/api/chat")
public class ChatHistoryController {

    private final ChatHistoryService chatHistoryService;

    public ChatHistoryController(ChatHistoryService chatHistoryService) {
        this.chatHistoryService = chatHistoryService;
    }

    /**
     * 获取当前用户的会话分页列表。
     * GET /api/chat/conversations?page=1&size=20&keyword=
     */
    @GetMapping("/conversations")
    public Result<IPage<ConversationVO>> listConversations(@ModelAttribute ConversationQueryDTO query) {
        Long userId = currentUserId();
        return Result.success(chatHistoryService.pageConversations(userId, query));
    }

    /**
     * 获取会话详情及完整问答记录。
     * GET /api/chat/conversations/{id}
     */
    @GetMapping("/conversations/{id}")
    public Result<ConversationDetailVO> getConversation(@PathVariable Long id) {
        Long userId = currentUserId();
        return Result.success(chatHistoryService.getConversationDetail(userId, id));
    }

    /**
     * 修改会话标题。
     * PUT /api/chat/conversations/{id}/title
     */
    @PutMapping("/conversations/{id}/title")
    public Result<Void> renameConversation(@PathVariable Long id,
                                           @Valid @RequestBody RenameConversationDTO dto) {
        Long userId = currentUserId();
        chatHistoryService.renameConversation(userId, id, dto);
        return Result.success(null);
    }

    /**
     * 删除整个会话及记录。
     * DELETE /api/chat/conversations/{id}
     */
    @DeleteMapping("/conversations/{id}")
    public Result<Void> deleteConversation(@PathVariable Long id) {
        Long userId = currentUserId();
        chatHistoryService.deleteConversation(userId, id);
        return Result.success(null);
    }

    /**
     * 删除单条问答记录。
     * DELETE /api/chat/records/{id}
     */
    @DeleteMapping("/records/{id}")
    public Result<Void> deleteRecord(@PathVariable Long id) {
        Long userId = currentUserId();
        chatHistoryService.deleteRecord(userId, id);
        return Result.success(null);
    }

    /**
     * 从 JWT 上下文中获取当前用户 ID。
     */
    private Long currentUserId() {
        UserContext.CurrentUser current = UserContext.get();
        if (current == null) {
            throw new com.group9.campusqa.exception.BizException(
                    com.group9.campusqa.common.ResultCode.UNAUTHORIZED, "请先登录");
        }
        return current.id();
    }
}
