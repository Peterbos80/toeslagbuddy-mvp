// Haalt dagelijks nieuws over toeslagen en inkomen op uit officiële RSS-feeds
// en schrijft data/nieuws.json. Draait in GitHub Actions vóór elke build.
//   node scripts/nieuws.js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { leesFeed, filter, samenvoegen, TREFWOORDEN, STRENG } from './rss.js';

// Feeds van de Rijksoverheid per onderwerp. Een feed die niet (meer) werkt,
// wordt overgeslagen en in het logboek gemeld.
// [bron, url, filter] – filter: false (alles), true (trefwoorden) of 'streng'.
// Een feed die niet (meer) werkt, wordt overgeslagen en in het logboek gemeld.
export const FEEDS = [
  ['Google Nieuws', 'https://news.google.com/rss/search?q=toeslagen+OR+zorgtoeslag+OR+huurtoeslag+OR+kinderopvangtoeslag+OR+%22kindgebonden+budget%22&hl=nl&gl=NL&ceid=NL:nl', 'streng'],
  ['NOS', 'https://feeds.nos.nl/nosnieuwsbinnenland', 'streng'],
  ['NOS', 'https://feeds.nos.nl/nosnieuwseconomie', 'streng'],
  ['NU.nl', 'https://www.nu.nl/rss/Economie', 'streng'],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/huurtoeslag/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/zorgtoeslag/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/kinderopvang/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/nieuws.rss', true],
];

const BESTAND = join(import.meta.dirname, '../data/nieuws.json');

async function haal([bron, url, filteren]) {
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ToeslagBuddy-nieuws/1.0; +https://www.toeslagbuddy.nl)', Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
  } catch (e) {
    // Toon de echte oorzaak (DNS, TLS, verbinding geweigerd) in het logboek
    throw new Error(`${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = leesFeed(await res.text(), bron);
  if (!filteren) return items;
  return filter(items, filteren === 'streng' ? STRENG : TREFWOORDEN);
}

const oud = existsSync(BESTAND) ? JSON.parse(readFileSync(BESTAND, 'utf8')).items || [] : [];
const resultaten = await Promise.allSettled(FEEDS.map(haal));
let nieuw = [];
resultaten.forEach((r, i) => {
  if (r.status === 'fulfilled') {
    console.log(`✓ ${FEEDS[i][1]} – ${r.value.length} berichten`);
    nieuw = nieuw.concat(r.value);
  } else {
    console.warn(`✗ ${FEEDS[i][1]} – ${r.reason.message}`);
  }
});

if (!resultaten.some((r) => r.status === 'fulfilled')) {
  console.warn('Geen enkele feed bereikbaar; het bestaande nieuws blijft staan.');
  process.exit(0);
}

const items = samenvoegen(nieuw, oud);
writeFileSync(BESTAND, JSON.stringify({ bijgewerkt: new Date().toISOString(), items }, null, 2) + '\n');
console.log(`✓ ${items.length} nieuwsberichten opgeslagen`);
