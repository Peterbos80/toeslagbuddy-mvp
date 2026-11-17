// Meldt gewijzigde pagina's bij IndexNow (Bing, Yandex, Seznam, Naver) na een
// publicatie. Gebruik:
//   node scripts/indexnow.js --bewaar oud.json     (vóór de publicatie: huidige stand ophalen)
//   node scripts/indexnow.js --oud oud.json        (ná de publicatie: verschil melden)
// Zonder vorige stand melden we alles één keer. IndexNow vraagt geen account:
// de sleutel staat als bestand op de site en bewijst dat de melding van ons is.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import config from '../site.config.js';
import { sleutelGeldig } from '../src/site/vindbaar.js';

const EINDPUNT = 'https://api.indexnow.org/indexnow';
const MAX = 10000; // maximum per melding volgens het protocol

export function verschil(oud, nieuw) {
  if (!oud || !Object.keys(oud).length) return Object.keys(nieuw);
  return Object.keys(nieuw).filter((u) => oud[u] !== nieuw[u]);
}

export function bericht(cfg, paden) {
  const host = new URL(cfg.url).host;
  return { host, key: cfg.vindbaar.indexnowSleutel, keyLocation: `${cfg.url}/${cfg.vindbaar.indexnowSleutel}.txt`, urlList: paden.slice(0, MAX).map((p) => cfg.url + p) };
}

async function haal(url, haalOp = fetch) {
  try {
    const r = await haalOp(url, { headers: { 'User-Agent': 'ToeslagBuddyIndexNow/1.0' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function meld({ cfg = config, oud, haalOp = fetch, wacht = 0 } = {}) {
  if (!sleutelGeldig(cfg.vindbaar?.indexnowSleutel)) return { gemeld: 0, reden: 'geen sleutel' };
  let nieuw = null;
  // Na een publicatie duurt het even voor de nieuwe versie overal staat
  for (let i = 0; i < 6 && !nieuw; i++) {
    nieuw = await haal(`${cfg.url}/inhoud.json`, haalOp);
    if (!nieuw && wacht) await new Promise((r) => setTimeout(r, wacht));
  }
  if (!nieuw) return { gemeld: 0, reden: 'inhoud.json niet bereikbaar' };
  const paden = verschil(oud, nieuw.paginas || {});
  if (!paden.length) return { gemeld: 0, reden: 'niets gewijzigd' };
  const r = await haalOp(EINDPUNT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(bericht(cfg, paden)), signal: AbortSignal.timeout(30000) });
  return { gemeld: paden.length, status: r.status, reden: r.status >= 200 && r.status < 300 ? 'ok' : 'geweigerd' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (naam) => { const i = process.argv.indexOf(naam); return i > -1 ? process.argv[i + 1] : null; };
  const bewaar = arg('--bewaar');
  if (bewaar) {
    const stand = await haal(`${config.url}/inhoud.json`);
    writeFileSync(bewaar, JSON.stringify(stand?.paginas || {}));
    console.log(`Vorige stand: ${Object.keys(stand?.paginas || {}).length} pagina's`);
  } else {
    const pad = arg('--oud');
    const oud = pad && existsSync(pad) ? JSON.parse(readFileSync(pad, 'utf8')) : null;
    const uit = await meld({ oud, wacht: 15000 });
    console.log(`IndexNow: ${uit.gemeld} pagina's gemeld (${uit.reden}${uit.status ? `, status ${uit.status}` : ''})`);
  }
}
