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
      message.success('?????????????')
      navigate('/login')
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
          <div className="hero-subtitle">?????????????</div>
          <div className="hero-motto">
            ???? ? ????
            <br />
            ???? ? ????
          </div>
        </div>

        <div className="auth-card">
          <div className="card-title">
            <h3>??</h3>
            <div className="card-sub">????????</div>
          </div>

          <Form name="register" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '??????' },
                { min: 2, max: 50, message: '????? 2-50 ?' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="???"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '?????' },
                { type: 'email', message: '???????' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="??"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '?????' },
                { min: 6, max: 72, message: '???? 6-72 ?' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="??"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '???????' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('??????????'))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="????"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} className="auth-btn">
                ? ?
              </Button>
            </Form.Item>
          </Form>

          <div className="card-switch">
            ?????<Link to="/login">???</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
