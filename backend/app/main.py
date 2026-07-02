from collections.abc import Iterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
import json
import sqlite3
import threading
import uuid

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field

from .config import settings
from .database import get_db, init_database, transaction, utc_now
from .rag_engine_v2 import HHURAGEngine, rag_engine
from .security import create_token, decode_token, hash_password, verify_password


class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ChatBody(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    conversation_id: int | None = None


class UserUpdateBody(BaseModel):
    role: str | None = None
    is_active: bool | None = None


def public_user(row: sqlite3.Row) -> dict[str, object]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }


def seed_database() -> None:
    with transaction() as db:
        admin = db.execute(
            "SELECT id FROM users WHERE email = ?", ("admin@campus.example",)
        ).fetchone()
        if not admin:
            cursor = db.execute(
                """
                INSERT INTO users(name, email, password_hash, role, is_active, created_at)
                VALUES (?, ?, ?, 'ADMIN', 1, ?)
                """,
                (
                    "系统管理员",
                    "admin@campus.example",
                    hash_password("admin123"),
                    utc_now(),
                ),
            )
            admin_id = int(cursor.lastrowid)
        else:
            admin_id = int(admin["id"])

        # 河海大学示例数据
        sample = (
            "河海大学是一所拥有111年办学历史，以水利为特色、工科为主，"
            '多学科协调发展的教育部直属全国重点大学，是国家"双一流"建设、'
            '"211工程"重点建设、"985工程优势学科创新平台"建设以及'
            "经国家批准设立研究生院的高校。\n\n"
            "河海大学的校训是：艰苦朴素、实事求是、严格要求、勇于探索。\n\n"
            "图书馆周一至周五开放时间为 08:00 至 22:00，周末开放时间为 "
            "09:00 至 21:00。法定节假日安排以图书馆公告为准。\n\n"
            "校园卡补办\n\n"
            "学生遗失校园卡后，可先在校园服务 App 中挂失，再携带学生证前往"
            "行政楼一层校园卡服务中心补办。补办工本费为 20 元。\n\n"
            "奖学金申请\n\n"
            "综合奖学金每学年评定一次，申请人需完成本学年培养方案规定课程，"
            "无违纪记录，并在学院通知期限内提交申请表和成绩证明。"
        )
        seed_path = settings.upload_dir / "seed-hhu-guide.md"
        seed_path.write_bytes(sample.encode("utf-8"))

        seed_document = db.execute(
            "SELECT id, status, chunk_count FROM documents WHERE stored_name = 'seed-hhu-guide.md'"
        ).fetchone()
        if (
            seed_document
            and seed_document["status"] == "READY"
            and seed_document["chunk_count"] > 0
        ):
            return

        if not seed_document:
            now = utc_now()
            cursor = db.execute(
                """
                INSERT INTO documents(
                    title, filename, stored_name, mime_type, size, status,
                    chunk_count, uploaded_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'PROCESSING', 0, ?, ?, ?)
                """,
                (
                    "河海大学校园服务指南（示例）",
                    "hhu-guide.md",
                    "seed-hhu-guide.md",
                    "text/markdown",
                    len(sample.encode()),
                    admin_id,
                    now,
                    now,
                ),
            )
            document_id = int(cursor.lastrowid)
        else:
            document_id = int(seed_document["id"])

        rag_engine.add_document(
            seed_path,
            document_id=document_id,
            title="河海大学校园服务指南（示例）",
            category="校园服务",
            db=db,
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    init_database()
    # 先初始化 RAG 引擎（加载/创建 FAISS 索引），再用它索引 seed 数据
    try:
        _ = HHURAGEngine()
        print("✅ DashScope + FAISS RAG engine initialized")
    except Exception as e:
        print(f"⚠️ RAG engine initialization failed: {e}")
        raise
    seed_database()

    # 在后台线程加载河海知识库，避免阻塞服务启动
    def _load_kb() -> None:
        try:
            loaded = rag_engine.load_knowledge_base(settings.knowledge_base_dir)
            print(f"✅ 知识库加载完成: {loaded} 篇文档")
        except Exception as e:
            print(f"⚠️ 知识库加载失败: {e}")

    threading.Thread(target=_load_kb, daemon=True).start()
    yield


app = FastAPI(title="河海大学校园问答助手 API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Database = Annotated[sqlite3.Connection, Depends(get_db)]


def current_user(
    db: Database, authorization: Annotated[str | None, Header()] = None
) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    if not payload:
        raise HTTPException(status_code=401, detail="登录状态已失效")
    user = db.execute(
        "SELECT * FROM users WHERE id = ?", (int(str(payload["sub"])),)
    ).fetchone()
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="账号不可用")
    return user


def admin_user(user: Annotated[sqlite3.Row, Depends(current_user)]) -> sqlite3.Row:
    if user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "dashscope", "version": "2.0.0"}


