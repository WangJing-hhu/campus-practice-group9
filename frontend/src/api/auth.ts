import request from './request'
import type { LoginParams, RegisterParams, LoginResponse, User } from '../types/user'

// ===== ???? API =====

/** ?? */
export function loginApi(data: LoginParams): Promise<LoginResponse> {
  return request.post('/user/login', data)
}

/** ?? */
export function registerApi(data: RegisterParams): Promise<User> {
  return request.post('/user/register', data)
}

/** ??????????? Token? */
export function getCurrentUserApi(): Promise<User> {
  return request.get('/user/me')
}
