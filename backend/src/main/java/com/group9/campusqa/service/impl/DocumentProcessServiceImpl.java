package com.group9.campusqa.service.impl;


import com.group9.campusqa.client.AiClient;
import com.group9.campusqa.dto.AiProcessRequest;
import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.mapper.KbDocumentMapper;
import com.group9.campusqa.service.DocumentProcessService;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;


@Service
public class DocumentProcessServiceImpl 
        implements DocumentProcessService {


    private final KbDocumentMapper mapper;

    private final AiClient aiClient;


    public DocumentProcessServiceImpl(
            KbDocumentMapper mapper,
            AiClient aiClient) {

        this.mapper = mapper;
        this.aiClient = aiClient;

    }



    /**
     * 异步调用 Python 文档处理服务
     *
     * 流程：
     * 上传文件
     *      ↓
     * Java保存文档信息
     *      ↓
     * 调用Python切片+向量化
     *      ↓
     * Python处理完成后callback
     *      ↓
     * Java更新状态
     */
    @Async
    @Override
    public void processDocument(Long docId) {


        // 查询文档
        KbDocument doc = mapper.selectById(docId);


        if (doc == null) {
            throw new RuntimeException(
                    "文档不存在，id=" + docId
            );
        }



        // 更新状态
        doc.setStatus("PROCESSING");

        doc.setProcessStage("PROCESSING");

        mapper.updateById(doc);



        // 构造发送给Python的请求
        AiProcessRequest request =
                new AiProcessRequest();



        request.setDocId(
                doc.getId()
        );


        request.setPath(
                doc.getFilePath()
        );


        request.setTitle(
                doc.getTitle()
        );



        // Python处理完成后回调Java
        request.setCallbackUrl(
                "http://localhost:8081/api/doc/callback"
        );



        // 调用Python处理接口
        aiClient.process(request);



    }

}