@app.post("/api/auth/guest")
def guest_login(db: Database) -> dict[str, object]:
    """为嵌入 Widget 创建独立的匿名访客身份。"""
    guest_key = uuid.uuid4().hex
    cursor = db.execute(
        """
        INSERT INTO users(name, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, 'STUDENT', 1, ?)
        """,
        (
            "访客",
            f"guest-{guest_key}@campus.local",
            hash_password(guest_key),
            utc_now(),
        ),
    )
    db.commit()
    guest = db.execute(
        "SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    if not guest:
        raise HTTPException(status_code=500, detail="无法创建访客用户")
    return {
        "token": create_token(guest["id"], guest["role"]),
        "user": public_user(guest),
    }


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterBody, db: Database) -> dict[str, object]:
    email = body.email.lower()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        raise HTTPException(status_code=409, detail="该邮箱已注册")
    cursor = db.execute(
        """
        INSERT INTO users(name, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, 'STUDENT', 1, ?)
        """,
        (body.name.strip(), email, hash_password(body.password), utc_now()),
    )
    db.commit()
    user = db.execute(
        "SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"token": create_token(user["id"], user["role"]), "user": public_user(user)}


@app.post("/api/auth/login")
def login(body: LoginBody, db: Database) -> dict[str, object]:
    user = db.execute(
        "SELECT * FROM users WHERE email = ?", (body.email.lower(),)
    ).fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="账号已停用")
    return {"token": create_token(user["id"], user["role"]), "user": public_user(user)}


@app.get("/api/auth/me")
def me(user: Annotated[sqlite3.Row, Depends(current_user)]) -> dict[str, object]:
    return public_user(user)


@app.get("/api/stats")
def stats(
    db: Database, _: Annotated[sqlite3.Row, Depends(current_user)]
) -> dict[str, int]:
    return {
        "documents": db.execute(
            "SELECT COUNT(*) FROM documents WHERE status = 'READY'"
        ).fetchone()[0],
        "chunks": len(rag_engine.index.docstore.docs),
        "conversations": db.execute("SELECT COUNT(*) FROM conversations").fetchone()[0],
    }


@app.get("/api/documents")
def list_documents(
    db: Database, _: Annotated[sqlite3.Row, Depends(admin_user)]
) -> list[dict[str, object]]:
    rows = db.execute("""
        SELECT d.*, u.name AS uploader_name
        FROM documents d JOIN users u ON u.id = d.uploaded_by
        ORDER BY d.created_at DESC
        """).fetchall()
    return [dict(row) | {"size": int(row["size"])} for row in rows]


