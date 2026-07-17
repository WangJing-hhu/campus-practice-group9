import { Button, Space, Modal } from 'antd'
import {
  EyeOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { DocumentItem } from '../../types/document'

// ===== 文档操作按钮组 =====

interface DocumentActionsProps {
  /** 当前行文档 */
  document: DocumentItem
  /** 正在重新处理/删除的文档 id */
  actionLoadingId: number | null
  /** 正在预览加载的文档 id */
  previewLoadingId: number | null
  /** 正在下载的文档 id */
  downloadLoadingId: number | null
  /** 查看详情 */
  onDetail: (document: DocumentItem) => void
  /** 预览文档 */
  onPreview: (document: DocumentItem) => void
  /** 下载文档 */
  onDownload: (document: DocumentItem) => void
  /** 重新处理 */
  onReprocess: (document: DocumentItem) => void
  /** 删除文档 */
  onDelete: (document: DocumentItem) => void
}

/**
 * 文档行操作按钮。
 *
 * 规则：
 * - PENDING / PROCESSING：禁用预览、下载、重新处理和删除，仅详情可用
 * - FAILED：允许详情和下载（原文件可能保留），允许重新处理和删除，预览不可用
 * - COMPLETED：允许全部操作
 *
 * 删除和重新处理前弹出 Modal.confirm 并显示文档名称。
 * 不调用接口，不静默 catch。
 */
export function DocumentActions({
  document,
  actionLoadingId,
  previewLoadingId,
  downloadLoadingId,
  onDetail,
  onPreview,
  onDownload,
  onReprocess,
  onDelete,
}: DocumentActionsProps) {
  const { id, status, title } = document
  const isPendingOrProcessing =
    status === 'PENDING' || status === 'PROCESSING'
  const isActionBusy = actionLoadingId === id
  const isPreviewBusy = previewLoadingId === id
  const isDownloadBusy = downloadLoadingId === id
  const isAnyBusy = isActionBusy || isPreviewBusy || isDownloadBusy

  const handleReprocess = () => {
    Modal.confirm({
      centered: true,
      title: '确认重新处理',
      content: `确定要重新处理文档「${title}」吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => onReprocess(document),
    })
  }

  const handleDelete = () => {
    Modal.confirm({
      centered: true,
      title: '确认删除',
      content: `确定要删除文档「${title}」吗？删除后不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => onDelete(document),
    })
  }

  return (
    <Space size="small" wrap>
      {/* 详情：所有状态均可 */}
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => onDetail(document)}
        disabled={isAnyBusy}
      >
        详情
      </Button>

      {/* 预览：仅 COMPLETED */}
      {status === 'COMPLETED' && (
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => onPreview(document)}
          disabled={isAnyBusy || isPreviewBusy}
          loading={isPreviewBusy}
        >
          预览
        </Button>
      )}

      {/* 下载：COMPLETED 和 FAILED 可用，PENDING/PROCESSING 禁用 */}
      {!isPendingOrProcessing && (
        <Button
          type="link"
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => onDownload(document)}
          disabled={isAnyBusy || isDownloadBusy}
          loading={isDownloadBusy}
        >
          下载
        </Button>
      )}

      {/* 重新处理：PENDING / PROCESSING 时禁用 */}
      <Button
        type="link"
        size="small"
        icon={<ReloadOutlined />}
        onClick={handleReprocess}
        disabled={isPendingOrProcessing || isAnyBusy}
        loading={isActionBusy}
      >
        重新处理
      </Button>

      {/* 删除：PENDING / PROCESSING 时禁用 */}
      <Button
        type="link"
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={handleDelete}
        disabled={isPendingOrProcessing || isAnyBusy}
        loading={isActionBusy}
      >
        删除
      </Button>
    </Space>
  )
}
