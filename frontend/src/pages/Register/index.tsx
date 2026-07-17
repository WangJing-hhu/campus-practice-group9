import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { registerApi } from '../../api/auth'
import '../../styles/auth.css'

export function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: {
    username: string
    password: string
    email: string
  }) => {
    setLoading(true)
    try {
      await registerApi(values)
      message.success('注册成功，请登录')
      navigate('/login')
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
        <Link to="/login">登录</Link>
        <Link to="/register" className="active">注册</Link>
      </div>

      {/* 左上角校徽 */}
      <div className="auth-emblem-top">
          <img src="/images/logo.png" alt="河海大学" />
      </div>

      {/* 右侧：品牌文字 + 注册卡片 */}
      <div className="auth-right">
        <div className="auth-hero">
          <h1>校园问答助手</h1>
          <div className="hero-subtitle">创建账号，开启校园知识服务</div>
          <div className="hero-motto">
              <img src="/images/xiaox.svg" alt="艰苦朴素 实事求是 严格要求 勇于探索" />
          </div>
            <img src="/images/runzx.svg" alt="" className="hero-decor" />
        </div>

        <div className="auth-card">
        <div className="card-title">
          <h3>注册</h3>
          <div className="card-sub">创建你的校园账号</div>
        </div>

        <Form name="register" onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 50, message: '用户名长度 2-50 位' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 72, message: '密码长度 6-72 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="auth-btn"
            >
              注 册
            </Button>
          </Form.Item>
        </Form>

        <div className="card-switch">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
    </div>
  )
}
