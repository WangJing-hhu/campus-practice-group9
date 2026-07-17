package com.group9.campusqa.controller;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.context.UserContext;
import com.group9.campusqa.dto.LoginDTO;
import com.group9.campusqa.dto.RegisterDTO;
import com.group9.campusqa.service.AuthService;
import com.group9.campusqa.service.UserService;
import com.group9.campusqa.vo.LoginVO;
import com.group9.campusqa.vo.UserVO;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class AuthController {
    private final UserService userService;
    private final AuthService authService;

    public AuthController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Result<UserVO>> register(@Valid @RequestBody RegisterDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Result.created(userService.register(dto)));
    }

    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO dto) {
        return Result.success(authService.login(dto));
    }

    @GetMapping("/me")
    public Result<UserVO> me() {
        UserContext.CurrentUser current = UserContext.get();
        return Result.success(UserVO.from(userService.getById(current.id())));
    }
}
