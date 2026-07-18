package com.group9.campusqa.interceptor;

import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.context.UserContext;
import com.group9.campusqa.exception.BizException;
import com.group9.campusqa.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {
    private final JwtUtil jwtUtil;

    public JwtInterceptor(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new BizException(ResultCode.UNAUTHORIZED, "未登录或Token缺失");
        }
        try {
            Claims claims = jwtUtil.parse(authorization.substring(7));
            UserContext.set(new UserContext.CurrentUser(
                    Long.valueOf(claims.getSubject()),
                    claims.get("username", String.class),
                    claims.get("role", String.class)));
            return true;
        } catch (Exception e) {
            throw new BizException(ResultCode.UNAUTHORIZED, "Token无效或已过期");
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        UserContext.clear();
    }
}
