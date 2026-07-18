package com.group9.campusqa.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.group9.campusqa.dto.chat.ConversationQueryDTO;
import com.group9.campusqa.dto.chat.RenameConversationDTO;
import com.group9.campusqa.entity.QaConversation;
import com.group9.campusqa.entity.QaRecord;
import com.group9.campusqa.vo.chat.ConversationDetailVO;
import com.group9.campusqa.vo.chat.ConversationVO;

import java.util.List;

/**
 * 聊天历史服务接口。
 *
 * <p>管理 qa_conversation 和 qa_record 的完整生命周期，
 * 所有方法均需传入 userId 进行权限校验。</p>
 */
public interface ChatHistoryService extends IService<QaConversation> {

    /**
     * 创建新会话。
     *
     * @param userId 当前用户 ID
     * @return 新创建的会话
     */
    QaConversation createConversation(Long userId);

    /**
     * 分页查询当前用户的会话列表。
     *
     * @param userId 当前用户 ID
     * @param query  分页与搜索条件
     * @return 分页结果
     */
    IPage<ConversationVO> pageConversations(Long userId, ConversationQueryDTO query);

    /**
     * 获取会话详情（含完整问答记录）。
     *
     * @param userId         当前用户 ID
     * @param conversationId 会话 ID
     * @return 会话详情
     */
    ConversationDetailVO getConversationDetail(Long userId, Long conversationId);

    /**
     * 重命名会话。
     *
     * @param userId         当前用户 ID
     * @param conversationId 会话 ID
     * @param dto            新标题
     */
    void renameConversation(Long userId, Long conversationId, RenameConversationDTO dto);

    /**
     * 逻辑删除会话及其下所有记录。
     *
     * @param userId         当前用户 ID
     * @param conversationId 会话 ID
     */
    void deleteConversation(Long userId, Long conversationId);

    /**
     * 删除单条问答记录。
     *
     * @param userId   当前用户 ID
     * @param recordId 记录 ID
     */
    void deleteRecord(Long userId, Long recordId);

    /**
     * 获取指定会话最近 N 轮 USER/ASSISTANT 对话历史。
     * 按时间升序排列，供 RagService 构建 Prompt。
     *
     * @param userId         当前用户 ID
     * @param conversationId 会话 ID
     * @param limit          轮数上限（默认 3）
     * @return 最近的问答记录列表（COMPLETED 状态），按 createTime 升序
     */
    List<QaRecord> getRecentHistory(Long userId, Long conversationId, int limit);

    /**
     * 保存问答记录。
     *
     * @param record 问答记录实体
     * @return 保存后的记录
     */
    QaRecord saveRecord(QaRecord record);

    /**
     * 根据 ID 获取问答记录（含权限校验）。
     *
     * @param userId   当前用户 ID
     * @param recordId 记录 ID
     * @return 记录实体
     */
    QaRecord getRecordById(Long userId, Long recordId);

    /**
     * 根据首问自动生成会话标题。
     *
     * @param question 首问内容
     * @return 截断后的标题
     */
    String generateTitle(String question);
    /**
     * 更新问答记录。
     * 专门用于更新状态 (COMPLETED/FAILED) 或 答案内容。
     *
     * @param record 需要更新的记录（必须包含 ID）
     */
    void updateRecord(QaRecord record); // <--- 加这一行
}
