package com.group9.campusqa.vo;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

/**
 * 文档视图对象——返回给前端的"安全"文档数据。
 *
 * <p>与 Entity 的关键区别：
 * <ul>
 *   <li><b>不暴露</b> filePath（绝对路径属于服务器内部信息）</li>
 *   <li>只返回 fileSize 数值，前端自行格式化</li>
 *   <li>时间字段统一为 ISO 字符串，由 Jackson 序列化</li>
 * </ul></p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DocumentVO {

    private Long id;
    private String title;
    private String originalName;
    private String storedName;
    private String fileType;
    private Long fileSize;
    private Integer chunkCount;
    private String status;
    private String processStage;
    private String errorMessage;
    private Long createUserId;
    private LocalDateTime createTime;
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

    public Long getCreateUserId() { return createUserId; }
    public void setCreateUserId(Long createUserId) { this.createUserId = createUserId; }

    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }

    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
}
