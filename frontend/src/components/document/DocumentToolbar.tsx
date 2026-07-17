import { useState } from 'react'
import { Input, Select, Button } from 'antd'
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
  /** 外部加载状态 */
  loading: boolean
  /** 搜索回调：父容器收到后才请求列表 */
  onSearch: (keyword: string, status: string) => void
  /** 重置回调：清空条件并重新加载全部数据 */
  onReset: () => void
}

/**
 * 文档搜索工具栏。
 *
 * 自行管理草稿状态（draftKeyword / draftStatus）：
 * - 输入关键词和修改状态下拉框不会立即请求接口。
 * - 点击"搜索"或按 Enter 后才通过 onSearch 通知父容器。
 * - 点击"重置"清空草稿条件并通过 onReset 通知父容器。
 */
export function DocumentToolbar({
  loading,
  onSearch,
  onReset,
}: DocumentToolbarProps) {
  const [draftKeyword, setDraftKeyword] = useState('')
  const [draftStatus, setDraftStatus] = useState<string>('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(draftKeyword, draftStatus)
    }
  }

  const handleReset = () => {
    setDraftKeyword('')
    setDraftStatus('')
    onReset()
  }

  return (
    <div className="kb-toolbar">
      <Input
        className="kb-toolbar-keyword"
        placeholder="搜索文档标题"
        prefix={<SearchOutlined />}
        value={draftKeyword}
        onChange={(e) => setDraftKeyword(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        allowClear
      />

      <Select
        className="kb-toolbar-status"
        value={draftStatus || undefined}
        placeholder="全部状态"
        onChange={(value) => setDraftStatus(value ?? '')}
        disabled={loading}
        allowClear
        options={STATUS_OPTIONS}
      />

      <Button
        type="primary"
        icon={<SearchOutlined />}
        onClick={() => onSearch(draftKeyword, draftStatus)}
        loading={loading}
      >
        搜索
      </Button>

      <Button
        icon={<ReloadOutlined />}
        onClick={handleReset}
        disabled={loading}
      >
        重置
      </Button>
    </div>
  )
}
