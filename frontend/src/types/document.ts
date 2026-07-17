// ===== 知识库文档类型定义 =====
// 与后端 kb_document 表字段及接口约定对齐

/** 文档状态 */
export type DocStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

/** 处理阶段 */
export type ProcessStage =
  | 'UPLOADED'
  | 'EXTRACTING'
  | 'SPLITTING'
  | 'EMBEDDING'
  | 'INDEXING'
  | 'DONE'

/** 允许上传的文件类型 */
export const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.txt']
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/** 文档列表项（对应后端 DocumentVO） */
export interface DocumentItem {
  id: number
  title: string
  originalName: string
  storedName: string
  fileType: string
  fileSize: number
  chunkCount: number
  status: DocStatus
  processStage: ProcessStage
  errorMessage: string | null
  createUserId: number
  createTime: string
  updateTime: string
}

/** 文档列表查询参数 */
export interface DocumentListParams {
  page: number
  size: number
  keyword?: string
  status?: string
}

/** 分页结果 */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

/** 检索请求 */
export interface SearchParams {
  question: string
  topK?: number
}

/** 检索结果 */
export interface SearchResultItem {
  content: string
  docId: number
  chunkIdx: number
  title: string
  score: number
}

/** 上传额外参数 */
export interface UploadExtras {
  title?: string
}
