package com.group9.campusqa.service;

import com.group9.campusqa.dto.LoginDTO;
import com.group9.campusqa.dto.RegisterDTO;
import com.group9.campusqa.vo.LoginVO;
import com.group9.campusqa.vo.UserVO;

public interface AuthService {
    void register(RegisterDTO dto);
    LoginVO login(LoginDTO dto);
    UserVO me(Long userId);
}