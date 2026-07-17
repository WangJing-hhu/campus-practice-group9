package com.group9.campusqa.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/**
 * 知识库文档实体，对应 kb_document 表。
 *
 * <p>记录文档元数据：文件名、路径、类型、大小、处理状态、
 * 切分块数等。处理流程由 {@code DocumentProcessService} 异步驱动，
 * Python AI 服务通过回调更新状态。</p>
 *
 * <p>时间字段沿用昨日 MetaObjectHandlerConfig 自动填充；
 * deleted 字段使用 MyBatis-Plus 逻辑删除。</p>
 */
@TableName("kb_document")
public class KbDocument {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 展示标题 */
    private String title;

    /** 上传原文件名 */
    private String originalName;

    /** UUID 存储名 */
    private String storedName;

    /** 文件绝对路径 */
    private String filePath;

    /** 文件类型（pdf/doc/docx/txt） */
    private String fileType;

    /** 文件大小（字节） */
    private Long fileSize;

    /** 切分块数 */
    private Integer chunkCount;

    /** 处理状态：PENDING / PROCESSING / COMPLETED / FAILED */
    private String status;

    /** 处理阶段：UPLOADED / EXTRACTING / SPLITTING / EMBEDDING / INDEXING / DONE */
    private String processStage;

    /** 失败原因 */
    private String errorMessage;

    // ── Day5 官网来源字段（可选） ──────────────────────────

    /** 官网原文链接 */
    private String sourceUrl;

    /** 来源站点名称 */
    private String sourceSite;

    /** 内容分类 */
    private String category;

    /** 官网发布日期 */
    private java.time.LocalDate publishedAt;

    /** 抓取时间 */
    private LocalDateTime crawledAt;

    /** 上传管理员 ID */
    private Long createUserId;

    /** 逻辑删除标记（0-正常 1-已删除） */
    @TableLogic
    private Integer deleted;

    /** 创建时间（自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    /** 更新时间（自动填充） */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    // ── Getter / Setter ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getStoredName() { return storedName; }
    public void setStoredName(String storedName) { this.storedName = storedName; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public Integer getChunkCount() { return chunkCount; }
    public void setChunkCount(Integer chunkCount) { this.chunkCount = chunkCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProcessStage() { return processStage; }
    public void setProcessStage(String processStage) { this.processStage = processStage; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }

    public String getSourceSite() { return sourceSite; }
    public void setSourceSite(String sourceSite) { this.sourceSite = sourceSite; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public java.time.LocalDate getPublishedAt() { return publishedAt; }
    public void setPublishedAt(java.time.LocalDate publishedAt) { this.publishedAt = publishedAt; }

    public LocalDateTime getCrawledAt() { return crawledAt; }
    public void setCrawledAt(LocalDateTime crawledAt) { this.crawledAt = crawledAt; }

    public Long getCreateUserId() { return createUserId; }
    public void setCreateUserId(Long createUserId) { this.createUserId = createUserId; }

    public Integer getDeleted() { return deleted; }
    public void setDeleted(Integer deleted) { this.deleted = deleted; }

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }

    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
}
