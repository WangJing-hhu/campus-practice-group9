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
}

// ===== 组件 =====
/**
 * 聊天消息气泡。
 * 用户消息右对齐，助手消息左对齐，
 * 支持流式光标、错误状态、来源展示。
 * 不解析 Markdown 或 HTML，按纯文本安全展示。
 */
export function ChatBubble({ message }: ChatBubbleProps) {
  const { role, content, sources, isStreaming, isError } = message
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'

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
            <Text className="chat-bubble__text">{content}</Text>

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
                <SourceCard key={source.index} source={source} />
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
