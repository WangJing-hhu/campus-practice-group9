// ===== 文档组件 — 纯格式化工具与常量 =====
// 不定义业务类型，业务类型统一从 ../../types/document 导入

/** 格式化文件大小（B → KB → MB） */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** 格式化时间为 zh-CN 本地字符串，非法时返回 "—" */
export function formatTime(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}
