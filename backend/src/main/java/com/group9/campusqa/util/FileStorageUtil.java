package com.group9.campusqa.util;

import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.common.ResultCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * 文件存储工具。
 *
 * <p>负责：
 * <ul>
 *   <li>生成 UUID 安全文件名，保留原始扩展名</li>
 *   <li>将上传文件保存到 storage/uploads 目录</li>
 *   <li>替换（先删后存）和删除文件</li>
 *   <li>路径穿越防护</li>
 * </ul></p>
 *
 * <p>保存的绝对路径同时供 Java 和 Python（通过挂载同一目录）读取。</p>
 */
@Component
public class FileStorageUtil {

    private static final Logger log = LoggerFactory.getLogger(FileStorageUtil.class);

    /** 允许的文件扩展名（小写） */
    private static final Set ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx", "txt");

    /** 最大文件大小 50 MB */
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;

    /** 上传根目录（从 application.yml 注入） */
    @Value("${campus-qa.upload.dir:storage/uploads}")
    private String uploadDir;

    // ── 公共方法 ────────────────────────────────────────

    /**
     * 保存上传文件。
     *
     * @param file  前端上传的 MultipartFile
     * @return 保存后的 [storedName, absolutePath]
     * @throws BizException 格式/大小/IO 异常
     */
    public StoredFile save(MultipartFile file) {
        validate(file);

        String originalName = file.getOriginalFilename();
        String extension = getExtension(originalName).toLowerCase();
        String storedName = UUID.randomUUID().toString() + "." + extension;

        Path dir = ensureUploadDir();
        Path target = dir.resolve(storedName);

        // 路径穿越防护
        if (!target.normalize().startsWith(dir.normalize())) {
            throw new BizException(ResultCode.SERVER_ERROR, "非法文件路径");
        }

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("文件保存成功: {} -> {}", originalName, target.toAbsolutePath());
        } catch (IOException e) {
            log.error("文件保存失败: {}", originalName, e);
            throw new BizException(ResultCode.SERVER_ERROR, "文件保存失败: " + e.getMessage());
        }

        return new StoredFile(storedName, target.toAbsolutePath().toString());
    }

    /**
     * 替换文件：先保存新文件，成功后再删除旧文件。
     *
     * <p>顺序很重要：如果先删旧文件再保存新文件，新文件保存失败时
     * 旧文件已被删除，造成数据丢失。</p>
     *
     * <p>调用方（DocumentService）应在数据库更新失败时
     * 调用 {@link #deleteFile(String)} 清理刚保存的新文件，回滚到替换前状态。</p>
     *
     * @param oldFilePath 旧文件绝对路径（可能不存在）
     * @param newFile     新上传文件
     * @return 新的 StoredFile
     */
    public StoredFile replace(String oldFilePath, MultipartFile newFile) {
        // 1. 先校验并保存新文件（失败则旧文件不受影响）
        StoredFile newStored = save(newFile);

        // 2. 新文件保存成功后，再删除旧文件
        if (oldFilePath != null && !oldFilePath.isBlank()) {
            // 新旧文件路径相同则跳过删除（幂等替换场景）
            if (!oldFilePath.equals(newStored.getAbsolutePath())) {
                deleteFile(oldFilePath);
            }
        }

        return newStored;
    }

    /**
     * 删除物理文件（幂等：文件不存在时只记录日志，不抛异常）。
     *
     * @param absolutePath 文件绝对路径
     */
    public void deleteFile(String absolutePath) {
        if (absolutePath == null || absolutePath.isBlank()) {
            return;
        }
        try {
            Path path = Paths.get(absolutePath);
            boolean deleted = Files.deleteIfExists(path);
            if (deleted) {
                log.info("文件已删除: {}", absolutePath);
            } else {
                log.debug("文件不存在，跳过删除: {}", absolutePath);
            }
        } catch (IOException e) {
            log.warn("删除文件异常（不阻断流程）: {} —— {}", absolutePath, e.getMessage());
        }
    }

    // ── 校验逻辑 ────────────────────────────────────────

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException(ResultCode.BAD_REQUEST, "上传文件为空");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new BizException(ResultCode.BAD_REQUEST, "文件名为空");
        }

        String extension = getExtension(originalName).toLowerCase();
        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BizException(ResultCode.BAD_REQUEST,
                    "不支持的文件格式: ." + extension + "（仅允许 pdf/doc/docx/txt）");
        }

        long size = file.getSize();
        if (size > MAX_FILE_SIZE) {
            throw new BizException(ResultCode.BAD_REQUEST,
                    "文件过大（最大 50MB），当前: " + (size / 1024 / 1024) + "MB");
        }
    }

    // ── 辅助方法 ────────────────────────────────────────

    /** 确保上传目录存在 */
    private Path ensureUploadDir() {
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            return dir;
        } catch (IOException e) {
            throw new BizException(ResultCode.SERVER_ERROR, "无法创建上传目录: " + e.getMessage());
        }
    }

    /** 从文件名中提取扩展名（不含点号，小写） */
    private String getExtension(String filename) {
        if (filename == null) return "";
        int idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx + 1).toLowerCase() : "";
    }

    // ── 内部类：存储结果 ────────────────────────────────

    /**
     * 文件存储结果。
     */
    public static class StoredFile {
        private final String storedName;
        private final String absolutePath;

        StoredFile(String storedName, String absolutePath) {
            this.storedName = storedName;
            this.absolutePath = absolutePath;
        }

        public String getStoredName() { return storedName; }
        public String getAbsolutePath() { return absolutePath; }
    }
}
