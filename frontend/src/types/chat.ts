// ===== 聊天相关类型定义 =====
// 与后端 Java ChatController 及 SSE 事件约定对齐

/** 来源文档引用 */
export interface ChatSource {
  index: number
  docId: number
  title: string
  fileName: string
  score: number
  content: string
  sourceUrl?: string
  sourceSite?: string
  category?: string
  publishedAt?: string
  crawledAt?: string
}

/** 一条问答记录 */
export interface ChatRecord {
  id: number
  conversationId: number
  userId: number
  question: string
  answer: string
  sourceDocs: ChatSource[]
  status: string
  createTime: string
}

/** 会话摘要 */
export interface Conversation {
  id: number
  title: string
  updateTime: string
  recordCount: number
}

/** 会话详情（含消息列表） */
export interface ConversationDetail extends Conversation {
  records: ChatRecord[]
}

/** 同步聊天请求 */
export interface ChatRequest {
  conversationId?: number
  question: string
}

/** 同步聊天响应 */
export interface ChatResponse {
  conversationId: number
  recordId: number
  answer: string
  sources: ChatSource[]
}

/** SSE meta 事件数据 */
export interface StreamMeta {
  conversationId: number
  recordId: number
  sources: ChatSource[]
}

/** SSE token 事件数据 */
export interface StreamToken {
  text: string
}

/** SSE done 事件数据 */
export interface StreamDone {
  recordId: number
}

/** SSE error 事件数据 */
export interface StreamError {
  message: string
}

/** 会话分页参数 */
export interface ConversationListParams {
  page: number
  size: number
  keyword?: string
}

/** 分页结果 */
export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
}
