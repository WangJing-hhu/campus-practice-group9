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





    /**
     * 上传文档
     */
    @PostMapping("/upload")
    public Long upload(
            @RequestParam("file") MultipartFile file
    ) throws Exception {



        String fileName =
                UUID.randomUUID()
                +"_"
                +file.getOriginalFilename();



        // 建议使用项目data目录
      File uploadDir = new File("data/uploads");

if(!uploadDir.exists()){
    uploadDir.mkdirs();
}


String path =
        "data/uploads/"
        + fileName;

        File target =
                new File(path);



        if(!target.getParentFile().exists()){
            target.getParentFile().mkdirs();
        }



        file.transferTo(target);




        KbDocument doc =
                new KbDocument();



        doc.setTitle(
                file.getOriginalFilename()
        );



        doc.setOriginalName(
                file.getOriginalFilename()
        );


        doc.setStoredName(
                fileName
        );


        doc.setFilePath(
                path
        );


        doc.setFileSize(
                file.getSize()
        );



        doc.setStatus(
                "PENDING"
        );


        doc.setProcessStage(
                "UPLOADED"
        );



        documentService.saveDocument(doc);



        // 调用Python处理
        processService.processDocument(
                doc.getId()
        );



        return doc.getId();

    }





    /**
     * Python处理完成回调
     */
    @PostMapping("/callback")
    public Map<String,String> callback(
            @RequestBody Map<String,Object> body
    ){



        if(body.get("doc_id")==null){

            throw new RuntimeException(
                    "缺少doc_id"
            );
        }



        Long docId =
                Long.valueOf(
                    body.get("doc_id").toString()
                );



        String status =
                body.get("status")==null
                ?
                "FAILED"
                :
                body.get("status").toString();




        documentService.updateStatus(
                docId,
                status,
                body
        );



        return Map.of(
                "message",
                "success"
        );

    }


}