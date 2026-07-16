import {
  Pencil,
  UserCheck,
  UserX,
  Trash2,
  Loader,
} from "lucide-react";
import type { UserRecord } from "../../api/user";
import { UserRoleTag, UserStatusTag } from "./UserStatusTag";

interface UserTableProps {
  users: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  actionLoadingId: number | null;
  onEdit: (user: UserRecord) => void;
  onToggleStatus: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageSizeOptions = [10, 20, 50];

  const handleStatusToggle = (user: UserRecord) => {
    if (actionLoadingId === user.id) return;
    onToggleStatus(user);
  };

  const handleDelete = (user: UserRecord) => {
    if (actionLoadingId === user.id) return;
    onDelete(user);
  };

  return (
    <div className="um-table-container">
      {/* table */}
      <div className="um-table-scroll">
        <table className="um-table">
          <thead>
            <tr>
              <th className="um-th--index">序号</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th className="um-th--actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="um-empty">
                  暂无用户数据
                </td>
              </tr>
            )}
            {users.length === 0 && loading && (
              <tr>
                <td colSpan={7} className="um-empty">
                  <Loader size={18} className="spin" /> 加载中...
                </td>
              </tr>
            )}
            {users.map((user, idx) => {
              const seq = (page - 1) * pageSize + idx + 1;
              const isBusy = actionLoadingId === user.id;

              return (
                <tr key={user.id}>
                  <td className="um-td--index">{seq}</td>
                  <td className="um-td--name">{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <UserRoleTag role={user.role} />
                  </td>
                  <td>
                    <UserStatusTag status={user.status} />
                  </td>
                  <td className="um-td--time">
                    {formatTime(user.createTime)}
                  </td>
                  <td className="um-td--actions">
                    <div className="um-actions">
                      <button
                        className="um-action-btn"
                        onClick={() => onEdit(user)}
                        disabled={isBusy}
                        title="编辑"
                      >
                        <Pencil size={13} />
                        <span>编辑</span>
                      </button>

                      {user.status === 1 ? (
                        <button
                          className="um-action-btn um-action-btn--warn"
                          onClick={() => handleStatusToggle(user)}
                          disabled={isBusy}
                          title="禁用"
                        >
                          {isBusy ? (
                            <Loader size={13} className="spin" />
                          ) : (
                            <UserX size={13} />
                          )}
                          <span>禁用</span>
                        </button>
                      ) : (
                        <button
                          className="um-action-btn um-action-btn--ok"
                          onClick={() => handleStatusToggle(user)}
                          disabled={isBusy}
                          title="启用"
                        >
                          {isBusy ? (
                            <Loader size={13} className="spin" />
                          ) : (
                            <UserCheck size={13} />
                          )}
                          <span>启用</span>
                        </button>
                      )}

                      <button
                        className="um-action-btn um-action-btn--danger"
                        onClick={() => handleDelete(user)}
                        disabled={isBusy}
                        title="删除"
                      >
                        <Trash2 size={13} />
                        <span>删除</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {total > 0 && (
        <div className="um-pagination">
          <div className="um-pagination-info">共 {total} 条</div>

          <div className="um-pagination-controls">
            <div className="um-pagination-size">
              <select
                value={pageSize}
                onChange={(e) => onPageChange(1, Number(e.target.value))}
                className="um-page-size-select"
              >
                {pageSizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s} 条/页
                  </option>
                ))}
              </select>
            </div>

            <button
              className="um-page-btn"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1, pageSize)}
            >
              上一页
            </button>

            <span className="um-page-indicator">
              {page} / {totalPages}
            </span>

            <button
              className="um-page-btn"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1, pageSize)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
