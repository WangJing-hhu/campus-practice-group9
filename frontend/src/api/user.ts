import request from './request'

// ===== 用户管理 API =====
// 统一使用 request.ts（baseURL=/api，自动携带 Token，自动解包 Result.data）

/* ---------- 类型 ---------- */

export type UserRole = 'admin' | 'user'
export type UserStatus = 0 | 1

export interface UserRecord {
  id: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
  createTime: string
}

export interface UserListParams {
  page: number
  size: number
  keyword?: string
  role?: string
  status?: string
}

export interface UserPageResult {
  records: UserRecord[]
  total: number
  current: number
  size: number
  pages?: number
}

export interface UserUpdatePayload {
  email: string
  role: UserRole
}

export interface UserCreatePayload {
  username: string
  password: string
  email: string
  role: UserRole
  status: UserStatus
}

/* ---------- API 方法 ---------- */

/** 分页查询用户列表 */
export function getUserList(params: UserListParams): Promise<UserPageResult> {
  return request.get('/user/list', { params })
}

/** 编辑用户信息 */
export function updateUser(id: number, payload: UserUpdatePayload): Promise<UserRecord> {
  return request.put(`/user/${id}`, payload)
}

/** 启用/禁用用户 */
export function updateUserStatus(id: number, status: UserStatus): Promise<UserRecord> {
  return request.put(`/user/${id}/status`, { status })
}

/** 逻辑删除用户 */
export function deleteUser(id: number): Promise<void> {
  return request.delete(`/user/${id}`)
}

/** 管理员新增用户 */
export function createUser(payload: UserCreatePayload): Promise<UserRecord> {
  return request.post('/user', payload)
}
