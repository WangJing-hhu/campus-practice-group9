package com.group9.campusqa.controller;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.dto.LoginDTO;
import com.group9.campusqa.dto.RegisterDTO;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.service.AuthService;
import com.group9.campusqa.util.JwtUtil;
import com.group9.campusqa.vo.LoginVO;
import com.group9.campusqa.vo.UserVO;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<Result<Void>> register(@Valid @RequestBody RegisterDTO dto) {
        authService.register(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.success("注册成功", null));
    }

    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        LoginVO vo = authService.login(dto);
        return Result.success("登录成功", vo);
    }

    @GetMapping("/me")
    public Result<UserVO> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BizException(ResultCode.UNAUTHORIZED, "未登录，请先登录");
        }
        String token = authHeader.replace("Bearer ", "");
        try {
            Long userId = Long.parseLong(jwtUtil.parse(token).getSubject());
            UserVO vo = authService.me(userId);
            return Result.success(vo);
        } catch (ExpiredJwtException e) {
            throw new BizException(ResultCode.UNAUTHORIZED, "Token已过期，请重新登录");
        } catch (JwtException e) {
            throw new BizException(ResultCode.UNAUTHORIZED, "Token无效");
        }
    }
}