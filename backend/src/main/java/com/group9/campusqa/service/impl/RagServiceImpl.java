package com.group9.campusqa.service.impl;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.group9.campusqa.ai.LlmClient;
import com.group9.campusqa.ai.PromptBuilder;
import com.group9.campusqa.client.AiClient;
import com.group9.campusqa.dto.AiSearchRequest;
import com.group9.campusqa.dto.chat.AiSearchResponse;
import com.group9.campusqa.dto.chat.ChatRequest;
import com.group9.campusqa.entity.QaConversation;
import com.group9.campusqa.entity.QaRecord;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.service.ChatHistoryService;
import com.group9.campusqa.service.RagService;
import com.group9.campusqa.vo.chat.ChatResponse;
import com.group9.campusqa.vo.chat.SourceVO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;


@Service
public class RagServiceImpl implements RagService {


    private static final Logger log =
            LoggerFactory.getLogger(RagServiceImpl.class);


    private final AiClient aiClient;

    private final ChatHistoryService chatHistoryService;

    private final PromptBuilder promptBuilder;

    private final LlmClient llmClient;

    private final ObjectMapper objectMapper;


    private final ExecutorService executorService =
            Executors.newCachedThreadPool();



    public RagServiceImpl(
            AiClient aiClient,
            ChatHistoryService chatHistoryService,
            PromptBuilder promptBuilder,
            LlmClient llmClient
    ){

        this.aiClient = aiClient;
        this.chatHistoryService = chatHistoryService;
        this.promptBuilder = promptBuilder;
        this.llmClient = llmClient;


        this.objectMapper = new ObjectMapper();

        this.objectMapper.configure(
                DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                false
        );

    }




    /**
     * 创建聊天上下文
     */
    private RagContext prepareContext(
            ChatRequest request,
            Long userId
    ){


        RagContext context = new RagContext();


        context.question =
                request.getQuestion();



        // 创建或者获取会话
        if(request.getConversationId()!=null){


            QaConversation conversation =
                    chatHistoryService.getById(
                            request.getConversationId()
                    );


            if(conversation==null ||
               !conversation.getUserId().equals(userId)){


                throw new BizException(
                        403,
                        "无权访问此会话"
                );

            }


            context.conversationId =
                    request.getConversationId();



        }else{


            QaConversation newConversation =
                    chatHistoryService.createConversation(
                            userId
                    );


            context.conversationId =
                    newConversation.getId();

        }




        // 初始化聊天记录
        QaRecord record =
                new QaRecord();


        record.setUserId(userId);

        record.setConversationId(
                context.conversationId
        );

        record.setQuestion(
                request.getQuestion()
        );


        record.setStatus(
                "PENDING"
        );


        record.setTopK(5);

        record.setScoreThreshold(0.70);



        // 这里只插入一次
        record =
                chatHistoryService.saveRecord(
                        record
                );


        context.record = record;




        // 调用Python检索
        AiSearchRequest searchReq =
                new AiSearchRequest();


        searchReq.setQuestion(
                request.getQuestion()
        );


        searchReq.setTopK(5);

        searchReq.setScoreThreshold(0.70);



        try{


            Object raw =
                    aiClient.search(
                            searchReq
                    );


            AiSearchResponse response =
                    objectMapper.convertValue(
                            raw,
                            AiSearchResponse.class
                    );



            context.searchResults =
                    response!=null
                    ?
                    response.getResults()
                    :
                    new ArrayList<>();



        }catch(Exception e){


            log.error(
                    "调用Python检索失败",
                    e
            );


            record.setStatus(
                    "FAILED"
            );


            record.setErrorMessage(
                    "检索服务不可用"
            );


            chatHistoryService.updateRecord(
                    record
            );


            throw new BizException(
                    500,
                    "检索服务不可用，请稍后再试"
            );

        }




        context.sourceVOs =
                convertToSourceVOs(
                        context.searchResults
                );



        context.recentHistory =
                chatHistoryService.getRecentHistory(
                        userId,
                        context.conversationId,
                        3
                );



        return context;

    }





