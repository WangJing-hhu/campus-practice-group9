import { useState } from 'react'
import { Button, List, Spin, Popconfirm, Input, Typography, Empty } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import type { Conversation } from '../../types/chat'

const { Text } = Typography

// ===== Props =====
export interface ConversationSidebarProps {
  /** 会话列表 */
  conversations: Conversation[]
  /** 当前选中会话 ID */
  activeConversationId: number | null
  /** 列表加载中 */
  loading: boolean
  /** 是否还有更多会话 */
  hasMore: boolean
  /** 侧栏是否收起 */
  collapsed: boolean
  /** 新建会话回调 */
  onCreate: () => void
  /** 选中会话回调 */
  onSelect: (id: number) => void
  /** 重命名会话回调 */
  onRename: (id: number, title: string) => void
  /** 删除会话回调 */
  onDelete: (id: number) => void
  /** 加载更多回调 */
  onLoadMore: () => void
  /** 收起/展开侧栏回调 */
  onCollapse: (collapsed: boolean) => void
}

// ===== 工具函数 =====
/** 将 ISO 时间字符串转为相对时间描述 */
function formatRelativeTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'

  const now = Date.now()
  const diff = now - d.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

// ===== 组件 =====
/**
 * 聊天会话侧栏。
 * 纯受控组件：所有数据通过 props 传入，交互通过回调通知父组件。
 */
export function ConversationSidebar({
  conversations,
  activeConversationId,
  loading,
  hasMore,
  collapsed,
  onCreate,
  onSelect,
  onRename,
  onDelete,
  onLoadMore,
  onCollapse,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditingTitle(conv.title)
  }

  const submitRename = () => {
    if (editingId !== null && editingTitle.trim()) {
      onRename(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  // ---- 收起状态：仅显示展开按钮 ----
  if (collapsed) {
    return (
      <div className="chat-sidebar chat-sidebar--collapsed">
        <Button
          type="text"
          icon={<MenuUnfoldOutlined />}
          onClick={() => onCollapse(false)}
          className="chat-sidebar__toggle-btn"
          title="展开会话列表"
        />
      </div>
    )
  }

  // ---- 正常状态 ----
  return (
    <div className="chat-sidebar">
      {/* 头部 */}
      <div className="chat-sidebar__header">
        <Text strong className="chat-sidebar__title">
          对话历史
        </Text>
        <div className="chat-sidebar__header-actions">
          <Button
            type="text"
            size="small"
            icon={<MenuFoldOutlined />}
            onClick={() => onCollapse(true)}
            className="chat-sidebar__collapse-btn"
            title="收起侧栏"
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            新建会话
          </Button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="chat-sidebar__list">
        {/* 首次加载中 */}
        {loading && conversations.length === 0 ? (
          <div className="chat-sidebar__loading">
            <Spin tip="加载中…" />
          </div>
        ) : conversations.length === 0 ? (
          /* 空列表 */
          <div className="chat-sidebar__empty">
            <Empty
              description="暂无会话记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <Button
              type="primary"
              onClick={onCreate}
              style={{ marginTop: 12 }}
            >
              开始第一个会话
            </Button>
          </div>
        ) : (
          <List
            dataSource={conversations}
            renderItem={(conv) => {
              const isActive = conv.id === activeConversationId
              const isEditing = conv.id === editingId

              return (
                <div
                  key={conv.id}
                  className={`chat-sidebar__item${isActive ? ' chat-sidebar__item--active' : ''}`}
                  onClick={() => {
                    if (!isEditing) onSelect(conv.id)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isEditing) onSelect(conv.id)
                  }}
                >
                  <MessageOutlined className="chat-sidebar__item-icon" />

                  <div className="chat-sidebar__item-body">
                    {isEditing ? (
                      <Input
                        size="small"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onPressEnter={submitRename}
                        onBlur={cancelRename}
                        autoFocus
                        maxLength={50}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <Text
                          className="chat-sidebar__item-title"
                          ellipsis={{ tooltip: conv.title }}
                        >
                          {conv.title}
                        </Text>
                        <Text
                          type="secondary"
                          className="chat-sidebar__item-time"
                        >
                          {formatRelativeTime(conv.updateTime)}
                        </Text>
                      </>
                    )}
                  </div>

                  {/* 操作按钮：当前激活项显示 */}
                  {isActive && !isEditing && (
                    <div
                      className="chat-sidebar__item-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startRename(conv)}
                        title="重命名"
                      />
                      <Popconfirm
                        title="确定删除该会话？"
                        description="删除后无法恢复"
                        onConfirm={() => onDelete(conv.id)}
                        okText="确认删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          title="删除"
                        />
                      </Popconfirm>
                    </div>
                  )}
                </div>
              )
            }}
          />
        )}
      </div>

      {/* 加载更多 */}
      {hasMore && conversations.length > 0 && (
        <div className="chat-sidebar__footer">
          <Button
            type="link"
            block
            loading={loading}
            onClick={onLoadMore}
          >
            加载更多
          </Button>
        </div>
      )}
    </div>
  )
}
