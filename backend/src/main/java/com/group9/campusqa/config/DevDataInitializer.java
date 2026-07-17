package com.group9.campusqa.config;

import com.group9.campusqa.entity.User;
import com.group9.campusqa.mapper.UserMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevDataInitializer implements CommandLineRunner {
    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder;

    public DevDataInitializer(UserMapper userMapper, BCryptPasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userMapper.selectCount(null) == 0) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@campus.example");
            admin.setRole("admin");
            admin.setStatus(1);
            admin.setDeleted(0);
            userMapper.insert(admin);
        }
    }
}
