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
    public void updateDocument(Long id, DocumentUpdateDTO req) {
        KbDocument doc = this.getById(id);
        if (doc == null) return;
        if (StringUtils.hasText(req.getTitle())) {
            doc.setTitle(req.getTitle());
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
    public void updateStatus(Long id, String status, Map<String, Object> body) {
        KbDocument doc = this.getById(id);
        if (doc == null) return;

        doc.setStatus(status);

        if (body != null) {
            if (body.get("chunk_count") != null) {
                doc.setChunkCount(Integer.valueOf(body.get("chunk_count").toString()));
            }
            if (body.get("error_message") != null) {
                doc.setErrorMessage(body.get("error_message").toString());
            }
            if (body.get("stage") != null) {
                doc.setProcessStage(body.get("stage").toString());
            }
        }
        this.updateById(doc);
    }

    @Override
    public void streamFileToResponse(Long id, HttpServletResponse response, boolean isDownload) throws Exception {
        KbDocument doc = this.getById(id);
        if (doc == null || (doc.getDeleted() != null && doc.getDeleted() == 1)) {
            response.setStatus(404);
            return;
        }

        File file = new File(doc.getFilePath());
        if (!file.exists()) {
            response.setStatus(404);
            return;
        }

        String canonicalPath = file.getCanonicalPath();
        if (!canonicalPath.contains("storage" + File.separator + "uploads")) {
            response.setStatus(403);
            return;
        }

        String encodedName = URLEncoder.encode(doc.getOriginalName(), "UTF-8").replaceAll("\\+", "%20");

        if (isDownload) {
            response.setContentType("application/octet-stream");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + encodedName + "\"");
        } else {
            if ("pdf".equalsIgnoreCase(doc.getFileType())) {
                response.setContentType("application/pdf");
            } else if ("txt".equalsIgnoreCase(doc.getFileType())) {
                response.setContentType("text/plain;charset=UTF-8");
            }
            response.setHeader("Content-Disposition", "inline; filename=\"" + encodedName + "\"");
        }

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