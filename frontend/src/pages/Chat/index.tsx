import { useState, useEffect, useCallback, useRef } from 'react'
import { message, Spin } from 'antd'
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
  ChatRecord,
  ChatSource,
  StreamMeta,
} from '../../types/chat'

// ===== 聊天页面容器 =====
// 负责：会话管理、消息流、SSE解析、状态分发
// 孙凤摇的聊天组件通过 props 接入

interface MessageItem {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  recordId?: number
}

export function ChatPage() {
  const { isLoggedIn } = useAuthStore()

  // 会话
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
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

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const currentConversationId = useRef<number | null>(null)

  const { startStream, stopStream } = useChatStream()

  useEffect(() => {
    return () => { mounted.current = false }
  }, [])

  // ===== 加载会话列表 =====
  const loadConversations = useCallback(async (page: number) => {
    setConvLoading(true)
    try {
      const result = await getConversations({ page, size: 20 })
      if (!mounted.current) return
      setConversations(result.records ?? [])
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
      const msgs: MessageItem[] = (detail.records || []).map((r: ChatRecord) => ({
        role: r.question ? 'user' : 'assistant',
        content: r.question || r.answer || '',
        sources: r.sourceDocs || [],
        recordId: r.id,
      }))
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
    inputRef.current?.focus()
  }, [])

  // ===== 发送消息 =====
  const handleSend = useCallback(async (question: string) => {
    if (!question.trim() || sending) return

    setError(null)
    setSending(true)
    setStreamingText('')
    setStreamingSources([])

    // 添加用户消息
    const userMsg: MessageItem = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])

    let fullAnswer = ''
    let sources: ChatSource[] = []

    await startStream(
      (signal) =>
        sendChatStream(
          {
            question,
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
        onDone: () => {
          if (!mounted.current) return
          setSending(false)
          // 添加助手消息
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: fullAnswer,
              sources,
              recordId: undefined,
            },
          ])
          setStreamingText('')
          setStreamingSources([])
        },
        onError: (msg: string) => {
          if (!mounted.current) return
          setSending(false)
          setError(msg)
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
  }, [sending, startStream, loadConversations])

  // ===== 切换会话 =====
  const handleSelectConversation = useCallback((id: number) => {
    if (id === activeConversationId) return
    // 如果有正在进行的生成，先停止
    stopStream()
    setSending(false)
    setStreamingText('')
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
      loadConversations(convPage)
    } catch {
      // request.ts 统一提示
    }
  }, [activeConversationId, convPage, loadConversations, handleNewChat])

  // ===== 重命名会话 =====
  const handleRename = useCallback(async (id: number, title: string) => {
    try {
      await updateConversationTitle(id, title)
      message.success('标题已更新')
      loadConversations(convPage)
    } catch {
      // request.ts 统一提示
    }
  }, [convPage, loadConversations])

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

  // ===== 未登录 =====
  if (!isLoggedIn()) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2>请先登录</h2>
        <p style={{ color: '#888' }}>登录后可使用智能问答功能</p>
      </div>
    )
  }

  // 孙凤摇组件接入时的 props（提前声明避免 TS 报未使用）
  void handleRename; // 孙凤摇侧栏重命名功能使用

  // 会话侧栏: conversations, convLoading, convPage, convTotal, activeConversationId
  //           onSelect: handleSelectConversation, onDelete: handleDeleteConversation
  //           onRename: handleRename, onNew: handleNewChat, onPageChange
  // 消息列表: messages, streamingText, sending, detailLoading, error, sources
  // 输入区: onSend: handleSend, onStop: handleStop, sending, disabled

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0 }}>
      {/* 左侧会话栏 — 孙凤摇组件挂载位置 */}
      <div style={{ width: 280, borderRight: '1px solid #f0f0f0', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ margin: 0 }}>会话列表</h3>
          <span style={{ fontSize: 12, color: '#888' }}>共 {convTotal} 个会话</span>
        </div>
        {convLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <div style={{ padding: 8 }}>
            {conversations.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: c.id === activeConversationId ? '#e8f0fe' : 'transparent',
                  marginBottom: 4,
                  cursor: 'pointer',
                }}
              >
                <div
                  onClick={() => handleSelectConversation(c.id)}
                  style={{ flex: 1, overflow: 'hidden' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {c.recordCount} 条记录
                  </div>
                </div>
                <span
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(c.id) }}
                  style={{ color: '#ccc', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}
                  title="删除会话"
                >
                  ×
                </span>
              </div>
            ))}
            {conversations.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无会话</div>
            )}
          </div>
        )}
      </div>

      {/* 右侧消息区 — 孙凤摇组件挂载位置 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 消息列表 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
          ) : messages.length === 0 && !streamingText ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
              <h2>智能问答</h2>
              <p>向校园知识助手提问，获取基于官方资料的准确回答</p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: msg.role === 'user' ? '#005bac' : '#f0f2f5',
                      color: msg.role === 'user' ? '#fff' : '#333',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.content}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                        来源：{msg.sources.map((s) => s.title).join('、')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* 流式生成中的临时气泡 */}
              {streamingText && (
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '12px 16px', borderRadius: 12,
                    background: '#f0f2f5', color: '#333', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {streamingText}
                    <span style={{ animation: 'blink 1s infinite', color: '#005bac' }}>|</span>
                  </div>
                </div>
              )}
            </>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: '#e74c3c', padding: 12, fontSize: 13 }}>
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <textarea
              ref={inputRef}
              placeholder="输入问题，Enter 发送，Shift+Enter 换行"
              rows={2}
              disabled={sending}
              style={{
                flex: 1, resize: 'none', borderRadius: 8, padding: '10px 14px',
                border: '1px solid #d9d9d9', fontSize: 14, outline: 'none',
                fontFamily: 'inherit',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const input = e.currentTarget
                  handleSend(input.value)
                  input.value = ''
                }
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sending ? (
                <button
                  onClick={handleStop}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: '1px solid #e74c3c',
                    background: '#fff', color: '#e74c3c', cursor: 'pointer', fontSize: 14,
                    whiteSpace: 'nowrap',
                  }}
                >
                  停止
                </button>
              ) : (
                <button
                  onClick={() => {
                    const input = inputRef.current
                    if (input) {
                      handleSend(input.value)
                      input.value = ''
                    }
                  }}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: '#005bac', color: '#fff', cursor: 'pointer', fontSize: 14,
                    whiteSpace: 'nowrap',
                  }}
                >
                  发送
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
