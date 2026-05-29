# Claude Opus 4.8 System Card 中文翻译

Anthropic Claude Opus 4.8 系统卡片的完整中文翻译，附宣纸风格 HTML 阅读器。
在线查看器： [https://connectedgraph.github.io/claude-opus-4.8-system-card-zh/](https://connectedgraph.github.io/claude-opus-4.8-system-card-zh/)

## 预览

- 宣纸底色 + 楷体排版
- 左侧目录导航（滑动窗口高亮）
- 页码跳转功能
- 276 个目录条目，300 页内容

## 文件说明

| 文件 | 说明 |
|------|------|
| `translated.md` | 翻译后的 Markdown 全文 |
| `index.html` | 宣纸风格 HTML 阅读器（直接浏览器打开） |
| `render.mjs` | Markdown → HTML 构建脚本 |
| `translate.py` | PDF 提取 + Anthropic API 并发翻译脚本 |
| `source.pdf` | 原始英文 PDF |

## 构建

```bash
# 翻译（需要 ANTHROPIC_API_KEY 环境变量）
pip install pdfplumber anthropic
python translate.py

# 渲染 HTML
npm install marked
node render.mjs
```

## 翻译说明

- 所有专业术语翻译后均以英文括号标注原文，如：负责任扩展政策(Responsible Scaling Policy)
- 模型名称保留英文原文
- 使用 claude-sonnet-4-6 模型，100 并发异步翻译

## 原文信息

- 来源：[Anthropic](https://www.anthropic.com)
- 日期：2026年5月28日
- 页数：244页
