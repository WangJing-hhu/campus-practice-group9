package com.group9.campusqa.vo.chat;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * 同步/流式聊天响应中的单条来源。
 *
 * <p>index 对应回答中的 [1][2] 引用编号，与前端来源卡片一一对应。
 * 字段冻结后杨熙杰只可使用，不得自行修改结构。</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SourceVO {

    /** 引用编号（从 1 开始，对应回答中的 [1]） */
    private Integer index;

    /** 知识库文档 ID */
    private Long docId;

    /** 文档标题 */
    private String title;

    /** 文档文件名 */
    private String fileName;

    /** 相似度分数 */
    private Double score;

    /** 来源片段正文 */
    private String content;

    // ── Getter / Setter ──────────────────────────────────

    public Integer getIndex() { return index; }
    public void setIndex(Integer index) { this.index = index; }

    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
