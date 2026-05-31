#!/usr/bin/env node
/**
 * docs/PROJECT.md → docs/PROJECT.pdf
 *
 * 渲染策略：
 *   1) marked 把 md 转成 HTML（保留内联 SVG）
 *   2) 套一个 A4 print-friendly 的 HTML 模板（中文字体 + 代码块 + 表格）
 *   3) 调 Chrome 无头模式 print-to-pdf
 *
 * 用法：node docs/build-pdf.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { marked } from 'marked'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC_MD = path.join(__dirname, 'PROJECT.md')
const TMP_HTML = path.join(__dirname, 'PROJECT.html')
const OUT_PDF = path.join(__dirname, 'PROJECT.pdf')

// macOS / Linux / Windows 下常见的 Chrome 路径
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p
  throw new Error('找不到 Chrome / Edge / Chromium，请安装其一或自行修改 CHROME_CANDIDATES')
}

const md = fs.readFileSync(SRC_MD, 'utf-8')
marked.setOptions({ gfm: true, breaks: false })
const body = marked.parse(md)

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>学海小书院 · 技术文档</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  :root {
    --ink-900: #0f172a;
    --ink-700: #334155;
    --ink-500: #64748b;
    --brand:   #ea580c;
    --bg-soft: #fff7ed;
    --border:  #e2e8f0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    color: var(--ink-900);
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    font-size: 11pt;
    line-height: 1.55;
  }
  h1 { font-size: 22pt; margin: 0 0 6pt; border-bottom: 2px solid var(--brand); padding-bottom: 6pt; }
  h2 { font-size: 15pt; margin: 18pt 0 8pt; color: var(--brand); break-after: avoid; }
  h3 { font-size: 12pt; margin: 12pt 0 6pt; break-after: avoid; }
  h4 { font-size: 11pt; margin: 8pt 0 4pt; }
  p { margin: 4pt 0; }
  blockquote {
    margin: 6pt 0;
    padding: 8pt 12pt;
    background: var(--bg-soft);
    border-left: 3px solid var(--brand);
    color: var(--ink-700);
    font-size: 10pt;
    border-radius: 4px;
  }
  ul, ol { margin: 4pt 0 4pt 18pt; padding: 0; }
  li { margin: 1pt 0; }
  code {
    font-family: "SF Mono", "Menlo", Consolas, monospace;
    font-size: 9.5pt;
    background: #f1f5f9;
    padding: 1pt 4pt;
    border-radius: 3px;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 10pt 12pt;
    border-radius: 6px;
    font-size: 8.8pt;
    line-height: 1.5;
    overflow-x: auto;
    margin: 6pt 0;
    page-break-inside: avoid;
  }
  pre code { background: transparent; color: inherit; padding: 0; font-size: 8.8pt; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 6pt 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 4pt 8pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: var(--bg-soft); font-weight: 700; }
  hr { border: none; border-top: 1px dashed var(--border); margin: 12pt 0; }
  /* 内联 SVG：宽度自适应、整图避免被分页切开 */
  svg { display: block; max-width: 100%; height: auto; margin: 8pt auto; page-break-inside: avoid; }
  a { color: var(--brand); text-decoration: none; }
  strong { color: var(--ink-900); }
</style>
</head>
<body>
${body}
</body>
</html>`

fs.writeFileSync(TMP_HTML, html, 'utf-8')
console.log(`[build-pdf] wrote ${TMP_HTML} (${(html.length / 1024).toFixed(1)} KB)`)

const chrome = findChrome()
console.log(`[build-pdf] using browser: ${chrome}`)

const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-pdf-header-footer',
  `--print-to-pdf=${OUT_PDF}`,
  `file://${TMP_HTML}`,
]
const res = spawnSync(chrome, args, { stdio: 'inherit' })
if (res.status !== 0) {
  console.error('[build-pdf] Chrome 退出码:', res.status)
  process.exit(res.status ?? 1)
}

const size = fs.statSync(OUT_PDF).size
console.log(`[build-pdf] ✅ 生成 ${OUT_PDF} (${(size / 1024).toFixed(1)} KB)`)
// 临时 HTML 留着方便你检查/再次打印；不需要可以 fs.unlinkSync
