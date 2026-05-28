import { readFileSync, writeFileSync, existsSync } from 'fs';
import { marked } from 'marked';
import { join } from 'path';

const baseDir = 'C:/Users/18086/Desktop/Translation/PDF_Translation';
const mdPath = join(baseDir, 'translated.md');
const outPath = join(baseDir, 'index.html');
const imagesDir = join(baseDir, 'images');

const md = readFileSync(mdPath, 'utf-8').replace(/\r\n/g, '\n');

// Load image map (PDF page number -> image filenames)
const imageMap = JSON.parse(readFileSync(join(imagesDir, 'map.json'), 'utf-8'));

// Build image path list for all images (use relative paths, not base64)
const imagePaths = {};
for (const [page, files] of Object.entries(imageMap)) {
  imagePaths[page] = files.map(fname => {
    const fpath = join(imagesDir, fname);
    if (existsSync(fpath)) {
      return `images/${fname}`;
    }
    return null;
  }).filter(Boolean);
}

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

// Map PDF pages to sections: each translation batch covered ~5 PDF pages
// Original PDF had 244 pages, translated into 49 batches, split into 300 sections
// We approximate: section index / 300 * 244 ≈ PDF page
// For each PDF page with images, find the closest section
function pdfPageToSection(pdfPage) {
  // Approximate mapping
  return Math.round((pdfPage - 1) / 244 * (renderedPages.length - 1));
}

// Inject images into rendered pages
for (const [pdfPage, paths] of Object.entries(imagePaths)) {
  const sectionIdx = pdfPageToSection(parseInt(pdfPage));
  if (sectionIdx >= 0 && sectionIdx < renderedPages.length && paths.length > 0) {
    const imgHtml = paths.map(src =>
      `<div class="page-image"><img src="${src}" alt="Figure from page ${pdfPage}" loading="lazy"></div>`
    ).join('');
    renderedPages[sectionIdx].html += imgHtml;
  }
}

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
  --main-bg: #d4c5a9;
  --main-surface: linear-gradient(135deg, #f7f2ea 0%, #f0e8d8 50%, #ede4d0 100%);
  --border-color: #b8a88a;
  --page-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04);
}

[data-theme="dark"] {
  --paper-bg: #1e1e1e;
  --paper-dark: #2a2a2a;
  --ink: #e0d8c8;
  --ink-light: #b0a890;
  --accent: #d4a06a;
  --main-bg: #141414;
  --main-surface: linear-gradient(135deg, #1a1a1a 0%, #1e1e1e 50%, #222 100%);
  --border-color: #3a3a3a;
  --page-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2);
}

body {
  font-family: "KaiTi", "楷体", "STKaiti", "Noto Serif SC", serif;
  background: var(--main-bg);
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
  border-right: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  transition: width 0.3s, transform 0.3s;
  position: relative;
}

.sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-toggle {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1000;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--paper-dark);
  border: 1px solid var(--border-color);
  color: var(--accent);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: left 0.3s, background 0.2s;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.sidebar-toggle:hover { background: var(--accent); color: #fff; }

body:not(.sidebar-hidden) .sidebar-toggle {
  left: calc(var(--sidebar-width) - 44px);
}

.toolbar {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.toolbar button {
  padding: 4px 10px;
  background: var(--paper-dark);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  color: var(--ink-light);
  transition: all 0.15s;
}

.toolbar button:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
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
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--paper-bg);
  color: var(--ink);
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
    var(--main-surface);
  background-attachment: local;
}

[data-theme="dark"] .main {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 38px,
      rgba(255, 255, 255, 0.02) 38px,
      rgba(255, 255, 255, 0.02) 39px
    ),
    var(--main-surface);
}

.page {
  max-width: 860px;
  margin: 0 auto 60px;
  padding: 48px 56px;
  background: var(--paper-bg);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  box-shadow: var(--page-shadow);
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
  border: 1px solid var(--border-color);
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

[data-theme="dark"] .page pre {
  background: #111;
  color: #d4c5a9;
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

.page-image {
  margin: 16px 0;
  text-align: center;
}

.page-image img {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--paper-dark); }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }

/* Responsive */
@media (max-width: 900px) {
  .sidebar { width: 240px; }
  .main { padding: 20px; }
  .page { padding: 24px; }
  body:not(.sidebar-hidden) .sidebar-toggle { left: 196px; }
}
</style>
</head>
<body>

<button class="sidebar-toggle" id="sidebarToggle" title="收起/展开目录">&#9776;</button>

<div class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <h2>目录导航</h2>
    <div class="page-jump">
      <input type="number" id="pageInput" min="1" placeholder="页码">
      <button onclick="jumpToPage()">跳转</button>
      <span id="pageTotal"></span>
    </div>
    <div class="toolbar">
      <button id="themeToggle">夜间模式</button>
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
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const themeToggle = document.getElementById('themeToggle');

// Render all pages
function renderPages() {
  let html = '';
  for (let i = 0; i < pages.length; i++) {
    html += '<div class="page" data-page="' + i + '">' + pages[i] + '<div class="page-number">第 ' + (i + 1) + ' / ' + totalPages + ' 页</div></div>';
  }
  mainEl.innerHTML = html;
}
renderPages();

// Sidebar toggle
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  document.body.classList.toggle('sidebar-hidden');
});

// Theme toggle
function setTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeToggle.textContent = dark ? '日间模式' : '夜间模式';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(!isDark);
});

// Restore saved theme
if (localStorage.getItem('theme') === 'dark') setTheme(true);

// Jump to page
function jumpToPage() {
  const input = document.getElementById('pageInput');
  const num = parseInt(input.value);
  if (num >= 1 && num <= totalPages) {
    const target = mainEl.querySelector('.page[data-page="' + (num - 1) + '"]');
    if (target) {
      mainEl.scrollTo({ top: target.offsetTop - mainEl.offsetTop, behavior: 'smooth' });
    }
  }
}

document.getElementById('pageInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') jumpToPage();
});

// TOC click — fixed: scroll the .main container directly
tocItems.forEach(item => {
  item.addEventListener('click', () => {
    const id = item.dataset.id;
    const target = mainEl.querySelector('#' + CSS.escape(id));
    if (target) {
      const offset = target.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + mainEl.scrollTop;
      mainEl.scrollTo({ top: offset - 20, behavior: 'smooth' });
    } else {
      const page = parseInt(item.dataset.page);
      const pageEl = mainEl.querySelector('.page[data-page="' + page + '"]');
      if (pageEl) {
        mainEl.scrollTo({ top: pageEl.offsetTop - mainEl.offsetTop, behavior: 'smooth' });
      }
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
  const rect = mainEl.getBoundingClientRect();
  const viewMid = rect.top + rect.height * 0.3;

  let activeId = null;
  const allHeadings = mainEl.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');

  for (let i = allHeadings.length - 1; i >= 0; i--) {
    if (allHeadings[i].getBoundingClientRect().top <= viewMid) {
      activeId = allHeadings[i].id;
      break;
    }
  }

  tocItems.forEach(item => {
    if (item.dataset.id === activeId) {
      item.classList.add('active');
      const itemRect = item.getBoundingClientRect();
      const containerRect = tocContainer.getBoundingClientRect();
      if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } else {
      item.classList.remove('active');
    }
  });
}

setTimeout(updateActiveToc, 100);
</script>
</body>
</html>`;

writeFileSync(outPath, html, 'utf-8');
console.log('HTML generated:', outPath);
console.log('Total pages:', renderedPages.length);
console.log('TOC entries:', allHeadings.length);
