#!/usr/bin/env python3
"""
正文清洗脚本——从原始 HTML 中提取纯文本正文。

用法:
    python cleaner.py [--input-dir PATH]
                      [--output-dir PATH]
                      [--min-chars N]

从 raw/*.html 读取原始页面，清洗后输出为 generated/*.txt。
正文不足 --min-chars 字时标记为失败（生成 .error 文件）。

清洗规则:
    - 移除 <script>、<style>、<noscript>、<iframe>
    - 移除导航、页脚、侧栏（按常见 class/id 启发式识别）
    - 移除超长链接文本（>200 字符的 <a> 内容）
    - 合并空白行、去重连续重复段落
    - 保留标题 <h1>~<h4> 作为段落前缀
"""

import argparse
import os
import re
from pathlib import Path

from bs4 import BeautifulSoup

# ── 需要整块删除的标签 ──────────────────────────────────
REMOVE_TAGS = {"script", "style", "noscript", "iframe", "nav", "footer", "header"}

# ── 需要删除的 class/id 关键词（启发式） ────────────────
REMOVE_CLASS_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r"nav", r"menu", r"sidebar", r"footer", r"header",
        r"breadcrumb", r"pagination", r"search", r"login",
        r"copyright", r"friend.?link", r"link-list",
        r"share", r"toolbar", r"banner", r"ad-",
    ]
]


def should_remove(element) -> bool:
    """判断元素是否应被移除（基于 tag / class / id）。"""
    if element.name in REMOVE_TAGS:
        return True
    if element.name == "a":
        text = element.get_text(strip=True)
        if len(text) > 200:
            return True
    cls = " ".join(element.get("class", []))
    el_id = element.get("id", "")
    combined = f"{cls} {el_id}"
    for pattern in REMOVE_CLASS_PATTERNS:
        if pattern.search(combined):
            return True
    return False


def extract_main_content(html: str) -> str:
    """从 HTML 中提取正文内容。"""
    soup = BeautifulSoup(html, "lxml")

    # 移除无用标签
    for tag in soup.find_all(True):
        if should_remove(tag):
            tag.decompose()

    # 尝试定位主内容区
    main_selectors = [
        {"id": "content"}, {"id": "main"}, {"id": "article"},
        {"class_": "content"}, {"class_": "main-content"},
        {"class_": "article-content"}, {"class_": "entry-content"},
        {"role": "main"},
    ]
    main = None
    for sel in main_selectors:
        main = soup.find(**sel)
        if main:
            break

    target = main if main else soup.find("body")
    if target is None:
        return ""

    # 提取文本行
    lines = []
    seen = set()

    for elem in target.descendants:
        if elem.name in ("h1", "h2", "h3", "h4"):
            text = elem.get_text(strip=True)
            if text and len(text) > 2:
                lines.append(f"\n## {text}\n")
        elif elem.name == "p":
            text = elem.get_text(strip=True)
            if text:
                lines.append(text)
        elif elem.name is None:  # 裸文本节点
            text = elem.string
            if text:
                text = text.strip()
                if text and len(text) > 20:  # 过滤短片段
                    lines.append(text)

    # 去重连续重复行
    deduped = []
    for line in lines:
        if line not in seen:
            deduped.append(line)
            seen.add(line)

    return "\n\n".join(deduped)


def clean_text(text: str) -> str:
    """后处理：合并空白行、移除过多空行。"""
    # 合并连续空行为单个空行
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 去除首尾空白
    text = text.strip()
    return text


def main():
    parser = argparse.ArgumentParser(description="正文清洗脚本")
    parser.add_argument("--input-dir", default="knowledge-base/hhu-official/raw")
    parser.add_argument("--output-dir", default="knowledge-base/hhu-official/generated")
    parser.add_argument("--min-chars", type=int, default=100)
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    html_files = sorted(input_dir.glob("*.html"))
    if not html_files:
        print(f"⚠️  {input_dir} 中没有 .html 文件")
        return

    success = 0
    failed = 0

    for html_file in html_files:
        page_id = html_file.stem
        with open(html_file, "r", encoding="utf-8") as f:
            html = f.read()

        text = extract_main_content(html)
        text = clean_text(text)

        out_file = output_dir / f"{page_id}.txt"
        err_file = output_dir / f"{page_id}.error"

        if len(text) < args.min_chars:
            with open(err_file, "w", encoding="utf-8") as f:
                f.write(f"正文不足 {args.min_chars} 字（实际 {len(text)} 字）\n")
            # 同时保存不完整的正文供人工审核
            if text.strip():
                with open(out_file, "w", encoding="utf-8") as f:
                    f.write(text)
            print(f"❌ [{page_id}] 正文不足 ({len(text)} chars)")
            failed += 1
        else:
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(text)
            # 清理之前的错误标记
            if err_file.exists():
                err_file.unlink()
            print(f"✅ [{page_id}] 清洗完成 ({len(text)} chars)")
            success += 1

    print(f"\n📊 清洗完成: 成功={success}  失败={failed}")


if __name__ == "__main__":
    main()
