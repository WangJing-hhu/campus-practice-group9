import { Tag } from 'antd'
import type { DocStatus } from '../../types/document'

// ===== 文档状态标签（基于 Ant Design Tag） =====

/** 业务状态 → 中文 + 颜色（集中维护，避免其他组件重复硬编码） */
const STATUS_CONFIG: Record<DocStatus, { label: string; color: string }> = {
  PENDING: { label: '待处理', color: 'default' },
  PROCESSING: { label: '处理中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'success' },
  FAILED: { label: '处理失败', color: 'error' },
}

interface DocumentStatusTagProps {
  status: DocStatus | undefined | null
}

/** 文档业务状态标签，兼容空状态和未知状态 */
export function DocumentStatusTag({ status }: DocumentStatusTagProps) {
  if (!status) {
    return <Tag color="default">未知</Tag>
  }
  const cfg = STATUS_CONFIG[status]
  if (!cfg) {
    return <Tag color="default">{status}</Tag>
  }
  return <Tag color={cfg.color}>{cfg.label}</Tag>
}
