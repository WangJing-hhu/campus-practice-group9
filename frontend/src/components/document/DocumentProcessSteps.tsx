import { Steps, Alert } from 'antd'
import type { DocStatus, ProcessStage } from '../../types/document'

// ===== 文档处理阶段步骤条 =====

/** 处理阶段 → 步骤序号（0-based），EMBEDDING/INDEXING 共用"向量化" */
const STAGE_TO_STEP: Record<ProcessStage, number> = {
  UPLOADED: 0,
  EXTRACTING: 1,
  SPLITTING: 2,
  EMBEDDING: 3,
  INDEXING: 3,
  DONE: 4,
}

/** 步骤标题 */
const STEP_TITLES: string[] = ['上传', '提取', '切分', '向量化', '完成']

interface DocumentProcessStepsProps {
  status: DocStatus | undefined | null
  processStage: ProcessStage | undefined | null
  errorMessage?: string | null
}

/**
 * 展示文档处理阶段：
 * 上传 → 提取 → 切分 → 向量化 → 完成
 *
 * 不创建轮询或请求接口，仅根据 props 渲染。
 */
export function DocumentProcessSteps({
  status,
  processStage,
  errorMessage,
}: DocumentProcessStepsProps) {
  const stepIndex = (() => {
    if (!status) return 0
    if (status === 'COMPLETED') return STEP_TITLES.length - 1
    return processStage ? (STAGE_TO_STEP[processStage] ?? 0) : 0
  })()

  // 边界保护：确保 current 永远在 [0, steps.length - 1] 范围内
  const safeCurrent = Math.min(Math.max(stepIndex, 0), STEP_TITLES.length - 1)

  const isFailed = status === 'FAILED'
  const isCompleted = status === 'COMPLETED'

  const stepsStatus = isFailed ? 'error' : isCompleted ? 'finish' : 'process'

  return (
    <div className="kb-process-steps">
      <Steps
        current={safeCurrent}
        size="small"
        status={stepsStatus}
        items={STEP_TITLES.map((title) => ({ title }))}
      />
      {isFailed && errorMessage && (
        <Alert
          type="error"
          message="处理失败"
          description={errorMessage}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  )
}
