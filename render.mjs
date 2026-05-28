import { readFileSync, writeFileSync } from 'fs';
import { marked } from 'marked';

const mdPath = 'C:/Users/18086/Desktop/Translation/PDF_Translation/translated.md';
const outPath = 'C:/Users/18086/Desktop/Translation/PDF_Translation/index.html';

const md = readFileSync(mdPath, 'utf-8').replace(/\r\n/g, '\n');

// Split into pages by "---" separator (double newline around ---)
const rawSections = md.split(/\n\n---\n\n/);
const sections = rawSections.map(s => s.trim()).filter(s => s.length > 0);

// Extract headings for TOC
function extractHeadings(html, pageIdx) {
  const headings = [];
  const re = /<h([1-4])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[1-4]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: parseInt(m[1]), id: m[2], text: m[3].replace(/<[^>]*>/g, ''), page: pageIdx });
  }
  return headings;
}

// Configure marked with heading IDs
let headingCounter = 0;
const renderer = new marked.Renderer();
renderer.heading = function({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const rawText = text.replace(/<[^>]*>/g, '');
  const id = `heading-${headingCounter++}`;
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.setOptions({ renderer });

// Render each section
const renderedPages = sections.map((sec, i) => {
  const html = marked.parse(sec);
  return { html, index: i };
});

// Extract all headings for navigation
const allHeadings = [];
renderedPages.forEach((p, i) => {
  const tempDiv = p.html;
  const re = /<h([1-4])\s+id="([^"]*)">(.*?)<\/h[1-4]>/gi;
  let m;
  while ((m = re.exec(tempDiv)) !== null) {
    allHeadings.push({ level: parseInt(m[1]), id: m[2], text: m[3].replace(/<[^>]*>/g, ''), page: i });
  }
});

const tocHTML = allHeadings.map(h => {
  const indent = (h.level - 1) * 16;
  return `<div class="toc-item toc-level-${h.level}" style="padding-left:${indent}px" data-page="${h.page}" data-id="${h.id}">${h.text}</div>`;
}).join('\n');

const pagesJSON = JSON.stringify(renderedPages.map(p => p.html));

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claude Opus 4.8 系统卡片 - 中文翻译</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --paper-bg: #f5f0e8;
  --paper-dark: #e8e0d0;
  --ink: #2c2416;
  --ink-light: #5c4a32;
  --accent: #8b4513;
  --sidebar-width: 300px;
}

body {
  font-family: "KaiTi", "楷体", "STKaiti", "Noto Serif SC", serif;
  background: #d4c5a9;
  color: var(--ink);
  line-height: 1.9;
  font-size: 16px;
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--paper-dark);
  border-right: 2px solid #b8a88a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #b8a88a;
  background: var(--paper-bg);
}

.sidebar-header h2 {
  font-size: 15px;
  color: var(--accent);
  margin-bottom: 8px;
}

.page-jump {
  display: flex;
  gap: 6px;
  align-items: center;
}

.page-jump input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #b8a88a;
  border-radius: 4px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
}

.page-jump button {
  padding: 4px 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
}

.page-jump button:hover { background: #6b3410; }

.page-jump span {
  font-size: 12px;
  color: var(--ink-light);
}

.toc-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.toc-item {
  padding: 4px 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ink-light);
  border-left: 3px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item:hover {
  background: rgba(139, 69, 19, 0.08);
  color: var(--accent);
}

.toc-item.active {
  border-left-color: var(--accent);
  color: var(--accent);
  background: rgba(139, 69, 19, 0.05);
  font-weight: 600;
}

.toc-level-1 { font-size: 14px; font-weight: 700; }
.toc-level-2 { font-size: 13px; font-weight: 600; }
.toc-level-3 { font-size: 12.5px; }
.toc-level-4 { font-size: 12px; }

/* Main content */
.main {
  flex: 1;
  overflow-y: auto;
  padding: 40px 60px;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 38px,
      rgba(139, 69, 19, 0.03) 38px,
      rgba(139, 69, 19, 0.03) 39px
    ),
    linear-gradient(135deg, #f7f2ea 0%, #f0e8d8 50%, #ede4d0 100%);
  background-attachment: local;
  scroll-behavior: smooth;
}

.page {
  max-width: 860px;
  margin: 0 auto 60px;
  padding: 48px 56px;
  background: var(--paper-bg);
  border: 1px solid #d4c5a9;
  border-radius: 2px;
  box-shadow:
    0 1px 3px rgba(0,0,0,0.08),
    0 8px 24px rgba(0,0,0,0.04),
    inset 0 0 80px rgba(139, 69, 19, 0.02);
  position: relative;
}

.page::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(139, 69, 19, 0.015) 0%, transparent 70%),
    radial-gradient(ellipse at 80% 20%, rgba(101, 67, 33, 0.01) 0%, transparent 60%);
  pointer-events: none;
}

.page-number {
  position: absolute;
  bottom: 16px;
  right: 24px;
  font-size: 12px;
  color: var(--ink-light);
  opacity: 0.6;
}

