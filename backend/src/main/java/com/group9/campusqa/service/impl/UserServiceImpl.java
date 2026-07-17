package com.group9.campusqa.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.dto.RegisterDTO;
import com.group9.campusqa.dto.UserCreateDTO;
import com.group9.campusqa.dto.UserQueryDTO;
import com.group9.campusqa.dto.UserUpdateDTO;
import com.group9.campusqa.entity.User;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.mapper.UserMapper;
import com.group9.campusqa.service.UserService;
import com.group9.campusqa.vo.UserVO;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    private final BCryptPasswordEncoder passwordEncoder;

    public UserServiceImpl(BCryptPasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User findByUsername(String username) {
        return lambdaQuery().eq(User::getUsername, username).one();
    }

    @Override
    @Transactional
    public UserVO register(RegisterDTO dto) {
        String username = dto.getUsername().trim();
        String email = dto.getEmail().trim();
        ensureUnique(username, email, null);
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(email);
        user.setRole("user");
        user.setStatus(1);
        user.setDeleted(0);
        save(user);
        return UserVO.from(user);
    }

    @Override
    @Transactional
    public UserVO createUser(UserCreateDTO dto) {
        String username = dto.getUsername().trim();
        String email = dto.getEmail().trim();
        ensureUnique(username, email, null);
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setEmail(email);
        user.setRole(dto.getRole());
        user.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        user.setDeleted(0);
        save(user);
        return UserVO.from(user);
    }

    private void ensureUnique(String username, String email, Long excludedId) {
        var usernameQuery = lambdaQuery().eq(User::getUsername, username);
        if (excludedId != null) usernameQuery.ne(User::getId, excludedId);
        if (usernameQuery.count() > 0) {
            throw new BizException(ResultCode.CONFLICT, "??????");
        }
        var emailQuery = lambdaQuery().eq(User::getEmail, email);
        if (excludedId != null) emailQuery.ne(User::getId, excludedId);
        if (emailQuery.count() > 0) {
            throw new BizException(ResultCode.CONFLICT, "?????");
        }
    }

    @Override
    public IPage<UserVO> pageUsers(UserQueryDTO query) {
        long size = Math.max(1, Math.min(query.getSize(), 100));
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.and(w -> w.like(User::getUsername, query.getKeyword())
                    .or().like(User::getEmail, query.getKeyword()));
        }
        wrapper.eq(StringUtils.hasText(query.getRole()), User::getRole, query.getRole());
        wrapper.eq(query.getStatus() != null, User::getStatus, query.getStatus());
        wrapper.orderByDesc(User::getCreateTime);
        IPage<User> source = page(new Page<>(Math.max(1, query.getPage()), size), wrapper);
        return source.convert(UserVO::from);
    }

    @Override
    @Transactional
    public UserVO updateUser(Long id, UserUpdateDTO dto) {
        User user = requireUser(id);
        String email = dto.getEmail().trim();
        long emailCount = lambdaQuery().eq(User::getEmail, email).ne(User::getId, id).count();
        if (emailCount > 0) throw new BizException(ResultCode.CONFLICT, "?????");
        user.setEmail(email);
        user.setRole(dto.getRole());
        updateById(user);
        return UserVO.from(user);
    }

    @Override
    @Transactional
    public UserVO updateStatus(Long id, Integer status, Long currentUserId) {
        if (id.equals(currentUserId) && status == 0) {
            throw new BizException(ResultCode.BAD_REQUEST, "??????????");
        }
        User user = requireUser(id);
        user.setStatus(status);
        updateById(user);
        return UserVO.from(user);
    }

    @Override
    public void logicalDelete(Long id) {
        requireUser(id);
        removeById(id);
    }

    private User requireUser(Long id) {
        User user = getById(id);
        if (user == null) throw new BizException(ResultCode.NOT_FOUND, "?????");
        return user;
    }
}
