import { Routes, Route, Navigate } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './ProtectedRoute'
import { AdminLayout } from '../layouts/AdminLayout'
import { LoginPage } from '../pages/Login'
import { RegisterPage } from '../pages/Register'
import { UserManagement } from '../pages/UserManagement'

// ===== ?????? =====
export function AppRouter() {
  return (
    <Routes>
      {/* ???????????? */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      {/* ???????????????? */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* ?????? */}
        <Route
          index
          element={
            <div style={{ textAlign: 'center', padding: 60 }}>
              <h2>?? ??????????????</h2>
              <p style={{ color: '#888', marginTop: 12 }}>
                ????????????
              </p>
            </div>
          }
        />
        <Route path="users" element={<UserManagement />} />
      </Route>

      {/* ??????????? ? ???? /admin */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
