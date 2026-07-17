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
      message.success('????')
      navigate('/admin')
    } catch {
      // request.ts ???????
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-emblem-top">
        <img src="/images/logo.svg" alt="????" />
        <span className="emblem-text">HOHAI UNIVERSITY</span>
      </div>

      <div className="auth-right">
        <div className="auth-hero">
          <h1>??????</h1>
          <div className="hero-subtitle">???????????</div>
          <div className="hero-motto">
            ???? ? ????
            <br />
            ???? ? ????
          </div>
        </div>

        <div className="auth-card">
          <div className="card-title">
            <h3>??</h3>
            <div className="card-sub">????</div>
          </div>

          <Form name="login" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item name="username" rules={[{ required: true, message: '??????' }]}>
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="???"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '?????' },
                { min: 6, message: '????6?' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="??"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} className="auth-btn">
                ? ?
              </Button>
            </Form.Item>
          </Form>

          <div className="card-switch">
            ??????<Link to="/register">????</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
