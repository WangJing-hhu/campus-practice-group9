#!/usr/bin/env python3
"""
数据集验证脚本——检查采集结果的完整性与合规性。

用法:
    python validate_dataset.py [--source-list PATH]
                               [--generated-dir PATH]
                               [--manifest PATH]

检查项:
    1. source-list.csv 格式完整（必需列、50条记录）
    2. 每条记录 URL 格式正确
    3. 分类数量与分配一致
    4. generated/ 中 TXT 正文 >= 100 字
    5. manifest.json 与 source-list 记录一一对应
    6. 无重复 URL、无重复 ID
"""

import argparse
import csv
import json
import os
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

REQUIRED_COLUMNS = ["id", "title", "url", "source_site", "category",
                    "freshness", "enabled", "review_status", "review_note"]

CATEGORY_QUOTAS = {
    "学校概况与历史": 8,
    "校园公共服务": 8,
    "图书馆服务": 10,
    "教务教学": 10,
    "招生与专业": 8,
    "学院及其他官方子站": 6,
}

HTTP_URL_RE = re.compile(r"^https?://")


def validate_url(url: str) -> str | None:
    """验证 URL 格式。"""
    if not url or not HTTP_URL_RE.match(url):
        return f"无效 URL: {url}"
    parsed = urlparse(url)
    if "hhu.edu.cn" not in (parsed.hostname or ""):
        return f"非河海域名: {url}"
    return None


def main():
    parser = argparse.ArgumentParser(description="数据集验证")
    parser.add_argument("--source-list", default="knowledge-base/hhu-official/source-list.csv")
    parser.add_argument("--generated-dir", default="knowledge-base/hhu-official/generated")
    parser.add_argument("--manifest", default="knowledge-base/hhu-official/manifest.json")
    args = parser.parse_args()

    errors = []
    warnings = []

    # ── 1. 检查 source-list.csv ──────────────────────
    source_path = Path(args.source_list)
    if not source_path.exists():
        errors.append(f"source-list.csv 不存在: {source_path}")
        for e in errors:
            print(f"❌ {e}")
        return

    with open(source_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # 检查必需列
    actual_cols = set(reader.fieldnames or [])
    missing_cols = set(REQUIRED_COLUMNS) - actual_cols
    if missing_cols:
        errors.append(f"source-list.csv 缺少列: {missing_cols}")

    # 检查记录数
    if len(rows) != 50:
        msg = f"source-list.csv 共 {len(rows)} 条记录（预期 50）"
        if len(rows) < 50:
            errors.append(msg)
        else:
            warnings.append(msg)

    # 检查每条记录
    seen_ids = set()
    seen_urls = set()
    for row in rows:
        pid = row.get("id", "").strip()
        url = row.get("url", "").strip()
        review_status = row.get("review_status", "").strip()

        if not pid:
            errors.append(f"记录缺少 id: {row}")
        elif pid in seen_ids:
            errors.append(f"重复 id: {pid}")
        else:
            seen_ids.add(pid)

        if url in seen_urls:
            errors.append(f"重复 URL [{pid}]: {url}")
        else:
            seen_urls.add(url)

        err = validate_url(url)
        if err:
            errors.append(err)

        if review_status not in ("PENDING", "APPROVED", "REJECTED", "NEEDS_EDIT"):
            errors.append(f"[{pid}] 无效 review_status: {review_status}")

    # 检查分类数量
    categories = Counter(r.get("category", "").strip() for r in rows)
    for cat, expected in CATEGORY_QUOTAS.items():
        actual = categories.get(cat, 0)
        if actual != expected:
            msg = f"分类 '{cat}' 预期 {expected} 条，实际 {actual} 条"
            if actual < expected:
                warnings.append(msg)
            else:
                warnings.append(msg)

    # ── 2. 检查 generated/ TXT ─────────────────────────
    generated_dir = Path(args.generated_dir)
    approved_ids = {r["id"].strip() for r in rows if r.get("review_status") == "APPROVED"}
    txt_count = 0
    valid_txt_count = 0

    for pid in sorted(approved_ids):
        txt_file = generated_dir / f"{pid}.txt"
        err_file = generated_dir / f"{pid}.error"
        if txt_file.exists():
            txt_count += 1
            text = txt_file.read_text(encoding="utf-8")
            if len(text.strip()) >= 100:
                valid_txt_count += 1
            else:
                warnings.append(f"[{pid}] 正文不足 100 字（{len(text.strip())} 字）")
        else:
            warnings.append(f"[{pid}] 无生成文件")

    if valid_txt_count < 45:
        errors.append(f"正文合格的 TXT 仅 {valid_txt_count} 篇（要求 >=45，当前不达标）")

    # ── 3. 检查 manifest.json ────────────────────────
    manifest_path = Path(args.manifest)
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        manifest_ids = {e["id"] for e in manifest}
        csv_ids = {r["id"].strip() for r in rows}
        if manifest_ids != csv_ids:
            diff = manifest_ids.symmetric_difference(csv_ids)
            warnings.append(f"manifest 与 source-list 的 ID 不一致: {diff}")
    else:
        warnings.append("manifest.json 不存在，请先运行 build_manifest.py")

    # ── 输出报告 ──────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"📊 数据集验证报告")
    print(f"{'='*60}")
    print(f"source-list 记录: {len(rows)}")
    print(f"APPROVED 数量: {len(approved_ids)}")
    print(f"已生成 TXT: {txt_count}")
    print(f"正文合格 (≥100字): {valid_txt_count}")
    print(f"分类分布: {dict(categories)}")
    print(f"{'='*60}")

    if errors:
        print(f"\n❌ {len(errors)} 个错误:")
        for e in errors:
            print(f"   {e}")

    if warnings:
        print(f"\n⚠️  {len(warnings)} 个警告:")
        for w in warnings:
            print(f"   {w}")

    overall = "PASS" if not errors else "FAIL"
    print(f"\n结果: {overall}  (错误={len(errors)}  警告={len(warnings)})")

    if errors:
        exit(1)


if __name__ == "__main__":
    main()
