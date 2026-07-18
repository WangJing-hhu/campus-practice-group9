package com.group9.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.group9.campusqa.common.Result;
import com.group9.campusqa.common.ResultCode; // 引入统一状态码
import com.group9.campusqa.exception.BizException; // 引入统一异常
import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.service.DocumentProcessService;
import com.group9.campusqa.service.DocumentService;
import com.group9.campusqa.vo.DocumentVO;
import com.group9.campusqa.dto.CallbackRequest; // 引入回调DTO
import com.group9.campusqa.dto.AiSearchRequest;
import com.group9.campusqa.util.FileStorageUtil;
import com.group9.campusqa.context.UserContext;
import org.springframework.http.MediaType;
import com.group9.campusqa.dto.DocumentUpdateDTO;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
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

    // 🌟 修复 5：使用 BizException + FORBIDDEN
    private void checkAdminRole() {
        if (!"admin".equals(UserContext.get().role())) {
            // 注意：如果你们的 ResultCode 里不叫 FORBIDDEN 而是 UNAUTHORIZED 等，请以王雨淇的定义为准
            throw new BizException(403, "无管理员权限"); 
        }
    }

    // 🌟 修复 4：上传接口返回完整 DocumentVO
    @PostMapping("/upload")
    public Result<DocumentVO> upload(@RequestParam("file") MultipartFile file) {
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

        DocumentVO vo = new DocumentVO();
        BeanUtils.copyProperties(doc, vo);
        return Result.success(vo);
    }

    @GetMapping("/list")
    public Result<Page<DocumentVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status
    ){
        checkAdminRole();
        return Result.success(documentService.queryPage(page, size, keyword, status));
    }
    
    @GetMapping("/{id}")
    public Result<DocumentVO> detail(@PathVariable Long id){
        checkAdminRole();
        return Result.success(documentService.queryById(id));
    }

    // 🌟 修复 3：支持 multipart 文件替换和标题修改
   // 1. 专门处理前端【只修改标题】的场景 (接收 JSON Body)
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Result<String> updateTitle(@PathVariable Long id, @RequestBody DocumentUpdateDTO req) {
        checkAdminRole();
        // 调用 service，文件传 null，只更新标题
        documentService.updateDocument(id, null, req.getTitle());
        documentService.retryProcess(id);
        processService.processDocument(id);
        return Result.success("success");
    }

    // 2. 专门处理前端【替换文件或同时改标题】的场景 (接收 FormData)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<String> replaceFile(
            @PathVariable Long id,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        checkAdminRole();
        documentService.updateDocument(id, file, title);
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
    public Result<?> search(@RequestBody AiSearchRequest req){
        checkAdminRole();
        return Result.success(processService.semanticSearch(req.getQuestion(), req.getTopK()));
    }

    // 🌟 修复 6：使用 CallbackRequest
    @PostMapping("/callback")
    public Map<String,String> callback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody CallbackRequest body 
    ){
        // 规范严谨的 Token 校验写法
        if (authHeader == null || !authHeader.startsWith("Bearer ") || !authHeader.substring(7).equals(expectedToken)) {
            throw new BizException(401, "Invalid Token");
        }
        if (body.getDocId() == null) {
            throw new BizException(400, "缺少doc_id");
        }

        // 把原来传 Map 改为直接处理 DTO 字段
        documentService.updateStatusFromCallback(body); 
        return Map.of("message", "success");
    }
}