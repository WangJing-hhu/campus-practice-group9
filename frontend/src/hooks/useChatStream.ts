import { useRef, useCallback } from 'react'
import type { StreamMeta } from '../types/chat'

// ===== SSE 流式解析 Hook =====
// 支持 POST + fetch + ReadableStream 读取 text/event-stream
// 支持 AbortController 停止生成
// 按空行切帧，识别 meta / token / done / error 事件

export interface StreamCallbacks {
  onMeta?: (meta: StreamMeta) => void
  onToken?: (text: string) => void
  onDone?: (recordId: number) => void
  onError?: (message: string) => void
}

export function useChatStream() {
  const controllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback(
    async (
      fetchFn: (signal: AbortSignal) => Promise<Response>,
      callbacks: StreamCallbacks,
    ) => {
      // 取消上一次请求
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const response = await fetchFn(controller.signal)

        if (!response.ok) {
          const err = await response.json().catch(() => ({ detail: '流式请求失败' }))
          callbacks.onError?.(err.detail || err.message || `HTTP ${response.status}`)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          callbacks.onError?.('浏览器不支持流式读取')
          return
        }

        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 按空行切帧（SSE 帧以 \n\n 分隔）
          const frames = buffer.split('\n\n')
          buffer = frames.pop() || ''   // 最后一个可能不完整，留到下次拼接

          for (const frame of frames) {
            if (!frame.trim()) continue

            const lines = frame.split('\n')
            let eventType = ''
            let dataStr = ''

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim()
              } else if (line.startsWith('data: ')) {
                dataStr = line.slice(6)
              }
            }

            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)

              switch (eventType) {
                case 'meta':
                  callbacks.onMeta?.(data as StreamMeta)
                  break
                case 'token':
                  callbacks.onToken?.(data.text || '')
                  break
                case 'done':
                  callbacks.onDone?.(data.recordId)
                  break
                case 'error':
                  callbacks.onError?.(data.message || '服务器错误')
                  break
              }
            } catch {
              // JSON 解析失败，跳过此帧
            }
          }
        }

        // 处理缓冲区剩余内容
        if (buffer.trim()) {
          const lines = buffer.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.text) callbacks.onToken?.(data.text)
              } catch { /* ignore */ }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return // 用户主动停止，不报错
        }
        callbacks.onError?.(err instanceof Error ? err.message : '网络错误')
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    [],
  )

  /** 停止生成 */
  const stopStream = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  return { startStream, stopStream }
}
