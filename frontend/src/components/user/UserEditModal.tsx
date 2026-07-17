import { useEffect } from 'react'
import { Modal, Form, Input, Select } from 'antd'
import type { UserRecord, UserUpdatePayload, UserCreatePayload } from '../../api/user'

// ===== ???? / ???????? =====

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

  // ?????????
  useEffect(() => {
    if (!open) return
    if (isCreate) {
      form.resetFields()
    } else if (user) {
      form.setFieldsValue({
        email: user.email,
        role: user.role,
      })
    }
  }, [open, mode, user, form, isCreate])

  // ?????
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

  const title = isCreate ? '????' : '??????'
  const okText = isCreate ? '??' : '??'

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
      mask={{ closable: !loading }}
      centered
      okText={okText}
      cancelText="??"
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        preserve={false}
        size="middle"
      >
        {/* ??? */}
        {isCreate ? (
          <Form.Item
            name="username"
            label="???"
            rules={[
              { required: true, message: '??????' },
              { min: 2, max: 50, message: '?????2?50?' },
            ]}
          >
            <Input
              placeholder="??????"
              disabled={loading}
              autoComplete="off"
            />
          </Form.Item>
        ) : (
          <Form.Item label="???">
            <Input value={user?.username ?? ''} readOnly disabled />
          </Form.Item>
        )}

        {/* ??????? */}
        {isCreate && (
          <>
            <Form.Item
              name="password"
              label="??"
              rules={[
                { required: true, message: '?????' },
                { min: 6, max: 72, message: '????6?72?' },
              ]}
            >
              <Input.Password
                placeholder="?????"
                disabled={loading}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="????"
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
                placeholder="???????"
                disabled={loading}
                autoComplete="new-password"
              />
            </Form.Item>
          </>
        )}

        {/* ?? */}
        <Form.Item
          name="email"
          label="??"
          rules={[
            { required: true, message: '??????' },
            { type: 'email', message: '??????????' },
          ]}
        >
          <Input placeholder="???????" disabled={loading} />
        </Form.Item>

        {/* ?? */}
        <Form.Item
          name="role"
          label="??"
          initialValue="user"
          rules={[{ required: true, message: '?????' }]}
        >
          <Select
            disabled={loading}
            options={[
              { value: 'user', label: '????' },
              { value: 'admin', label: '???' },
            ]}
          />
        </Form.Item>

        {isCreate && (
          <Form.Item
            name="status"
            label="??"
            initialValue={1}
            rules={[{ required: true, message: '?????' }]}
          >
            <Select
              disabled={loading}
              options={[
                { value: 1, label: '??' },
                { value: 0, label: '??' },
              ]}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
