import { Table, Button, Space, Modal } from 'antd'
import { EditOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { UserRecord, UserStatus } from '../../api/user'
import { UserRoleTag, UserStatusTag } from './UserStatusTag'
import { showDeleteConfirm } from './UserDeleteConfirm'

// ===== 用户表格 =====

interface UserTableProps {
  users: UserRecord[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  actionLoadingId: number | null
  onEdit: (user: UserRecord) => void
  onToggleStatus: (user: UserRecord) => void
  onDelete: (user: UserRecord) => void
  onPageChange: (page: number, pageSize: number) => void
}

/** 格式化创建时间，非法时返回 "—" */
function formatTime(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function UserTable({
  users,
  total,
  page,
  pageSize,
  loading,
  actionLoadingId,
  onEdit,
  onToggleStatus,
  onDelete,
  onPageChange,
}: UserTableProps) {
  // 状态启停确认
  const handleToggleClick = (user: UserRecord) => {
    const newStatus: UserStatus = user.status === 1 ? 0 : 1
    const action = newStatus === 1 ? '启用' : '禁用'
    const description =
      newStatus === 1
        ? `确定要启用用户「${user.username}」吗？启用后该用户将恢复系统使用权限。`
        : `确定要禁用用户「${user.username}」吗？禁用后该用户将无法正常使用系统。`

    Modal.confirm({
      centered: true,
      title: `确认${action}用户`,
      content: description,
      okText: `确认${action}`,
      cancelText: '取消',
      okButtonProps: {
        danger: newStatus === 0,
      },
      onOk: () => {
        onToggleStatus(user)
      },
    })
  }

  // 删除确认
  const handleDeleteClick = (user: UserRecord) => {
    showDeleteConfirm({
      username: user.username,
      onOk: () => {
        onDelete(user)
      },
    })
  }

  const columns: ColumnsType<UserRecord> = [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_: unknown, __: UserRecord, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 140,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 220,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRecord['role']) => <UserRoleTag role={role} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: UserRecord['status']) => <UserStatusTag status={status} />,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (t: string) => formatTime(t),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_: unknown, user: UserRecord) => {
        const isBusy = actionLoadingId === user.id
        return (
          <Space size="small" wrap>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(user)}
              disabled={isBusy}
            >
              编辑
            </Button>

            {user.status === 1 ? (
              <Button
                type="link"
                size="small"
                icon={<StopOutlined />}
                onClick={() => handleToggleClick(user)}
                disabled={isBusy}
              >
                禁用
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleToggleClick(user)}
                disabled={isBusy}
                style={{ color: '#52c41a' }}
              >
                启用
              </Button>
            )}

            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(user)}
              disabled={isBusy}
            >
              删除
            </Button>
          </Space>
        )
      },
    },
  ]

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total,
    showTotal: (total: number) => `共 ${total} 条`,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50'],
    onChange: (p, ps) => {
      onPageChange(p, ps)
    },
  }

  return (
    <Table<UserRecord>
      rowKey="id"
      columns={columns}
      dataSource={users}
      loading={loading}
      pagination={pagination}
      scroll={{ x: 1000 }}
      locale={{
        emptyText: '暂无用户数据',
      }}
    />
  )
}
