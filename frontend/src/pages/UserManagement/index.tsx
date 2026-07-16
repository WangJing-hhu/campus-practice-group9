import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/auth-context";
import {
  getUserList,
  updateUser,
  updateUserStatus,
  deleteUser,
  type UserRecord,
  type UserListParams,
  type UserUpdatePayload,
  type UserStatusValue,
} from "../../api/user";
import type { UserFilters } from "../../components/user/UserSearchBar";
import { UserSearchBar } from "../../components/user/UserSearchBar";
import { UserTable } from "../../components/user/UserTable";
import { UserEditModal } from "../../components/user/UserEditModal";
import { UserDeleteConfirm } from "../../components/user/UserDeleteConfirm";
import { ShieldAlert, Loader } from "lucide-react";
import "../../styles/users.css";

/* ---------- helpers ---------- */

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastId = 0;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // try to extract back-end message
    const msg = err.message;
    if (msg && msg !== "请求失败" && !msg.startsWith("HTTP ")) return msg;
    return "操作失败，请稍后重试";
  }
  return "未知错误";
}

function isPermissionDenied(err: unknown): boolean {
  if (err instanceof Error) {
    const e = err as Error & { httpStatus?: number; bizCode?: number };
    return e.httpStatus === 403 || e.bizCode === 403;
  }
  return false;
}

const DEFAULT_FILTERS: UserFilters = { keyword: "", role: "", status: "" };

/* ---------- page ---------- */

