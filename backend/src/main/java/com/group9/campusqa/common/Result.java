package com.group9.campusqa.common;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 统一响应格式 Result&lt;T&gt;。
 *
 * <p>所有接口返回同一种结构，前端只需判断 code 即可。
 * 返回示例：{"code":200, "message":"success", "data":{...}, "timestamp":1780000000000}</p>
 *
 * <p>根据第9组统一接口约定：
 * <ul>
 *   <li>code 与真实 HTTP 状态码保持一致</li>
 *   <li>message 为人类可读的提示信息</li>
 *   <li>data 为业务数据，可为 null</li>
 *   <li>timestamp 为响应时间戳（毫秒）</li>
 * </ul></p>
 *
 * @param <T> 业务数据类型
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> {

    /** 状态码（与 HTTP 状态码一致） */
    private int code;

    /** 提示信息 */
    private String message;

    /** 业务数据 */
    private T data;

    /** 响应时间戳（毫秒） */
    private long timestamp;

    // ── 构造器 ──────────────────────────────────────────

    private Result() {
        this.timestamp = System.currentTimeMillis();
    }

    private Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.timestamp = System.currentTimeMillis();
    }

    // ── 工厂方法 ────────────────────────────────────────

    /** 成功（200） */
    public static <T> Result<T> success(T data) {
        return new Result<>(ResultCode.SUCCESS, "success", data);
    }

    /** 成功，自定义消息 */
    public static <T> Result<T> success(String message, T data) {
        return new Result<>(ResultCode.SUCCESS, message, data);
    }

    /** 创建成功（201） */
    public static <T> Result<T> created(T data) {
        return new Result<>(ResultCode.CREATED, "created", data);
    }

    /** 创建成功，自定义消息 */
    public static <T> Result<T> created(String message, T data) {
        return new Result<>(ResultCode.CREATED, message, data);
    }

    /** 失败 */
    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }

    // ── Getter / Setter ─────────────────────────────────

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
