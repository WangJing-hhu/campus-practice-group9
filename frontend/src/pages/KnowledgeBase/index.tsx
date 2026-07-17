import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, message } from 'antd'
import { useAuthStore } from '../../store/auth'
import {
  getDocumentList,
  deleteDocument,
  updateDocument,
  getDocumentDetail,
} from '../../api/document'
import { DocumentUpload } from '../../components/document/DocumentUpload'
import { DocumentToolbar } from '../../components/document/DocumentToolbar'
import { DocumentTable } from '../../components/document/DocumentTable'
import { DocumentDetailModal } from '../../components/document/DocumentDetailModal'
import {
  DocumentPreviewModal,
  type PreviewKind,
} from '../../components/document/DocumentPreviewModal'
import type {
  DocumentItem,
  DocumentListParams,
  PageResult,
} from '../../types/document'
import '../../styles/knowledge-base.css'

const POLL_INTERVAL = 3000

/** 根据 fileType 判定预览类型 */
function getPreviewKind(fileType: string): PreviewKind {
  const lower = fileType.toLowerCase()
  if (lower === 'pdf') return 'pdf'
  if (lower === 'txt') return 'txt'
  return 'unsupported'
}

/**
 * 知识库管理页面容器
 * 负责：查询条件、分页、刷新、上传后列表更新、轮询、预览/下载 Blob 管理
 * 孙凤摇的列表/状态/操作组件通过 props 接入
 */
