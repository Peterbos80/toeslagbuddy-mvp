import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = '/home/user/toeslagbuddy-mvp/dist';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const basis = 'http://localhost:' + srv.address().port;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell' });
const p = await (await b.newContext({ viewport: { width: 360, height: 740 } })).newPage();
for (const pad of process.argv.slice(2)) {
  await p.goto(basis + pad);
  const r = await p.evaluate(() => { const w = document.documentElement.clientWidth; const uit = []; for (const e of document.querySelectorAll('body *')) { const b = e.getBoundingClientRect(); if (b.right > w + 1 && b.width > 0) uit.push(e.tagName + '.' + e.className + ' ' + Math.round(b.left) + '-' + Math.round(b.right)); } return { breed: document.documentElement.scrollWidth, uit: uit.slice(0, 12) }; });
  console.log(pad, JSON.stringify(r, null, 1));
}
await b.close(); srv.close();
