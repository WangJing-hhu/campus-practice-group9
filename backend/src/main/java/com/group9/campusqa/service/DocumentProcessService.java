package com.group9.campusqa.service;

import com.group9.campusqa.vo.AiSearchResultVO;
import java.util.List;

public interface DocumentProcessService {

    void processDocument(Long docId);

    // 补充检索方法的声明
    List<AiSearchResultVO> semanticSearch(String question, Integer topK);
}