import { Typography, Button } from 'antd'
import {
  MessageOutlined,
  FileSearchOutlined,
  WifiOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

// ===== 类型 =====
/** 空状态类型 */
export type ChatEmptyStatus =
  | 'normal'        // 首次进入
  | 'history-empty' // 无历史会话
  | 'no-source'     // 低相关拒答
  | 'network-error' // 网络错误

// ===== Props =====
export interface ChatEmptyProps {
  /** 空状态类型 */
  status?: ChatEmptyStatus
  /** 点击示例问题回调 */
  onSelectQuestion?: (question: string) => void
  /** 网络错误重试回调 */
  onRetry?: () => void
}

// ===== 示例问题 =====
const SAMPLE_QUESTIONS = [
  '河海大学的校训是什么？',
  '图书馆的开放时间是怎样的？',
  '奖学金申请需要什么条件？',
  '如何进行课程退选？',
]

// ===== 各状态配置 =====
interface EmptyConfig {
  icon: React.ReactNode
  title: string
  description: string
  showQuestions: boolean
}

function getEmptyConfig(status: ChatEmptyStatus): EmptyConfig {
  switch (status) {
    case 'normal':
      return {
        icon: <MessageOutlined className="chat-empty__icon" />,
        title: '校园问答助手',
        description: '基于知识库的智能问答，随时为你解答校园相关问题',
        showQuestions: true,
      }
    case 'history-empty':
      return {
        icon: <MessageOutlined className="chat-empty__icon" />,
        title: '开始新的对话',
        description: '在下方输入你的问题，获取校园相关的智能解答',
        showQuestions: true,
      }
    case 'no-source':
      return {
        icon: <FileSearchOutlined className="chat-empty__icon" />,
        title: '根据现有资料，暂未找到相关信息',
        description: '建议换个说法试试，或者补充更多资料到知识库',
        showQuestions: true,
      }
    case 'network-error':
      return {
        icon: <WifiOutlined className="chat-empty__icon chat-empty__icon--error" />,
        title: '网络连接异常',
        description: '请检查网络连接后重试',
        showQuestions: false,
      }
    default:
      return {
        icon: <MessageOutlined className="chat-empty__icon" />,
        title: '校园问答助手',
        description: '',
        showQuestions: true,
      }
  }
}

// ===== 组件 =====
/**
 * 聊天空状态。
 * 根据 status 展示不同引导界面，支持点击示例问题。
 */
export function ChatEmpty({
  status = 'normal',
  onSelectQuestion,
  onRetry,
}: ChatEmptyProps) {
  const config = getEmptyConfig(status)

  return (
    <div className="chat-empty">
      {/* 图标 */}
      <div className="chat-empty__icon-wrap">
        {config.icon}
      </div>

      {/* 标题 */}
      <Title level={4} className="chat-empty__title">
        {config.title}
      </Title>

      {/* 描述 */}
      {config.description && (
        <Text type="secondary" className="chat-empty__desc">
          {config.description}
        </Text>
      )}

      {/* 示例问题 */}
      {config.showQuestions && onSelectQuestion && (
        <div className="chat-empty__questions">
          <Text type="secondary" className="chat-empty__questions-label">
            试试这些问题：
          </Text>
          <div className="chat-empty__questions-list">
            {SAMPLE_QUESTIONS.map((q) => (
              <Button
                key={q}
                type="default"
                size="small"
                className="chat-empty__question-btn"
                onClick={() => onSelectQuestion(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 网络错误时提供重试按钮 */}
      {status === 'network-error' && onRetry && (
        <Button
          type="primary"
          style={{ marginTop: 24 }}
          onClick={() => onRetry()}
        >
          重新连接
        </Button>
      )}
    </div>
  )
}
