package com.group9.campusqa.service.impl;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.mapper.KbDocumentMapper;
import com.group9.campusqa.service.DocumentService;
import com.group9.campusqa.vo.DocumentVO;

import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
public class DocumentServiceImpl
        extends ServiceImpl<KbDocumentMapper, KbDocument>
        implements DocumentService {


    /**
     * 查询文档列表
     */
    @Override
    public List<DocumentVO> queryList(){

        return this.list(
                new LambdaQueryWrapper<KbDocument>()
                        .orderByDesc(KbDocument::getCreateTime)
        )
        .stream()
        .map(this::convert)
        .collect(Collectors.toList());
    }



    /**
     * 根据id查询
     */
    @Override
    public DocumentVO queryById(Long id){

        KbDocument doc = this.getById(id);

        if(doc == null){
            return null;
        }

        return convert(doc);
    }



    /**
     * 删除
     */
    @Override
    public void deleteDocument(Long id){

        removeById(id);

    }



    /**
     * 重新处理
     */
    @Override
    public void retryProcess(Long id){

        KbDocument doc = this.getById(id);

        if(doc != null){

            doc.setStatus("PENDING");

            doc.setProcessStage("UPLOADED");

            updateById(doc);
        }

    }



    /**
     * 上传接口预留
     */
    @Override
    public Long upload(MultipartFile file){

        return null;

    }



    /**
     * 保存文档
     */
    @Override
    public Long saveDocument(KbDocument document){

        this.save(document);

        return document.getId();

    }



    /**
     * Python回调更新状态
     */
    @Override
    public void updateStatus(
            Long id,
            String status,
            Map<String,Object> body
    ){

        KbDocument doc = this.getById(id);


        if(doc == null){

            return;

        }


        doc.setStatus(status);



        if(body.get("chunk_count") != null){

            doc.setChunkCount(
                    Integer.valueOf(
                            body.get("chunk_count").toString()
                    )
            );

        }



        if(body.get("error_message") != null){

            doc.setErrorMessage(
                    body.get("error_message").toString()
            );

        }



        if(body.get("stage") != null){

            doc.setProcessStage(
                    body.get("stage").toString()
            );

        }



        this.updateById(doc);

    }




    /**
     * Entity转VO
     */
    private DocumentVO convert(KbDocument doc){

        DocumentVO vo = new DocumentVO();

        BeanUtils.copyProperties(doc,vo);

        return vo;

    }


}