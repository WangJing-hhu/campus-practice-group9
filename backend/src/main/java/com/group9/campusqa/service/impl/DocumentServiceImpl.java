package com.group9.campusqa.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.group9.campusqa.client.AiClient;
import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.mapper.KbDocumentMapper;
import com.group9.campusqa.vo.DocumentVO;
import com.group9.campusqa.dto.DocumentUpdateDTO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.group9.campusqa.service.DocumentService;
import com.group9.campusqa.util.FileStorageUtil;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;

import jakarta.servlet.http.HttpServletResponse; 
import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DocumentServiceImpl extends ServiceImpl<KbDocumentMapper, KbDocument> implements DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentServiceImpl.class);

    private final AiClient aiClient;
    private final FileStorageUtil fileStorageUtil;

    public DocumentServiceImpl(AiClient aiClient, FileStorageUtil fileStorageUtil) {
        this.aiClient = aiClient;
        this.fileStorageUtil = fileStorageUtil;
    }
 
   @Value("${campus-qa.upload.dir:storage/uploads}")
    private String uploadDir; // 必须注入配置的上传路径
    
    @Override
    public void updateStatusFromCallback(com.group9.campusqa.dto.CallbackRequest request) {
        KbDocument doc = this.getById(request.getDocId());
        if (doc == null) return;

        doc.setStatus(request.getStatus() != null ? request.getStatus() : "FAILED");
        if (request.getChunkCount() != null) doc.setChunkCount(request.getChunkCount());
        if (request.getErrorMessage() != null) doc.setErrorMessage(request.getErrorMessage());
        if (request.getStage() != null) doc.setProcessStage(request.getStage());
        
        this.updateById(doc);
    }
    @Override
    public Page<DocumentVO> queryPage(int page, int size, String keyword, String status) {
        LambdaQueryWrapper<KbDocument> wrapper = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(keyword)) {
            wrapper.like(KbDocument::getTitle, keyword)
                   .or().like(KbDocument::getOriginalName, keyword);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(KbDocument::getStatus, status);
        }
        wrapper.orderByDesc(KbDocument::getCreateTime);

        Page<KbDocument> pageParam = new Page<>(page, size);
        Page<KbDocument> result = this.page(pageParam, wrapper);

        // 将 Entity 转为 VO
        List<DocumentVO> voList = result.getRecords().stream().map(doc -> {
            DocumentVO vo = new DocumentVO();
            BeanUtils.copyProperties(doc, vo);
            return vo;
        }).collect(Collectors.toList());

        // 重新包装为 VO 的 Page 返回
        Page<DocumentVO> voPage = new Page<>(page, size, result.getTotal());
        voPage.setRecords(voList);
        return voPage;
    }
    
    @Override
    public DocumentVO queryById(Long id) {
        KbDocument doc = this.getById(id);
        if (doc == null) {
            return null;
        }
        DocumentVO vo = new DocumentVO();
        BeanUtils.copyProperties(doc, vo);
        return vo;
    }

  @Override
    public void updateDocument(Long id, MultipartFile file, String title) {
        KbDocument doc = this.getById(id);
        if (doc == null) return;

        if (StringUtils.hasText(title)) {
            doc.setTitle(title);
        }
        
      
        if (file != null && !file.isEmpty()) {
            // 🌟 新增：如果上传了新文件，在更新数据库前，必须同步清理 Python 端的旧向量
            try {
                aiClient.delete(id);
            } catch (Exception e) {
                log.warn("更新文件前清理旧向量失败: {}", e.getMessage());
                // 这里用 warn 记录即可，不要阻断后续的文件更新逻辑
            }

            FileStorageUtil.StoredFile storedFile = fileStorageUtil.replace(doc.getFilePath(), file);
            doc.setOriginalName(file.getOriginalFilename());
            doc.setStoredName(storedFile.getStoredName());
            doc.setFilePath(storedFile.getAbsolutePath());
            doc.setFileSize(file.getSize());
            String fileType = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".") + 1);
            doc.setFileType(fileType);
            
            // 更新了文件，需要将状态重置为 PENDING 等待重新处理
            doc.setStatus("PENDING");
            doc.setProcessStage("UPLOADED"); 
            doc.setChunkCount(0); 
            doc.setErrorMessage(""); 
        }
        this.updateById(doc);
    }
    
    @Override
    public void deleteDocumentFull(Long id) {
        KbDocument doc = this.getById(id);
        if (doc == null) return;

        try {
            aiClient.delete(id);
        } catch (Exception e) {
            log.error("调用AI删除向量失败, docId: " + id, e);
            throw new RuntimeException("删除知识库向量失败，请重试");
        }

        try {
            fileStorageUtil.deleteFile(doc.getFilePath());
        } catch (Exception e) {
            log.error("删除本地文件失败: " + doc.getFilePath(), e);
        }

        this.removeById(id);
    }

    @Override
    public void retryProcess(Long id) {
        KbDocument doc = this.getById(id);
        if (doc != null) {
            try {
                aiClient.delete(id);
            } catch (Exception e) {
                log.warn("重处理前清理旧向量失败，可能是初次处理失败未生成向量: {}", e.getMessage());
            }
            doc.setStatus("PENDING");
            doc.setProcessStage("UPLOADED"); 
            doc.setChunkCount(0); 
            doc.setErrorMessage(""); 
            updateById(doc);
        }
    }

    @Override
    public Long saveDocument(KbDocument document) {
        this.save(document);
        return document.getId();
    }

    

   @Override
    public void streamFileToResponse(Long id, HttpServletResponse response, boolean isDownload) throws Exception {
        // 1. 获取文档记录并检查是否已被删除
        KbDocument doc = this.getById(id);
        if (doc == null || (doc.getDeleted() != null && doc.getDeleted() == 1)) {
            response.setStatus(404);
            return;
        }

        // 2. 检查物理文件是否存在
        File file = new File(doc.getFilePath());
        if (!file.exists()) {
            response.setStatus(404);
            return;
        }

        // 3. 🌟 核心修复 (要求7)：安全校验防止路径穿越
        // 获取配置的上传根目录，并标准化为绝对路径（消除 ../ 等符号）
        java.nio.file.Path root = java.nio.file.Paths.get(uploadDir).toAbsolutePath().normalize();
        // 获取当前请求文件的真实路径，并标准化
        java.nio.file.Path target = file.toPath().toAbsolutePath().normalize();

        // 严格判断：目标文件必须在我们的 uploadDir 根目录下
        if (!target.startsWith(root)) {
            response.setStatus(403);
            return;
        }

        // 4. 处理文件名中文乱码
        String encodedName = URLEncoder.encode(doc.getOriginalName(), "UTF-8").replaceAll("\\+", "%20");

        // 5. 设置响应头
        if (isDownload) {
            // 下载模式：作为附件
            response.setContentType("application/octet-stream");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + encodedName + "\"");
        } else {
            // 预览模式：内联展示
            if ("pdf".equalsIgnoreCase(doc.getFileType())) {
                response.setContentType("application/pdf");
            } else if ("txt".equalsIgnoreCase(doc.getFileType())) {
                response.setContentType("text/plain;charset=UTF-8");
            }
            response.setHeader("Content-Disposition", "inline; filename=\"" + encodedName + "\"");
        }

        // 6. 将文件流写入 HTTP 响应
        try (FileInputStream fis = new FileInputStream(file);
             OutputStream os = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = fis.read(buffer)) != -1) {
                os.write(buffer, 0, len);
            }
        }
    }
}