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
| GET | `/health` | 无 | 健康检查 |
| POST | `/process` | `X-Internal-Token` | 文档处理流水线 |
| POST | `/search` | `X-Internal-Token` | 语义检索 top-k |
| DELETE | `/document/{doc_id}` | `X-Internal-Token` | 删除文档向量 |
