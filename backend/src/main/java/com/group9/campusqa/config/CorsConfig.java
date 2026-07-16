package com.group9.campusqa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * 全局跨域配置。
 *
 * <p>开发环境允许前端 http://localhost:5173 跨域访问。
 * 生产环境部署前需改为实际域名。</p>
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // 开发环境：允许 Vite 前端地址
        config.addAllowedOriginPattern("http://localhost:5173");
        config.addAllowedOriginPattern("http://127.0.0.1:5173");
        // 允许携带 Cookie / Authorization header
        config.setAllowCredentials(true);
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        // 预检请求缓存 1 小时
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
