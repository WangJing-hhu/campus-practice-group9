import request from './request'
import type {
  DocumentItem,
  DocumentListParams,
  PageResult,
  SearchParams,
  SearchResultItem,
} from '../types/document'

// ===== 知识库文档 API =====
// 所有接口需要管理员权限，Token 由 request 拦截器自动携带

/** 上传文档 */
export function uploadDocument(
  file: File,
  title?: string,
): Promise<DocumentItem> {
  const form = new FormData()
  form.append('file', file)
  if (title) {
    form.append('title', title)
  }
  return request.post('/doc/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 文档列表（分页+搜索+状态筛选） */
export function getDocumentList(
  params: DocumentListParams,
): Promise<PageResult<DocumentItem>> {
  return request.get('/doc/list', { params })
}

/** 文档详情 */
export function getDocumentDetail(id: number): Promise<DocumentItem> {
  return request.get(`/doc/${id}`)
}

/** 更新/重新处理文档 */
export function updateDocument(
  id: number,
  payload: { title?: string; file?: File },
): Promise<DocumentItem> {
  if (payload.file) {
    const form = new FormData()
    if (payload.title) form.append('title', payload.title)
    form.append('file', payload.file)
    return request.put(`/doc/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  // 无新文件 = 重新处理原文件
  return request.put(`/doc/${id}`, payload)
}

/** 删除文档 */
export function deleteDocument(id: number): Promise<void> {
  return request.delete(`/doc/${id}`)
}

/** 检索（验收用） */
export function searchDocuments(
  params: SearchParams,
): Promise<SearchResultItem[]> {
  return request.post('/doc/search', params)
}

// ===== 文件预览 / 下载（公开访问，无需JWT） =====

/**
 * 预览文档（PDF inline / TXT inline / DOC/DOCX 提示下载）
 * 返回 { blob, contentType, filename } 供前端渲染或下载
 */
export async function previewDocument(id: number): Promise<{
  blob: Blob
  contentType: string
  filename: string
}> {
  const response = await fetch(`/api/doc/${id}/preview`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: '预览失败' }))
    throw new Error(err.detail || err.message || `HTTP ${response.status}`)
  }
  const contentType = response.headers.get('Content-Type') || 'application/octet-stream'
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  const filename = match ? match[1].replace(/['"]/g, '') : `document-${id}`
  const blob = await response.blob()
  return { blob, contentType, filename }
}

/**
 * 下载文档（Content-Disposition: attachment）
 * 触发浏览器下载，支持 PDF/DOC/DOCX/TXT
 */
export async function downloadDocument(id: number): Promise<void> {
  const response = await fetch(`/api/doc/${id}/download`)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: '下载失败' }))
    throw new Error(err.detail || err.message || `HTTP ${response.status}`)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  const filename = match ? match[1].replace(/['"]/g, '') : `document-${id}`

  // 触发浏览器下载
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
