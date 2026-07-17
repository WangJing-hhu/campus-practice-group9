import { Table, Tooltip } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { DocumentItem, ProcessStage } from '../../types/document'
import { formatFileSize, formatTime } from './documentUtils'
import { DocumentStatusTag } from './DocumentStatusTag'
import { DocumentActions } from './DocumentActions'

// ===== 文档数据表格 =====

/** 处理阶段 → 中文标签 */
const STAGE_LABEL: Record<ProcessStage, string> = {
  UPLOADED: '上传',
  EXTRACTING: '提取',
  SPLITTING: '切分',
  EMBEDDING: '向量化',
  INDEXING: '向量化',
  DONE: '完成',
}

interface DocumentTableProps {
  data: DocumentItem[]
  loading: boolean
  pagination: {
    current: number
    pageSize: number
    total: number
  }
  /** 正在重新处理/删除的文档 id */
  actionLoadingId: number | null
  /** 正在预览加载的文档 id */
  previewLoadingId: number | null
  /** 正在下载的文档 id */
  downloadLoadingId: number | null
  onPageChange: (page: number) => void
  onDetail: (document: DocumentItem) => void
  onPreview: (document: DocumentItem) => void
  onDownload: (document: DocumentItem) => void
  onReprocess: (document: DocumentItem) => void
  onDelete: (document: DocumentItem) => void
}

/** 格式化处理阶段为中文，为空时返回 "—" */
function renderProcessStage(stage: ProcessStage | undefined | null): string {
  if (!stage) return '—'
  return STAGE_LABEL[stage] ?? stage
}

/**
 * 文档数据表格。
 * 列：文档名 / 类型 / 大小 / 块数 / 状态 / 处理阶段 / 上传时间 / 操作
 * 不请求列表接口，不修改筛选条件。
 */
export function DocumentTable({
  data,
  loading,
  pagination,
  actionLoadingId,
  previewLoadingId,
  downloadLoadingId,
  onPageChange,
  onDetail,
  onPreview,
  onDownload,
  onReprocess,
  onDelete,
}: DocumentTableProps) {
  const columns: ColumnsType<DocumentItem> = [
    {
      title: '文档名',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: { showTitle: false },
      render: (title: string) => (
        <Tooltip title={title} placement="topLeft">
          <span>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 80,
      render: (t: string) => t?.toUpperCase() ?? '—',
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '块数',
      dataIndex: 'chunkCount',
      key: 'chunkCount',
      width: 80,
      render: (count: number) => (count > 0 ? count : '—'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: DocumentItem['status']) => (
        <DocumentStatusTag status={status} />
      ),
    },
    {
      title: '处理阶段',
      dataIndex: 'processStage',
      key: 'processStage',
      width: 100,
      render: (stage: ProcessStage) => renderProcessStage(stage),
    },
    {
      title: '上传时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      render: (t: string) => formatTime(t),
    },
    {
      title: '操作',
      key: 'actions',
      width: 340,
      render: (_: unknown, doc: DocumentItem) => (
        <DocumentActions
          document={doc}
          actionLoadingId={actionLoadingId}
          previewLoadingId={previewLoadingId}
          downloadLoadingId={downloadLoadingId}
          onDetail={onDetail}
          onPreview={onPreview}
          onDownload={onDownload}
          onReprocess={onReprocess}
          onDelete={onDelete}
        />
      ),
    },
  ]

  const tablePagination: TablePaginationConfig = {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    showTotal: (total: number) => `共 ${total} 条`,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50'],
    onChange: (page) => {
      onPageChange(page)
    },
  }

  return (
    <Table<DocumentItem>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={tablePagination}
      scroll={{ x: 1200 }}
      locale={{ emptyText: '暂无文档数据' }}
    />
  )
}
