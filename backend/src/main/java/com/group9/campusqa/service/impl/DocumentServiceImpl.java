package com.group9.campusqa.service.impl;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.mapper.KbDocumentMapper;
import com.group9.campusqa.vo.DocumentVO;
import com.group9.campusqa.service.DocumentService;

import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;


@Service
public class DocumentServiceImpl 
        extends ServiceImpl<KbDocumentMapper, KbDocument>
        implements DocumentService {


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



    @Override
public DocumentVO queryById(Long id){

        KbDocument doc=this.getById(id);

        if(doc==null){
            return null;
        }

        return convert(doc);
    }



   @Override
public void deleteDocument(Long id){

        removeById(id);

    }



    @Override
public void retryProcess(Long id){

        KbDocument doc=this.getById(id);

        if(doc!=null){

            doc.setStatus("PENDING");
            doc.setProcessStage("UPLOADED");

            updateById(doc);
        }

    }



    private DocumentVO convert(KbDocument doc){

        DocumentVO vo=new DocumentVO();

        BeanUtils.copyProperties(doc,vo);

        return vo;
    }
    @Override
public Long upload(MultipartFile file) {

    return null;
}
@Override
public Long saveDocument(KbDocument document){

    this.save(document);

    return document.getId();
}
@Override
public void updateStatus(
        Long id,
        String status,
        java.util.Map<String,Object> body
){

    KbDocument doc=this.getById(id);

    if(doc==null){
        return;
    }


    doc.setStatus(status);


    if(body.get("chunk_count")!=null){

        doc.setChunkCount(
            Integer.valueOf(
              body.get("chunk_count").toString()
            )
        );
    }


    if(body.get("error_message")!=null){

        doc.setErrorMessage(
            body.get("error_message").toString()
        );
    }


    if(body.get("stage")!=null){

    doc.setProcessStage(
        body.get("stage").toString()
    );

}


    this.updateById(doc);
}
@Override
public String preview(Long id){

    KbDocument doc = this.getById(id);

    if(doc == null){
        return null;
    }

    return doc.getFilePath();
}



@Override
public String download(Long id){

    KbDocument doc = this.getById(id);

    if(doc == null){
        return null;
    }

    return doc.getFilePath();
}




@Override
public List<DocumentVO> search(String keyword){


    LambdaQueryWrapper<KbDocument> wrapper =
            new LambdaQueryWrapper<>();


    wrapper.like(
            KbDocument::getTitle,
            keyword
    )
    .or()
    .like(
            KbDocument::getOriginalName,
            keyword
    );


    return this.list(wrapper)
            .stream()
            .map(this::convert)
            .collect(Collectors.toList());

}
}