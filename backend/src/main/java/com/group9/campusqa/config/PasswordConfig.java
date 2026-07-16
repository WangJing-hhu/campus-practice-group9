package com.group9.campusqa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 密码加密配置。
 *
 * <p>向 Spring 容器注册 BCryptPasswordEncoder Bean，
 * 供注册（加密）和登录（比对）统一使用。
 * BCrypt 自动处理 salt，每次加密结果不同，安全且方便。</p>
 */
@Configuration
public class PasswordConfig {

    /**
     * BCrypt 密码编码器，强度因子 10（默认值）。
     */
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
