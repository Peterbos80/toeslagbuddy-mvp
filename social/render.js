// Rendert alle posts uit de kalender als JPEG (1080×1350, Instagram 4:5) naar
// dist/social/, zodat ze met de site mee online komen. Instagram haalt de
// afbeeldingen daar op bij het plaatsen.
//
//   node social/render.js            → kalender + afbeeldingen
//   node social/render.js --kalender → alleen kalender.json (geen browser nodig)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../site.config.js';
import { csp, bedrijfsgegevens } from '../src/site/layout.js';
import { kalender } from './content.js';
import { updates, tiktokScripts } from './updates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UIT = join(ROOT, 'dist/social');
const alleenKalender = process.argv.includes('--kalender');

const posts = kalender(config.instagram.startDatum, config.instagram.weken).map((p) => ({
  ...p,
  afbeeldingen: p.slides.map((_, i) => `${config.url}/social/${p.id}/${i + 1}.jpg`),
  video: `${config.url}/social/${p.id}/video.mp4`, // gemaakt door social/video.js
}));

mkdirSync(UIT, { recursive: true });
writeFileSync(join(UIT, 'kalender.json'), JSON.stringify(posts, null, 2));
writeFileSync(join(UIT, 'updates.json'), JSON.stringify({ updates, tiktokScripts }, null, 2));

// Overzicht om te lezen en te controleren (niet geïndexeerd)
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
writeFileSync(
  join(UIT, 'index.html'),
  `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp({ slug: '/social/' })}"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contentkalender</title>
<style>body{font:15px/1.5 system-ui;margin:0 auto;max-width:1000px;padding:16px;background:#f7f8f5;color:#1d2521}article{background:#fff;border-radius:12px;padding:16px;margin:16px 0}.s{display:flex;gap:8px;overflow-x:auto}.s img{width:180px;border-radius:8px}pre{white-space:pre-wrap;font:inherit;background:#f2f4f1;padding:12px;border-radius:8px}</style></head><body>
<h1>Instagram-contentkalender</h1>
<h2>Grappige persona-updates (X, Threads, Bluesky)</h2>
${updates.map((u) => `<article><p><strong>${esc(u.persona)}</strong> · ${u.tekst.length} tekens</p><pre>${esc(u.tekst)}</pre></article>`).join('')}
<h2>TikTok-scripts</h2>
${tiktokScripts.map((t) => `<article><h3>${esc(t.titel)} (${esc(t.persona)})</h3><p><strong>Hook:</strong> ${esc(t.hook)}</p><ol>${t.beats.map((b) => `<li>${esc(b)}</li>`).join('')}</ol><p><strong>CTA:</strong> ${esc(t.cta)}</p></article>`).join('')}
<h2>Instagram-kalender</h2>
${posts.map((p) => `<article><h2>${p.datum} ${p.tijd} · ${esc(p.id)}</h2><div class="s">${p.slides.map((_, i) => `<img src="${p.id}/${i + 1}.jpg" alt="">`).join('')}</div><p><a href="${p.id}/video.mp4" download>Video downloaden (Reels/TikTok)</a></p><pre>${esc(p.caption)}</pre></article>`).join('')}
<footer>${bedrijfsgegevens()}</footer>
</body></html>`,
);

if (alleenKalender) {
  console.log(`✓ Kalender met ${posts.length} posts`);
  process.exit(0);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });

for (const post of posts) {
  mkdirSync(join(UIT, post.id), { recursive: true });
  for (const [i, slide] of post.slides.entries()) {
    await page.setContent(slideHtml(slide, i + 1, post.slides.length));
    await page.screenshot({ path: join(UIT, post.id, `${i + 1}.jpg`), type: 'jpeg', quality: 90 });
  }
}
await browser.close();
console.log(`✓ ${posts.length} posts gerenderd in dist/social/`);

function slideHtml(s, nr, totaal) {
  const donker = s.soort === 'haak' || s.soort === 'totaal' || s.soort === 'cta';
  const bg = donker ? '#0d7a5f' : '#f7f8f5';
  const fg = donker ? '#ffffff' : '#1d2521';
  const lijst = (s.lijst || [])
    .map((r) =>
      Array.isArray(r)
        ? `<div class="rij"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`
        : `<div class="rij"><span>✓&nbsp; ${esc(r)}</span></div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1080px;height:1350px;background:${bg};color:${fg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;padding:96px 90px}
.logo{display:flex;align-items:center;gap:18px;font-size:38px;font-weight:800}.logo i{font-style:normal;display:inline-grid;place-items:center;width:64px;height:64px;border-radius:18px;background:${donker ? '#fff' : '#0d7a5f'};color:${donker ? '#0d7a5f' : '#fff'}}
main{flex:1;display:flex;flex-direction:column;justify-content:center}
h1{font-size:${s.soort === 'totaal' ? 120 : s.soort === 'haak' ? 92 : 70}px;line-height:1.08;margin:0 0 30px;letter-spacing:-.01em}
p{font-size:44px;margin:0;opacity:.9}
.label{display:inline-block;align-self:flex-start;font-size:30px;font-weight:700;background:#f2b233;color:#231a00;padding:10px 20px;border-radius:12px;margin-bottom:30px}
.rij{display:flex;justify-content:space-between;gap:20px;font-size:44px;padding:26px 0;border-bottom:3px solid ${donker ? 'rgba(255,255,255,.25)' : '#dfe4de'}}.rij b{color:#0d7a5f;white-space:nowrap}
.knop{margin-top:50px;align-self:flex-start;background:#f2b233;color:#231a00;font-size:52px;font-weight:800;padding:26px 44px;border-radius:22px}
footer{display:flex;justify-content:space-between;font-size:28px;opacity:.75}
</style></head><body>
<div class="logo"><i>€</i>ToeslagBuddy</div>
<main>
${s.label ? `<div class="label">${esc(s.label)}</div>` : ''}
<h1>${esc(s.titel)}</h1>
${s.sub ? `<p>${esc(s.sub)}</p>` : ''}
${lijst ? `<div style="margin-top:30px">${lijst}</div>` : ''}
${s.knop ? `<div class="knop">${esc(s.knop)}</div>` : ''}
</main>
<footer><span>Indicatie · gebaseerd op officiële regels</span><span>${nr}/${totaal}</span></footer>
</body></html>`;
}