@app.post("/api/documents", status_code=201)
async def upload_document(
    db: Database,
    user: Annotated[sqlite3.Row, Depends(admin_user)],
    title: Annotated[str, Form(min_length=2, max_length=120)],
    file: Annotated[UploadFile, File()],
) -> dict[str, object]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".txt", ".md", ".pdf", ".docx"}:
        raise HTTPException(status_code=400, detail="文件格式不支持")
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="文件不能超过 10MB")

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    (settings.upload_dir / stored_name).write_bytes(data)
    now = utc_now()
    cursor = db.execute(
        """
        INSERT INTO documents(
            title, filename, stored_name, mime_type, size, status,
            chunk_count, uploaded_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'PROCESSING', 0, ?, ?, ?)
        """,
        (
            title.strip(),
            file.filename or stored_name,
            stored_name,
            file.content_type or "application/octet-stream",
            len(data),
            user["id"],
            now,
            now,
        ),
    )
    # 使用 LlamaIndex 处理文档
    try:
        chunk_count = rag_engine.add_document(
            settings.upload_dir / stored_name,
            document_id=int(cursor.lastrowid),
            title=title.strip(),
            category="其他",
            db=db,
        )
        db.execute(
            """
            UPDATE documents
            SET status = 'READY', chunk_count = ?, error = NULL, updated_at = ?
            WHERE id = ?
            """,
            (chunk_count, utc_now(), cursor.lastrowid),
        )
        db.commit()
        rag_engine.save_index()
    except Exception as exc:
        db.execute(
            "UPDATE documents SET status = 'ERROR', error = ?, updated_at = ? WHERE id = ?",
            (str(exc), utc_now(), cursor.lastrowid),
        )
        db.commit()
    row = db.execute(
        "SELECT * FROM documents WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return dict(row)


@app.post("/api/documents/{document_id}/reprocess")
def reprocess_document(
    document_id: int,
    db: Database,
    _: Annotated[sqlite3.Row, Depends(admin_user)],
) -> dict[str, object]:
    document = db.execute(
        "SELECT * FROM documents WHERE id = ?", (document_id,)
    ).fetchone()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    path = settings.upload_dir / document["stored_name"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="原始文件不存在")
    try:
        chunk_count = rag_engine.reprocess_document(
            path,
            document_id=document_id,
            title=document["title"],
            category=document["category"] or "其他",
            db=db,
        )
        db.execute(
            "UPDATE documents SET status = 'READY', chunk_count = ?, error = NULL, updated_at = ? WHERE id = ?",
            (chunk_count, utc_now(), document_id),
        )
        db.commit()
        rag_engine.save_index()
    except Exception as exc:
        db.execute(
            "UPDATE documents SET status = 'ERROR', error = ?, updated_at = ? WHERE id = ?",
            (str(exc), utc_now(), document_id),
        )
        db.commit()
    row = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    return dict(row)


@app.delete("/api/documents/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Database,
    _: Annotated[sqlite3.Row, Depends(admin_user)],
) -> None:
    document = db.execute(
        "SELECT * FROM documents WHERE id = ?", (document_id,)
    ).fetchone()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    db.commit()
    rag_engine.delete_document(document_id)
    path = settings.upload_dir / document["stored_name"]
    if path.exists() and not document["stored_name"].startswith("seed-"):
        path.unlink()


@app.post("/api/chat/stream")
async def chat_stream(
    body: ChatBody,
    db: Database,
    user: Annotated[sqlite3.Row, Depends(current_user)],
) -> StreamingResponse:
    now = utc_now()
    conversation_id = body.conversation_id
    if conversation_id:
        conversation = db.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user["id"]),
        ).fetchone()
        if not conversation:
            raise HTTPException(status_code=404, detail="会话不存在")
    else:
        cursor = db.execute(
            """
            INSERT INTO conversations(user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (user["id"], body.question[:28], now, now),
        )
        conversation_id = int(cursor.lastrowid)

    # 使用 LlamaIndex RAG 引擎进行流式查询
    def events() -> Iterator[str]:
        full_answer = ""
        sources = []
        for event in rag_engine.stream_query(body.question, conversation_id):
            if event.startswith("event: meta"):
                try:
                    data = event.split("data: ", 1)[1]
                    parsed = json.loads(data)
                    sources = parsed.get("sources", [])
                    parsed["conversation_id"] = conversation_id
                    event = (
                        "event: meta\n"
                        f"data: {json.dumps(parsed, ensure_ascii=False)}\n\n"
                    )
                except Exception:
                    pass
            elif event.startswith("event: token"):
                try:
                    data = event.split("data: ", 1)[1]
                    parsed = json.loads(data)
                    full_answer += parsed.get("text", "")
                except Exception:
                    pass
            yield event

        # 保存问答记录
        db.execute(
            """
            INSERT INTO messages(conversation_id, role, content, sources, created_at)
            VALUES (?, 'USER', ?, '[]', ?)
            """,
            (conversation_id, body.question, now),
        )
        db.execute(
            """
            INSERT INTO messages(conversation_id, role, content, sources, created_at)
            VALUES (?, 'ASSISTANT', ?, ?, ?)
            """,
            (
                conversation_id,
                full_answer,
                json.dumps(sources, ensure_ascii=False),
                utc_now(),
            ),
        )
        db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (utc_now(), conversation_id),
        )
        db.commit()

    return StreamingResponse(events(), media_type="text/event-stream")


@app.get("/api/conversations")
def list_conversations(
    db: Database, user: Annotated[sqlite3.Row, Depends(current_user)]
) -> list[dict[str, object]]:
    rows = db.execute(
        """
        SELECT c.*, COUNT(m.id) AS message_count
        FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        """,
        (user["id"],),
    ).fetchall()
    return [dict(row) for row in rows]


@app.get("/api/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    db: Database,
    user: Annotated[sqlite3.Row, Depends(current_user)],
) -> dict[str, object]:
    conversation = db.execute(
        "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user["id"]),
    ).fetchone()
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    messages = db.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id",
        (conversation_id,),
    ).fetchall()
    return dict(conversation) | {
        "messages": [
            dict(row) | {"sources": json.loads(row["sources"])} for row in messages
        ]
    }


@app.delete("/api/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: int,
    db: Database,
    user: Annotated[sqlite3.Row, Depends(current_user)],
) -> None:
    cursor = db.execute(
        "DELETE FROM conversations WHERE id = ? AND user_id = ?",
        (conversation_id, user["id"]),
    )
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="会话不存在")


@app.get("/api/users")
def list_users(
    db: Database, _: Annotated[sqlite3.Row, Depends(admin_user)]
) -> list[dict[str, object]]:
    rows = db.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    return [public_user(row) for row in rows]


@app.patch("/api/users/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdateBody,
    db: Database,
    admin: Annotated[sqlite3.Row, Depends(admin_user)],
) -> dict[str, object]:
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user_id == admin["id"] and body.is_active is False:
        raise HTTPException(status_code=400, detail="不能停用当前管理员")
    role = body.role or user["role"]
    if role not in {"STUDENT", "ADMIN"}:
        raise HTTPException(status_code=400, detail="角色无效")
    active = int(body.is_active) if body.is_active is not None else user["is_active"]
    db.execute(
        "UPDATE users SET role = ?, is_active = ? WHERE id = ?",
        (role, active, user_id),
    )
    db.commit()
    updated = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return public_user(updated)
