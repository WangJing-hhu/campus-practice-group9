package com.group9.campusqa.controller;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.entity.User;
import com.group9.campusqa.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 分页查询用户列表
     */
    @GetMapping("/list")
    public Result<List<User>> list() {
        List<User> users = userService.list();
        return Result.success(users);
    }

    /**
     * 根据id查询用户
     */
    @GetMapping("/{id}")
    public Result<User> getById(@PathVariable Long id) {
        User user = userService.getById(id);
        return Result.success(user);
    }

    /**
     * 新增用户
     */
    @PostMapping
    public Result<Boolean> save(@RequestBody User user) {
        boolean result = userService.save(user);
        return Result.created(result);
    }

    /**
     * 修改用户
     */
    @PutMapping("/{id}")
    public Result<Boolean> update(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        boolean result = userService.updateById(user);
        return Result.success(result);
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        boolean result = userService.removeById(id);
        return Result.success(result);
    }
}