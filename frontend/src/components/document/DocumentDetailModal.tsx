import { Modal, Descriptions, Alert, Button, Space } from 'antd'
import { ReloadOutlined, FileTextOutlined } from '@ant-design/icons'
import type { DocumentItem, ProcessStage } from '../../types/document'
import { formatFileSize, formatTime } from './documentUtils'
import { DocumentStatusTag } from './DocumentStatusTag'
import { DocumentProcessSteps } from './DocumentProcessSteps'

// ===== 文档详情弹窗 =====

/** 处理阶段 → 中文标签 */
const STAGE_LABEL: Record<ProcessStage, string> = {
  UPLOADED: '上传',
  EXTRACTING: '提取',
  SPLITTING: '切分',
  EMBEDDING: '向量化',
  INDEXING: '向量化',
  DONE: '完成',
}

interface DocumentDetailModalProps {
  open: boolean
  document: DocumentItem | null
  loading: boolean
  onClose: () => void
  onPreview: (document: DocumentItem) => void
  onReprocess: (document: DocumentItem) => void
}

/**
 * 文档详情弹窗。
 * - PROCESSING 时展示 DocumentProcessSteps
 * - FAILED 时使用 Alert 突出展示 errorMessage
 * - document 为空时正常渲染空弹窗，不报错
 */
export function DocumentDetailModal({
  open,
  document,
  loading,
  onClose,
  onPreview,
  onReprocess,
}: DocumentDetailModalProps) {
  if (!document) {
    return (
      <Modal
        title="文档详情"
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        width={680}
      >
        <Alert type="info" message="暂无文档数据" showIcon />
      </Modal>
    )
  }

  const {
    title,
    originalName,
    fileType,
    fileSize,
    chunkCount,
    status,
    processStage,
    errorMessage,
    createTime,
    updateTime,
  } = document

  const isProcessing = status === 'PROCESSING'
  const isFailed = status === 'FAILED'

  const footer = (
    <Space>
      <Button onClick={onClose}>关闭</Button>
      {status === 'COMPLETED' && (
        <Button
          icon={<FileTextOutlined />}
          onClick={() => onPreview(document)}
        >
          预览
        </Button>
      )}
      {!isProcessing && status !== 'PENDING' && (
        <Button
          icon={<ReloadOutlined />}
          onClick={() => onReprocess(document)}
          loading={loading}
        >
          重新处理
        </Button>
      )}
    </Space>
  )

  return (
    <Modal
      title="文档详情"
      open={open}
      onCancel={onClose}
      footer={footer}
      destroyOnClose
      width={700}
    >
      <div className="kb-detail-modal">
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, sm: 2 }}
          labelStyle={{ width: 100, flexShrink: 0 }}
        >
          <Descriptions.Item label="文档标题" span={2}>
            {title}
          </Descriptions.Item>
          <Descriptions.Item label="原始文件名">
            {originalName}
          </Descriptions.Item>
          <Descriptions.Item label="文件类型">
            {fileType?.toUpperCase()}
          </Descriptions.Item>
          <Descriptions.Item label="文件大小">
            {formatFileSize(fileSize)}
          </Descriptions.Item>
          <Descriptions.Item label="文本块数">
            {chunkCount > 0 ? chunkCount : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="业务状态">
            <DocumentStatusTag status={status} />
          </Descriptions.Item>
          <Descriptions.Item label="处理阶段">
            {processStage ? (STAGE_LABEL[processStage] ?? processStage) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="上传时间">
            {formatTime(createTime)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatTime(updateTime)}
          </Descriptions.Item>
        </Descriptions>

        {isProcessing && (
          <div style={{ marginTop: 16 }}>
            <DocumentProcessSteps
              status={status}
              processStage={processStage ?? null}
              errorMessage={errorMessage}
            />
          </div>
        )}

        {isFailed && errorMessage && (
          <Alert
            type="error"
            message="处理失败原因"
            description={errorMessage}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  )
}
