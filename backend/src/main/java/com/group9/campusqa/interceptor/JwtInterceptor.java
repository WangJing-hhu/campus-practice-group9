package com.group9.campusqa.interceptor;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.common.ResultCode;
import com.group9.campusqa.context.UserContext;
import com.group9.campusqa.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendError(response, ResultCode.UNAUTHORIZED, "未登录，请先登录");
            return false;
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = jwtUtil.parse(token);
            UserContext.set(
                Long.parseLong(claims.getSubject()),
                claims.get("username", String.class),
                claims.get("role", String.class)
            );
            return true;
        } catch (ExpiredJwtException e) {
            sendError(response, ResultCode.UNAUTHORIZED, "Token已过期，请重新登录");
            return false;
        } catch (JwtException e) {
            sendError(response, ResultCode.UNAUTHORIZED, "Token无效");
            return false;
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }

    private void sendError(HttpServletResponse response, int code, String message) throws Exception {
        response.setStatus(code);
        response.setContentType("application/json;charset=UTF-8");
        Result<Void> result = Result.error(code, message);
        response.getWriter().write(objectMapper.writeValueAsString(result));
    }
}