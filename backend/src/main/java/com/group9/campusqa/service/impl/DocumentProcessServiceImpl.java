package com.group9.campusqa.service.impl;


import com.group9.campusqa.client.AiClient;
import com.group9.campusqa.dto.AiProcessRequest;
import com.group9.campusqa.dto.AiProcessResponse;
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
            AiClient aiClient){

        this.mapper=mapper;
        this.aiClient=aiClient;

    }



    @Async
    @Override
    public void processDocument(Long docId){


        KbDocument doc =
                mapper.selectById(docId);



        doc.setStatus("PROCESSING");

        doc.setProcessStage("PROCESSING");

        mapper.updateById(doc);



        AiProcessRequest request =
                new AiProcessRequest();


        request.setDocId(doc.getId());

        request.setPath(doc.getFilePath());

        request.setTitle(doc.getTitle());
        request.setCallbackUrl(
    "http://localhost:8080/api/doc/callback"
);



        AiProcessResponse response =
                aiClient.process(request);



        doc.setStatus(
                response.getStatus()
        );


        doc.setChunkCount(
                response.getChunkCount()
        );


        doc.setProcessStage(
                "DONE"
        );


        mapper.updateById(doc);


    }

}