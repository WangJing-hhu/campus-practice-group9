package com.group9.campusqa.exception;

import com.group9.campusqa.common.Result;
import com.group9.campusqa.common.ResultCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器。
 *
 * <p>使用 @RestControllerAdvice 统一捕获异常，避免每个 Controller 都 try-catch。
 * 返回的 HTTP 状态码与 Result.code 保持一致。</p>
 *
 * <p>处理顺序：BizException → 参数校验异常 → 兜底 Exception</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 业务异常：按异常中携带的 code 和 message 返回。
     */
    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result<Void>> handleBizException(BizException e) {
        log.warn("业务异常 [{}]: {}", e.getCode(), e.getMessage());
        HttpStatus status = HttpStatus.resolve(e.getCode());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        return ResponseEntity
                .status(status)
                .body(Result.error(e.getCode(), e.getMessage()));
    }

    /**
     * 参数校验失败（@Valid 触发）：提取第一条校验错误信息。
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidation(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String msg = fieldError != null
                ? fieldError.getDefaultMessage()
                : "参数校验失败";
        log.warn("参数校验失败: {}", msg);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Result.error(ResultCode.BAD_REQUEST, msg));
    }

    /**
     * 兜底：未预期的服务器异常。
     * 不把原始异常信息暴露给前端，只在日志中记录完整堆栈。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e) {
        log.error("服务器内部错误", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(ResultCode.SERVER_ERROR, "服务器内部错误"));
    }
}
