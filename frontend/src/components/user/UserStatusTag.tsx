import { Tag } from 'antd'
import type { UserRole, UserStatus } from '../../api/user'

// ===== 用户角色 & 状态标签（基于 Ant Design Tag） =====

interface RoleTagProps {
  role: UserRole
}

interface StatusTagProps {
  status: UserStatus
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'blue' },
  user: { label: '普通用户', color: 'default' },
}

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  1: { label: '启用', color: 'green' },
  0: { label: '禁用', color: 'gold' },
}

/** 角色标签 */
export function UserRoleTag({ role }: RoleTagProps) {
  const cfg = ROLE_CONFIG[role]
  return <Tag color={cfg.color}>{cfg.label}</Tag>
}

/** 状态标签 */
export function UserStatusTag({ status }: StatusTagProps) {
  const cfg = STATUS_CONFIG[status]
  return <Tag color={cfg.color}>{cfg.label}</Tag>
}
