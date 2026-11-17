// Maakt de deelafbeeldingen (Open Graph, 1200 × 630) in de huisstijl:
//   CHROMIUM_PATH=… node scripts/og.js
// De uitkomst staat in public/ en gaat mee in git; draai dit alleen opnieuw
// als de huisstijl of de teksten veranderen.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = (naam) => readFileSync(join(ROOT, 'public/fonts', naam)).toString('base64');

export const KAARTEN = [
  { bestand: 'og.png', label: 'Toeslagen', kleur: '#d9a441', kop: 'Mis je <em>geld</em> waar je recht op hebt?', tekst: 'Bereken in 2 minuten al je toeslagen. Onafhankelijk en gratis.', punten: ['Zorgtoeslag', 'Huurtoeslag', 'Kindgebonden budget', 'Kinderopvangtoeslag'] },
  { bestand: 'og-familie.png', label: 'Familie', kleur: '#c2643a', kop: 'Samen de zaken van je <em>ouders</em> regelen', tekst: 'Eén gedeelde regelkamer: termijnen, brieven, geld en afspraken.', punten: ['Geen termijn gemist', 'Iedereen ziet hetzelfde', 'Klaar als het nodig is'] },
  { bestand: 'og-besparen.png', label: 'Besparen', kleur: '#b98abd', kop: 'Echte deals, <em>eerlijk</em> berekend', tekst: 'We vergelijken met wat een product meestal kost. Met bewijs.', punten: ['Gangbare prijs van 90 dagen', 'Prijsgrafiek per winkel', 'Jager die voor je zoekt'] },
  { bestand: 'og-pro.png', label: 'Professionals', kleur: '#8fb8e0', kop: 'Toeslagen van al je cliënten <em>in één keer</em>', tekst: 'Voor bewindvoerders, budgetcoaches en zzp’ers.', punten: ['Gemiste toeslagen', 'Risico op terugbetalen', 'Rapport per cliënt'] },
];

const html = (k) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>
@font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${font('fraunces-latin-soft-normal.woff2')}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Figtree; src: url(data:font/woff2;base64,${font('figtree-latin-wght-normal.woff2')}) format('woff2'); font-weight: 300 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: #14211e; color: #f4efe6; font-family: Figtree, sans-serif; position: relative; overflow: hidden; }
.gloed { position: absolute; width: 760px; height: 760px; border-radius: 50%; right: -260px; top: -300px; background: ${k.kleur}; opacity: .28; filter: blur(60px); }
.gloed.twee { right: auto; left: -340px; top: auto; bottom: -460px; background: #1f6b5a; opacity: .7; }
.in { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; }
.merk { display: flex; align-items: center; gap: 14px; font-family: Fraunces, serif; font-size: 34px; font-weight: 600; }
.merk span { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 15px; background: #1f6b5a; font-family: Figtree, sans-serif; font-weight: 800; font-size: 30px; }
.label { margin-left: auto; font-size: 20px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #14211e; background: ${k.kleur}; padding: 9px 20px; border-radius: 99px; }
h1 { font-family: Fraunces, serif; font-variation-settings: 'SOFT' 100; font-weight: 560; font-size: 78px; line-height: 1.04; letter-spacing: -.025em; margin-top: auto; max-width: 980px; }
h1 em { font-style: italic; font-weight: 480; color: ${k.kleur}; }
p { font-size: 30px; line-height: 1.35; color: #cfd8d3; margin-top: 22px; max-width: 900px; }
ul { list-style: none; padding: 0; display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap; }
li { font-size: 21px; font-weight: 600; padding: 10px 20px; border-radius: 99px; border: 1.5px solid rgb(255 255 255 / 22%); background: rgb(255 255 255 / 6%); }
</style></head><body><div class="gloed"></div><div class="gloed twee"></div><div class="in">
<div class="merk"><span>€</span>ToeslagBuddy<b class="label">${k.label}</b></div>
<h1>${k.kop}</h1><p>${k.tekst}</p><ul>${k.punten.map((x) => `<li>${x}</li>`).join('')}</ul>
</div></body></html>`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const pagina = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })).newPage();
  for (const k of KAARTEN) {
    await pagina.setContent(html(k));
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: join(ROOT, 'public', k.bestand), type: 'png' });
    console.log('✓', k.bestand);
  }
  await browser.close();
}
