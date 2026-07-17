package com.group9.campusqa.vo;

import com.group9.campusqa.entity.User;

import java.time.LocalDateTime;

public class UserVO {
    private Long id;
    private String username;
    private String email;
    private String role;
    private Integer status;
    private LocalDateTime createTime;

    public static UserVO from(User user) {
        UserVO result = new UserVO();
        result.setId(user.getId());
        result.setUsername(user.getUsername());
        result.setEmail(user.getEmail());
        result.setRole(user.getRole());
        result.setStatus(user.getStatus());
        result.setCreateTime(user.getCreateTime());
        return result;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
}
