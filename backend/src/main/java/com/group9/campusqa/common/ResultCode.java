package com.group9.campusqa.common;

/**
 * 统一响应状态码常量。
 *
 * <p>要求：后端 JSON 中的 code 与真实 HTTP 状态码保持一致。
 * 前端 Axios 拦截器同时处理 HTTP 状态码和业务错误信息。</p>
 */
public final class ResultCode {

    private ResultCode() {
        // 工具类，禁止实例化
    }

    /** 成功 */
    public static final int SUCCESS = 200;

    /** 创建成功（注册等） */
    public static final int CREATED = 201;

    /** 参数错误 */
    public static final int BAD_REQUEST = 400;

    /** 未认证：Token 缺失 / 无效 / 过期 */
    public static final int UNAUTHORIZED = 401;

    /** 无权限：非管理员访问管理接口 / 账号停用 */
    public static final int FORBIDDEN = 403;

    /** 资源不存在 */
    public static final int NOT_FOUND = 404;

    /** 冲突：用户名或邮箱已存在 */
    public static final int CONFLICT = 409;

    /** 服务器内部错误 */
    public static final int SERVER_ERROR = 500;
}
