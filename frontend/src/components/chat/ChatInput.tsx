import { useRef, useCallback } from 'react'
import { Input, Button } from 'antd'
import { SendOutlined, PauseCircleOutlined } from '@ant-design/icons'

const { TextArea } = Input

// ===== Props =====
export interface ChatInputProps {
  /** 输入框当前值（受控） */
  value: string
  /** 是否禁用输入（例如未选中会话） */
  disabled: boolean
  /** 是否正在生成回复 */
  generating: boolean
  /** placeholder 文本 */
  placeholder?: string
  /** 最大输入长度 */
  maxLength?: number
  /** 输入变化回调 */
  onChange: (value: string) => void
  /** 发送回调 */
  onSend: () => void
  /** 停止生成回调 */
  onStop: () => void
}

// ===== 组件 =====
/**
 * 聊天输入区。
 * 受控组件，Enter 发送，Shift+Enter 换行，
 * 处理中文输入法组合输入，防止误触发送。
 */
export function ChatInput({
  value,
  disabled,
  generating,
  placeholder = '输入你的问题…',
  maxLength = 2000,
  onChange,
  onSend,
  onStop,
}: ChatInputProps) {
  // 输入法组合状态标记
  const isComposingRef = useRef(false)
  // Shift 键是否按下（用于区分 Shift+Enter 和 Enter）
  const shiftRef = useRef(false)

  // ---- 发送判断 ----
  const canSend = value.trim().length > 0 && !disabled && !generating

  const handleSend = useCallback(() => {
    if (canSend) {
      onSend()
    }
  }, [canSend, onSend])

  // ---- 键盘事件 ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 跟踪 Shift 状态
      if (e.key === 'Shift') {
        shiftRef.current = true
        return
      }

      // Enter 键处理
      if (e.key === 'Enter') {
        // Shift+Enter → 换行，不发送
        if (e.shiftKey || shiftRef.current) {
          return
        }

        // 输入法组合中 → 不发送
        if (isComposingRef.current || e.nativeEvent.isComposing) {
          return
        }

        // 阻止默认换行，触发发送
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Shift') {
      shiftRef.current = false
    }
  }, [])

  // ========== 渲染 ==========
  return (
    <div className="chat-input">
      <div className="chat-input__box">
        <TextArea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
          }}
          placeholder={disabled ? '请先选择或创建会话' : placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoSize={{ minRows: 1, maxRows: 5 }}
          className="chat-input__textarea"
        />

        {/* 操作按钮区 */}
        <div className="chat-input__actions">
          {/* 字符计数 */}
          <span className="chat-input__count">
            {value.length}/{maxLength}
          </span>

          {generating ? (
            <Button
              danger
              icon={<PauseCircleOutlined />}
              onClick={onStop}
              className="chat-input__stop-btn"
            >
              停止生成
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!canSend}
              className="chat-input__send-btn"
            >
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
