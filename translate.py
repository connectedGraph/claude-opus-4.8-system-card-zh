import asyncio
import pdfplumber
import anthropic

PDF_PATH = r"C:/Users/18086/Desktop/Translation/PDF_Translation/source.pdf"
OUTPUT_PATH = r"C:/Users/18086/Desktop/Translation/PDF_Translation/translated.md"

BATCH_SIZE = 5
MODEL = "claude-sonnet-4-6"
CONCURRENCY = 100

client = anthropic.AsyncAnthropic()


def extract_pages(pdf_path):
    pages_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text and text.strip():
                pages_text.append((i + 1, text.strip()))
    return pages_text


async def translate_batch(semaphore, text, batch_idx, total_batches):
    async with semaphore:
        print(f"  [{batch_idx+1}/{total_batches}] Translating...")
        response = await client.messages.create(
            model=MODEL,
            max_tokens=16000,
            messages=[
                {
                    "role": "user",
                    "content": f"""请将以下英文技术文档翻译为中文。这是Anthropic公司的Claude Opus 4.8系统卡片(System Card)。

翻译要求：
- 所有专业术语翻译后必须在后面用英文括号标注原文，例如：负责任扩展政策(Responsible Scaling Policy)、提示注入(prompt injection)、对齐(alignment)
- 保持原文的段落结构和格式
- 表格数据保持原样，仅翻译表头和描述文字
- 图表标题和说明翻译为中文
- 翻译要流畅自然，符合中文技术文档的表达习惯
- 模型名称保留英文原文不翻译（如Claude Opus 4.8、Mythos Preview等）

原文：
{text}""",
                }
            ],
        )
        print(f"  [{batch_idx+1}/{total_batches}] Done.")
        return batch_idx, response.content[0].text


async def main():
    print("Extracting text from PDF...")
    pages = extract_pages(PDF_PATH)
    print(f"Extracted {len(pages)} pages with text content.")

    batches = []
    for i in range(0, len(pages), BATCH_SIZE):
        batch_pages = pages[i : i + BATCH_SIZE]
        batch_text = "\n\n".join(
            [f"--- Page {p[0]} ---\n{p[1]}" for p in batch_pages]
        )
        batches.append(batch_text)

    total = len(batches)
    print(f"Split into {total} batches of ~{BATCH_SIZE} pages each.")
    print(f"Starting translation with concurrency={CONCURRENCY}, model={MODEL}\n")

    semaphore = asyncio.Semaphore(CONCURRENCY)
    tasks = [
        translate_batch(semaphore, batch, i, total)
        for i, batch in enumerate(batches)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    translated_parts = [""] * total
    for r in results:
        if isinstance(r, Exception):
            print(f"  Error: {r}")
        else:
            idx, text = r
            translated_parts[idx] = text

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write("# Claude Opus 4.8 系统卡片(System Card) 中文翻译\n\n")
        f.write("原文档日期：2026年5月28日\n\n")
        f.write("---\n\n")
        f.write("\n\n---\n\n".join(translated_parts))

    print(f"\nTranslation complete! Output saved to:\n{OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
