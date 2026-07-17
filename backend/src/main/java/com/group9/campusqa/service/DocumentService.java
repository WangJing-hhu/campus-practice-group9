package com.group9.campusqa.service;


import com.group9.campusqa.entity.KbDocument;
import com.group9.campusqa.vo.DocumentVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;


/**
 * 知识库文档服务接口
 */
public interface DocumentService {


    /**
     * 上传文件
     */
    Long upload(MultipartFile file);



    /**
     * 查询文档列表
     */
    List<DocumentVO> queryList();



    /**
     * 根据id查询文档
     */
    DocumentVO queryById(Long id);



    /**
     * 删除文档
     */
    void deleteDocument(Long id);



    /**
     * 重新处理文档
     */
    void retryProcess(Long id);



    /**
     * 保存文档信息
     *
     * @param document 文档实体
     * @return 文档id
     */
    Long saveDocument(KbDocument document);



    /**
     * 更新Python处理状态回调
     *
     * @param id 文档id
     * @param status 状态
     * @param body 回调数据
     */
    void updateStatus(
            Long id,
            String status,
            Map<String,Object> body
    );
        /**
     * 文件预览
     */
    String preview(Long id);



    /**
     * 文件下载路径
     */
    String download(Long id);



    /**
     * 文档搜索
     */
    List<DocumentVO> search(String keyword);

}