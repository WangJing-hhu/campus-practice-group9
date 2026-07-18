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
    # 跳过 NavigableString 等非 Tag 节点
    if not hasattr(element, 'name') or element.name is None:
        return False
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
    """从 HTML 中提取正文内容——激进模式，最大化文本提取。"""
    soup = BeautifulSoup(html, "lxml")

    # 1. 提取 meta description + noscript 降级内容
    meta_lines = []
    for meta in soup.find_all("meta"):
        name = (meta.get("name") or "").lower()
        prop = (meta.get("property") or "").lower()
        if name in ("description", "keywords") or prop in ("og:description", "og:title"):
            content = meta.get("content", "").strip()
            if content and len(content) > 10:
                meta_lines.append(content)
    # noscript 标签中的文本（JS 渲染失败时的降级内容）
    for ns in soup.find_all("noscript"):
        text = ns.get_text(strip=True)
        if text and len(text) > 20:
            meta_lines.append(text)

    # 2. 提取 title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # 3. 移除无用标签
    for tag in soup.find_all(True):
        if not hasattr(tag, 'name') or tag.name is None:
            continue
        if tag.name in REMOVE_TAGS:
            tag.decompose()
            continue
        if should_remove(tag):
            tag.decompose()
            continue

    # 4. 尝试定位主内容区
    main_selectors = [
        {"id": "content"}, {"id": "main"}, {"id": "article"},
        {"class_": "content"}, {"class_": "main-content"},
        {"class_": "article-content"}, {"class_": "entry-content"},
        {"class_": "wp-container"}, {"class_": "container"},
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

    # 5. 提取所有文本承载元素
    lines = []
    seen = set()

    # 文本承载标签
    TEXT_TAGS = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "dd", "dt",
                 "div", "span", "a", "strong", "em", "b", "label", "figcaption", "blockquote",
                 "pre", "code", "summary", "details", "article", "section", "aside"}

    for elem in target.descendants:
        if not hasattr(elem, 'name') or elem.name is None:
            continue
        if elem.name not in TEXT_TAGS:
            continue
        # 跳过子元素已被处理的情况（div/span/article/section 只取直接文本）
        if elem.name in ("div", "span", "article", "section", "aside"):
            # 只取直接文本子节点
            direct_text = "".join(
                c.strip() for c in elem.children
                if hasattr(c, 'name') and c.name is None and isinstance(c.string, str)
            )
            text = direct_text.strip()
        else:
            text = elem.get_text(strip=True)

        if not text:
            continue
        # 去重并过滤
        if len(text) < 4:
            continue
        # 对于 a 标签，过滤长链接文本
        if elem.name == "a" and len(text) > 200:
            continue
        # 对于 li/td/th/dd/dt，去掉明显是导航的
        if text in seen:
            continue
        seen.add(text)

        if elem.name.startswith("h") and elem.name[1:].isdigit():
            lines.append(f"\n## {text}\n")
        else:
            lines.append(text)

    # 6. 组装结果
    result_parts = []
    if title:
        result_parts.append(f"# {title}\n")
    if meta_lines:
        result_parts.append("\n".join(meta_lines))
    result_parts.append("\n\n".join(lines))
    return "\n\n".join(result_parts)

    return "\n\n".join(lines)


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
