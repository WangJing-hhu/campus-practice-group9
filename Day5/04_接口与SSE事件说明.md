# Day5 接口与 SSE 事件说明

## 一、文档目的

本文档用于统一 Day5 校园问答模块的前端、Java 后端和 Python AI 服务接口约定，重点说明：

- 同步问答接口；
- SSE 流式问答接口；
- 会话与历史记录接口；
- Java 与 Python 检索接口；
- SSE 事件类型和前端处理顺序；
- 鉴权、异常处理和来源字段要求。

> 说明：本文档记录当前团队统一约定。最终接口字段应在代码合并和联调后再次核对。

---

## 二、统一接口规范

### 2.1 基础地址

| 服务 | 默认地址 | 说明 |
|---|---|---|
| React 前端 | `http://localhost:5173` | 用户访问页面 |
| Spring Boot 后端 | `http://localhost:8080` | 用户、文档、会话和 RAG 编排 |
| Python AI 服务 | `http://localhost:8000` | 文档处理、向量化和检索 |
| MySQL | `localhost:3306` | 业务数据存储 |

### 2.2 数据格式

普通 REST 接口使用：

```http
Content-Type: application/json
```

文件上传接口使用：

```http
Content-Type: multipart/form-data
```

SSE 流式接口返回：

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 2.3 用户鉴权

除登录、注册、健康检查和内部回调外，用户接口均需要携带 JWT：

```http
Authorization: Bearer <token>
```

Java 调用 Python 内部接口时携带：

```http
X-Internal-Token: <internal-token>
```

用户只能读取、修改和删除属于自己的会话与问答记录。

---

## 三、同步问答接口

### 3.1 接口信息

```http
POST /api/chat
```

### 3.2 请求示例

```json
{
  "question": "河海大学的校训是什么？",
  "conversationId": null,
  "topK": 5,
  "scoreThreshold": 0.3
}
```

字段说明：

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| question | string | 是 | 用户问题，不能为空 |
| conversationId | number | 否 | 已有会话 ID；为空时创建新会话 |
| topK | number | 否 | 检索文本块数量，默认 5 |
| scoreThreshold | number | 否 | 相似度阈值 |