export function UserManagement() {
  const { token, isAdmin } = useAuth();

  /* data */
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<UserFilters>({
    ...DEFAULT_FILTERS,
  });

  /* ui */
  const [listLoading, setListLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  /* delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* status toggle confirm (inline modal) */
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  /* permission */
  const [permissionDenied, setPermissionDenied] = useState(false);

  /* toast */
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addToast = useCallback(
    (type: "success" | "error", message: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        if (mountedRef.current) {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }
      }, 3200);
    },
    [],
  );

  /* --- data loading --- */

  const loadList = useCallback(
    async (p: number, ps: number, f: UserFilters) => {
      if (!token) return;
      setListLoading(true);
      try {
        const params: UserListParams = {
          page: p,
          size: ps,
          keyword: f.keyword || undefined,
          role: f.role || undefined,
          status: f.status || undefined,
        };
        const result = await getUserList(token, params);
        if (!mountedRef.current) return;
        setUsers(result.records ?? []);
        setTotal(result.total ?? 0);
        setPage(result.current || p);
        setPageSize(result.size || ps);
        setPermissionDenied(false);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        if (isPermissionDenied(err)) {
          setPermissionDenied(true);
          setUsers([]);
          setTotal(0);
        } else {
          addToast("error", getErrorMessage(err));
        }
      } finally {
        if (mountedRef.current) setListLoading(false);
      }
    },
    [token, addToast],
  );

  // initial load
  useEffect(() => {
    loadList(page, pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- search / reset --- */

  const handleSearch = useCallback(
    (f: UserFilters) => {
      setFilters(f);
      loadList(1, pageSize, f);
    },
    [pageSize, loadList],
  );

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    loadList(1, pageSize, DEFAULT_FILTERS);
  }, [pageSize, loadList]);

  /* --- page change --- */

  const handlePageChange = useCallback(
    (p: number, ps: number) => {
      loadList(p, ps, filters);
    },
    [filters, loadList],
  );

  /* --- edit --- */

  const handleEditOpen = useCallback((user: UserRecord) => {
    setEditingUser(user);
    setEditModalOpen(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditModalOpen(false);
    setEditingUser(null);
  }, []);

  const handleEditSave = useCallback(
    async (id: number, payload: UserUpdatePayload) => {
      if (!token) return;
      setActionLoadingId(id);
      try {
        await updateUser(token, id, payload);
        if (mountedRef.current) {
          addToast("success", "用户信息修改成功");
          handleEditClose();
          loadList(page, pageSize, filters);
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          if (isPermissionDenied(err)) {
            setPermissionDenied(true);
            handleEditClose();
          } else {
            addToast("error", getErrorMessage(err));
          }
        }
      } finally {
        if (mountedRef.current) setActionLoadingId(null);
      }
    },
    [token, page, pageSize, filters, loadList, addToast, handleEditClose],
  );

  /* --- toggle status --- */

  const handleStatusRequest = useCallback((user: UserRecord) => {
    setStatusTarget(user);
  }, []);

  const handleStatusConfirm = useCallback(async () => {
    const user = statusTarget;
    if (!token || !user) return;
    setStatusLoading(true);
    const newStatus: UserStatusValue = user.status === 1 ? 0 : 1;
    try {
      await updateUserStatus(token, user.id, newStatus);
      if (mountedRef.current) {
        addToast(
          "success",
          newStatus === 1 ? "用户已启用" : "用户已禁用",
        );
        setStatusTarget(null);
        loadList(page, pageSize, filters);
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        if (isPermissionDenied(err)) {
          setPermissionDenied(true);
          setStatusTarget(null);
        } else {
          addToast("error", getErrorMessage(err));
        }
      }
    } finally {
      if (mountedRef.current) setStatusLoading(false);
    }
  }, [token, statusTarget, page, pageSize, filters, loadList, addToast]);

  const handleStatusCancel = useCallback(() => {
    setStatusTarget(null);
  }, []);

  /* --- delete --- */

  const handleDeleteRequest = useCallback((user: UserRecord) => {
    setDeleteTarget(user);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const user = deleteTarget;
    if (!token || !user) return;
    setDeleteLoading(true);
    try {
      await deleteUser(token, user.id);
      if (mountedRef.current) {
        addToast("success", "用户已删除");
        setDeleteTarget(null);
        // if this was the last record on the page, go back one page
        const remaining = total - 1;
        const newPage =
          remaining <= (page - 1) * pageSize && page > 1 ? page - 1 : page;
        loadList(newPage, pageSize, filters);
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        if (isPermissionDenied(err)) {
          setPermissionDenied(true);
          setDeleteTarget(null);
        } else {
          addToast("error", getErrorMessage(err));
        }
      }
    } finally {
      if (mountedRef.current) setDeleteLoading(false);
    }
  }, [
    token,
    deleteTarget,
    total,
    page,
    pageSize,
    filters,
    loadList,
    addToast,
  ]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  /* --- permission denied --- */

  if (!isAdmin() || permissionDenied) {
    return (
      <div className="admin-page">
        <header className="page-heading">
          <div>
            <span className="eyebrow">IDENTITY & ACCESS</span>
            <h1>用户管理</h1>
            <p>管理系统用户的角色、状态和基本信息</p>
          </div>
          <span className="page-index">03</span>
        </header>

        <div className="um-forbidden">
          <div className="um-forbidden-card">
            <span className="um-forbidden-icon">
              <ShieldAlert size={48} />
            </span>
            <h2>无权限访问</h2>
            <p>仅管理员可以访问用户管理页面</p>
            <span className="um-forbidden-code">HTTP 403</span>
          </div>
        </div>
      </div>
    );
  }

  /* --- normal admin view --- */

  return (
    <div className="admin-page">
      {/* toast container */}
      {toasts.length > 0 && (
        <div className="um-toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`um-toast um-toast--${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* heading */}
      <header className="page-heading">
        <div>
          <span className="eyebrow">IDENTITY & ACCESS</span>
          <h1>用户管理</h1>
          <p>管理系统用户的角色、状态和基本信息</p>
        </div>
        <span className="page-index">03</span>
      </header>

      {/* search */}
      <div className="um-section">
        <UserSearchBar
          filters={filters}
          loading={listLoading}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      {/* table */}
      <div className="um-section">
        <UserTable
          users={users}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={listLoading}
          actionLoadingId={actionLoadingId}
          onEdit={handleEditOpen}
          onToggleStatus={handleStatusRequest}
          onDelete={handleDeleteRequest}
          onPageChange={handlePageChange}
        />
      </div>

      {/* edit modal */}
      <UserEditModal
        user={editingUser}
        open={editModalOpen}
        loading={actionLoadingId === editingUser?.id}
        onSave={handleEditSave}
        onClose={handleEditClose}
      />

      {/* delete confirm */}
      <UserDeleteConfirm
        username={deleteTarget?.username ?? ""}
        open={deleteTarget !== null}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* status toggle confirm */}
      {statusTarget && (
        <div className="um-overlay" onClick={handleStatusCancel}>
          <div
            className="um-modal um-modal--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="um-confirm-title">
              {statusTarget.status === 1 ? "确认禁用用户" : "确认启用用户"}
            </h3>
            <p className="um-confirm-desc">
              {statusTarget.status === 1
                ? `确定要禁用用户「${statusTarget.username}」吗？禁用后该用户将无法正常使用系统。`
                : `确定要启用用户「${statusTarget.username}」吗？启用后该用户将恢复系统使用权限。`}
            </p>
            <div className="um-confirm-actions">
              <button
                className="um-btn um-btn--ghost"
                onClick={handleStatusCancel}
                disabled={statusLoading}
              >
                取消
              </button>
              <button
                className={`um-btn ${statusTarget.status === 1 ? "um-btn--warn" : "um-btn--primary"}`}
                onClick={handleStatusConfirm}
                disabled={statusLoading}
              >
                {statusLoading ? (
                  <>
                    <Loader size={14} className="spin" /> 处理中...
                  </>
                ) : statusTarget.status === 1 ? (
                  "确认禁用"
                ) : (
                  "确认启用"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
