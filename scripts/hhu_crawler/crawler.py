#!/usr/bin/env python3
"""
河海大学官网知识库采集脚本。

用法:
    python crawler.py [--source-list PATH]
                      [--output-dir PATH]
                      [--delay MIN MAX]
                      [--timeout SEC]
                      [--retries N]

从 source-list.csv 中读取 status=APPROVED 且 enabled=1 的页面，
依次抓取并保存到 output-dir。已存在文件跳过，支持断点续传。

原则:
    - 间隔 1~2 秒（可配置），禁止高频请求。
    - 超时 10 秒，最多 2 次重试。
    - 只访问 source-list.csv 中的白名单 URL，不递归外链。
    - 正文清洗由 cleaner.py 独立完成，本脚本只负责原始 HTML 抓取。
"""

import argparse
import csv
import os
import random
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── 全局 UA（模拟浏览器，降低被拒概率） ──────────────
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

HEADERS = {"User-Agent": USER_AGENT}

# 仅允许河海大学域名
ALLOWED_DOMAINS = {
    "www.hhu.edu.cn",
    "hhu.edu.cn",
    "lib.hhu.edu.cn",
    "jwc.hhu.edu.cn",
    "yjsy.hhu.edu.cn",
    "zsb.hhu.edu.cn",
    "cie.hhu.edu.cn",
    "sise.hhu.edu.cn",
    "cse.hhu.edu.cn",
    "wgy.hhu.edu.cn",
    "spa.hhu.edu.cn",
    "ms.hhu.edu.cn",
    "hhbs.hhu.edu.cn",
}

def is_allowed_url(url: str) -> bool:
    """检查 URL 是否属于允许的域名范围。"""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return host in ALLOWED_DOMAINS or host.endswith(".hhu.edu.cn")


def fetch_page(url: str, timeout: int, retries: int) -> tuple[str | None, str | None]:
    """抓取单个页面。返回 (html_text, error_message)。"""
    if not is_allowed_url(url):
        return None, f"URL 不在白名单: {url}"

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            # 检查 Content-Type，只保留 text/html
            ct = resp.headers.get("Content-Type", "")
            if "text/html" not in ct and "text/plain" not in ct:
                return None, f"非文本内容类型: {ct}"
            resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text, None
        except requests.exceptions.Timeout:
            last_error = f"超时（第{attempt}次）"
        except requests.exceptions.HTTPError as e:
            last_error = f"HTTP {e.response.status_code}"
        except requests.exceptions.ConnectionError:
            last_error = f"连接失败（第{attempt}次）"
        except Exception as e:
            last_error = f"未知错误: {e}"

        if attempt < retries:
            time.sleep(2)  # 重试前等待

    return None, last_error


def main():
    parser = argparse.ArgumentParser(description="河海大学官网采集脚本")
    parser.add_argument("--source-list", default="knowledge-base/hhu-official/source-list.csv")
    parser.add_argument("--output-dir", default="knowledge-base/hhu-official/raw")
    parser.add_argument("--delay-min", type=float, default=1.0)
    parser.add_argument("--delay-max", type=float, default=2.0)
    parser.add_argument("--timeout", type=int, default=10)
    parser.add_argument("--retries", type=int, default=2)
    args = parser.parse_args()

    source_path = Path(args.source_list)
    if not source_path.exists():
        print(f"❌ source-list.csv 不存在: {source_path}")
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 读取 source-list
    with open(source_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    targets = [
        r for r in rows
        if r.get("review_status", "").strip() == "APPROVED"
        and r.get("enabled", "1").strip() == "1"
    ]

    if not targets:
        print("⚠️  source-list.csv 中没有 APPROVED 且 enabled=1 的记录")
        sys.exit(0)

    print(f"📋 共 {len(targets)} 个待抓取页面（APPROVED + enabled）")
    success = 0
    failed = 0
    skipped = 0

    for row in targets:
        page_id = row["id"].strip()
        url = row["url"].strip()
        title = row.get("title", page_id).strip()

        out_file = output_dir / f"{page_id}.html"
        if out_file.exists():
            print(f"⏭️  [{page_id}] 已存在，跳过: {title}")
            skipped += 1
            continue

        print(f"🌐 [{page_id}] 抓取: {title}  ({url})")
        html, error = fetch_page(url, args.timeout, args.retries)

        if html:
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"   ✅ 已保存 ({len(html)} chars)")
            success += 1
        else:
            print(f"   ❌ 失败: {error}")
            # 创建一个空标记文件，记录错误信息
            with open(out_file.with_suffix(".error"), "w", encoding="utf-8") as f:
                f.write(f"url: {url}\nerror: {error}\n")
            failed += 1

        # 间隔延迟
        delay = random.uniform(args.delay_min, args.delay_max)
        time.sleep(delay)

    print(f"\n📊 抓取完成: 成功={success}  失败={failed}  跳过={skipped}")


if __name__ == "__main__":
    main()
