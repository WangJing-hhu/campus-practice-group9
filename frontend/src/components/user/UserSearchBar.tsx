import { useState, useEffect } from 'react'
import { Card, Input, Select, Button } from 'antd'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons'

// ===== 用户搜索筛选栏 =====

export interface UserFilters {
  keyword: string
  role: string
  status: string
}

interface UserSearchBarProps {
  filters: UserFilters
  loading: boolean
  onSearch: (filters: UserFilters) => void
  onReset: () => void
  onCreate: () => void
}

const EMPTY_FILTERS: UserFilters = { keyword: '', role: '', status: '' }

export function UserSearchBar({ filters, loading, onSearch, onReset, onCreate }: UserSearchBarProps) {
  const [local, setLocal] = useState<UserFilters>(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const handleSearch = () => {
    onSearch({ ...local })
  }

  const handleReset = () => {
    setLocal({ ...EMPTY_FILTERS })
    onReset()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Card>
      <div className="um-search-grid">
        {/* 1. 关键字搜索 */}
        <Input
          className="um-search-keyword"
          placeholder="搜索用户名或邮箱"
          prefix={<SearchOutlined />}
          value={local.keyword}
          onChange={(e) => setLocal((prev) => ({ ...prev, keyword: e.target.value }))}
          onKeyDown={handleKeyDown}
          disabled={loading}
          allowClear
        />

        {/* 2. 角色筛选 */}
        <Select
          className="um-search-role"
          value={local.role || undefined}
          placeholder="全部角色"
          onChange={(value) => setLocal((prev) => ({ ...prev, role: value ?? '' }))}
          disabled={loading}
          allowClear
          options={[
            { value: 'admin', label: '管理员' },
            { value: 'user', label: '普通用户' },
          ]}
        />

        {/* 3. 状态筛选 */}
        <Select
          className="um-search-status"
          value={local.status || undefined}
          placeholder="全部状态"
          onChange={(value) => setLocal((prev) => ({ ...prev, status: value ?? '' }))}
          disabled={loading}
          allowClear
          options={[
            { value: '1', label: '启用' },
            { value: '0', label: '禁用' },
          ]}
        />

        {/* 4. 查询 */}
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          loading={loading}
          block
          style={{ background: '#005BAC', borderColor: '#005BAC' }}
        >
          查询
        </Button>

        {/* 5. 重置 */}
        <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={loading} block>
          重置
        </Button>

        {/* 6. 新增用户 */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
          block
        >
          新增用户
        </Button>
      </div>
    </Card>
  )
}
