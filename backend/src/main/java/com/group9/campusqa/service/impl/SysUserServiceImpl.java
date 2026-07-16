package com.group9.campusqa.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.group9.campusqa.entity.SysUser;
import com.group9.campusqa.mapper.SysUserMapper;
import com.group9.campusqa.service.SysUserService;
import org.springframework.stereotype.Service;

@Service
public class SysUserServiceImpl 
        extends ServiceImpl<SysUserMapper, SysUser>
        implements SysUserService {

}