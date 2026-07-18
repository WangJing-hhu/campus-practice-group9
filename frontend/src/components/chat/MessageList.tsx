import { useRef, useEffect, useCallback, useState } from 'react'
import { Spin } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import { ChatBubble } from './ChatBubble'
import { ChatEmpty, type ChatEmptyStatus } from './ChatEmpty'
import type { ChatSource } from '../../types/chat'

// ===== 类型定义 =====
/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/** 聊天消息（组件内部 UI 类型，在公共 ChatRecord 基础上扩展流式/错误状态） */
export interface ChatMessage {
  id: string | number
  role: MessageRole
  content: string
  sources?: ChatSource[]
  isStreaming?: boolean
  isError?: boolean
  createdAt?: string
}

// ===== Props =====
export interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 首次加载中 */
  loading: boolean
  /** 空状态类型 */
  emptyStatus?: ChatEmptyStatus
  /** 点击示例问题 */
  onSelectQuestion?: (question: string) => void
}

// ===== 常量 =====
/** 判断"接近底部"的阈值（px） */
const NEAR_BOTTOM_THRESHOLD = 80
/** 显示"回到底部"按钮的阈值（px） */
const SHOW_BUTTON_THRESHOLD = 200

// ===== 组件 =====
/**
 * 聊天消息列表。
 * 纯受控组件：展示消息列表，自动滚动管理，"回到底部"按钮。
 */
export function MessageList({
  messages,
  loading,
  emptyStatus = 'normal',
  onSelectQuestion,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // ---- 滚动到底部 ----
  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
    setShowScrollButton(false)
  }, [])

  // ---- 处理 scroll 事件 ----
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distance < NEAR_BOTTOM_THRESHOLD
    setShowScrollButton(distance > SHOW_BUTTON_THRESHOLD)
  }, [])

  // ---- 消息变化时自动滚动 ----
  useEffect(() => {
    if (isNearBottomRef.current && containerRef.current) {
      // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      })
    }
  }, [messages])

  // ---- messages 从空变为有内容时，强制滚到底部 ----
  const prevLengthRef = useRef(messages.length)
  useEffect(() => {
    if (prevLengthRef.current === 0 && messages.length > 0) {
      isNearBottomRef.current = true
      requestAnimationFrame(() => scrollToBottom(false))
    }
    prevLengthRef.current = messages.length
  }, [messages.length, scrollToBottom])

  // ---- 首次加载中 ----
  if (loading) {
    return (
      <div className="chat-messages__loading">
        <Spin tip="加载消息中…" />
      </div>
    )
  }

  // ---- 无消息：显示空状态 ----
  if (messages.length === 0) {
    return (
      <div className="chat-messages__empty">
        <ChatEmpty
          status={emptyStatus}
          onSelectQuestion={onSelectQuestion}
        />
      </div>
    )
  }

  // ---- 消息列表 ----
  return (
    <div
      className="chat-messages"
      ref={containerRef}
      onScroll={handleScroll}
    >
      <div className="chat-messages__list">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* 回到底部浮动按钮 */}
      {showScrollButton && (
        <button
          type="button"
          className="chat-messages__scroll-btn"
          onClick={() => scrollToBottom(true)}
          title="回到底部"
        >
          <DownOutlined />
        </button>
      )}
    </div>
  )
}
