import { Typography, Button } from 'antd'
import { LinkOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

// ===== 精简 Props =====
export interface OfficialSourceDetailProps {
  /** 来源站点（兼容 sourceDomain 和组长规定的 sourceSite） */
  sourceSite?: string | null
  sourceDomain?: string | null
  /** 分类 */
  category?: string | null
  /** 发布日期（兼容 publishedAt 和 sourceUpdatedAt） */
  publishedAt?: string | null
  sourceUpdatedAt?: string | null
  /** 抓取时间 */
  crawledAt?: string | null
  /** 原文链接 */
  sourceUrl?: string | null
}

// ===== 工具函数 =====

/** 安全格式化日期，非法日期返回 null */
function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return null
  }
}

/** 是否为有效 http/https 链接 */
function isValidUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ===== 组件 =====
/**
 * 官网来源详情。
 * 按字段存在情况展示来源站点、分类、发布日期、抓取时间和原文链接。
 * 无日期时整行不显示，无网址时不显示原文链接。
 * 所有官网字段均为空时返回 null。
 */
export function OfficialSourceDetail({
  sourceSite,
  sourceDomain,
  category,
  publishedAt,
  sourceUpdatedAt,
  crawledAt,
  sourceUrl,
}: OfficialSourceDetailProps) {
  const site = (sourceSite ?? sourceDomain)?.trim()
  const pubDate = formatDate(publishedAt ?? sourceUpdatedAt)
  const crawlDate = formatDate(crawledAt)
  const url = sourceUrl?.trim()

  // 所有官网字段为空 → 不渲染
  if (!site && !category && !pubDate && !crawlDate && !url) return null

  const hasUrl = isValidUrl(url)

  return (
    <div className="official-source-detail">
      {/* 来源站点 */}
      {site && (
        <Text className="official-source-detail__site">
          来源站点：{site}
        </Text>
      )}

      {/* 分类 */}
      {category && (
        <Text className="official-source-detail__category">
          分类：{category}
        </Text>
      )}

      {/* 发布日期 */}
      {pubDate && (
        <Text className="official-source-detail__date">
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          发布日期：{pubDate}
        </Text>
      )}

      {/* 抓取时间 */}
      {crawlDate && (
        <Text type="secondary" className="official-source-detail__crawl-date">
          抓取时间：{crawlDate}
        </Text>
      )}

      {/* 查看原文 */}
      {hasUrl && (
        <Button
          type="link"
          size="small"
          icon={<LinkOutlined />}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="official-source-detail__link"
          onClick={(e) => e.stopPropagation()}
        >
          查看原文
        </Button>
      )}
    </div>
  )
}
