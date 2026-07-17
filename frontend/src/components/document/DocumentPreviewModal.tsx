import { Modal, Alert, Button, Empty, Spin, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import type { DocumentItem } from '../../types/document'

const { Text } = Typography

// ===== 文档预览弹窗 =====

/** 预览内容类型 */
export type PreviewKind = 'pdf' | 'txt' | 'unsupported' | null

interface DocumentPreviewModalProps {
  /** 弹窗开关 */
  open: boolean
  /** 文档数据，为空时不报错 */
  document: DocumentItem | null
  /** 是否正在加载预览内容 */
  loading: boolean
  /** 预览类型（由父容器根据 fileType 判定后传入） */
  previewKind: PreviewKind
  /** PDF 预览用的 Blob URL（父容器创建和释放） */
  previewUrl?: string | null
  /** TXT 文本内容（父容器通过 blob.text() 读取后传入） */
  textContent?: string | null
  /** 预览/加载失败时的错误信息 */
  errorMessage?: string | null
  /** 关闭回调 */
  onClose: () => void
  /** 下载回调 */
  onDownload: (document: DocumentItem) => void
  /** 是否正在下载 */
  downloadLoading: boolean
}

/**
 * 文档预览弹窗。
 *
 * 子组件不调用接口，所有数据由父容器传入：
 * - previewKind / previewUrl / textContent 由父容器在打开预览时计算。
 * - PDF 使用 iframe + Blob URL 展示。
 * - Blob URL 由父容器通过 URL.createObjectURL 创建，
 *   关闭弹窗/切换文档/组件卸载时由父容器调用 URL.revokeObjectURL 释放。
 * - TXT 使用可滚动的 <pre> 展示 textContent。
 * - DOC/DOCX 提示浏览器不支持在线预览，提供下载。
 * - document 为 null 时不报错。
 */
export function DocumentPreviewModal({
  open,
  document,
  loading,
  previewKind,
  previewUrl,
  textContent,
  errorMessage,
  onClose,
  onDownload,
  downloadLoading,
}: DocumentPreviewModalProps) {
  // 文档为空
  if (!document) {
    return (
      <Modal
        title="文档预览"
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        centered
        width={800}
      >
        <Alert type="info" message="暂无文档数据" showIcon />
      </Modal>
    )
  }

  /** 渲染预览主体内容 */
  const renderBody = () => {
    // 加载中
    if (loading) {
      return (
        <div className="kb-preview-loading">
          <Spin tip="加载预览内容中…" />
        </div>
      )
    }

    // 加载出错
    if (errorMessage) {
      return (
        <div className="kb-preview-error">
          <Alert
            type="error"
            message="预览加载失败"
            description={errorMessage}
            showIcon
          />
        </div>
      )
    }

    // PDF：使用 iframe + Blob URL
    if (previewKind === 'pdf' && previewUrl) {
      return (
        <div className="kb-preview-iframe">
          <iframe
            src={previewUrl}
            title={`PDF 预览 - ${document.title}`}
            className="kb-preview-iframe-inner"
            sandbox="allow-same-origin"
          />
        </div>
      )
    }

    // TXT：可滚动 pre
    if (previewKind === 'txt' && textContent != null && textContent.length > 0) {
      return (
        <div className="kb-preview-text">
          <pre className="kb-preview-text-content">{textContent}</pre>
        </div>
      )
    }

    // TXT 但文本为空
    if (previewKind === 'txt' && (textContent == null || textContent.length === 0)) {
      return (
        <div className="kb-preview-empty">
          <Alert
            type="warning"
            message="文本内容为空"
            description="该文档可能为空文件，或预览内容尚未加载。"
            showIcon
          />
        </div>
      )
    }

    // PDF 但 Blob URL 缺失
    if (previewKind === 'pdf' && !previewUrl) {
      return (
        <div className="kb-preview-empty">
          <Alert
            type="warning"
            message="预览地址缺失"
            description="PDF 预览地址暂不可用，请稍后重试或下载后查看。"
            showIcon
          />
        </div>
      )
    }

    // DOC / DOCX：不支持在线预览
    if (previewKind === 'unsupported') {
      return (
        <div className="kb-preview-unsupported">
          <Empty description={`当前文件类型暂不支持浏览器在线预览，请下载后查看`}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(document)}
              loading={downloadLoading}
            >
              下载文档
            </Button>
          </Empty>
        </div>
      )
    }

    // 无预览内容 / previewKind 为 null
    return (
      <div className="kb-preview-empty">
        <Alert
          type="info"
          message="暂无可预览内容"
          description={
            <Text>
              该文档暂不支持在线预览，请
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={() => onDownload(document)}
                loading={downloadLoading}
                style={{ padding: 0 }}
              >
                下载
              </Button>
              后查看
            </Text>
          }
          showIcon
        />
      </div>
    )
  }

  const footer = (
    <>
      <Button
        icon={<DownloadOutlined />}
        onClick={() => onDownload(document)}
        loading={downloadLoading}
        disabled={loading}
      >
        下载
      </Button>
      <Button onClick={onClose}>关闭</Button>
    </>
  )

  return (
    <Modal
      title={
        <>
          <span>文档预览</span>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 400, marginLeft: 8 }}>
            {document.title}
          </Text>
        </>
      }
      open={open}
      onCancel={onClose}
      footer={footer}
      destroyOnClose
      centered
      width={860}
      className="kb-preview-modal"
    >
      <div className="kb-preview-body">{renderBody()}</div>
    </Modal>
  )
}
