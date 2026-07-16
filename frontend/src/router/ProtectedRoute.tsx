import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

// ===== 登录路由守卫 =====
// 未登录 → 跳转 /login
// 已登录访问 /login → 跳转 /admin（不需要重复登录）
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (isLoggedIn()) {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}

// ===== 受保护路由守卫 =====
// 未登录 → 跳转 /login
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
