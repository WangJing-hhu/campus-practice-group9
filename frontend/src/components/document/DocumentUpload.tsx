import { useState } from 'react'
import { Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps, UploadFile } from 'antd'
import { uploadDocument } from '../../api/document'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../../types/document'

const { Dragger } = Upload

interface DocumentUploadProps {
  onSuccess: () => void
}

// ===== 文件扩展名校验文案 =====
const ALLOWED_EXT = ALLOWED_FILE_TYPES.join('、')

/**
 * Ant Design Upload/Dragger 知识库上传组件
 * - 支持点击和拖拽
 * - 前端校验格式 + 大小
 * - 上传进度 + 成功/失败提示
 * - 上传中禁用重复提交
 */
export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // 前端校验
  const beforeUpload = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      message.error(`仅支持 ${ALLOWED_EXT} 格式`)
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小不能超过 50MB')
      return false
    }
    return true
  }

  // 自定义上传
  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onProgress, onSuccess: upSuccess, onError } = options
    const uploadFile = file as File

    setUploading(true)
    try {
      // 进度模拟（antd Upload 用 onProgress 上报）
      onProgress?.({ percent: 30 })

      await uploadDocument(uploadFile)

      onProgress?.({ percent: 100 })
      upSuccess?.(uploadFile)
      message.success(`${uploadFile.name} 上传成功`)
      setFileList([])
      onSuccess()
    } catch (err: any) {
      onError?.(err)
      // 错误由 request 拦截器统一提示
    } finally {
      setUploading(false)
    }
  }

  const handleChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList)
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Dragger
        name="file"
        multiple={false}
        fileList={fileList}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        onChange={handleChange}
        disabled={uploading}
        accept={ALLOWED_FILE_TYPES.join(',')}
        showUploadList={{
          showPreviewIcon: false,
          showRemoveIcon: true,
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          {uploading ? '上传中...' : '点击或拖拽文件到此处上传'}
        </p>
        <p className="ant-upload-hint">
          支持 {ALLOWED_EXT} 格式，单文件不超过 50MB
        </p>
      </Dragger>
    </div>
  )
}
