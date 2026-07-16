// ===== 用户相关类型定义 =====
// 前端统一使用的类型，与后端接口约定对齐

/** 用户信息（后端返回的安全字段，不含 password） */
export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  status: number          // 1=启用, 0=禁用
  createTime: string
}

/** 登录响应 */
export interface LoginResponse {
  token: string
  userId: number
  username: string
  role: 'admin' | 'user'
}

/** 注册请求 */
export interface RegisterParams {
  username: string
  password: string
  email: string
}

/** 登录请求 */
export interface LoginParams {
  username: string
  password: string
}
