#!/usr/bin/env python3
"""
构建/更新 manifest.json——记录每条官网来源的元数据与处理状态。

用法:
    python build_manifest.py [--source-list PATH]
                             [--generated-dir PATH]
                             [--manifest PATH]

工作流:
    1. 读取 source-list.csv 的审核状态
    2. 扫描 generated/ 目录中的 TXT 文件
    3. 计算每个文件的 SHA-256 content_hash
    4. 对比已有 manifest.json：
       - 新增 → 状态 NEW
       - 哈希相同 → 保持原 import_status（跳过）
       - 哈希不同 → 状态 UPDATED
       - 源列表有但无 TXT → 状态 MISSING
"""

import argparse
import csv
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


def compute_hash(filepath: str) -> str:
    """计算文件的 SHA-256 哈希。"""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_existing_manifest(path: str) -> dict[str, dict]:
    """加载已有 manifest。"""
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        entries = json.load(f)
    return {e["id"]: e for e in entries}


def main():
    parser = argparse.ArgumentParser(description="构建 manifest.json")
    parser.add_argument("--source-list", default="knowledge-base/hhu-official/source-list.csv")
    parser.add_argument("--generated-dir", default="knowledge-base/hhu-official/generated")
    parser.add_argument("--manifest", default="knowledge-base/hhu-official/manifest.json")
    args = parser.parse_args()

    # 读取 source-list
    with open(args.source_list, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    existing = load_existing_manifest(args.manifest)
    generated_dir = Path(args.generated_dir)
    entries = []

    stats = {"NEW": 0, "UNCHANGED": 0, "UPDATED": 0, "MISSING": 0, "INVALID": 0}

    for row in rows:
        page_id = row["id"].strip()
        title = row.get("title", "").strip()
        url = row.get("url", "").strip()
        source_site = row.get("source_site", "河海大学官网").strip()
        category = row.get("category", "").strip()
        review_status = row.get("review_status", "").strip()
        published_at = row.get("published_at", "").strip() or None
        freshness = row.get("freshness", "static").strip()
        review_note = row.get("review_note", "").strip() or None

        entry = {
            "id": page_id,
            "file_name": f"{page_id}_{title}.txt",
            "title": title,
            "source_url": url,
            "source_site": source_site,
            "category": category,
            "freshness": freshness,
            "published_at": published_at,
            "crawled_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "content_hash": None,
            "review_status": review_status,
            "review_note": review_note,
            "import_status": "PENDING",
        }

        # 检查生成的 TXT
        generated_file = generated_dir / f"{page_id}.txt"
        err_file = generated_dir / f"{page_id}.error"

        if generated_file.exists():
            # 读取正文内容，检查长度
            text = generated_file.read_text(encoding="utf-8")
            content_len = len(text.strip())

            # 正文不足 100 字或有 .error 文件 → 标记 INVALID，禁止导入
            if content_len < 100 or err_file.exists():
                entry["content_hash"] = compute_hash(str(generated_file))
                entry["import_status"] = "INVALID"
                if err_file.exists():
                    entry["error_note"] = err_file.read_text(encoding="utf-8").strip()[:500]
                else:
                    entry["error_note"] = f"正文不足 100 字（实际 {content_len} 字）"
                stats["INVALID"] = stats.get("INVALID", 0) + 1
            else:
                entry["content_hash"] = compute_hash(str(generated_file))
                old = existing.get(page_id, {})
                old_hash = old.get("content_hash")
                if old_hash == entry["content_hash"]:
                    entry["import_status"] = old.get("import_status", "PENDING")
                    if entry["import_status"] == "INVALID":
                        entry["import_status"] = "INVALID"
                    entry["crawled_at"] = old.get("crawled_at", entry["crawled_at"])
                    stats["UNCHANGED"] += 1
                elif old_hash is not None:
                    entry["import_status"] = "PENDING"
                    stats["UPDATED"] += 1
                else:
                    stats["NEW"] += 1
        else:
            entry["import_status"] = "MISSING"
            stats["MISSING"] += 1
            if err_file.exists():
                with open(err_file, "r", encoding="utf-8") as f:
                    entry["error_note"] = f.read().strip()[:500]

        entries.append(entry)

    # 写入 manifest
    with open(args.manifest, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    total = len(entries)
    print(f"📋 manifest.json 已更新: 共 {total} 条")
    print(f"   NEW={stats['NEW']}  UNCHANGED={stats['UNCHANGED']}"
          f"  UPDATED={stats['UPDATED']}  MISSING={stats['MISSING']}"
          f"  INVALID={stats['INVALID']}")


if __name__ == "__main__":
    main()