### 3.3 成功响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "conversationId": 12,
    "recordId": 35,
    "answer": "河海大学的校训是……[1]",
    "sources": [
      {
        "index": 1,
        "documentId": 8,
        "title": "河海大学学校概况",
        "fileName": "学校概况.html",
        "content": "……",
        "score": 0.86,
        "sourceUrl": "https://www.hhu.edu.cn/..."
      }
    ],
    "model": "qwen-plus",
    "durationMs": 1860
  },
  "timestamp": 1784340000000
}
```

### 3.4 无有效资料

没有达到相似度要求的资料时，应返回：

```json
{
  "answer": "根据现有资料，暂未找到相关信息。",
  "sources": []
}
```

禁止：

- 编造回答；
- 编造官网网址；
- 返回虚假的 `[1]`、`[2]`；
- 使用与问题无关的来源补足答案。

---

## 四、SSE 流式问答接口

### 4.1 接口信息

```http
POST /api/chat/stream
```

请求体与同步问答接口基本一致。

前端应使用 `fetch` 读取响应流，不使用只能发送 GET 请求的原生 `EventSource`。

### 4.2 标准事件顺序

正常情况下按照以下顺序返回：

```text
meta → token → token → …… → done
```

异常情况下返回：

```text
meta → token → …… → error
```

检索阶段就失败时，也可能直接返回：

```text
error
```

---

## 五、SSE 事件定义

### 5.1 `meta` 事件

用途：

- 返回会话 ID；
- 返回问答记录 ID；
- 返回检索来源；
- 通知前端本次请求已开始处理。

示例：

```text
event: meta
data: {"conversationId":12,"recordId":35,"sources":[{"index":1,"title":"河海大学学校概况","score":0.86,"sourceUrl":"https://www.hhu.edu.cn/..."}]}
```

前端处理：

1. 保存 `conversationId`；
2. 保存 `recordId`；
3. 初始化来源卡片；
4. 如果是新会话，刷新左侧会话列表。

### 5.2 `token` 事件

用途：逐段返回大模型生成的文本。

示例：

```text
event: token
data: {"content":"河海大学"}
```

```text
event: token
data: {"content":"的校训是"}
```

前端处理：

```text
已有回答文本 + 本次 content
```

前端不得在每个 token 到达时创建一条新消息，只更新当前流式助手气泡。

### 5.3 `done` 事件

用途：表示完整回答已经生成并保存。

示例：

```text
event: done
data: {"recordId":35,"status":"COMPLETED","durationMs":1860}
```

前端处理：

1. 停止流式光标；
2. 将临时助手气泡转为正式消息；
3. 保留回答和来源卡片；
4. 更新会话列表时间和记录数量；
5. 清除发送中状态。

### 5.4 `error` 事件

用途：返回检索、模型、网络或服务异常。

示例：

```text
event: error
data: {"code":"LLM_TIMEOUT","message":"大模型响应超时，请稍后重试","recordId":35}
```

前端处理：

1. 停止流式状态；
2. 显示用户可理解的错误信息；
3. 保留已经接收到的部分回答；
4. 不生成虚假来源；
5. 允许用户重新提问或重新连接。

---

## 六、停止生成

用户点击“停止生成”后，前端应：

1. 通过 `AbortController.abort()` 终止当前请求；
2. 停止继续追加 token；
3. 保留已经生成的部分内容；
4. 将当前记录标记为 `INTERRUPTED`；
5. 允许用户继续发起新问题。

建议保存状态：

```text
PENDING
COMPLETED
FAILED
INTERRUPTED
```

停止生成不等于删除会话或删除已有回答。

---

## 七、会话管理接口

### 7.1 查询会话列表

```http
GET /api/chat/conversations?page=1&size=20
```

返回内容至少包括：

```json
{
  "id": 12,
  "title": "河海大学校训",
  "recordCount": 3,
  "createTime": "2026-07-18T10:20:00",
  "updateTime": "2026-07-18T10:26:00"
}
```

### 7.2 查询会话详情

```http
GET /api/chat/conversations/{conversationId}
```

返回：

- 会话基本信息；
- 用户问题；
- 助手完整回答；
- 每轮回答的来源；
- 问答状态；
- 创建时间。

### 7.3 修改会话标题

```http
PUT /api/chat/conversations/{conversationId}
```

请求：

```json
{
  "title": "河海大学招生咨询"
}
```

### 7.4 删除会话

```http
DELETE /api/chat/conversations/{conversationId}
```

删除前必须校验该会话是否属于当前用户。

删除会话时应同时处理该会话下的问答记录。

---

## 八、Java 调用 Python 检索接口

### 8.1 检索接口

```http
POST /search
```

请求示例：

```json
{
  "question": "河海大学的校训是什么？",
  "top_k": 5,
  "score_threshold": 0.3
}
```

请求头：

```http
X-Internal-Token: <internal-token>
```

### 8.2 返回示例

```json
{
  "results": [
    {
      "document_id": 8,
      "chunk_index": 2,
      "content": "……",
      "title": "河海大学学校概况",
      "file_name": "学校概况.html",
      "score": 0.86,
      "source_url": "https://www.hhu.edu.cn/..."
    }
  ],
  "count": 1
}
```

Java 接收 Python 字段时应注意：

```text
Python：snake_case
Java：camelCase
```

例如：

```text
document_id → documentId
chunk_index → chunkIndex
file_name → fileName
source_url → sourceUrl
```

---

## 九、来源与引用规范

回答正文中的引用编号：

```text
[1] [2] [3]
```

必须与 `sources` 数组中的 `index` 一致。

示例：

```json
{
  "answer": "河海大学的相关信息可以在学校官网查询[1]。",
  "sources": [
    {
      "index": 1,
      "title": "河海大学学校概况"
    }
  ]
}
```

前端点击 `[1]` 后，应滚动到对应来源卡片并短暂高亮。

来源卡片至少展示：

- 来源编号；
- 页面或文档标题；
- 文件名；
- 内容摘要；
- 相似度；
- 官网原文链接。

刷新页面或重新进入历史会话后，来源仍应能够恢复。

---

## 十、主要异常类型

| 异常类型 | 建议提示 |
|---|---|
| EMPTY_QUESTION | 问题不能为空 |
| UNAUTHORIZED | 登录状态已失效，请重新登录 |
| CONVERSATION_NOT_FOUND | 会话不存在或无权访问 |
| RETRIEVAL_EMPTY | 根据现有资料，暂未找到相关信息 |
| AI_SERVICE_UNAVAILABLE | AI 检索服务暂时不可用 |
| LLM_TIMEOUT | 大模型响应超时，请稍后重试 |
| LLM_API_ERROR | 回答生成失败，请稍后重试 |
| STREAM_INTERRUPTED | 回答生成已停止 |
| INTERNAL_ERROR | 服务异常，请稍后重试 |

错误提示应面向普通用户，详细异常信息记录在服务端日志中，不直接返回密钥、路径或堆栈信息。

---

## 十一、联调检查清单

- [ ] 同步问答接口可以返回完整回答；
- [ ] SSE 按 `meta → token → done` 顺序返回；
- [ ] 多个 token 能正确拼接为一条回答；
- [ ] 新会话能返回并保存 `conversationId`；
- [ ] 来源编号与回答中的引用一致；
- [ ] 来源卡片可以打开官网原文；
- [ ] 无资料时不编造回答；
- [ ] 停止生成后不再接收 token；
- [ ] 历史会话可以恢复回答和来源；
- [ ] 用户无法访问其他用户的会话；
- [ ] JWT 和内部 Token 均能正常校验；
- [ ] 网络、检索和 LLM 异常均有友好提示。

## 十二、待最终确认项

PR 合并并完成联调后，需要根据实际代码再次确认：

- `/api/chat/stream` 的最终请求方法；
- SSE 每个事件的实际 JSON 字段；
- 删除单条问答记录的接口地址；
- `topK` 和 `scoreThreshold` 的默认值；
- 停止生成后的后端记录状态；
- Python `/search` 的最终返回结构。
