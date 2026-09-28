// Eenvoudige lokale webserver om dist/ te bekijken: npm run serve
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const DIST = join(import.meta.dirname, 'dist');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  let pad = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let bestand = join(DIST, pad);
  try {
    if ((await stat(bestand)).isDirectory()) bestand = join(bestand, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(bestand)] || 'application/octet-stream' });
    res.end(await readFile(bestand));
  } catch {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(await readFile(join(DIST, '404.html')));
  }
}).listen(PORT, () => console.log(`ToeslagBuddy draait op http://localhost:${PORT}`));
