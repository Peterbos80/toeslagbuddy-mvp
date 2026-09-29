// Gedeelde hulpfuncties voor de browsertests: start een lokale server op
// dist/ en een Chromium-browser.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const DIST = join(import.meta.dirname, '../../dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

export async function start() {
  const server = createServer(async (req, res) => {
    let bestand = join(DIST, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''));
    try {
      if ((await stat(bestand)).isDirectory()) bestand = join(bestand, 'index.html');
      res.writeHead(200, { 'Content-Type': TYPES[extname(bestand)] || 'application/octet-stream' });
      res.end(await readFile(bestand));
    } catch {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(await readFile(join(DIST, '404.html')));
    }
  });
  await new Promise((r) => server.listen(0, r));
  const basis = `http://localhost:${server.address().port}`;
  const opties = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(opties);
  return {
    basis,
    browser,
    async stop() {
      await browser.close();
      server.close();
    },
  };
}

// Opent een pagina en verzamelt JavaScript-fouten
export async function open(ctx, url, fouten) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fouten.push(`${url}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && fouten.push(`${url}: ${m.text()}`));
  await page.goto(url);
  return page;
}

const require = createRequire(import.meta.url);
export const axeBron = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

export async function paginas() {
  const xml = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
  const extra = ['/instagram/', '/404.html'];
  return [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).concat(extra);
}
