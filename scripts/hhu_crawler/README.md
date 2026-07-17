# hhu_crawler — 河海大学官网知识库采集工具

## 环境

```bash
pip install -r requirements.txt
```

## 脚本说明

| 脚本 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `crawler.py` | 抓取官网 HTML | source-list.csv | raw/*.html |
| `cleaner.py` | 提取清洗正文 | raw/*.html | generated/*.txt |
| `build_manifest.py` | 生成/更新元数据清单 | source-list.csv + generated/*.txt | manifest.json |
| `validate_dataset.py` | 验证数据集完整性 | 全部文件 | 控制台报告 |
| `import_to_kb.py` | 批量导入知识库 | manifest.json + generated/*.txt | Java kb_document |

## 工作流

```bash
# 步骤 1: 抓取（只需执行一次，已抓取的跳过）
python scripts/hhu_crawler/crawler.py

# 步骤 2: 清洗正文
python scripts/hhu_crawler/cleaner.py

# 步骤 3: 构建 manifest（含 content_hash 去重）
python scripts/hhu_crawler/build_manifest.py

# 步骤 4: 验证数据集
python scripts/hhu_crawler/validate_dataset.py

# 步骤 5: 试运行（检查文件完整性，不实际导入）
python scripts/hhu_crawler/import_to_kb.py --dry-run

# 步骤 6: 实际导入（需 Java 后端运行中）
python scripts/hhu_crawler/import_to_kb.py
```

## 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--delay-min` | 1.0 | 请求最小间隔（秒） |
| `--delay-max` | 2.0 | 请求最大间隔（秒） |
| `--timeout` | 10 | HTTP 请求超时（秒） |
| `--retries` | 2 | 失败重试次数 |
| `--min-chars` | 100 | 正文最少字符数（低于此值标记失败） |
| `--base-url` | http://localhost:8081 | Java 后端地址 |
| `--token` | (环境变量 JWT_TOKEN) | JWT 认证 Token |
| `--user-id` | (环境变量 UPLOAD_USER_ID) | 上传用户 ID |
| `--dry-run` | false | 仅检查不导入 |

## 目录

```
scripts/hhu_crawler/          ← 工具脚本（提交 Git）
knowledge-base/hhu-official/
├── source-list.csv           ← 50 条官网页面登记表（提交）
├── manifest.json             ← 元数据清单（提交，跟踪 import_status）
├── README.md                 ← 说明（提交）
├── samples/                  ← 5 份清洗后 TXT 样例（提交）
├── raw/                      ← 抓取原始 HTML（禁止提交）
└── generated/                ← 清洗后 TXT 正文（禁止提交）
```

## 采集规则

- **白名单制**：仅访问 source-list.csv 中的 URL，不递归外链
- **频率控制**：每次请求间隔 1~2 秒（随机），重试前等待 2 秒
- **超时设置**：单次请求 10 秒超时，最多 2 次重试
- **禁止采集**：登录后页面、验证码页面、教务系统内部页面、付费数据库全文
