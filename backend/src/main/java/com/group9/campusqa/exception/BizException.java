package com.group9.campusqa.exception;

/**
 * 自定义业务异常。
 *
 * <p>业务层抛出此异常后，由 {@link GlobalExceptionHandler} 统一捕获
 * 并转换为 Result JSON 响应，避免在每个 Controller 中 try-catch。</p>
 *
 * <p>使用示例：
 * <pre>{@code
 *   throw new BizException(409, "用户名已存在");
 *   throw new BizException(ResultCode.CONFLICT, "邮箱已注册");
 * }</pre></p>
 */
public class BizException extends RuntimeException {

    /** 业务状态码（与 HTTP 状态码一致） */
    private final int code;

    /**
     * @param code    业务状态码（见 {@link com.group9.campusqa.common.ResultCode}）
     * @param message 人类可读的错误描述
     */
    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
