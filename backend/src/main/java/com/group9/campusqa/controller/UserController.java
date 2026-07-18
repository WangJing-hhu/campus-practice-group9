package com.group9.campusqa.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.group9.campusqa.common.Result;
import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.context.UserContext;
import com.group9.campusqa.dto.UserCreateDTO;
import com.group9.campusqa.dto.UserQueryDTO;
import com.group9.campusqa.dto.UserStatusDTO;
import com.group9.campusqa.dto.UserUpdateDTO;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.service.UserService;
import com.group9.campusqa.vo.UserVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) { this.userService = userService; }

    @PostMapping
    public org.springframework.http.ResponseEntity<Result<UserVO>> create(
            @Valid @RequestBody UserCreateDTO dto) {
        requireAdmin();
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(Result.created(userService.createUser(dto)));
    }

    @GetMapping("/list")
    public Result<IPage<UserVO>> list(@ModelAttribute UserQueryDTO query) {
        requireAdmin();
        return Result.success(userService.pageUsers(query));
    }

    @PutMapping("/{id}")
    public Result<UserVO> update(@PathVariable Long id, @Valid @RequestBody UserUpdateDTO dto) {
        requireAdmin();
        return Result.success(userService.updateUser(id, dto));
    }

    @PutMapping("/{id}/status")
    public Result<UserVO> status(@PathVariable Long id, @Valid @RequestBody UserStatusDTO dto) {
        UserContext.CurrentUser current = requireAdmin();
        return Result.success(userService.updateStatus(id, dto.getStatus(), current.id()));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        UserContext.CurrentUser current = requireAdmin();
        if (id.equals(current.id())) {
            throw new BizException(ResultCode.BAD_REQUEST, "不能删除当前登录账号");
        }
        userService.logicalDelete(id);
        return Result.success(null);
    }

    private UserContext.CurrentUser requireAdmin() {
        UserContext.CurrentUser current = UserContext.get();
        if (current == null || !"admin".equals(current.role())) {
            throw new BizException(ResultCode.FORBIDDEN, "仅管理员可执行此操作");
        }
        return current;
    }
}
