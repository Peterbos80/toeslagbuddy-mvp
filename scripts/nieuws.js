// Haalt dagelijks nieuws over toeslagen en inkomen op uit officiële RSS-feeds
// en schrijft data/nieuws.json. Draait in GitHub Actions vóór elke build.
//   node scripts/nieuws.js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { leesFeed, filter, samenvoegen } from './rss.js';

// Feeds van de Rijksoverheid per onderwerp. Een feed die niet (meer) werkt,
// wordt overgeslagen en in het logboek gemeld.
export const FEEDS = [
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/huurtoeslag/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/zorgtoeslag/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/kinderopvangtoeslag/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/kinderopvang/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/kindgebonden-budget/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/kinderbijslag/nieuws.rss', false],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/huurwoning/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/zorgverzekering/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/minimumloon/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/bijstand/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/schulden/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/onderwerpen/inkomstenbelasting/nieuws.rss', true],
  ['Rijksoverheid', 'https://feeds.rijksoverheid.nl/nieuws.rss', true],
];

const BESTAND = join(import.meta.dirname, '../data/nieuws.json');

async function haal([bron, url, filteren]) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'ToeslagBuddy-nieuws/1.0 (+https://www.toeslagbuddy.nl)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = leesFeed(await res.text(), bron);
  return filteren ? filter(items) : items;
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
