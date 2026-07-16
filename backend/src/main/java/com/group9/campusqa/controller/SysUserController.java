package com.group9.campusqa.controller;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.entity.SysUser;
import com.group9.campusqa.service.SysUserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class SysUserController {


    private final SysUserService sysUserService;


    public SysUserController(SysUserService sysUserService) {
        this.sysUserService = sysUserService;
    }


    /**
     * 查询所有用户
     */
    @GetMapping
    public Result<List<SysUser>> list() {

        List<SysUser> users = sysUserService.list();

        return Result.success(users);
    }


    /**
     * 根据id查询用户
     */
    @GetMapping("/{id}")
    public Result<SysUser> getById(
            @PathVariable Long id
    ) {

        SysUser user = sysUserService.getById(id);

        return Result.success(user);
    }


    /**
     * 新增用户
     */
    @PostMapping
    public Result<Boolean> save(
            @RequestBody SysUser user
    ) {

        boolean result = sysUserService.save(user);

        return Result.created(result);
    }


    /**
     * 修改用户
     */
    @PutMapping("/{id}")
    public Result<Boolean> update(
            @PathVariable Long id,
            @RequestBody SysUser user
    ) {

        user.setId(id);

        boolean result = sysUserService.updateById(user);

        return Result.success(result);
    }


    /**
     * 删除用户
     */
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(
            @PathVariable Long id
    ) {

        boolean result = sysUserService.removeById(id);

        return Result.success(result);
    }

}