import { useMemo } from 'react'
import { Typography } from 'antd'
import {
  UserOutlined,
  RobotOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { SourceCard } from './SourceCard'
import type { ChatMessage } from './MessageList'
import type { ChatSource } from '../../types/chat'

const { Text } = Typography

// ===== Props =====
export interface ChatBubbleProps {
  /** 单条消息 */
  message: ChatMessage
  /** 消息在页面中的稳定 id，用于构造来源卡片唯一锚点 */
  messageId: string | number
}

// ===== 引用文本段类型 =====
interface TextSegment {
  type: 'text' | 'citation'
  value: string
}

/** 解析正文中的 [N] 引用标记，拆分为纯文本段和引用段 */
function parseCitations(text: string): TextSegment[] {
  const regex = /\[(\d+)\]/g
  const segments: TextSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'citation', value: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

/**
 * 将 messageId 转为安全、稳定的锚点前缀。
 * 只保留字母、数字、下划线和短横线，其余字符替换为短横线。
 */
function sanitizeAnchor(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-')
}

/**
 * 构建全局唯一的来源卡片锚点 id。
 * 格式：chat-source-{messageAnchor}-{sourceIndex}
 */
function buildSourceAnchorId(messageAnchor: string, sourceIndex: number): string {
  return `chat-source-${messageAnchor}-${sourceIndex}`
}

/**
 * 高亮来源卡片并滚动到可见位置。
 * 重复点击时先清除上一轮高亮，再重新添加，避免多计时器互相覆盖。
 */
function scrollToSource(anchorId: string) {
  const target = document.getElementById(anchorId)
  if (!target) return

  // 清除已有高亮计时器，避免多计时器互相干扰
  const prevTimer = Number((target as HTMLElement).dataset.highlightTimer)
  if (prevTimer) {
    clearTimeout(prevTimer)
  }
  // 滚前先移除高亮 class（如果上次点击后还未恢复），确保 transition 重新触发
  target.classList.remove('chat-source--highlight')

  // 强制浏览器重排后再添加 class，保证 transition 动画每次都能触发
  void (target as HTMLElement).offsetHeight

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })

  target.classList.add('chat-source--highlight')
  const timer = window.setTimeout(() => {
    target.classList.remove('chat-source--highlight')
    delete (target as HTMLElement).dataset.highlightTimer
  }, 1600)

  ;(target as HTMLElement).dataset.highlightTimer = String(timer)
}

// ===== 组件 =====
/**
 * 聊天消息气泡。
 * 用户消息右对齐，助手消息左对齐，
 * 支持流式光标、错误状态、来源展示、引用点击。
 * 使用正则解析 [N] 引用，不使用 dangerouslySetInnerHTML。
 */
export function ChatBubble({ message, messageId }: ChatBubbleProps) {
  const { role, content, sources, isStreaming, isError } = message
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'

  // 安全的消息锚点前缀
  const messageAnchor = sanitizeAnchor(messageId)

  // 构建有效引用编号集合
  const validSourceIndices = useMemo(() => {
    if (!sources || sources.length === 0) return new Set<number>()
    return new Set(sources.map((s) => s.index))
  }, [sources])

  // 解析引用段
  const segments = useMemo(() => {
    if (!isAssistant || !content) return null
    return parseCitations(content)
  }, [isAssistant, content])

  /** 渲染助手消息正文（含可点击引用） */
  const renderAssistantContent = () => {
    if (!segments) {
      return <Text className="chat-bubble__text">{content}</Text>
    }

    return (
      <Text className="chat-bubble__text">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.value}</span>
          }
          // 引用段
          const idx = Number(seg.value)
          const isValid = validSourceIndices.has(idx)
          const anchorId = buildSourceAnchorId(messageAnchor, idx)

          return (
            <button
              key={i}
              type="button"
              className={`chat-citation${isValid ? '' : ' chat-citation--unresolved'}`}
              disabled={!isValid}
              aria-label={isValid ? `查看来源 [${idx}]` : `来源 [${idx}] 不可用`}
              onClick={() => {
                if (isValid) scrollToSource(anchorId)
              }}
            >
              [{seg.value}]
            </button>
          )
        })}
      </Text>
    )
  }

  // ---- 错误状态 ----
  if (isError) {
    return (
      <div className="chat-bubble-row chat-bubble-row--assistant">
        <div className="chat-bubble__avatar chat-bubble__avatar--error">
          <ExclamationCircleOutlined />
        </div>
        <div className="chat-bubble__body">
          <div className="chat-bubble chat-bubble--assistant chat-bubble--error">
            <Text type="danger">{content || '回复生成失败，请稍后重试'}</Text>
          </div>
        </div>
      </div>
    )
  }

  // ---- 用户消息 ----
  if (isUser) {
    return (
      <div className="chat-bubble-row chat-bubble-row--user">
        <div className="chat-bubble__body">
          <div className="chat-bubble chat-bubble--user">
            <Text className="chat-bubble__text">{content}</Text>
          </div>
        </div>
        <div className="chat-bubble__avatar chat-bubble__avatar--user">
          <UserOutlined />
        </div>
      </div>
    )
  }

  // ---- 助手消息 ----
  if (isAssistant) {
    return (
      <div className="chat-bubble-row chat-bubble-row--assistant">
        <div className="chat-bubble__avatar chat-bubble__avatar--assistant">
          <RobotOutlined />
        </div>
        <div className="chat-bubble__body">
          <div className="chat-bubble chat-bubble--assistant">
            {renderAssistantContent()}

            {/* 流式生成光标 */}
            {isStreaming && (
              <span className="chat-bubble__cursor" aria-hidden="true" />
            )}

            {/* 生成中 loading 指示 */}
            {isStreaming && !content && (
              <Text type="secondary">
                <LoadingOutlined style={{ marginRight: 8 }} />
                思考中…
              </Text>
            )}
          </div>

          {/* 来源卡片 */}
          {sources && sources.length > 0 && (
            <div className="chat-bubble__sources">
              <Text type="secondary" className="chat-bubble__sources-label">
                参考来源
              </Text>
              {sources.map((source: ChatSource) => (
                <SourceCard
                  key={source.index}
                  source={source}
                  anchorId={buildSourceAnchorId(messageAnchor, source.index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // fallback（不应到达）
  return null
}
