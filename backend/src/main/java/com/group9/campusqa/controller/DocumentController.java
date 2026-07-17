package com.group9.campusqa.controller;


import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.service.DocumentProcessService;
import com.group9.campusqa.service.DocumentService;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.io.File;
import java.util.UUID;
import java.util.Map;



@RestController
@RequestMapping("/api/doc")
public class DocumentController {


    private final DocumentService documentService;

    private final DocumentProcessService processService;



    public DocumentController(
            DocumentService documentService,
            DocumentProcessService processService){

        this.documentService=documentService;
        this.processService=processService;

    }



    @PostMapping("/upload")
    public Long upload(
            @RequestParam("file") MultipartFile file
    ) throws Exception {


        // 保存路径
        String fileName =
                UUID.randomUUID()
                +"_"
                +file.getOriginalFilename();


        String path =
                "/tmp/"
                +fileName;



        file.transferTo(new File(path));



        KbDocument doc=new KbDocument();


        doc.setTitle(
                file.getOriginalFilename()
        );


        doc.setOriginalName(
                file.getOriginalFilename()
        );


        doc.setStoredName(fileName);


        doc.setFilePath(path);


        doc.setFileSize(
                file.getSize()
        );


        doc.setStatus("PENDING");


        doc.setProcessStage("UPLOADED");



        documentService.saveDocument(doc);



        // 异步调用Python处理
        processService.processDocument(
                doc.getId()
        );


        return doc.getId();

    }
    @PostMapping("/callback")
public void callback(
        @RequestBody Map<String,Object> body
){

    Long docId =
        Long.valueOf(
            body.get("doc_id").toString()
        );


    String status =
        body.get("status").toString();


    documentService.updateStatus(
        docId,
        status,
        body
    );
}

}