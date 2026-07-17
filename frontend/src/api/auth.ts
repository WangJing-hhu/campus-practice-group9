import request from './request'
import type { LoginParams, RegisterParams, LoginResponse, User } from '../types/user'

// ===== 认证相关 API =====

/** 登录 */
export function loginApi(data: LoginParams): Promise<LoginResponse> {
  return request.post('/user/login', data)
}

/** 注册 */
export function registerApi(data: RegisterParams): Promise<User> {
  return request.post('/user/register', data)
}

/** 获取当前用户信息（验证 Token） */
export function getCurrentUserApi(): Promise<User> {
  return request.get('/user/me')
}
