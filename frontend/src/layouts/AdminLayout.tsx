import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, theme, Dropdown } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/auth'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout

// ===== 管理后台统一布局 =====
// 给孙凤摇的用户管理页提供挂载位置
// 普通用户不显示"用户管理"菜单
export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  // 处理退出
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  // 侧边栏菜单（根据角色动态生成）
  const menuItems: MenuProps['items'] = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    // 仅管理员可见
    ...(isAdmin()
      ? [
          {
            key: '/admin/users',
            icon: <TeamOutlined />,
            label: '用户管理',
          },
        ]
      : []),
  ]

  // 根据当前路径选中菜单项
  const selectedKey = location.pathname === '/admin' ? '/admin' : '/admin/users'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        style={{ background: colorBgContainer }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            fontWeight: 600,
            fontSize: collapsed ? 16 : 18,
            color: '#005BAC',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? '🏫' : '🏫 校园问答助手'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>

      <Layout>
        {/* 顶部栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined />
              <span>{user?.username}</span>
              <span style={{ color: '#888', fontSize: 12 }}>
                ({isAdmin() ? '管理员' : '普通用户'})
              </span>
            </div>
          </Dropdown>
        </Header>

        {/* 内容区：孙凤摇的用户管理页挂载在这里 */}
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
