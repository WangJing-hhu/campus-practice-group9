package com.group9.campusqa.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.group9.campusqa.entity.User;
import com.group9.campusqa.mapper.UserMapper;
import com.group9.campusqa.service.SysUserService;
import org.springframework.stereotype.Service;

@Service
public class SysUserServiceImpl 
        extends ServiceImpl<UserMapper, User>
        implements SysUserService {

}