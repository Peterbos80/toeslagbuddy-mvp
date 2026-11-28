// Maakt de deelafbeeldingen (Open Graph, 1200 × 630) in de huisstijl:
//   CHROMIUM_PATH=… node scripts/og.js
// De uitkomst staat in public/ en gaat mee in git; draai dit alleen opnieuw
// als de huisstijl of de teksten veranderen. De afbeelding per pagina maakt
// scripts/og-paginas.js (zelfde opmaak, uit src/site/og.js).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ogHtml } from '../src/site/og.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = (naam) => readFileSync(join(ROOT, 'public/fonts', naam)).toString('base64');

export const KAARTEN = [
  { bestand: 'og.png', label: 'Toeslagen', kleur: '#d9a441', kop: 'Mis je <em>geld</em> waar je recht op hebt?', tekst: 'Bereken in 2 minuten al je toeslagen. Onafhankelijk en gratis.', punten: ['Zorgtoeslag', 'Huurtoeslag', 'Kindgebonden budget', 'Kinderopvangtoeslag'] },
  { bestand: 'og-familie.png', label: 'Familie', kleur: '#c2643a', kop: 'Samen de zaken van je <em>ouders</em> regelen', tekst: 'Eén gedeelde regelkamer: termijnen, brieven, geld en afspraken.', punten: ['Geen termijn gemist', 'Iedereen ziet hetzelfde', 'Klaar als het nodig is'] },
  { bestand: 'og-besparen.png', label: 'Besparen', kleur: '#b98abd', kop: 'Echte deals, <em>eerlijk</em> berekend', tekst: 'We vergelijken met wat een product meestal kost. Met bewijs.', punten: ['Gangbare prijs van 90 dagen', 'Prijsgrafiek per winkel', 'Jager die voor je zoekt'] },
  { bestand: 'og-pro.png', label: 'Professionals', kleur: '#8fb8e0', kop: 'Toeslagen van al je cliënten <em>in één keer</em>', tekst: 'Voor bewindvoerders, budgetcoaches en zzp’ers.', punten: ['Gemiste toeslagen', 'Risico op terugbetalen', 'Rapport per cliënt'] },
];

const html = (k) => ogHtml(k, { fraunces: font('fraunces-latin-soft-normal.woff2'), figtree: font('figtree-latin-wght-normal.woff2') });

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
