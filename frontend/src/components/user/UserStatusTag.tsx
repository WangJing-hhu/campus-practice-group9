import type { UserRole, UserStatusValue } from "../../api/user";

interface RoleTagProps {
  role: UserRole;
}

interface StatusTagProps {
  status: UserStatusValue;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理员",
  user: "普通用户",
};

const STATUS_LABEL: Record<UserStatusValue, string> = {
  1: "启用",
  0: "禁用",
};

export function UserRoleTag({ role }: RoleTagProps) {
  return (
    <span className={`user-badge user-badge--role-${role}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

export function UserStatusTag({ status }: StatusTagProps) {
  return (
    <span className={`user-badge user-badge--status-${status}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
