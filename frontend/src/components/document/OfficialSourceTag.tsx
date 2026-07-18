import { Tag } from 'antd'
import { LinkOutlined } from '@ant-design/icons'

// ===== 精简 Props（不修改 types/chat.ts） =====
export interface OfficialSourceTagProps {
  /** 官网 URL */
  sourceUrl?: string | null
  /** 来源站点（兼容 sourceDomain 和组长规定的 sourceSite） */
  sourceSite?: string | null
  sourceDomain?: string | null
  /** 分类 */
  category?: string | null
  /** 时效状态 */
  validityStatus?: string | null
}

// ===== 组件 =====
/**
 * 官网来源标签。
 * 仅当存在有效的官网来源信息时才显示。
 * 普通上传文档（无 sourceUrl / sourceSite / sourceDomain）不显示。
 */
export function OfficialSourceTag({
  sourceUrl,
  sourceSite,
  sourceDomain,
  category,
  validityStatus,
}: OfficialSourceTagProps) {
  const site = (sourceSite ?? sourceDomain)?.trim()
  const url = sourceUrl?.trim()

  // 无官网来源信息 → 不显示
  if (!site && !url) return null

  return (
    <span className="official-source-tags" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <Tag icon={<LinkOutlined />} color="blue" className="official-source-tag">
        {site ? `官方来源 · ${site}` : '官方来源'}
      </Tag>
      {category && (
        <Tag color="green" className="official-source-category-tag">
          {category}
        </Tag>
      )}
      {validityStatus && (
        <Tag color="default" className="official-source-validity-tag">
          {validityStatus}
        </Tag>
      )}
    </span>
  )
}
