# AI Service

## 启动
pip install -r requirements.txt
cp .env.example .env  # 填入 DASHSCOPE_API_KEY
python -m uvicorn ai_service.main:app --reload --port 8000

## 接口
- GET /health
- POST /process
- POST /search
- DELETE /document/{doc_id}
