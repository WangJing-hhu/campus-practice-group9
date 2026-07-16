import { create } from 'zustand'
import type { User } from '../types/user'

// ===== Zustand 登录状态管理 =====
// 替代 React Context，提供全局的登录/登出/验证能力

interface AuthState {
  token: string | null
  user: User | null

  // 操作
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void

  // 计算属性（用函数实现）
  isAdmin: () => boolean
  isLoggedIn: () => boolean
}

// 从 localStorage 恢复初始状态（页面刷新后保持登录）
const storedToken = localStorage.getItem('token')
const storedUser = (() => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: storedUser,

  login: (token: string, user: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  isAdmin: () => get().user?.role === 'admin',
  isLoggedIn: () => !!get().token,
}))
