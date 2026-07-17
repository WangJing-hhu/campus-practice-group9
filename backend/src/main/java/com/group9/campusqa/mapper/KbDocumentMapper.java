package com.group9.campusqa.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.group9.campusqa.entity.KbDocument;
import org.apache.ibatis.annotations.Mapper;

/**
 * 知识库文档 Mapper。
 *
 * <p>继承 MyBatis-Plus BaseMapper，自动获得 CRUD、分页、
 * 逻辑删除等能力。复杂查询使用 MyBatis-Plus LambdaQueryWrapper
 * 在 Service 层构建。</p>
 */
@Mapper
public interface KbDocumentMapper extends BaseMapper<KbDocument> {
}
