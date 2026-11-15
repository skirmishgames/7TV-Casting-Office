#!/usr/bin/env node
/* Binder divider cards from the command line, drawn by js/dividers.js (the same code as the Print Sheet page).
     node tools/dividers/make-dividers.js <out.pdf> [--books 80s,steeljustice] [--paper letter|a4] [--png <dir>]
   Core is always included. Stops if an Extra is in no binder section or in two (see js/data/binder.js).
   Needs Playwright. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const OUT = args[0];
if (!OUT || OUT.startsWith('--')) { console.error('usage: node tools/dividers/make-dividers.js <out.pdf> [--books 80s,steeljustice] [--paper letter|a4] [--png <dir>]'); process.exit(1); }
const opt = (name, def) => { const i = args.indexOf(name); return i > 0 ? args[i + 1] : def; };
const BOOKS = opt('--books', '80s,steeljustice').split(',').filter(Boolean);
const PAPER = opt('--paper', 'letter');
const PNG_DIR = opt('--png', null);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const browser = await chromium.launch();
  let code = 0;
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${server.address().port}/index.html`);
    await page.waitForFunction(() => window.Dividers && window.CardRender && window.jspdf);
    const out = await page.evaluate(async ({ books, paper, png }) => {
      const problems = Dividers.problems();
      if (problems.length) return { problems };
      await document.fonts.ready;
      const list = Dividers.sections(books);
      const doc = await Dividers.pdf(list, { paper });
      const pngs = [];
      if (png) for (const s of list) pngs.push({ name: `${s.group} - ${s.title}`, data: (await Dividers.draw(s)).toDataURL('image/png').split(',')[1] });
      return { pdf: doc.output('datauristring').split(',')[1], count: list.length, pngs };
    }, { books: BOOKS, paper: PAPER, png: !!PNG_DIR });
    if (out.problems) { console.error(out.problems.join('\n')); code = 1; return; }
    fs.writeFileSync(OUT, Buffer.from(out.pdf, 'base64'));
    if (PNG_DIR) {
      fs.mkdirSync(PNG_DIR, { recursive: true });
      out.pngs.forEach((p, i) => fs.writeFileSync(path.join(PNG_DIR, `${String(i + 1).padStart(2, '0')} ${p.name.replace(/&/g, 'and')}.png`), Buffer.from(p.data, 'base64')));
    }
    console.log(`wrote ${out.count} dividers to ${OUT}`);
  } finally {
    await browser.close();
    server.close();
    process.exitCode = code;
  }
})();
