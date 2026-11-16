// Bronnen-scraper: haalt de officiële pagina's op waar onze regels en bedragen
// vandaan komen (CAK, Belastingdienst, Rijksoverheid, SVB), en bewaart per
// bron een tekstafdruk in data/familie/bronnen/. Zo kunnen we elk bedrag
// narekenen tegen de bron, en zien we het als een pagina verandert.
//
// Beleefd: robots.txt eerst, herkenbare User-Agent, per site één verzoek
// tegelijk met 5 seconden ertussen, geen omzeiling van blokkades.
//
//   node scripts/familie/bronnen.js [--alleen id,id] [--ontdek] [--budget 120]
//
// --ontdek volgt ook links op dezelfde site die over onze onderwerpen gaan
// (één niveau diep) en schrijft ze naar data/familie/bronnen/ontdekt.json.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakOphaler, Geweigerd } from '../deals/http.js';
import { htmlNaarTekst, titelVan, linksVan } from './tekst.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const MAP = join(ROOT, 'data/familie/bronnen');
export const USER_AGENT = 'ToeslagBuddyBronnen/1.0 (+https://www.toeslagbuddy.nl/familie/bronnen/)';
const ONDERWERP = /overlijd|overled|nabestaand|erf|nalaten|wlz|wmo|eigen.?bijdrage|zorgkosten|anw|salder|verpleeghuis|zorginstelling|machtig|toeslag|volmacht|aangifte/i;

const sha = (s) => createHash('sha256').update(s).digest('hex');

export function leesLijst(bestand = join(ROOT, 'data/familie/bronnen.json')) {
  return JSON.parse(readFileSync(bestand, 'utf8')).bronnen;
}

export function leesIndex(map = MAP) {
  const b = join(map, 'index.json');
  return existsSync(b) ? JSON.parse(readFileSync(b, 'utf8')) : { bijgewerkt: null, bronnen: {} };
}

// Eén bron ophalen en vergelijken met de vorige afdruk
export async function verwerk(bron, { ophaler, index, map = MAP, nu = new Date() }) {
  const vorige = index.bronnen[bron.id] || {};
  const basis = { url: bron.url, onderwerp: bron.onderwerp || '', gecontroleerd: nu.toISOString() };
  let r;
  try {
    r = await ophaler.haal(bron.url, { voorwaardelijk: false });
  } catch (e) {
    const reden = e instanceof Geweigerd ? e.reden : 'fout';
    return { ...vorige, ...basis, status: reden === 'robots' ? 'robots' : reden === 'geblokkeerd' ? 'geblokkeerd' : 'fout', gewijzigd: false };
  }
  if (!r.ok) return { ...vorige, ...basis, status: `http-${r.status}`, gewijzigd: false };
  const soort = (r.headers?.get?.('content-type') || '').toLowerCase();
  if (soort.includes('pdf') || /\.pdf($|\?)/i.test(bron.url)) {
    const hash = sha(r.tekst);
    return { ...vorige, ...basis, status: 'pdf', hash, gewijzigd: !!vorige.hash && vorige.hash !== hash, opgehaald: nu.toISOString() };
  }
  const tekst = htmlNaarTekst(r.tekst);
  const hash = sha(tekst);
  const gewijzigd = !!vorige.hash && vorige.hash !== hash;
  mkdirSync(map, { recursive: true });
  writeFileSync(join(map, `${bron.id}.txt`), `Bron: ${bron.url}\nTitel: ${titelVan(r.tekst)}\nOpgehaald: ${nu.toISOString()}\n\n${tekst}\n`);
  return {
    ...basis,
    status: 'ok',
    titel: titelVan(r.tekst),
    hash,
    tekens: tekst.length,
    opgehaald: nu.toISOString(),
    gewijzigd,
    gewijzigdOp: gewijzigd ? nu.toISOString() : vorige.gewijzigdOp || null,
    links: linksVan(r.tekst, r.url || bron.url),
  };
}

export async function draai({ alleen = null, ontdek = false, budget = 120, map = MAP, lijst = leesLijst(), ophaler = maakOphaler({ userAgent: USER_AGENT, budget, minInterval: 5000 }), log = console.log, nu = new Date() } = {}) {
  const index = leesIndex(map);
  const kandidaten = new Map();
  const bekend = new Set(lijst.map((b) => b.url.replace(/\/$/, '')));
  for (const bron of lijst.filter((b) => !alleen || alleen.includes(b.id))) {
    const uit = await verwerk(bron, { ophaler, index, map, nu });
    for (const l of uit.links || []) {
      const zelfdeSite = new URL(l.url).host.replace(/^www\./, '') === new URL(bron.url).host.replace(/^www\./, '');
      if (zelfdeSite && ONDERWERP.test(`${l.url} ${l.tekst}`) && !bekend.has(l.url.replace(/\/$/, '')) && !/\.(pdf|docx?|xlsx?|zip)($|\?)/i.test(l.url)) kandidaten.set(l.url, { ...l, via: bron.id });
    }
    delete uit.links;
    index.bronnen[bron.id] = uit;
    log(`${bron.id}: ${uit.status}${uit.gewijzigd ? ' (GEWIJZIGD)' : ''}${uit.tekens ? `, ${uit.tekens} tekens` : ''}`);
  }
  index.bijgewerkt = nu.toISOString();
  index.sites = ophaler.status();
  mkdirSync(map, { recursive: true });
  writeFileSync(join(map, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  if (ontdek) {
    const lijstOntdekt = [...kandidaten.values()].sort((a, b) => a.url.localeCompare(b.url));
    writeFileSync(join(map, 'ontdekt.json'), JSON.stringify({ bijgewerkt: nu.toISOString(), links: lijstOntdekt }, null, 1) + '\n');
    log(`${lijstOntdekt.length} verwante pagina's gevonden (ontdekt.json)`);
  }
  return index;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (naam) => {
    const i = process.argv.indexOf(naam);
    return i > -1 ? process.argv[i + 1] : null;
  };
  const index = await draai({ alleen: arg('--alleen')?.split(','), ontdek: process.argv.includes('--ontdek'), budget: Number(arg('--budget') || 120) });
  const fout = Object.values(index.bronnen).filter((b) => b.status !== 'ok' && b.status !== 'pdf').length;
  console.log(`Klaar: ${Object.keys(index.bronnen).length} bronnen, ${fout} niet op te halen`);
}
