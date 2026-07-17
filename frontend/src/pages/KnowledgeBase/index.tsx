import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, message, Table, Input, Select, Space, Button, Popconfirm, Tag } from 'antd'
import { SearchOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/auth'
import { getDocumentList, deleteDocument, updateDocument } from '../../api/document'
import { DocumentUpload } from '../../components/document/DocumentUpload'
import type {
  DocumentItem,
  DocumentListParams,
  PageResult,
} from '../../types/document'

// 轮询间隔（毫秒）
const POLL_INTERVAL = 3000

/**
 * 知识库管理页面容器
 * 负责：查询条件、分页、刷新、上传后列表更新
 * 孙凤摇的列表/状态/操作组件通过 props 接入
 */
export function KnowledgeBase() {
  const { isAdmin } = useAuthStore()

  // 数据状态
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    return () => { mounted.current = false }
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

  // ===== 状态轮询：有 PENDING/PROCESSING 文档时每 3 秒刷新 =====
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
      // 当前页最后一条 → 回到上一页
      const remaining = total - 1
      const newPage = remaining <= (page - 1) * pageSize && page > 1 ? page - 1 : page
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
      loadList(page, keyword, statusFilter)
    } catch {
      // request.ts 统一提示
    } finally {
      if (mounted.current) setActionLoadingId(null)
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

  // ===== 列定义（孙凤摇替换为正式组件后移除） =====
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '文档名', dataIndex: 'title', ellipsis: true },
    {
      title: '类型', dataIndex: 'fileType', width: 70,
      render: (t: string) => <Tag>{t?.toUpperCase()}</Tag>,
    },
    {
      title: '大小', dataIndex: 'fileSize', width: 90,
      render: (s: number) => s ? `${(s / 1024).toFixed(0)} KB` : '-',
    },
    { title: '块数', dataIndex: 'chunkCount', width: 60 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => {
        const color =
          s === 'COMPLETED' ? 'green' : s === 'FAILED' ? 'red' : s === 'PROCESSING' ? 'blue' : 'default'
        return <Tag color={color}>{s}</Tag>
      },
    },
    {
      title: '上传时间', dataIndex: 'createTime', width: 170,
      render: (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', width: 180,
      render: (_: unknown, record: DocumentItem) => (
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={actionLoadingId === record.id}
            disabled={record.status === 'PROCESSING' || record.status === 'PENDING'}
            onClick={() => handleReprocess(record)}
          >
            重处理
          </Button>
          <Popconfirm
            title="确定删除此文档？"
            onConfirm={() => handleDelete(record)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoadingId === record.id}
              disabled={record.status === 'PROCESSING' || record.status === 'PENDING'}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <DocumentUpload onSuccess={handleUploadSuccess} />

      <Card
        title="文档列表"
        extra={
          <Space>
            <Select
              allowClear
              placeholder="状态筛选"
              style={{ width: 130 }}
              value={statusFilter || undefined}
              onChange={(v) => handleStatusFilter(v ?? '')}
              options={[
                { label: '待处理', value: 'PENDING' },
                { label: '处理中', value: 'PROCESSING' },
                { label: '已完成', value: 'COMPLETED' },
                { label: '失败', value: 'FAILED' },
              ]}
            />
            <Input
              placeholder="搜索文档名"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => handleSearch(keyword)}
              allowClear
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={docs}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 篇`,
            onChange: handlePageChange,
          }}
          locale={{ emptyText: '暂无文档，请上传' }}
        />
      </Card>
    </div>
  )
}
