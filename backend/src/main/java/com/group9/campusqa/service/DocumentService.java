package com.group9.campusqa.service;

import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.vo.DocumentVO;
import com.group9.campusqa.dto.DocumentUpdateDTO;
import jakarta.servlet.http.HttpServletResponse;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface DocumentService {

    Page<DocumentVO> queryPage(int page, int size, String keyword, String status);

    DocumentVO queryById(Long id);

    void updateDocument(Long id, MultipartFile file, String title);

    void deleteDocumentFull(Long id);

    void retryProcess(Long id);

    Long saveDocument(KbDocument document);

   void updateStatusFromCallback(com.group9.campusqa.dto.CallbackRequest request);

    void streamFileToResponse(Long id, HttpServletResponse response, boolean isDownload) throws Exception;
}