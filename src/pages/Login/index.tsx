import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Typography, Space } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { loginApi } from '../../api/auth'
import { useAuthStore } from '../../store/auth'
import '../../styles/auth.css'

const { Title, Text } = Typography

// ===== 登录页 =====
// 使用 Ant Design Form 组件
// 接口：POST /api/user/login
export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  // 提交表单
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      // 调用登录接口
      const data = await loginApi(values)

      // 构造 User 对象存入 Zustand
      const user = {
        id: data.userId,
        username: data.username,
        email: '',           // 登录接口不返回 email，需要时调 /user/me
        role: data.role,
        status: 1,
        createTime: '',
      }

      // 保存登录状态
      login(data.token, user)
      message.success('登录成功')
      navigate('/admin')
    } catch (err: any) {
      // 错误已在 request.ts 拦截器中统一提示
      // 这里不需要再 message.error
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
            河海大学校园知识管理与智能问答平台
          </Text>
          <ul className="feature-list">
            <li>📚 基于学校官方资料，回答准确可靠</li>
            <li>🤖 AI 智能问答，7×24 小时在线</li>
            <li>🔗 每条回答附来源，可追溯原文</li>
          </ul>
        </div>

        {/* 右侧：登录表单 */}
        <div className="auth-form">
          <Title level={3} style={{ marginBottom: 4 }}>登录</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 28 }}>
            使用用户名和密码登录管理后台
          </Text>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
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
                prefix={<LockOutlined />}
                placeholder="密码"
                autoComplete="current-password"
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
                登 录
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Space>
              <Text type="secondary">还没有账号？</Text>
              <Link to="/register">去注册</Link>
            </Space>
          </div>
        </div>
      </div>
    </div>
  )
}
