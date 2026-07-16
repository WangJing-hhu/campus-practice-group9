package com.group9.campusqa.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 自动填充配置。
 *
 * <p>配合实体类上的 @TableField(fill = ...) 注解，
 * 在插入和更新时自动填充 create_time 和 update_time 字段。</p>
 *
 * <p>使用方式：在 Entity 字段上添加：
 * <pre>{@code
 *   @TableField(fill = FieldFill.INSERT)
 *   private LocalDateTime createTime;
 *
 *   @TableField(fill = FieldFill.INSERT_UPDATE)
 *   private LocalDateTime updateTime;
 * }</pre></p>
 */
@Component
public class MetaObjectHandlerConfig implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }
}
