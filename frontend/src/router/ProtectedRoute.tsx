import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

// ===== 开发模式：后端没跑时临时绕过登录校验 =====
// 后端联调完成后把这行改成 false
const DEV_BYPASS_AUTH = false

function ensureDevBypass() {
  if (!DEV_BYPASS_AUTH) return
  const state = useAuthStore.getState()
  if (!state.token) {
    state.login('dev-bypass-token', {
      id: 1,
      username: 'admin',
      email: 'admin@test.com',
      role: 'admin',
      status: 1,
      createTime: '',
    })
  }
}

// ===== 登录路由守卫 =====
export function GuestRoute({ children }: { children: React.ReactNode }) {
  ensureDevBypass()
  if (DEV_BYPASS_AUTH) return <>{children}</>

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (isLoggedIn()) {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}

// ===== 受保护路由守卫 =====
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  ensureDevBypass()
  if (DEV_BYPASS_AUTH) return <>{children}</>

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
