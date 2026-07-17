#!/usr/bin/env python3
"""
批量导入脚本——将清洗后的 TXT 正文导入知识库。

用法:
    # 试运行（不实际导入）
    python import_to_kb.py --dry-run

    # 实际导入（需要 Java 后端运行中）
    python import_to_kb.py [--manifest PATH]
                           [--generated-dir PATH]
                           [--base-url URL]
                           [--token JWT_TOKEN]
                           [--user-id ID]

工作流:
    1. 读取 manifest.json，筛选 import_status ∈ {PENDING, UPDATED}
    2. 逐个调用 Java POST /api/doc/upload 上传 TXT
    3. 上传时携带来源元数据字段
    4. 根据响应更新 manifest 的 import_status
    5. 输出成功/失败/跳过统计
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests


def upload_document(
    txt_path: str,
    metadata: dict,
    base_url: str,
    token: str,
    user_id: str,
) -> tuple[str, str | None]:
    """调用 Java 上传接口。返回 (status, error_message)。"""
    url = f"{base_url.rstrip('/')}/api/doc/upload"

    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        with open(txt_path, "rb") as f:
            files = {"file": (os.path.basename(txt_path), f, "text/plain")}
            data = {
                "title": metadata.get("title", ""),
                "sourceUrl": metadata.get("source_url", ""),
                "sourceSite": metadata.get("source_site", ""),
                "category": metadata.get("category", ""),
                "publishedAt": metadata.get("published_at", ""),
                "crawledAt": metadata.get("crawled_at", ""),
                "userId": user_id,
            }
            # 移除空值
            data = {k: v for k, v in data.items() if v}

            resp = requests.post(url, files=files, data=data,
                                 headers=headers, timeout=30)
            if resp.status_code in (200, 201):
                return "IMPORTED", None
            else:
                msg = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
                return "FAILED", msg
    except requests.exceptions.ConnectionError:
        return "FAILED", "无法连接 Java 后端"
    except requests.exceptions.Timeout:
        return "FAILED", "上传超时"
    except Exception as e:
        return "FAILED", str(e)[:300]


def main():
    parser = argparse.ArgumentParser(description="批量导入到知识库")
    parser.add_argument("--manifest", default="knowledge-base/hhu-official/manifest.json")
    parser.add_argument("--generated-dir", default="knowledge-base/hhu-official/generated")
    parser.add_argument("--base-url", default=os.environ.get("JAVA_BASE_URL", "http://localhost:8081"))
    parser.add_argument("--token", default=os.environ.get("JWT_TOKEN", ""))
    parser.add_argument("--user-id", default=os.environ.get("UPLOAD_USER_ID", "1"))
    parser.add_argument("--dry-run", action="store_true",
                        help="仅检查，不上传")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"❌ manifest.json 不存在: {manifest_path}")
        sys.exit(1)

    with open(manifest_path, "r", encoding="utf-8") as f:
        entries = json.load(f)

    generated_dir = Path(args.generated_dir)

    # 筛选需要导入的条目
    pending = [e for e in entries if e.get("import_status") in ("PENDING", "UPDATED")]

    if not pending:
        print("✅ 没有待导入的条目")
        return

    print(f"📋 待导入: {len(pending)} 条")

    if args.dry_run:
        print("🔍 DRY RUN 模式——不会实际上传")
        print("即将导入以下文件:")
        for entry in pending:
            pid = entry["id"]
            fname = f"{pid}.txt"
            filepath = generated_dir / fname
            exists = "✅" if filepath.exists() else "❌ 文件缺失"
            print(f"   [{pid}] {entry['title']}  ({exists})")
        return

    # 实际导入
    success = 0
    failed = 0
    changed = False

    for i, entry in enumerate(pending, 1):
        pid = entry["id"]
        fname = f"{pid}.txt"
        filepath = generated_dir / fname

        if not filepath.exists():
            print(f"❌ [{pid}] 文件不存在: {fname}")
            entry["import_status"] = "MISSING"
            entry["error_note"] = "TXT 文件不存在"
            failed += 1
            changed = True
            continue

        print(f"[{i}/{len(pending)}] 📤 上传: [{pid}] {entry['title']}")

        status, error = upload_document(
            str(filepath), entry, args.base_url, args.token, args.user_id
        )

        if status == "IMPORTED":
            entry["import_status"] = "IMPORTED"
            entry.pop("error_note", None)
            print(f"   ✅ 导入成功")
            success += 1
        else:
            entry["import_status"] = "FAILED"
            entry["error_note"] = error
            print(f"   ❌ 失败: {error}")
            failed += 1

        changed = True

        # 间隔避免打垮后端
        if i < len(pending):
            time.sleep(0.5)

    # 写回 manifest
    if changed:
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print("📝 manifest.json 已更新")

    # 统计
    all_status = {}
    for e in entries:
        s = e.get("import_status", "UNKNOWN")
        all_status[s] = all_status.get(s, 0) + 1

    print(f"\n📊 批量导入完成:")
    print(f"   本次: 成功={success}  失败={failed}")
    print(f"   全量状态: {dict(all_status)}")


if __name__ == "__main__":
    main()
