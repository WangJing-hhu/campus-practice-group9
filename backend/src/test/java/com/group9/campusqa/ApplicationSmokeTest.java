package com.group9.campusqa;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.config.PasswordConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 最小启动冒烟测试。
 *
 * <p>验证：Spring 容器正常启动、关键 Bean 已注册、
 * BCrypt 密码加密可用、统一响应格式正确。</p>
 */
@SpringBootTest
class
ApplicationSmokeTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    // ── 容器启动 ──────────────────────────────────────

    @Test
    @DisplayName("Spring 容器正常启动")
    void contextLoads() {
        assertThat(context).isNotNull();
        assertThat(context.containsBean("campusQaApplication")).isTrue();
    }

    // ── 关键 Bean ─────────────────────────────────────

    @Test
    @DisplayName("BCryptPasswordEncoder Bean 已注册")
    void passwordEncoderBeanExists() {
        assertThat(passwordEncoder).isNotNull();
    }

    @Test
    @DisplayName("MyBatisPlus 分页插件已注册")
    void mybatisPlusInterceptorExists() {
        assertThat(context.containsBean("mybatisPlusInterceptor")).isTrue();
    }

    @Test
    @DisplayName("CorsFilter 已注册")
    void corsFilterExists() {
        assertThat(context.containsBean("corsFilter")).isTrue();
    }

    // ── BCrypt 加密 ─────────────────────────────────

    @Test
    @DisplayName("BCrypt 加密和比对正常")
    void bcryptEncodeAndMatch() {
        String raw = "test123456";
        String encoded = passwordEncoder.encode(raw);

        // 密文不能与明文相同
        assertThat(encoded).isNotEqualTo(raw);
        // 密文以 BCrypt 前缀开头
        assertThat(encoded).startsWith("$2a$");
        // 比对正确
        assertThat(passwordEncoder.matches(raw, encoded)).isTrue();
        // 错误密码比对失败
        assertThat(passwordEncoder.matches("wrong", encoded)).isFalse();
    }

    // ── 统一响应格式 ─────────────────────────────────

    @Test
    @DisplayName("Result.success 格式正确")
    void resultSuccessFormat() {
        Result<String> r = Result.success("hello");

        assertThat(r.getCode()).isEqualTo(ResultCode.SUCCESS);
        assertThat(r.getMessage()).isEqualTo("success");
        assertThat(r.getData()).isEqualTo("hello");
        assertThat(r.getTimestamp()).isPositive();
    }

    @Test
    @DisplayName("Result.error 格式正确")
    void resultErrorFormat() {
        Result<Void> r = Result.error(ResultCode.CONFLICT, "用户名已存在");

        assertThat(r.getCode()).isEqualTo(ResultCode.CONFLICT);
        assertThat(r.getMessage()).isEqualTo("用户名已存在");
        assertThat(r.getData()).isNull();
        assertThat(r.getTimestamp()).isPositive();
    }

    // ── 密码配置 Bean ────────────────────────────────

    @Test
    @DisplayName("PasswordConfig 注册的 encoder 可用")
    void passwordConfigWorks() {
        PasswordConfig config = new PasswordConfig();
        BCryptPasswordEncoder encoder = config.passwordEncoder();
        assertThat(encoder).isNotNull();
        String encoded = encoder.encode("test");
        assertThat(encoder.matches("test", encoded)).isTrue();
    }
}
