import request from './request'

// ===== ???? API =====
// ???? request.ts?baseURL=/api????? Token????? Result.data?

/* ---------- ?? ---------- */

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

/* ---------- API ?? ---------- */

/** ???????? */
export function getUserList(params: UserListParams): Promise<UserPageResult> {
  return request.get('/user/list', { params })
}

/** ?????? */
export function updateUser(id: number, payload: UserUpdatePayload): Promise<UserRecord> {
  return request.put(`/user/${id}`, payload)
}

/** ??/???? */
export function updateUserStatus(id: number, status: UserStatus): Promise<UserRecord> {
  return request.put(`/user/${id}/status`, { status })
}

/** ?????? */
export function deleteUser(id: number): Promise<void> {
  return request.delete(`/user/${id}`)
}

/** ??????? */
export function createUser(payload: UserCreatePayload): Promise<UserRecord> {
  return request.post('/user', payload)
}
