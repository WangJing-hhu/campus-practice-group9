package com.group9.campusqa.service.impl;

import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.dto.LoginDTO;
import com.group9.campusqa.entity.User;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.service.AuthService;
import com.group9.campusqa.service.UserService;
import com.group9.campusqa.util.JwtUtil;
import com.group9.campusqa.vo.LoginVO;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserService userService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthServiceImpl(UserService userService, BCryptPasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Override
    public LoginVO login(LoginDTO dto) {
        User user = userService.findByUsername(dto.getUsername());
        if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BizException(ResultCode.UNAUTHORIZED, "????????");
        }
        if (user.getStatus() == 0) {
            throw new BizException(ResultCode.FORBIDDEN, "??????");
        }
        return new LoginVO(jwtUtil.generate(user), user.getId(), user.getUsername(), user.getRole());
    }
}
