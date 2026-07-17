import request from './request'
import type {
  ChatRequest,
  ChatResponse,
  Conversation,
  ConversationDetail,
  ConversationListParams,
  PageResult,
} from '../types/chat'

// ===== 聊天 API =====
// Token 由 request 拦截器自动携带

/** 同步聊天 */
export function sendChat(data: ChatRequest): Promise<ChatResponse> {
  return request.post('/chat', data)
}

/** 流式聊天：返回 Response 供 ReadableStream 读取 */
export function sendChatStream(
  data: ChatRequest,
  signal?: AbortSignal,
): Promise<Response> {
  return fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
    body: JSON.stringify({
      question: data.question,
      conversation_id: data.conversationId,   // ← 后端用 snake_case
    }),
    signal,
  })
}

/** 会话列表（分页） */
export function getConversations(
  params: ConversationListParams,
): Promise<PageResult<Conversation>> {
  return request.get('/chat/conversations', { params })
}

/** 会话详情（含完整问答记录） */
export function getConversationDetail(
  id: number,
): Promise<ConversationDetail> {
  return request.get(`/chat/conversations/${id}`)
}

/** 修改会话标题 */
export function updateConversationTitle(
  id: number,
  title: string,
): Promise<void> {
  return request.put(`/chat/conversations/${id}/title`, {
    title,
  })
}

/** 删除整个会话 */
export function deleteConversation(id: number): Promise<void> {
  return request.delete(`/chat/conversations/${id}`)
}

/** 删除单条问答记录 */
export function deleteRecord(id: number): Promise<void> {
  return request.delete(`/chat/records/${id}`)
}
