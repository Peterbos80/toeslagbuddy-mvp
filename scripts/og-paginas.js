// Maakt na `node build.js` een eigen deelafbeelding (Open Graph, 1200 × 630)
// voor elke indexeerbare Nederlandse pagina in de sitemap, uit de inhoud van
// de gebouwde pagina zelf: de kop (h1), de beschrijving en de kleur van het
// onderdeel. Daarna verwijst elke pagina in dist/ naar haar eigen afbeelding.
//
//   node build.js && CHROMIUM_PATH=… node scripts/og-paginas.js
//
// Uitkomst: dist/og/<slug>.jpg (niet in git; wordt bij elke publicatie
// opnieuw gemaakt). Zonder dit script houden pagina's de afbeelding van hun
// onderdeel (public/og*.png), dus een verwijzing breekt nooit.
//
// Snel: één browser en één pagina; de lettertypen worden één keer geladen en
// per kaart wordt alleen de inhoud vervangen.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../site.config.js';
import { vingerafdruk } from '../src/site/vindbaar.js';
import { OG_MAP, OG_MAAT, OG_KWALITEIT, OG_EXTENSIE, OG_PASSEN, ogBestandsnaam, heeftEigenOg, uitHtml, paginaKaart, ogHtml, ogInhoud } from '../src/site/og.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const font = (naam) => readFileSync(join(ROOT, 'public/fonts', naam)).toString('base64');

// Pagina's uit de sitemap (zelfde lijst als zoekmachines krijgen)
export function slugsUitSitemap(xml) {
  return [...String(xml).matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
}

// Zet de verwijzingen in een gebouwde pagina om naar de eigen afbeelding:
// og:image en (bij gidsen) de afbeelding in de Article-gegevens.
export function verwijsNaar(html, url, { basis = config.url } = {}) {
  let uit = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${url}$2`);
  // Article/NewsArticle-gegevens met de afbeelding van het onderdeel
  uit = uit.replace(new RegExp(`("image":")${basis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/og[\\w-]*\\.png(")`, 'g'), `$1${url}$2`);
  return uit;
}

async function main() {
  const begin = Date.now();
  const xml = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const uitMap = join(DIST, OG_MAP);
  mkdirSync(uitMap, { recursive: true });

  // Welke pagina's? Indexeerbaar (in de sitemap) en Nederlands
  const taken = [];
  const namen = new Map();
  for (const slug of slugsUitSitemap(xml)) {
    if (!heeftEigenOg({ slug, taal: slug.startsWith('/en/') ? 'en' : 'nl' })) continue;
    const bestand = join(DIST, slug, 'index.html');
    if (!existsSync(bestand)) continue;
    const naam = ogBestandsnaam(slug);
    if (namen.has(naam)) {
      console.warn(`⚠ ${slug} en ${namen.get(naam)} krijgen allebei ${naam}; ${slug} houdt de afbeelding van het onderdeel`);
      continue;
    }
    namen.set(naam, slug);
    taken.push({ slug, bestand, naam });
  }

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const pagina = await (await browser.newContext({ viewport: { width: OG_MAAT.breedte, height: OG_MAAT.hoogte }, deviceScaleFactor: 1 })).newPage();
  const fonts = { fraunces: font('fraunces-latin-soft-normal.woff2'), figtree: font('figtree-latin-wght-normal.woff2') };
  await pagina.setContent(ogHtml({ label: '', kleur: '#d9a441', kop: '', tekst: '', punten: [] }, fonts));
  await pagina.evaluate(() => document.fonts.ready);

  const host = new URL(config.url).host.replace(/^www\./, '');
  let klein = 0;
  const gemaakt = new Set();
  for (const t of taken) {
    const html = readFileSync(t.bestand, 'utf8');
    const kaart = paginaKaart(uitHtml(html), `${host}${t.slug.replace(/\/$/, '')}`);
    await pagina.evaluate(([inhoud, kleur]) => {
      document.body.style.setProperty('--k', kleur);
      document.body.innerHTML = inhoud;
    }, [ogInhoud(kaart), kaart.kleur]);
    await pagina.evaluate(() => document.fonts.ready);
    const grootte = await pagina.evaluate(OG_PASSEN);
    if (grootte <= 40) klein++;
    await pagina.screenshot({ path: join(uitMap, t.naam), type: OG_EXTENSIE === 'png' ? 'png' : 'jpeg', ...(OG_EXTENSIE === 'png' ? {} : { quality: OG_KWALITEIT }) });
    gemaakt.add(t.naam);

    // De pagina verwijst nu naar haar eigen afbeelding
    const nieuw = verwijsNaar(html, `${config.url}/${OG_MAP}/${t.naam}`);
    if (nieuw !== html) writeFileSync(t.bestand, nieuw);
  }
  await browser.close();

  // Oude afbeeldingen van pagina's die er niet meer zijn opruimen
  for (const f of readdirSync(uitMap)) if (!gemaakt.has(f)) rmSync(join(uitMap, f), { force: true });

  // Vingerafdrukken voor IndexNow bijwerken (de og:image is veranderd)
  const inhoudPad = join(DIST, 'inhoud.json');
  if (existsSync(inhoudPad)) {
    const inhoud = JSON.parse(readFileSync(inhoudPad, 'utf8'));
    for (const t of taken) if (inhoud.paginas?.[t.slug]) inhoud.paginas[t.slug] = vingerafdruk(readFileSync(t.bestand, 'utf8'));
    writeFileSync(inhoudPad, JSON.stringify(inhoud));
  }

  const duur = (Date.now() - begin) / 1000;
  console.log(`✓ ${gemaakt.size} deelafbeeldingen in dist/${OG_MAP}/ in ${duur.toFixed(1)} s${klein ? ` (${klein} met de kleinste kop)` : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
