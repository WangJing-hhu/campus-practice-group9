package com.group9.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.group9.campusqa.common.Result; // 引入你的统一 Result
import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.service.DocumentProcessService;
import com.group9.campusqa.service.DocumentService;
import com.group9.campusqa.vo.DocumentVO;
import com.group9.campusqa.dto.DocumentUpdateDTO;
import com.group9.campusqa.dto.AiSearchRequest; // 使用已有的搜索类
import com.group9.campusqa.util.FileStorageUtil;
import com.group9.campusqa.context.UserContext;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;

@RestController
@RequestMapping("/api/doc")
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentProcessService processService;
    private final FileStorageUtil fileStorageUtil;

    @Value("${campus-qa.ai.callback-token}")
    private String expectedToken;

    public DocumentController(
            DocumentService documentService,
            DocumentProcessService processService,
            FileStorageUtil fileStorageUtil
    ){
        this.documentService = documentService;
        this.processService = processService;
        this.fileStorageUtil = fileStorageUtil;
    }

    private void checkAdminRole() {
        if (!"admin".equals(UserContext.get().role())) {
            throw new RuntimeException("403 Forbidden");
        }
    }

    @PostMapping("/upload")
    public Result<Long> upload(@RequestParam("file") MultipartFile file) {
        checkAdminRole();

        FileStorageUtil.StoredFile storedFile = fileStorageUtil.save(file);

        KbDocument doc = new KbDocument();
        doc.setTitle(file.getOriginalFilename());
        doc.setOriginalName(file.getOriginalFilename());
        doc.setStoredName(storedFile.getStoredName());
        doc.setFilePath(storedFile.getAbsolutePath());
        doc.setFileSize(file.getSize());

        String fileType = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".") + 1);
        doc.setFileType(fileType);
        doc.setCreateUserId(UserContext.get().id());

        doc.setStatus("PENDING");
        doc.setProcessStage("UPLOADED");

        documentService.saveDocument(doc);
        processService.processDocument(doc.getId());

        return Result.success(doc.getId()); // 使用统一 Result
    }

    @GetMapping("/list")
    public Result<Page<DocumentVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status
    ){
        checkAdminRole();
        return Result.success(documentService.queryPage(page, size, keyword, status)); // 使用统一 Result
    }

    @GetMapping("/{id}")
    public Result<DocumentVO> detail(@PathVariable Long id){
        checkAdminRole();
        return Result.success(documentService.queryById(id));
    }

    @PutMapping("/{id}")
    public Result<String> update(@PathVariable Long id, @RequestBody DocumentUpdateDTO req){
        checkAdminRole();
        documentService.updateDocument(id, req);
        documentService.retryProcess(id);
        processService.processDocument(id);
        return Result.success("success");
    }

    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Long id){
        checkAdminRole();
        documentService.deleteDocumentFull(id);
        return Result.success("success");
    }

    @GetMapping("/{id}/preview")
    public void preview(@PathVariable Long id, HttpServletResponse response) throws Exception {
        documentService.streamFileToResponse(id, response, false);
    }

    @GetMapping("/{id}/download")
    public void download(@PathVariable Long id, HttpServletResponse response) throws Exception {
        documentService.streamFileToResponse(id, response, true);
    }

    @PostMapping("/search")
    public Result<?> search(@RequestBody AiSearchRequest req){ // 替换为 AiSearchRequest
        checkAdminRole();
        return Result.success(processService.semanticSearch(req.getQuestion(), req.getTopK()));
    }

    @PostMapping("/callback")
    public Map<String,String> callback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String,Object> body
    ){
        if (authHeader == null || !authHeader.replace("Bearer ", "").equals(expectedToken)) {
            throw new RuntimeException("401 Unauthorized: Invalid Token");
        }
        if (body.get("doc_id") == null) {
            throw new RuntimeException("缺少doc_id");
        }

        Long docId = Long.valueOf(body.get("doc_id").toString());
        String status = body.get("status") == null ? "FAILED" : body.get("status").toString();

        documentService.updateStatus(docId, status, body);
        return Map.of("message", "success");
    }
}