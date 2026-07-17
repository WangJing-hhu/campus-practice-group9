package com.group9.campusqa.controller;


import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.service.DocumentProcessService;
import com.group9.campusqa.service.DocumentService;
import com.group9.campusqa.vo.DocumentVO;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.UUID;



@RestController
@RequestMapping("/api/doc")
public class DocumentController {


    private final DocumentService documentService;

    private final DocumentProcessService processService;



    public DocumentController(
            DocumentService documentService,
            DocumentProcessService processService
    ){

        this.documentService = documentService;
        this.processService = processService;

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
                + "_"
                + file.getOriginalFilename();



        // 统一存储目录
        String path =
                "storage/uploads/"
                + fileName;



        File target =
                new File(path);



        // 自动创建目录
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



        // 调用AI处理
        processService.processDocument(
                doc.getId()
        );



        return doc.getId();

    }







    /**
     * 文档列表
     */
    @GetMapping("/list")
    public List<DocumentVO> list(){


        return documentService.queryList();

    }






    /**
     * 文档详情
     */
    @GetMapping("/{id}")
    public DocumentVO detail(
            @PathVariable Long id
    ){

        return documentService.queryById(id);

    }








    /**
     * 重新处理
     */
    @PostMapping("/{id}/reprocess")
    public String reprocess(
            @PathVariable Long id
    ){


        documentService.retryProcess(id);


        processService.processDocument(id);



        return "success";

    }








    /**
     * 删除文档
     */
    @DeleteMapping("/{id}")
    public String delete(
            @PathVariable Long id
    ){


        documentService.deleteDocument(id);


        return "success";

    }








    /**
     * 文件预览
     */
    @GetMapping("/{id}/preview")
    public String preview(
            @PathVariable Long id
    ){


        return documentService.preview(id);

    }







    /**
     * 文件下载
     */
    @GetMapping("/{id}/download")
    public String download(
            @PathVariable Long id
    ){


        return documentService.download(id);

    }








    /**
     * 搜索
     */
    @GetMapping("/search")
    public List<DocumentVO> search(
            @RequestParam String keyword
    ){


        return documentService.search(keyword);

    }








    /**
     * Python处理回调
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