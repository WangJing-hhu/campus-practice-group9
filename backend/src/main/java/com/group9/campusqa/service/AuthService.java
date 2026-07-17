package com.group9.campusqa.service;

import com.group9.campusqa.dto.LoginDTO;
import com.group9.campusqa.vo.LoginVO;

public interface AuthService {
    LoginVO login(LoginDTO dto);
}