/* Typography */
.page h1 {
  font-size: 26px;
  color: var(--accent);
  margin: 24px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(139, 69, 19, 0.2);
}

.page h2 {
  font-size: 21px;
  color: var(--accent);
  margin: 20px 0 12px;
}

.page h3 {
  font-size: 18px;
  color: var(--ink);
  margin: 16px 0 10px;
}

.page h4 {
  font-size: 16px;
  color: var(--ink-light);
  margin: 12px 0 8px;
}

.page p {
  margin: 10px 0;
  text-align: justify;
  text-indent: 2em;
}

.page ul, .page ol {
  margin: 10px 0 10px 2em;
}

.page li {
  margin: 4px 0;
}

.page li p {
  text-indent: 0;
  margin: 4px 0;
}

.page table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}

.page th, .page td {
  border: 1px solid #c4b896;
  padding: 8px 10px;
  text-align: left;
}

.page th {
  background: var(--paper-dark);
  font-weight: 600;
}

.page tr:nth-child(even) {
  background: rgba(139, 69, 19, 0.02);
}

.page code {
  background: rgba(139, 69, 19, 0.06);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 14px;
  font-family: "Consolas", monospace;
}

.page pre {
  background: #2c2416;
  color: #f0e8d8;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 12px 0;
}

.page pre code {
  background: none;
  padding: 0;
  color: inherit;
}

.page blockquote {
  border-left: 3px solid var(--accent);
  padding: 8px 16px;
  margin: 12px 0;
  background: rgba(139, 69, 19, 0.03);
  color: var(--ink-light);
}

.page strong { color: var(--accent); }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--paper-dark); }
::-webkit-scrollbar-thumb { background: #b8a88a; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }

/* Responsive */
@media (max-width: 900px) {
  .sidebar { width: 240px; }
  .main { padding: 20px; }
  .page { padding: 24px; }
}
</style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-header">
    <h2>目录导航</h2>
    <div class="page-jump">
      <input type="number" id="pageInput" min="1" placeholder="页码">
      <button onclick="jumpToPage()">跳转</button>
      <span id="pageTotal"></span>
    </div>
  </div>
  <div class="toc-container" id="tocContainer">
    ${tocHTML}
  </div>
</div>

<div class="main" id="mainContent">
</div>

<script>
const pages = ${pagesJSON};
const totalPages = pages.length;
document.getElementById('pageTotal').textContent = '/ ' + totalPages;

const mainEl = document.getElementById('mainContent');
const tocContainer = document.getElementById('tocContainer');
const tocItems = document.querySelectorAll('.toc-item');

// Render all pages
function renderPages() {
  let html = '';
  for (let i = 0; i < pages.length; i++) {
    html += '<div class="page" data-page="' + i + '">' + pages[i] + '<div class="page-number">第 ' + (i + 1) + ' / ' + totalPages + ' 页</div></div>';
  }
  mainEl.innerHTML = html;
}

renderPages();

// Jump to page
function jumpToPage() {
  const input = document.getElementById('pageInput');
  const num = parseInt(input.value);
  if (num >= 1 && num <= totalPages) {
    const target = document.querySelector('.page[data-page="' + (num - 1) + '"]');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

document.getElementById('pageInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') jumpToPage();
});

// TOC click
tocItems.forEach(item => {
  item.addEventListener('click', () => {
    const page = parseInt(item.dataset.page);
    const id = item.dataset.id;
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const pageEl = document.querySelector('.page[data-page="' + page + '"]');
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Sliding window TOC highlight
let ticking = false;
mainEl.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateActiveToc();
      ticking = false;
    });
    ticking = true;
  }
});

function updateActiveToc() {
  const scrollTop = mainEl.scrollTop;
  const viewHeight = mainEl.clientHeight;
  const viewMid = scrollTop + viewHeight * 0.3;

  let activeItem = null;
  const allHeadings = mainEl.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');

  for (let i = allHeadings.length - 1; i >= 0; i--) {
    if (allHeadings[i].offsetTop <= viewMid) {
      activeItem = allHeadings[i].id;
      break;
    }
  }

  tocItems.forEach(item => {
    if (item.dataset.id === activeItem) {
      item.classList.add('active');
      // Scroll TOC to keep active item visible
      const container = tocContainer;
      const itemTop = item.offsetTop - container.offsetTop;
      const containerScroll = container.scrollTop;
      const containerHeight = container.clientHeight;
      if (itemTop < containerScroll || itemTop > containerScroll + containerHeight - 40) {
        container.scrollTop = itemTop - containerHeight / 2;
      }
    } else {
      item.classList.remove('active');
    }
  });
}

// Initial highlight
setTimeout(updateActiveToc, 100);
</script>
</body>
</html>`;

writeFileSync(outPath, html, 'utf-8');
console.log('HTML generated:', outPath);
console.log('Total pages:', renderedPages.length);
console.log('TOC entries:', allHeadings.length);
