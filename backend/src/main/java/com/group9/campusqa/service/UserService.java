package com.group9.campusqa.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.group9.campusqa.dto.RegisterDTO;
import com.group9.campusqa.dto.UserCreateDTO;
import com.group9.campusqa.dto.UserQueryDTO;
import com.group9.campusqa.dto.UserUpdateDTO;
import com.group9.campusqa.entity.User;
import com.group9.campusqa.vo.UserVO;

public interface UserService extends IService<User> {
    User findByUsername(String username);
    UserVO register(RegisterDTO dto);
    UserVO createUser(UserCreateDTO dto);
    IPage<UserVO> pageUsers(UserQueryDTO query);
    UserVO updateUser(Long id, UserUpdateDTO dto);
    UserVO updateStatus(Long id, Integer status, Long currentUserId);
    void logicalDelete(Long id);
}
