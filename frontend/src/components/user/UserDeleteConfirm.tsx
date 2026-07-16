import { Modal } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

// ===== 用户删除确认（基于 Modal.confirm） =====

interface DeleteConfirmOptions {
  username: string
  onOk: () => Promise<void> | void
}

/** 弹出删除确认对话框，返回 Promise<boolean>（确认=true，取消=false） */
export function showDeleteConfirm({ username, onOk }: DeleteConfirmOptions) {
  Modal.confirm({
    centered: true,
    title: '确认删除用户',
    icon: <ExclamationCircleOutlined />,
    content: `即将删除用户「${username}」。此为逻辑删除，删除后该用户将不再出现在普通用户列表中。`,
    okText: '确认删除',
    cancelText: '取消',
    okButtonProps: { danger: true },
    onOk: async () => {
      await onOk()
    },
  })
}
