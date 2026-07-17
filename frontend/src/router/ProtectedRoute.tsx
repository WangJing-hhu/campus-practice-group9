import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

// ===== ?????? =====
// ??? ? ?? /login
// ????? /login ? ?? /admin?????????
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (isLoggedIn()) {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}

// ===== ??????? =====
// ??? ? ?? /login
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
