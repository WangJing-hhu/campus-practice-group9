import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { loginApi } from '../../api/auth'
import { useAuthStore } from '../../store/auth'
import '../../styles/auth.css'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const data = await loginApi(values)
      login(data.token, {
        id: data.userId,
        username: data.username,
        email: '',
        role: data.role,
        status: 1,
        createTime: '',
      })
      message.success('登录成功')
      navigate('/admin')
    } catch {
      // request.ts 拦截器统一处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* 右上角导航 */}
      <div className="auth-top-nav">
        <Link to="/login" className="active">登录</Link>
        <Link to="/register">注册</Link>
      </div>

      {/* 左上角校徽 */}
      <div className="auth-emblem-top">
        <img src="/images/logo.png" alt="河海大学" />
      </div>

      {/* 右侧：品牌文字 + 登录卡片 */}
      <div className="auth-right">
        <div className="auth-hero">
          <h1>校园问答助手</h1>
          <div className="hero-subtitle">知识管理与智能问答平台</div>
          <div className="hero-motto">
            <img src="/images/xiaox.svg" alt="艰苦朴素 实事求是 严格要求 勇于探索" />
          </div>
          <img src="/images/runzx.svg" alt="" className="hero-decor" />
        </div>

        <div className="auth-card">
        <div className="card-title">
          <h3>登录</h3>
          <div className="card-sub">欢迎回来</div>
        </div>

        <Form name="login" onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="auth-btn"
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="card-switch">
          还没有账号？<Link to="/register">创建账号</Link>
        </div>
      </div>
    </div>
    </div>
  )
}
