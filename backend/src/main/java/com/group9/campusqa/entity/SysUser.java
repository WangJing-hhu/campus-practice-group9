package com.group9.campusqa.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_user")
public class SysUser {

    /**
     * 用户ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 用户名
     */
    private String username;

    /**
     * 密码
     */
    private String password;

    /**
     * 邮箱
     */
    private String email;

    /**
     * 用户角色
     * USER / ADMIN
     */
    private String role;

    /**
     * 状态
     * 1启用 0禁用
     */
    private Integer status;

    /**
     * 创建时间
     */
    private LocalDateTime createTime;
    public void setId(Long id) {
        this.id = id;
    }
}