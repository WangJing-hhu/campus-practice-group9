import { useState } from 'react'
import { Typography, Button } from 'antd'
import { DownOutlined, UpOutlined, FileTextOutlined, GlobalOutlined } from '@ant-design/icons'
import type { ChatSource } from '../../types/chat'

const { Text, Paragraph } = Typography

// ===== Props =====
export interface SourceCardProps {
  /** 单条来源数据 */
  source: ChatSource
  /** 全局唯一锚点 id，由父组件（ChatBubble）根据 messageId + source.index 构造 */
  anchorId: string
}

// ===== 工具函数 =====
/** 将相似度分数转为百分比字符串，兼容 0~1 浮点数 */
function formatScore(score: number | undefined | null): string {
  if (score == null) return '—'
  const num = Number(score)
  if (isNaN(num)) return '—'
  const pct = num <= 1 ? Math.round(num * 100) : Math.round(num)
  return `${pct}%`
}

// ===== 组件 =====
/**
 * 来源卡片。
 * 展示检索到的知识库文档来源信息：编号、标题、文件名、相似度、内容摘要。
 * 支持展开/收起，字段缺失时使用安全占位文本。
 * 通过 id="chat-source-{index}" 支持引用点击滚动定位。
 */
export function SourceCard({ source, anchorId }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const {
    index,
    title,
    fileName,
    score,
    content,
  } = source

  const hasContent = !!content

  return (
    <div
      id={anchorId}
      className="chat-source"
    >
      {/* 头部信息行 */}
      <div className="chat-source__header">
        <span className="chat-source__index">
          [{index ?? '?'}]
        </span>
        <FileTextOutlined className="chat-source__file-icon" />
        <Text strong className="chat-source__title" ellipsis={{ tooltip: title || '未命名文档' }}>
          {title || '未命名文档'}
        </Text>
        {fileName && (
          <Text type="secondary" className="chat-source__filename" ellipsis={{ tooltip: fileName }}>
            {fileName}
          </Text>
        )}
        {/* 官网来源轻量标记 */}
        {source.sourceUrl && (
          <span className="chat-source__official-badge">
            <GlobalOutlined />
            官网
          </span>
        )}
        <span className="chat-source__score">
          相似度 {formatScore(score)}
        </span>
      </div>

      {/* 内容摘要 */}
      {hasContent && (
        <div
          className={
            `chat-source__body${
              expanded ? ' chat-source__body--expanded' : ''
            }`
          }
        >
          <Paragraph className="chat-source__content">
            {content}
          </Paragraph>

          {/* 展开/收起按钮：仅当内容超过折叠阈值时显示 */}
          {content && content.length > 200 && (
            <Button
              type="link"
              size="small"
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setExpanded(!expanded)}
              className="chat-source__toggle"
            >
              {expanded ? '收起' : '展开全文'}
            </Button>
          )}
        </div>
      )}

      {/* 无内容 */}
      {!hasContent && (
        <div className="chat-source__body">
          <Text type="secondary" italic>
            暂无摘要内容
          </Text>
        </div>
      )}

      {/* 官网原文链接 */}
      {source.sourceUrl && (
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-source__link"
          onClick={(e) => e.stopPropagation()}
        >
          查看官网原文
        </a>
      )}
    </div>
  )
}
