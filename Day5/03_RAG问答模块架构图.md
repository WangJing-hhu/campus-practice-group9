# Day5 RAG 问答模块架构图

## 一、模块目标

Day5 在现有知识库管理功能基础上，实现“用户提问—知识检索—大模型回答—来源展示—历史保存”的完整 RAG 问答流程。

## 二、总体处理流程

```mermaid
flowchart LR
    A[用户在聊天页面输入问题] --> B[React 前端]
    B -->|POST /api/chat/stream| C[Spring Boot ChatController]
    C --> D[RagService]
    D --> E[ChatHistoryService]
    E -->|读取最近3轮历史| D
    D --> F[AiClient]
    F -->|POST /search| G[Python AI Service]
    G --> H[FAISS 向量知识库]
    H --> G
    G -->|返回 TopK 检索结果| F
    F --> D
    D --> I[PromptBuilder]
    I --> J[LlmClient]
    J -->|调用通义千问 API| K[大语言模型]
    K --> J
    J -->|SSE token| D
    D -->|meta / token / done / error| C
    C --> B
    B --> L[显示回答、引用编号和来源卡片]
    D --> M[(MySQL)]
    M -->|保存会话、问题、回答和来源| D
````

## 三、各模块职责

| 模块                 | 主要职责                       |
| ------------------ | -------------------------- |
| React 聊天页面         | 输入问题、展示流式回答、会话列表和来源卡片      |
| ChatController     | 接收同步或流式问答请求，返回 SSE 事件      |
| RagService         | 编排检索、历史记录、Prompt 和大模型调用    |
| ChatHistoryService | 管理会话和问答记录，进行用户权限隔离         |
| AiClient           | 调用 Python 的 `/search` 检索接口 |
| Python AI Service  | 文档向量检索、相似度筛选和来源元数据返回       |
| PromptBuilder      | 将检索结果、最近对话历史和用户问题组装为提示词    |
| LlmClient          | 调用大模型并处理同步或流式输出            |
| MySQL              | 保存会话、问题、回答、来源、状态和耗时        |
| FAISS              | 保存文档向量并完成相似度检索             |

## 四、SSE 事件流程

流式问答按照以下顺序返回：

```text
meta → token → token → ... → done
```

发生异常时返回：

```text
error
```

各事件含义：

* `meta`：返回会话 ID、问答记录 ID 和检索来源；
* `token`：返回大模型生成的一段文本；
* `done`：表示回答生成结束；
* `error`：返回检索、模型或网络异常信息。

## 五、数据保存要求

每次问答应保存以下信息：

* 当前用户 ID；
* 会话 ID；
* 用户问题；
* 助手完整回答；
* 检索来源 `source_docs`；
* 问答状态；
* 模型名称；
* 检索参数；
* 总响应耗时；
* 异常信息。

## 六、安全与可靠性要求

* 用户只能访问自己的会话和问答记录；
* Java 与 Python 内部接口使用 `X-Internal-Token`；
* 没有有效资料时不得调用常识编造回答；
* 回答中的 `[1][2]` 应与来源卡片编号一致；
* 停止生成后应中断流式请求并保留已生成内容；
* 页面刷新后应能够恢复完整回答和来源。
