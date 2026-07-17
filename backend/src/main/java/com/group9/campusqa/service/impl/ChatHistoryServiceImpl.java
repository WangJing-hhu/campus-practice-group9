package com.group9.campusqa.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.dto.chat.ConversationQueryDTO;
import com.group9.campusqa.dto.chat.RenameConversationDTO;
import com.group9.campusqa.entity.QaConversation;
import com.group9.campusqa.entity.QaRecord;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.mapper.QaConversationMapper;
import com.group9.campusqa.mapper.QaRecordMapper;
import com.group9.campusqa.service.ChatHistoryService;
import com.group9.campusqa.vo.chat.ConversationDetailVO;
import com.group9.campusqa.vo.chat.ConversationVO;
import com.group9.campusqa.vo.chat.RecordVO;
import com.group9.campusqa.vo.chat.SourceVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 聊天历史服务实现。
 *
 * <p>所有公开方法均校验 userId，禁止跨用户访问。
 * source_docs 使用 Jackson 序列化/反序列化 JSON。</p>
 */
@Service
public class ChatHistoryServiceImpl
        extends ServiceImpl<QaConversationMapper, QaConversation>
        implements ChatHistoryService {

    private static final Logger log = LoggerFactory.getLogger(ChatHistoryServiceImpl.class);
    private static final int MAX_TITLE_LENGTH = 50;

    private final QaRecordMapper recordMapper;
    private final ObjectMapper objectMapper;

    public ChatHistoryServiceImpl(QaRecordMapper recordMapper, ObjectMapper objectMapper) {
        this.recordMapper = recordMapper;
        this.objectMapper = objectMapper;
    }

    // ── 会话 CRUD ────────────────────────────────────────

    @Override
    @Transactional
    public QaConversation createConversation(Long userId) {
        QaConversation conv = new QaConversation();
        conv.setUserId(userId);
        conv.setTitle("新会话");
        conv.setDeleted(0);
        save(conv);
        log.debug("创建会话: id={}, userId={}", conv.getId(), userId);
        return conv;
    }

    @Override
    public IPage<ConversationVO> pageConversations(Long userId, ConversationQueryDTO query) {
        long size = Math.max(1, Math.min(query.getSize(), 50));
        long pageNum = Math.max(1, query.getPage());

        LambdaQueryWrapper<QaConversation> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(QaConversation::getUserId, userId);
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(QaConversation::getTitle, query.getKeyword());
        }
        wrapper.orderByDesc(QaConversation::getUpdateTime);

        IPage<QaConversation> source = page(
                new Page<>(pageNum, size), wrapper);

        return source.convert(this::toConversationVO);
    }

    @Override
    public ConversationDetailVO getConversationDetail(Long userId, Long conversationId) {
        QaConversation conv = requireConversation(userId, conversationId);

        // 查询该会话下的所有记录
        LambdaQueryWrapper<QaRecord> recordWrapper = new LambdaQueryWrapper<>();
        recordWrapper.eq(QaRecord::getConversationId, conversationId);
        recordWrapper.eq(QaRecord::getUserId, userId);
        recordWrapper.orderByAsc(QaRecord::getCreateTime);
        List<QaRecord> records = recordMapper.selectList(recordWrapper);

        List<RecordVO> recordVOs = records.stream()
                .map(this::toRecordVO)
                .collect(Collectors.toList());

        ConversationDetailVO detail = new ConversationDetailVO();
        detail.setId(conv.getId());
        detail.setTitle(conv.getTitle());
        detail.setCreateTime(conv.getCreateTime());
        detail.setUpdateTime(conv.getUpdateTime());
        detail.setRecords(recordVOs);
        return detail;
    }

    @Override
    @Transactional
    public void renameConversation(Long userId, Long conversationId, RenameConversationDTO dto) {
        QaConversation conv = requireConversation(userId, conversationId);
        String title = dto.getTitle().trim();
        if (title.length() > 200) {
            title = title.substring(0, 200);
        }
        conv.setTitle(title);
        updateById(conv);
        log.debug("重命名会话: id={}, title={}", conversationId, title);
    }

    @Override
    @Transactional
    public void deleteConversation(Long userId, Long conversationId) {
        requireConversation(userId, conversationId);

        // 软删除所有关联记录
        LambdaQueryWrapper<QaRecord> recordWrapper = new LambdaQueryWrapper<>();
        recordWrapper.eq(QaRecord::getConversationId, conversationId);
        recordWrapper.eq(QaRecord::getUserId, userId);
        List<QaRecord> records = recordMapper.selectList(recordWrapper);
        for (QaRecord record : records) {
            recordMapper.deleteById(record.getId());
        }

        // 软删除会话
        removeById(conversationId);
        log.debug("删除会话: id={}, userId={}, 关联记录数={}", conversationId, userId, records.size());
    }

    @Override
    @Transactional
    public void deleteRecord(Long userId, Long recordId) {
        QaRecord record = getRecordById(userId, recordId);
        recordMapper.deleteById(record.getId());
        log.debug("删除记录: id={}, userId={}", recordId, userId);
    }

    // ── 历史与记录 ──────────────────────────────────────────

    @Override
    public List<QaRecord> getRecentHistory(Long userId, Long conversationId, int limit) {
        LambdaQueryWrapper<QaRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(QaRecord::getConversationId, conversationId);
        wrapper.eq(QaRecord::getUserId, userId);
        wrapper.eq(QaRecord::getStatus, "COMPLETED");
        wrapper.orderByDesc(QaRecord::getCreateTime);
        wrapper.last("LIMIT " + (limit * 2)); // 每轮一问一答，取 limit*2 条

        List<QaRecord> records = recordMapper.selectList(wrapper);
        // 按时间升序排列（最早在前）
        Collections.reverse(records);
        return records;
    }

    @Override
    @Transactional
    public QaRecord saveRecord(QaRecord record) {
        recordMapper.insert(record);
        log.debug("保存记录: id={}, conversationId={}, status={}",
                record.getId(), record.getConversationId(), record.getStatus());
        return record;
    }

    @Override
    public QaRecord getRecordById(Long userId, Long recordId) {
        QaRecord record = recordMapper.selectById(recordId);
        if (record == null) {
            throw new BizException(ResultCode.NOT_FOUND, "问答记录不存在");
        }
        if (!record.getUserId().equals(userId)) {
            throw new BizException(ResultCode.FORBIDDEN, "无权访问该记录");
        }
        return record;
    }

    // ── 工具方法 ──────────────────────────────────────────

    @Override
    public String generateTitle(String question) {
        if (!StringUtils.hasText(question)) {
            return "新会话";
        }
        String cleaned = question.trim()
                .replaceAll("\\s+", " ");
        if (cleaned.length() <= MAX_TITLE_LENGTH) {
            return cleaned;
        }
        return cleaned.substring(0, MAX_TITLE_LENGTH) + "...";
    }

    /**
     * 校验会话存在且属于当前用户，否则抛出异常。
     */
    private QaConversation requireConversation(Long userId, Long conversationId) {
        QaConversation conv = getById(conversationId);
        if (conv == null) {
            throw new BizException(ResultCode.NOT_FOUND, "会话不存在");
        }
        if (!conv.getUserId().equals(userId)) {
            throw new BizException(ResultCode.FORBIDDEN, "无权访问该会话");
        }
        return conv;
    }

    // ── VO 转换 ──────────────────────────────────────────

    private ConversationVO toConversationVO(QaConversation conv) {
        ConversationVO vo = new ConversationVO();
        vo.setId(conv.getId());
        vo.setTitle(conv.getTitle());
        vo.setCreateTime(conv.getCreateTime());
        vo.setUpdateTime(conv.getUpdateTime());

        // 获取最近一条记录的时间
        LambdaQueryWrapper<QaRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(QaRecord::getConversationId, conv.getId());
        wrapper.orderByDesc(QaRecord::getCreateTime);
        wrapper.last("LIMIT 1");
        QaRecord lastRecord = recordMapper.selectOne(wrapper);
        vo.setLastRecordTime(lastRecord != null ? lastRecord.getCreateTime() : conv.getCreateTime());

        return vo;
    }

    private RecordVO toRecordVO(QaRecord record) {
        RecordVO vo = new RecordVO();
        vo.setId(record.getId());
        vo.setConversationId(record.getConversationId());
        vo.setQuestion(record.getQuestion());
        vo.setAnswer(record.getAnswer());
        vo.setSources(parseSources(record.getSourceDocs()));
        vo.setStatus(record.getStatus());
        vo.setModel(record.getModel());
        vo.setLatencyMs(record.getLatencyMs());
        vo.setErrorMessage(record.getErrorMessage());
        vo.setCreateTime(record.getCreateTime());
        return vo;
    }

    /**
     * 将 JSON 字符串反序列化为 SourceVO 列表。
     */
    List<SourceVO> parseSources(String sourceDocsJson) {
        if (!StringUtils.hasText(sourceDocsJson)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(sourceDocsJson, new TypeReference<List<SourceVO>>() {});
        } catch (JsonProcessingException e) {
            log.warn("解析 source_docs 失败: {}", sourceDocsJson, e);
            return Collections.emptyList();
        }
    }
}
