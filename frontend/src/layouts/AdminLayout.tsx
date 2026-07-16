import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown } from 'antd'
import {
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/auth'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ]

  const menuItems: MenuProps['items'] = [
    { key: '/admin', icon: <DashboardOutlined />, label: '工作台' },
    ...(isAdmin()
      ? [{ key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' }]
      : []),
  ]

  const selectedKey = location.pathname.startsWith('/admin/users')
    ? '/admin/users'
    : '/admin'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ background: '#001529' }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: collapsed ? 24 : 28,
            color: '#fff',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 500,
            letterSpacing: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {collapsed ? 'HHU' : '河海大学 · 问答助手'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderInlineEnd: 'none' }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            height: 56,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <span style={{ cursor: 'pointer', fontSize: 13, color: '#595959' }}>
              {user?.username}
              <span style={{ color: '#bbb', marginLeft: 8, fontSize: 12 }}>
                {isAdmin() ? '管理员' : '用户'}
              </span>
            </span>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: 20,
            padding: 24,
            background: '#fff',
            borderRadius: 6,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
