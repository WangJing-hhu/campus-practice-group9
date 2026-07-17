import { Input, Select, Button, Space } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { DocStatus } from '../../types/document'

// ===== 文档搜索工具栏 =====

/** 状态筛选选项 */
const STATUS_OPTIONS: { value: DocStatus; label: string }[] = [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '处理失败' },
]

interface DocumentToolbarProps {
  keyword: string
  status: string
  loading: boolean
  onKeywordChange: (keyword: string) => void
  onSearch: (keyword: string) => void
  onStatusChange: (status: string) => void
  onReset: () => void
}

/**
 * 文档搜索工具栏：
 * - 关键词输入（Enter 触发搜索）
 * - 状态下拉筛选
 * - 搜索 / 重置按钮
 *
 * 不维护与父容器重复的查询状态，全部由 props 控制。
 */
export function DocumentToolbar({
  keyword,
  status,
  loading,
  onKeywordChange,
  onSearch,
  onStatusChange,
  onReset,
}: DocumentToolbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(keyword)
    }
  }

  return (
    <div className="kb-toolbar">
      <Space wrap className="kb-toolbar-controls">
        <Input
          className="kb-toolbar-keyword"
          placeholder="搜索文档标题"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          allowClear
          style={{ width: 260 }}
        />

        <Select
          className="kb-toolbar-status"
          value={status || undefined}
          placeholder="全部状态"
          onChange={(value) => onStatusChange(value ?? '')}
          disabled={loading}
          allowClear
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
        />

        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => onSearch(keyword)}
          loading={loading}
        >
          搜索
        </Button>

        <Button
          icon={<ReloadOutlined />}
          onClick={onReset}
          disabled={loading}
        >
          重置
        </Button>
      </Space>
    </div>
  )
}
