import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Result, message } from 'antd'
import { useAuthStore } from '../../store/auth'
import {
  getUserList,
  updateUser,
  updateUserStatus,
  deleteUser,
  createUser,
  type UserRecord,
  type UserListParams,
  type UserUpdatePayload,
  type UserCreatePayload,
  type UserStatus,
} from '../../api/user'
import type { UserFilters } from '../../components/user/UserSearchBar'
import { UserSearchBar } from '../../components/user/UserSearchBar'
import { UserTable } from '../../components/user/UserTable'
import { UserEditModal } from '../../components/user/UserEditModal'
import '../../styles/users.css'

// ===== 用户管理页面 =====

const DEFAULT_FILTERS: UserFilters = { keyword: '', role: '', status: '' }

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || '操作失败，请稍后重试'
  }
  return '未知错误'
}

function isPermissionDenied(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message === '没有权限执行此操作'
  }
  return false
}

export function UserManagement() {
  const { isAdmin } = useAuthStore()

  // 数据
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<UserFilters>({ ...DEFAULT_FILTERS })

  // UI 状态
  const [listLoading, setListLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit')
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ===== 加载用户列表 =====
  const loadList = useCallback(
    async (p: number, ps: number, f: UserFilters) => {
      setListLoading(true)
      try {
        const params: UserListParams = {
          page: p,
          size: ps,
          keyword: f.keyword || undefined,
          role: f.role || undefined,
          status: f.status || undefined,
        }
        const result = await getUserList(params)
        if (!mountedRef.current) return
        setUsers(result.records ?? [])
        setTotal(result.total ?? 0)
        setPage(result.current || p)
        setPageSize(result.size || ps)
        setPermissionDenied(false)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        if (isPermissionDenied(err)) {
          setPermissionDenied(true)
          setUsers([])
          setTotal(0)
        } else {
          const msg = getErrorMessage(err)
          if (msg !== '没有权限执行此操作') {
            message.error(msg)
          }
        }
      } finally {
        if (mountedRef.current) setListLoading(false)
      }
    },
    [],
  )

  // 首次进入加载
  useEffect(() => {
    loadList(page, pageSize, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 搜索 / 重置 =====
  const handleSearch = useCallback(
    (f: UserFilters) => {
      setFilters(f)
      loadList(1, pageSize, f)
    },
    [pageSize, loadList],
  )

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
    loadList(1, pageSize, DEFAULT_FILTERS)
  }, [pageSize, loadList])

  // ===== 翻页 / pageSize 变化 =====
  const handlePageChange = useCallback(
    (p: number, ps: number) => {
      loadList(p, ps, filters)
    },
    [filters, loadList],
  )

  // ===== 打开弹窗 =====
  const handleCreate = useCallback(() => {
    setModalMode('create')
    setEditingUser(null)
    setEditModalOpen(true)
  }, [])

  const handleEditOpen = useCallback((user: UserRecord) => {
    setModalMode('edit')
    setEditingUser(user)
    setEditModalOpen(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setEditModalOpen(false)
    setEditingUser(null)
  }, [])

  // ===== 新增用户 =====
  const handleCreateSave = useCallback(
    async (payload: UserCreatePayload) => {
      setActionLoadingId(0)
      try {
        await createUser(payload)
        if (!mountedRef.current) return
        message.success('用户新增成功')
        handleModalClose()
        loadList(1, pageSize, filters)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        if (isPermissionDenied(err)) {
          setPermissionDenied(true)
          handleModalClose()
        } else {
          message.error(getErrorMessage(err))
        }
      } finally {
        if (mountedRef.current) setActionLoadingId(null)
      }
    },
    [pageSize, filters, loadList, handleModalClose],
  )

  // ===== 编辑用户 =====
  const handleEditSave = useCallback(
    async (id: number, payload: UserUpdatePayload) => {
      setActionLoadingId(id)
      try {
        await updateUser(id, payload)
        if (!mountedRef.current) return
        message.success('用户信息修改成功')
        handleModalClose()
        loadList(page, pageSize, filters)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        if (isPermissionDenied(err)) {
          setPermissionDenied(true)
          handleModalClose()
        } else {
          message.error(getErrorMessage(err))
        }
      } finally {
        if (mountedRef.current) setActionLoadingId(null)
      }
    },
    [page, pageSize, filters, loadList, handleModalClose],
  )

  // ===== 启用 / 禁用 =====
  const handleToggleStatus = useCallback(
    async (user: UserRecord) => {
      const newStatus: UserStatus = user.status === 1 ? 0 : 1
      setActionLoadingId(user.id)
      try {
        await updateUserStatus(user.id, newStatus)
        if (!mountedRef.current) return
        message.success(newStatus === 1 ? '用户已启用' : '用户已禁用')
        loadList(page, pageSize, filters)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        if (isPermissionDenied(err)) {
          setPermissionDenied(true)
        } else {
          message.error(getErrorMessage(err))
        }
      } finally {
        if (mountedRef.current) setActionLoadingId(null)
      }
    },
    [page, pageSize, filters, loadList],
  )

  // ===== 删除 =====
  const handleDelete = useCallback(
    async (user: UserRecord) => {
      setActionLoadingId(user.id)
      try {
        await deleteUser(user.id)
        if (!mountedRef.current) return
        message.success('用户已删除')

        // 当前页最后一条 → 回到上一页
        const remaining = total - 1
        const newPage =
          remaining <= (page - 1) * pageSize && page > 1 ? page - 1 : page
        loadList(newPage, pageSize, filters)
      } catch (err: unknown) {
        if (!mountedRef.current) return
        if (isPermissionDenied(err)) {
          setPermissionDenied(true)
        } else {
          message.error(getErrorMessage(err))
        }
      } finally {
        if (mountedRef.current) setActionLoadingId(null)
      }
    },
    [total, page, pageSize, filters, loadList],
  )

  // ===== 403 页面 =====
  if (!isAdmin() || permissionDenied) {
    return (
      <Result
        status="403"
        title="无权限访问"
        subTitle="仅管理员可以访问用户管理页面"
      />
    )
  }

  // ===== 正常管理页面 =====
  return (
    <div className="um-page">
      {/* 搜索筛选工具栏 */}
      <div className="um-section">
        <UserSearchBar
          filters={filters}
          loading={listLoading}
          onSearch={handleSearch}
          onReset={handleReset}
          onCreate={handleCreate}
        />
      </div>

      {/* 用户表格 */}
      <Card>
        <UserTable
          users={users}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={listLoading}
          actionLoadingId={actionLoadingId}
          onEdit={handleEditOpen}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          onPageChange={handlePageChange}
        />
      </Card>

      {/* 新增 / 编辑弹窗 */}
      <UserEditModal
        open={editModalOpen}
        mode={modalMode}
        user={modalMode === 'edit' ? editingUser : null}
        loading={modalMode === 'create' ? actionLoadingId === 0 : actionLoadingId === editingUser?.id}
        onCancel={handleModalClose}
        onCreate={handleCreateSave}
        onUpdate={handleEditSave}
      />
    </div>
  )
}