export function KnowledgeBase() {
  const { isAdmin } = useAuthStore()

  // 列表状态
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  // 弹窗状态
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // 预览状态
  const [previewLoading, setPreviewLoading] = useState(false)
  // TODO: 待预览 API 就绪后使用
  const [previewLoadingId] = useState<number | null>(null)
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // 下载状态
  // TODO: 待下载 API 就绪后使用 setDownloadLoadingId
  const [downloadLoadingId] = useState<number | null>(null)

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const mounted = useRef(true)
  const previewBlobUrl = useRef<string | null>(null)

  // 释放 Blob URL
  const revokePreviewUrl = useCallback(() => {
    if (previewBlobUrl.current) {
      URL.revokeObjectURL(previewBlobUrl.current)
      previewBlobUrl.current = null
    }
  }, [])

  // 组件卸载时释放 Blob URL
  useEffect(() => {
    return () => {
      mounted.current = false
      if (previewBlobUrl.current) {
        URL.revokeObjectURL(previewBlobUrl.current)
      }
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 加载列表 =====
  const loadList = useCallback(async (p: number, kw: string, st: string) => {
    setLoading(true)
    try {
      const params: DocumentListParams = {
        page: p,
        size: pageSize,
        keyword: kw || undefined,
        status: st || undefined,
      }
      const result: PageResult<DocumentItem> = await getDocumentList(params)
      if (!mounted.current) return
      setDocs(result.records ?? [])
      setTotal(result.total ?? 0)
      setPage(result.current ?? p)
    } catch {
      // request.ts 拦截器统一提示
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [pageSize])

  // ===== 首次加载 =====
  useEffect(() => {
    loadList(1, keyword, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 状态轮询 =====
  useEffect(() => {
    const hasProcessing = docs.some(
      (d) => d.status === 'PENDING' || d.status === 'PROCESSING',
    )
    if (hasProcessing && !pollTimer.current) {
      pollTimer.current = setInterval(() => {
        loadList(page, keyword, statusFilter)
      }, POLL_INTERVAL)
    }
    if (!hasProcessing && pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [docs, page, keyword, statusFilter, loadList])

  // ===== 搜索 =====
  const handleSearch = (kw: string) => {
    setKeyword(kw)
    loadList(1, kw, statusFilter)
  }

  // ===== 状态筛选 =====
  const handleStatusFilter = (st: string) => {
    setStatusFilter(st)
    loadList(1, keyword, st)
  }

  // ===== 重置 =====
  const handleReset = () => {
    setKeyword('')
    setStatusFilter('')
    loadList(1, '', '')
  }

  // ===== 分页 =====
  const handlePageChange = (p: number) => {
    loadList(p, keyword, statusFilter)
  }

  // ===== 上传成功后刷新 =====
  const handleUploadSuccess = () => {
    loadList(1, keyword, statusFilter)
  }

  // ===== 删除 =====
  const handleDelete = async (doc: DocumentItem) => {
    setActionLoadingId(doc.id)
    try {
      await deleteDocument(doc.id)
      message.success('文档已删除')
      const remaining = total - 1
      const newPage =
        remaining <= (page - 1) * pageSize && page > 1 ? page - 1 : page
      loadList(newPage, keyword, statusFilter)
    } catch {
      // request.ts 统一提示
    } finally {
      if (mounted.current) setActionLoadingId(null)
    }
  }

  // ===== 重新处理 =====
  const handleReprocess = async (doc: DocumentItem) => {
    setActionLoadingId(doc.id)
    try {
      await updateDocument(doc.id, {})
      message.success('已开始重新处理')
      setDetailOpen(false)
      setSelectedDocument(null)
      loadList(page, keyword, statusFilter)
    } catch {
      // request.ts 统一提示
    } finally {
      if (mounted.current) setActionLoadingId(null)
    }
  }

  // ===== 打开详情 =====
  const handleOpenDetail = async (doc: DocumentItem) => {
    setSelectedDocument(doc)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const detail = await getDocumentDetail(doc.id)
      if (mounted.current) setSelectedDocument(detail)
    } catch {
      // request.ts 统一提示
    } finally {
      if (mounted.current) setDetailLoading(false)
    }
  }

  // ===== 关闭详情 =====
  const handleCloseDetail = () => {
    setDetailOpen(false)
    setSelectedDocument(null)
  }

  // ===== 打开预览 =====
  // TODO: 待杨牧涵在 api/document.ts 中封装 previewDocument(docId) 后替换占位逻辑
  //       接口约定：GET /api/doc/{id}/preview 返回 Blob（Content-Type: application/octet-stream）
  //       PDF Blob → URL.createObjectURL(blob) → previewUrl
  //       TXT Blob → blob.text() → textContent
  //       unsupported → 不需要请求
  const handleOpenPreview = (doc: DocumentItem) => {
    const kind = getPreviewKind(doc.fileType)

    // 释放之前的 Blob URL
    revokePreviewUrl()

    setSelectedDocument(doc)
    setPreviewOpen(true)
    setPreviewKind(kind)
    setPreviewUrl(null)
    setTextContent(null)
    setPreviewError(null)

    // 当前前端 API 封装未就绪，标记为加载完成但无内容
    // TODO: 替换为真实请求——
    //   setPreviewLoading(true)
    //   try {
    //     const blob = await previewDocument(doc.id)  // ← 杨牧涵封装
    //     if (!mounted.current) return
    //
    //     if (kind === 'pdf') {
    //       const url = URL.createObjectURL(blob)
    //       previewBlobUrl.current = url
    //       setPreviewUrl(url)
    //     } else if (kind === 'txt') {
    //       const text = await blob.text()
    //       setTextContent(text)
    //     }
    //     // unsupported 不需要请求
    //   } catch {
    //     if (mounted.current) setPreviewError('预览加载失败，请稍后重试')
    //   } finally {
    //     if (mounted.current) setPreviewLoading(false)
    //   }
  }

  // ===== 关闭预览 =====
  const handleClosePreview = () => {
    setPreviewOpen(false)
    setSelectedDocument(null)
    setPreviewKind(null)
    setPreviewUrl(null)
    setTextContent(null)
    setPreviewError(null)
    setPreviewLoading(false)

    // 释放 Blob URL
    revokePreviewUrl()
  }

  // ===== 下载文档 =====
  // TODO: 待杨牧涵在 api/document.ts 中封装 downloadDocument(docId) 后替换占位逻辑
  //       接口约定：GET /api/doc/{id}/download 返回 Blob，响应头含 Content-Disposition
  //       下载时创建临时 <a> 标签触发浏览器下载
  const handleDownload = async (_doc: DocumentItem) => {
    // TODO: 替换为真实请求——
    //   setDownloadLoadingId(doc.id)
    //   try {
    //     const blob = await downloadDocument(doc.id)  // ← 杨牧涵封装
    //     const url = URL.createObjectURL(blob)
    //     const a = document.createElement('a')
    //     a.href = url
    //     a.download = doc.originalName || doc.title
    //     document.body.appendChild(a)
    //     a.click()
    //     document.body.removeChild(a)
    //     URL.revokeObjectURL(url)
    //     message.success('下载已开始')
    //   } catch {
    //     // request.ts 统一提示
    //   } finally {
    //     if (mounted.current) setDownloadLoadingId(null)
    //   }

    // 占位：接口未就绪
    message.info('下载功能将在后端接口就绪后开放')
  }

  // ===== 非管理员 =====
  if (!isAdmin()) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2>权限不足</h2>
        <p style={{ color: '#888' }}>仅管理员可访问知识库管理</p>
      </div>
    )
  }

  return (
    <div className="kb-page">
      <div className="kb-section">
        <DocumentUpload onSuccess={handleUploadSuccess} />
      </div>

      <Card className="kb-section">
        <DocumentToolbar
          keyword={keyword}
          status={statusFilter}
          loading={loading}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          onStatusChange={handleStatusFilter}
          onReset={handleReset}
        />
      </Card>

      <Card className="kb-section" title="文档列表">
        <DocumentTable
          data={docs}
          loading={loading}
          pagination={{ current: page, pageSize, total }}
          actionLoadingId={actionLoadingId}
          previewLoadingId={previewLoadingId}
          downloadLoadingId={downloadLoadingId}
          onPageChange={handlePageChange}
          onDetail={handleOpenDetail}
          onPreview={handleOpenPreview}
          onDownload={handleDownload}
          onReprocess={handleReprocess}
          onDelete={handleDelete}
        />
      </Card>

      <DocumentDetailModal
        open={detailOpen}
        document={selectedDocument}
        loading={detailLoading}
        onClose={handleCloseDetail}
        onPreview={(doc) => {
          handleCloseDetail()
          handleOpenPreview(doc)
        }}
        onReprocess={handleReprocess}
      />

      <DocumentPreviewModal
        open={previewOpen}
        document={selectedDocument}
        loading={previewLoading}
        previewKind={previewKind}
        previewUrl={previewUrl}
        textContent={textContent}
        errorMessage={previewError}
        onClose={handleClosePreview}
        onDownload={handleDownload}
        downloadLoading={downloadLoadingId === selectedDocument?.id}
      />
    </div>
  )
}
