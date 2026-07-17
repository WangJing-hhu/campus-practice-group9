package com.group9.campusqa.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.group9.campusqa.entity.QaRecord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 问答记录 Mapper。
 *
 * <p>继承 MyBatis-Plus BaseMapper，自动获得 CRUD、分页、
 * 逻辑删除等能力。复杂查询在 Service 层用 LambdaQueryWrapper 构建。</p>
 */
@Mapper
public interface QaRecordMapper extends BaseMapper<QaRecord> {
}