    @Override
    public ChatResponse chat(
            ChatRequest request,
            Long userId
    ){


        long startTime =
                System.currentTimeMillis();



        RagContext context =
                prepareContext(
                        request,
                        userId
                );



        String answer;



        if(!promptBuilder.hasValidSources(
                context.searchResults
        )){


            answer =
                    LlmClient.NO_DATA_ANSWER;



        }else{


            List<PromptBuilder.PromptMessage> messages =
                    promptBuilder.build(
                            context.searchResults,
                            context.recentHistory,
                            context.question
                    );


            try{


                answer =
                        llmClient.chatSync(
                                messages
                        );



            }catch(LlmClient.LlmException e){


                context.record.setStatus(
                        "FAILED"
                );


                context.record.setErrorMessage(
                        e.getMessage()
                );


                chatHistoryService.updateRecord(
                        context.record
                );


                throw new BizException(
                        500,
                        e.getMessage()
                );

            }

        }




        context.record.setAnswer(
                answer
        );


        context.record.setStatus(
                "COMPLETED"
        );


        context.record.setLatencyMs(
                (int)(
                    System.currentTimeMillis()
                    -
                    startTime
                )
        );


        fillRecordMetadata(
                context.record,
                context.sourceVOs
        );



        chatHistoryService.updateRecord(
                context.record
        );



        ChatResponse response =
                new ChatResponse();


        response.setConversationId(
                context.conversationId
        );


        response.setRecordId(
                context.record.getId()
        );


        response.setAnswer(
                answer
        );


        response.setSources(
                context.sourceVOs
        );



        return response;


    }
    @Override
public SseEmitter streamChat(ChatRequest request, Long userId) {

    SseEmitter emitter = new SseEmitter(120000L);

    long startTime = System.currentTimeMillis();

    AtomicBoolean interrupted = new AtomicBoolean(false);


    // SSE超时
    emitter.onTimeout(() -> {
        interrupted.set(true);
        log.warn("SSE连接超时，中断生成");
    });


    // SSE异常，例如客户端关闭页面
    emitter.onError(e -> {
        interrupted.set(true);
        log.warn("SSE连接异常，中断生成", e);
    });



    executorService.execute(() -> {

        RagContext context = null;


        try {

            context = prepareContext(request, userId);



            Map<String, Object> metaData = Map.of(
                    "conversationId",
                    context.conversationId,

                    "recordId",
                    context.record.getId(),

                    "sources",
                    context.sourceVOs
            );



            emitter.send(
                    SseEmitter.event()
                            .name("meta")
                            .data(metaData)
            );




            // 没有检索结果
            if (!promptBuilder.hasValidSources(context.searchResults)) {


                emitter.send(
                        SseEmitter.event()
                                .name("token")
                                .data(
                                        Map.of(
                                                "text",
                                                LlmClient.NO_DATA_ANSWER
                                        )
                                )
                );


                context.record.setAnswer(
                        LlmClient.NO_DATA_ANSWER
                );


                context.record.setStatus(
                        "COMPLETED"
                );


                context.record.setLatencyMs(
                        (int)(System.currentTimeMillis()-startTime)
                );



                fillRecordMetadata(
                        context.record,
                        context.sourceVOs
                );



                chatHistoryService.updateRecord(
                        context.record
                );



                emitter.send(
                        SseEmitter.event()
                                .name("done")
                                .data(
                                        Map.of(
                                                "recordId",
                                                context.record.getId()
                                        )
                                )
                );


                emitter.complete();

                return;
            }




            List<PromptBuilder.PromptMessage> messages =
                    promptBuilder.build(
                            context.searchResults,
                            context.recentHistory,
                            context.question
                    );





            LlmClient.StreamResult streamResult =
                    llmClient.chatStream(


                            messages,


                            token -> {

                                try {


                                    emitter.send(
                                            SseEmitter.event()
                                                    .name("token")
                                                    .data(
                                                            Map.of(
                                                                    "text",
                                                                    token
                                                            )
                                                    )
                                    );


                                } catch(IOException e) {


                                    interrupted.set(true);


                                    throw new RuntimeException(
                                            "客户端已断开连接",
                                            e
                                    );

                                }

                            },


                            interrupted::get
                    );






            context.record.setAnswer(
                    streamResult.getText()
            );



            context.record.setStatus(

                    streamResult.isInterrupted()

                    ?

                    "INTERRUPTED"

                    :

                    "COMPLETED"

            );



            context.record.setLatencyMs(

                    (int)(System.currentTimeMillis()-startTime)

            );




            fillRecordMetadata(
                    context.record,
                    context.sourceVOs
            );



            chatHistoryService.updateRecord(
                    context.record
            );





            emitter.send(
                    SseEmitter.event()
                            .name("done")
                            .data(
                                    Map.of(
                                            "recordId",
                                            context.record.getId()
                                    )
                            )
            );



            emitter.complete();




        } catch(Exception e) {


            log.error(
                    "流式回答异常",
                    e
            );



            if(context != null &&
               context.record != null) {


                context.record.setStatus(
                        "FAILED"
                );


                context.record.setErrorMessage(
                        e.getMessage()
                );



                chatHistoryService.updateRecord(
                        context.record
                );

            }



            try {


                emitter.send(
                        SseEmitter.event()
                                .name("error")
                                .data(
                                        Map.of(
                                                "message",
                                                e.getMessage()!=null
                                                        ?
                                                        e.getMessage()
                                                        :
                                                        "流式生成发生错误"
                                        )
                                )
                );


            } catch(IOException ioException) {


                log.error(
                        "发送error失败",
                        ioException
                );

            }



            emitter.completeWithError(e);

        }

    });


    return emitter;

}






private List<SourceVO> convertToSourceVOs(
        List<AiSearchResponse.SearchResult> results
) {


    List<SourceVO> vos =
            new ArrayList<>();


    if(results == null){

        return vos;

    }



    for(int i=0;i<results.size();i++){


        AiSearchResponse.SearchResult res =
                results.get(i);



        SourceVO vo =
                new SourceVO();



        vo.setIndex(
                i+1
        );


        vo.setDocId(
                res.getDocId()
        );


        vo.setTitle(
                res.getTitle()
        );


        vo.setFileName(
                res.getFileName()
        );


        vo.setScore(
                res.getScore()
        );


        vo.setContent(
                res.getContent()
        );


        vo.setSourceUrl(
                res.getSourceUrl()
        );


        vo.setSourceSite(
                res.getSourceSite()
        );


        vo.setCategory(
                res.getCategory()
        );



        vo.setPublishedAt(
                res.getPublishedAt()!=null
                ?
                res.getPublishedAt().toString()
                :
                null
        );



        vo.setCrawledAt(
                res.getCrawledAt()!=null
                ?
                res.getCrawledAt().toString()
                :
                null
        );



        vos.add(vo);

    }



    return vos;

}






private void fillRecordMetadata(
        QaRecord record,
        List<SourceVO> sources
) {


    try {


        record.setSourceDocs(
                objectMapper.writeValueAsString(
                        sources
                )
        );



    } catch(Exception e) {


        log.warn(
                "保存来源信息失败",
                e
        );

    }



    record.setModel(
            "qwen-plus"
    );

}





private static class RagContext {


    Long conversationId;


    String question;


    QaRecord record;


    List<AiSearchResponse.SearchResult> searchResults;


    List<SourceVO> sourceVOs;


    List<QaRecord> recentHistory;


}

}