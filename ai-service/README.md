# AI Service

校园问答助手 Python AI 服务 —— 文档处理、文本向量化、FAISS 语义检索。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DASHSCOPE_API_KEY` | (必填) | 阿里云 DashScope API Key |
| `AI_CALLBACK_TOKEN` | `day4-internal-callback-token` | 内部回调认证 Token，**必须与 Java 一致** |
| `UPLOAD_DIR` | `../storage/uploads` | 上传文件根目录，**必须与 Java 使用同一个目录** |

> ⚠️ **重要**：`UPLOAD_DIR` 默认值 `../storage/uploads` 假设 ai-service 和 backend 是同级目录，
> 两者启动后解析到同一个 `storage/uploads`。如果目录结构不同，请用绝对路径配置，确保 Java 传给 Python
> 的文件路径在允许目录内，否则 /process 接口会返回"不允许的文件路径"。

## 快速开始

```bash
cp .env.example .env  # 编辑填入 DASHSCOPE_API_KEY
pip install -r requirements.txt
python -m uvicorn ai_service.main:app --reload --port 8000
```

## 验证

```bash
# 运行全部测试
pytest -q

# 检查服务是否正常启动
curl http://localhost:8000/health
```

## 接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/health` | 无 | 健康检查，返回 `status`、`model`、`index_size`、`key_configured` |
| POST | `/process` | `X-Internal-Token` | 文档处理流水线 |
| POST | `/search` | `X-Internal-Token` | 语义检索 top-k，支持 `score_threshold` 阈值过滤和去重 |
| DELETE | `/document/{doc_id}` | `X-Internal-Token` | 删除文档向量 |

### POST /search 请求体

```json
{
  "question": "河海大学图书馆开放时间是什么？",
  "top_k": 5,
  "score_threshold": 0.70
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `question` | string | (必填) | 用户问题 |
| `top_k` | int | 5 | 返回结果数量 |
| `score_threshold` | float | 0.70 | 余弦相似度阈值，低于此值不返回 |

### POST /search 返回字段

每条结果包含：`doc_id`、`title`、`file_name`、`chunk_idx`、`content`、`score`。
结果按 `score` 降序；同一文档高度重复的片段自动去重；不足 `top_k` 条时按实际数量返回。

### GET /health 返回字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | 服务状态，正常为 `"OK"` |
| `model` | string | Embedding 模型名称 |
| `index_size` | int | 当前 FAISS 索引中的向量总数 |
| `key_configured` | bool | DashScope API Key 是否已配置 |
