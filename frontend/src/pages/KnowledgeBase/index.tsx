import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, message } from 'antd'
import { useAuthStore } from '../../store/auth'
import {
  getDocumentList,
  deleteDocument,
  updateDocument,
  getDocumentDetail,
  previewDocument,
  downloadDocument,
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
 *
 * 搜索/筛选采用两阶段状态：
 * - Toolbar 管理草稿条件（draftKeyword / draftStatus）
 * - 本容器只持有"已应用"条件（appliedKeyword / appliedStatus）
 * - 只有点击搜索/Enter 时才将草稿写入 applied 并请求列表
 * - 重置清空两组条件并立即加载
 */
export function KnowledgeBase() {
  const { isAdmin } = useAuthStore()

  // 已应用的条件（实际用于 API 请求）
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<string>('')

  // 列表状态
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  // 弹窗状态
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // 预览状态
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null)
  const [previewKind, setPreviewKind] = useState<PreviewKind>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // 下载状态
  const [downloadLoadingId, setDownloadLoadingId] = useState<number | null>(null)

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const mounted = useRef(true)
  const previewBlobUrl = useRef<string | null>(null)
  const pollErrorCount = useRef(0)

  // 释放 Blob URL
  const revokePreviewUrl = useCallback(() => {
    if (previewBlobUrl.current) {
      URL.revokeObjectURL(previewBlobUrl.current)
      previewBlobUrl.current = null
    }
  }, [])

  // 组件卸载时释放 Blob URL 并清理轮询
  useEffect(() => {
    return () => {
      mounted.current = false
      revokePreviewUrl()
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
      }
    }
  }, [revokePreviewUrl])

  // ===== 加载列表 =====
  const loadList = useCallback(async (
    p: number,
    kw: string,
    st: string,
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setLoading(true)
    }
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
      pollErrorCount.current = 0
    } catch {
      if (!silent) {
        // request.ts 拦截器统一提示
      } else {
        pollErrorCount.current++
        if (pollErrorCount.current % 30 === 0) {
          console.warn('[轮询] 列表刷新失败，将在一段时间后重试')
        }
      }
    } finally {
      if (!silent && mounted.current) {
        setLoading(false)
      }
    }
  }, [pageSize])

  // ===== 首次加载 =====
  useEffect(() => {
    loadList(1, appliedKeyword, appliedStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 状态轮询（静默，使用已应用条件） =====
  useEffect(() => {
    const hasProcessing = docs.some(
      (d) => d.status === 'PENDING' || d.status === 'PROCESSING',
    )
    if (hasProcessing && !pollTimer.current) {
      pollTimer.current = setInterval(() => {
        loadList(page, appliedKeyword, appliedStatus, { silent: true })
      }, POLL_INTERVAL)
    }
    if (!hasProcessing && pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
      pollErrorCount.current = 0
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [docs, page, appliedKeyword, appliedStatus, loadList])

  // ===== 搜索：Toolbar 点击搜索或按 Enter 时调用 =====
  const handleSearch = (kw: string, st: string) => {
    setAppliedKeyword(kw)
    setAppliedStatus(st)
    loadList(1, kw, st)
  }

  // ===== 重置：Toolbar 点击重置时调用 =====
  const handleReset = () => {
    setAppliedKeyword('')
    setAppliedStatus('')
    loadList(1, '', '')
  }

  // ===== 分页 =====
  const handlePageChange = (p: number) => {
    loadList(p, appliedKeyword, appliedStatus)
  }

  // ===== 上传成功后刷新 =====
  const handleUploadSuccess = () => {
    loadList(1, appliedKeyword, appliedStatus)
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
      loadList(newPage, appliedKeyword, appliedStatus)
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
      loadList(page, appliedKeyword, appliedStatus)
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

  // ===== 详情弹窗打开期间，同步 selectedDocument 到最新列表数据 =====
  // 轮询静默更新 docs 后，弹窗中的 Steps/状态也随之更新
  useEffect(() => {
    if (!detailOpen || !selectedDocument) return
    const latest = docs.find((d) => d.id === selectedDocument.id)
    if (latest) {
      // shallow compare to avoid unnecessary re-render
      if (
        latest.status !== selectedDocument.status ||
        latest.processStage !== selectedDocument.processStage ||
        latest.chunkCount !== selectedDocument.chunkCount ||
        latest.errorMessage !== selectedDocument.errorMessage
      ) {
        setSelectedDocument(latest)
      }
    }
  }, [docs, detailOpen, selectedDocument])

  // ===== 打开预览 =====
  const handleOpenPreview = async (doc: DocumentItem) => {
    const kind = getPreviewKind(doc.fileType)

    // 释放之前的 Blob URL
    revokePreviewUrl()

    setSelectedDocument(doc)
    setPreviewOpen(true)
    setPreviewKind(kind)
    setPreviewUrl(null)
    setTextContent(null)
    setPreviewError(null)

    // DOC/DOCX 不请求在线预览
    if (kind === 'unsupported') return

    // PDF / TXT 请求预览
    setPreviewLoading(true)
    setPreviewLoadingId(doc.id)
    try {
      const { blob } = await previewDocument(doc.id)
      if (!mounted.current) return

      if (kind === 'pdf') {
        const url = URL.createObjectURL(blob)
        previewBlobUrl.current = url
        setPreviewUrl(url)
      } else if (kind === 'txt') {
        // 强制使用 UTF-8 解码，避免依赖不完整的响应头 charset
        const buffer = await blob.arrayBuffer()
        const text = new TextDecoder('utf-8').decode(buffer)
        setTextContent(text)
      }
    } catch (err: unknown) {
      if (mounted.current) {
        const msg = err instanceof Error ? err.message : '预览加载失败'
        setPreviewError(msg)
      }
    } finally {
      if (mounted.current) {
        setPreviewLoading(false)
        setPreviewLoadingId(null)
      }
    }
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
    setPreviewLoadingId(null)
    revokePreviewUrl()
  }

  // ===== 下载文档 =====
  const handleDownload = async (doc: DocumentItem) => {
    setDownloadLoadingId(doc.id)
    try {
      await downloadDocument(doc.id)
    } catch (err: unknown) {
      if (mounted.current) {
        const msg = err instanceof Error ? err.message : '下载失败'
        message.error(msg)
      }
    } finally {
      if (mounted.current) setDownloadLoadingId(null)
    }
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
          loading={loading}
          onSearch={handleSearch}
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
