import type { ChatSource } from '../../types/chat'
import { SourceCard } from './SourceCard'

// ===== Props =====
export interface SourceListProps {
  /** 来源数组（可选，空数组或 undefined 时不报错） */
  sources?: ChatSource[] | null
  /** 消息锚点前缀，用于构造每个 SourceCard 的唯一 anchorId */
  messageAnchor?: string
}

// ===== 组件 =====
/**
 * 来源列表。
 * 安全渲染来源卡片，保证来源编号与回答中的 [1][2] 一致。
 * 不因为某些字段为空而过滤并改变编号顺序。
 * 不解析 SSE，不自行发起接口请求。
 *
 * 当前接入状态：ChatBubble 仍直接遍历 sources，本组件可供后续接入使用。
 */
export function SourceList({ sources, messageAnchor = 'unknown' }: SourceListProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="official-source-list">
      {sources.map((source) => {
        const idx = source.index
        const anchorId = `chat-source-${messageAnchor}-${idx}`

        return (
          <SourceCard
            key={idx}
            source={source}
            anchorId={anchorId}
          />
        )
      })}
    </div>
  )
}
