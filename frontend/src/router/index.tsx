import { Routes, Route, Navigate } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './ProtectedRoute'
import { AdminLayout } from '../layouts/AdminLayout'
import { LoginPage } from '../pages/Login'
import { RegisterPage } from '../pages/Register'
import { UserManagement } from '../pages/UserManagement'
import { KnowledgeBase } from '../pages/KnowledgeBase'

// ===== 应用路由配置 =====
export function AppRouter() {
  return (
    <Routes>
      {/* 公开路由：未登录才能访问 */}
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

      {/* 受保护路由：需要登录（管理后台） */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* 默认：工作台 */}
        <Route
          index
          element={
            <div style={{ textAlign: 'center', padding: 60 }}>
              <h2>👋 欢迎使用校园问答助手管理后台</h2>
              <p style={{ color: '#888', marginTop: 12 }}>
                请从左侧菜单选择功能模块
              </p>
            </div>
          }
        />
        {/* 用户管理页：孙凤摇实现 */}
        <Route path="users" element={<UserManagement />} />
        {/* 知识库管理：杨牧涵容器 + 孙凤摇列表组件 */}
        <Route path="knowledge" element={<KnowledgeBase />} />
      </Route>

      {/* 兜底：所有不认识的路径 → 重定向到 /admin */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
