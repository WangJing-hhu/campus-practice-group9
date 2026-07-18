import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { message, Button } from 'antd'
import { useAuthStore } from '../../store/auth'
import {
  sendChatStream,
  getConversations,
  getConversationDetail,
  updateConversationTitle,
  deleteConversation,
} from '../../api/chat'
import { useChatStream } from '../../hooks/useChatStream'
import type {
  Conversation,
  ChatSource,
  StreamMeta,
} from '../../types/chat'
import { ConversationSidebar } from '../../components/chat/ConversationSidebar'
import { MessageList } from '../../components/chat/MessageList'
import { ChatInput } from '../../components/chat/ChatInput'
import type { ChatMessage } from '../../components/chat/MessageList'
import '../../styles/chat.css'

// ===== 聊天页面容器 =====
// 负责：会话管理、消息流、SSE解析、状态分发
// 孙凤摇的聊天组件通过 props 接入

interface MessageItem {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  recordId?: number
}

/** 失败请求信息，用于重试 */
interface FailedRequest {
  question: string
  conversationId: number | null
}

type SendOptions = {
  retry?: boolean
}

export function ChatPage() {
  const { isLoggedIn } = useAuthStore()

  // 会话
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const CONVERSATION_PAGE_SIZE = 20
  const [convPage, setConvPage] = useState(1)
  const [convTotal, setConvTotal] = useState(0)
  const [convLoading, setConvLoading] = useState(false)

  // 消息
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingSources, setStreamingSources] = useState<ChatSource[]>([])
  const [error, setError] = useState<string | null>(null)

  // 详情加载
  const [detailLoading, setDetailLoading] = useState(false)

  // 失败请求（用于重试）
  const [lastFailedRequest, setLastFailedRequest] = useState<FailedRequest | null>(null)

  // UI 状态
  const [inputValue, setInputValue] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const mounted = useRef(true)
  const currentConversationId = useRef<number | null>(null)

  const { startStream, stopStream } = useChatStream()

  useEffect(() => {
    return () => { mounted.current = false }
  }, [])

  // ===== 加载会话列表 =====
  const loadConversations = useCallback(async (page: number, append = false) => {
    setConvLoading(true)
    try {
      const result = await getConversations({ page, size: CONVERSATION_PAGE_SIZE })
      if (!mounted.current) return
      setConversations((prev) => {
        if (!append) {
          return result.records ?? []
        }
        const merged = [...prev, ...(result.records ?? [])]
        return Array.from(
          new Map(merged.map((item) => [item.id, item])).values(),
        )
      })
      setConvTotal(result.total ?? 0)
      setConvPage(result.current ?? page)
    } catch {
      // request.ts 拦截器统一提示
    } finally {
      if (mounted.current) setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 加载会话详情 =====
  const loadConversationDetail = useCallback(async (id: number) => {
    setDetailLoading(true)
    setError(null)
    try {
      const detail = await getConversationDetail(id)
      if (!mounted.current) return
      // 每条 ChatRecord 展开为 用户问题 + 助手回答 两条消息
      const msgs: MessageItem[] = []
      for (const r of (detail.records || [])) {
        if (r.question) {
          msgs.push({ role: 'user', content: r.question, recordId: r.id })
        }
        if (r.answer) {
          msgs.push({ role: 'assistant', content: r.answer, sources: r.sourceDocs || [], recordId: r.id })
        }
      }
      setMessages(msgs)
      setActiveConversationId(id)
      currentConversationId.current = id
    } catch {
      // request.ts 统一提示
    } finally {
      if (mounted.current) setDetailLoading(false)
    }
  }, [])

  // ===== 新建会话 =====
  const handleNewChat = useCallback(() => {
    setMessages([])
    setActiveConversationId(null)
    currentConversationId.current = null
    setStreamingText('')
    setStreamingSources([])
    setError(null)
    setInputValue('')
    setLastFailedRequest(null)
  }, [])

  // ===== 发送消息 =====
  const handleSend = useCallback(async (explicitQuestion: string, options: SendOptions = {}) => {
    if (!explicitQuestion.trim() || sending) return
    if (detailLoading || convLoading) return

    setError(null)
    setSending(true)
    setStreamingText('')
    setStreamingSources([])

    // 正常发送时清空输入框
    if (!options.retry) {
      setInputValue('')
    }

    // 非重试模式才追加用户消息（避免重复气泡）
    if (!options.retry) {
      const userMsg: MessageItem = { role: 'user', content: explicitQuestion }
      setMessages((prev) => [...prev, userMsg])
    }

    let fullAnswer = ''
    let sources: ChatSource[] = []

    await startStream(
      (signal) =>
        sendChatStream(
          {
            question: explicitQuestion,
            conversationId: currentConversationId.current ?? undefined,
          },
          signal,
        ),
      {
        onMeta: (meta: StreamMeta) => {
          if (!mounted.current) return
          sources = meta.sources || []
          setStreamingSources(sources)
          // 首问时更新 conversationId
          if (!currentConversationId.current && meta.conversationId) {
            currentConversationId.current = meta.conversationId
            setActiveConversationId(meta.conversationId)
            loadConversations(1) // 刷新侧栏
          }
        },
        onToken: (text: string) => {
          if (!mounted.current) return
          fullAnswer += text
          setStreamingText(fullAnswer)
        },
        onDone: (recordId: number) => {
          if (!mounted.current) return
          setSending(false)
          setLastFailedRequest(null)
          // 添加助手消息，保存后端返回的 recordId
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: fullAnswer,
              sources,
              recordId,
            },
          ])
          setStreamingText('')
          setStreamingSources([])
        },
        onError: (msg: string) => {
          if (!mounted.current) return
          setSending(false)
          setError(msg)
          // 保存失败请求以便重试
          setLastFailedRequest({
            question: explicitQuestion,
            conversationId: currentConversationId.current ?? null,
          })
          if (fullAnswer) {
            // 保留已收到的内容
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: fullAnswer + '\n\n[回答中断]',
                sources,
                recordId: undefined,
              },
            ])
          }
          setStreamingText('')
        },
      },
    )
  }, [sending, detailLoading, convLoading, startStream, loadConversations])

  // ===== 切换会话 =====
  const handleSelectConversation = useCallback((id: number) => {
    if (id === activeConversationId) return
    // 如果有正在进行的生成，先停止
    stopStream()
    setSending(false)
    setStreamingText('')
    setLastFailedRequest(null)
    loadConversationDetail(id)
  }, [activeConversationId, stopStream, loadConversationDetail])

  // ===== 删除会话 =====
  const handleDeleteConversation = useCallback(async (id: number) => {
    try {
      await deleteConversation(id)
      message.success('会话已删除')
      if (id === activeConversationId) {
        handleNewChat()
      }
      loadConversations(1, false)
    } catch {
      // request.ts 统一提示
    }
  }, [activeConversationId, loadConversations, handleNewChat])

  // ===== 重命名会话 =====
  const handleRename = useCallback(async (id: number, title: string) => {
    try {
      await updateConversationTitle(id, title)
      message.success('标题已更新')
      loadConversations(1, false)
    } catch {
      // request.ts 统一提示
    }
  }, [loadConversations])

  // ===== 停止生成 =====
  const handleStop = useCallback(() => {
    stopStream()
    setSending(false)
    // 保留已流式输出的内容
    if (streamingText) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: streamingText,
          sources: streamingSources,
          recordId: undefined,
        },
      ])
      setStreamingText('')
      setStreamingSources([])
    }
  }, [stopStream, streamingText, streamingSources])

  // ===== 加载更多会话 =====
  const handleLoadMore = useCallback(() => {
    if (convLoading) return
    if (conversations.length >= convTotal) return
    const nextPage = convPage + 1
    loadConversations(nextPage, true)
  }, [convLoading, conversations.length, convTotal, convPage, loadConversations])

  // ===== 重新连接（网络错误重试） =====
  const handleRetry = useCallback(() => {
    setError(null)

    // 第一优先：存在失败请求时，真正重发问题
    if (lastFailedRequest) {
      // 如果有会话 ID，先确保 currentConversationId 指向失败时的会话
      if (lastFailedRequest.conversationId != null) {
        currentConversationId.current = lastFailedRequest.conversationId
        setActiveConversationId(lastFailedRequest.conversationId)
      }
      void handleSend(lastFailedRequest.question, { retry: true })
      return
    }

    // 第二优先：重新加载当前会话详情
    if (currentConversationId.current != null) {
      void loadConversationDetail(currentConversationId.current)
      return
    }

    // 最后：重新加载会话列表
    void loadConversations(1, false)
  }, [lastFailedRequest, handleSend, loadConversationDetail, loadConversations])

  // ===== 转换为组件需要的消息格式 =====
  const uiMessages: ChatMessage[] = useMemo(() => {
    const mapped: ChatMessage[] = messages.map((msg, index) => ({
      id:
        msg.recordId != null
          ? `${msg.recordId}-${msg.role}`
          : `${msg.role}-${index}`,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      isStreaming: false,
      isError: false,
    }))

    // 发送中或流式输出中，立即创建流式助手气泡
    if (sending || streamingText) {
      mapped.push({
        id: `streaming-${currentConversationId.current ?? 'new'}`,
        role: 'assistant',
        content: streamingText,
        sources: streamingSources,
        isStreaming: sending,
        isError: false,
      })
    }

    return mapped
  }, [messages, streamingText, streamingSources, sending])

  // ===== 空状态类型 =====
  const emptyStatus = error && messages.length === 0 ? 'network-error' as const : 'normal' as const

  // ===== 未登录 =====
  if (!isLoggedIn()) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2>请先登录</h2>
        <p style={{ color: '#888' }}>登录后可使用智能问答功能</p>
      </div>
    )
  }

  return (
    <div
      style={{
        margin: -20,
        height: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="chat-layout" style={{ flex: 1, minHeight: 0 }}>
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          loading={convLoading}
          hasMore={conversations.length < convTotal}
          collapsed={sidebarCollapsed}
          onCreate={handleNewChat}
          onSelect={handleSelectConversation}
          onRename={handleRename}
          onDelete={handleDeleteConversation}
          onLoadMore={handleLoadMore}
          onCollapse={setSidebarCollapsed}
        />

        <div className="chat-layout__main">
          <div className="chat-layout__messages">
            <MessageList
              messages={uiMessages}
              loading={detailLoading}
              emptyStatus={emptyStatus}
              onSelectQuestion={handleSend}
              onRetry={handleRetry}
            />
          </div>

          {error && (
            <div style={{ textAlign: 'center', color: '#e74c3c', padding: '8px 16px', fontSize: 13, flexShrink: 0 }}>
              {error}
              {lastFailedRequest && (
                <Button
                  type="link"
                  size="small"
                  style={{ padding: '0 4px', height: 'auto', fontSize: 13 }}
                  onClick={() => handleRetry()}
                >
                  点击重试
                </Button>
              )}
            </div>
          )}

          <div className="chat-layout__input">
            <ChatInput
              value={inputValue}
              disabled={detailLoading || convLoading}
              generating={sending}
              placeholder="请输入你的问题"
              maxLength={2000}
              onChange={setInputValue}
              onSend={() => handleSend(inputValue)}
              onStop={handleStop}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
