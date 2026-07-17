package com.group9.campusqa.config;

import com.group9.campusqa.interceptor.JwtInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    private final JwtInterceptor jwtInterceptor;

    public WebMvcConfig(JwtInterceptor jwtInterceptor) { this.jwtInterceptor = jwtInterceptor; }

    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/login", // 假设原来的登录放行
                        "/api/doc/callback",           // 🌟 必须放行 callback
                        "/api/doc/*/preview",          // 🌟 必须放行 preview
                        "/api/doc/*/download"          // 🌟 必须放行 download
                );
    }
}
