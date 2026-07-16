import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Typography, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { registerApi } from '../../api/auth'
import { useAuthStore } from '../../store/auth'
import '../../styles/auth.css'

const { Title, Text } = Typography

// ===== 注册页 =====
// 接口：POST /api/user/register
export function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const onFinish = async (values: {
    username: string
    password: string
    email: string
  }) => {
    setLoading(true)
    try {
      const data = await registerApi(values)

      // 构造 User 对象
      const user = {
        id: data.userId,
        username: data.username,
        email: values.email,
        role: data.role,
        status: 1,
        createTime: '',
      }

      login(data.token, user)
      message.success('注册成功！已自动登录')
      navigate('/admin')
    } catch (err: any) {
      // 错误已在 request.ts 拦截器中统一处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 左侧：品牌信息 */}
        <div className="auth-brand">
          <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>
            🏫 河海大学问答助手
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            创建账号，保留你的校园问答历史与学习线索。
          </Text>
          <ul className="feature-list">
            <li>📝 注册即可使用智能问答功能</li>
            <li>💬 多轮对话，上下文连贯</li>
            <li>📋 查看历史问答记录</li>
          </ul>
        </div>

        {/* 右侧：注册表单 */}
        <div className="auth-form">
          <Title level={3} style={{ marginBottom: 4 }}>注册</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 28 }}>
            填写以下信息创建校园账号
          </Text>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, max: 50, message: '用户名长度2-50位' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
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
                prefix={<MailOutlined />}
                placeholder="邮箱"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, max: 72, message: '密码长度6-72位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
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
                prefix={<LockOutlined />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, background: '#005BAC' }}
              >
                注 册
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Space>
              <Text type="secondary">已有账号？</Text>
              <Link to="/login">去登录</Link>
            </Space>
          </div>
        </div>
      </div>
    </div>
  )
}
