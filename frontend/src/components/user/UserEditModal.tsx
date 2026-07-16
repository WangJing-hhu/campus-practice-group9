import { useEffect } from 'react'
import { Modal, Form, Input, Select } from 'antd'
import type { UserRecord, UserUpdatePayload, UserCreatePayload } from '../../api/user'

// ===== 用户新增 / 编辑弹窗（共用） =====

interface UserEditModalProps {
  open: boolean
  mode: 'create' | 'edit'
  user?: UserRecord | null
  loading: boolean
  onCancel: () => void
  onCreate: (payload: UserCreatePayload) => Promise<void>
  onUpdate: (id: number, payload: UserUpdatePayload) => Promise<void>
}

export function UserEditModal({
  open,
  mode,
  user,
  loading,
  onCancel,
  onCreate,
  onUpdate,
}: UserEditModalProps) {
  const [form] = Form.useForm()
  const isCreate = mode === 'create'

  // 打开时加载表单数据
  useEffect(() => {
    if (!open) return
    if (isCreate) {
      form.resetFields()
      form.setFieldsValue({ role: 'user', status: 1 })
    } else if (user) {
      form.setFieldsValue({
        email: user.email,
        role: user.role,
      })
    }
  }, [open, mode, user, form, isCreate])

  // 关闭后清理
  const handleClose = () => {
    form.resetFields()
    onCancel()
  }

  const handleFinish = async (values: Record<string, unknown>) => {
    if (isCreate) {
      await onCreate({
        username: String(values.username).trim(),
        password: String(values.password),
        email: String(values.email).trim(),
        role: values.role as UserCreatePayload['role'],
        status: values.status as UserCreatePayload['status'],
      })
    } else if (user) {
      await onUpdate(user.id, {
        email: String(values.email).trim(),
        role: values.role as UserUpdatePayload['role'],
      })
    }
  }

  const title = isCreate ? '新增用户' : '编辑用户信息'
  const okText = isCreate ? '创建' : '保存'

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      maskClosable={!loading}
      centered
      okText={okText}
      cancelText="取消"
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        preserve={false}
        size="middle"
      >
        {/* 用户名 */}
        {isCreate ? (
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 50, message: '用户名长度2—50位' },
            ]}
          >
            <Input
              placeholder="请输入用户名"
              disabled={loading}
              autoComplete="off"
            />
          </Form.Item>
        ) : (
          <Form.Item label="用户名">
            <Input value={user?.username ?? ''} readOnly disabled />
          </Form.Item>
        )}

        {/* 密码（仅新增） */}
        {isCreate && (
          <>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, max: 72, message: '密码长度6—72位' },
              ]}
            >
              <Input.Password
                placeholder="请输入密码"
                disabled={loading}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
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
                placeholder="请再次输入密码"
                disabled={loading}
                autoComplete="new-password"
              />
            </Form.Item>
          </>
        )}

        {/* 邮箱 */}
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '邮箱不能为空' },
            { type: 'email', message: '请输入正确的邮箱格式' },
          ]}
        >
          <Input placeholder="请输入邮箱地址" disabled={loading} />
        </Form.Item>

        {/* 角色 */}
        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select
            disabled={loading}
            options={[
              { value: 'user', label: '普通用户' },
              { value: 'admin', label: '管理员' },
            ]}
          />
        </Form.Item>

        {/* 状态（仅新增） */}
        {isCreate && (
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              disabled={loading}
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '禁用' },
              ]}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
