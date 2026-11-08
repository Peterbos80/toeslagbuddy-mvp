// Lezen en schrijven van data/deals/ (historie als compacte JSON per product
// of route, plus status, http-cache, verzonden meldingen en opt-outs).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA = join(ROOT, 'data/deals');

export function leesJson(pad, standaard) {
  try {
    return existsSync(pad) ? JSON.parse(readFileSync(pad, 'utf8')) : standaard;
  } catch {
    return standaard;
  }
}

export function schrijfJson(pad, data, mooi = false) {
  mkdirSync(dirname(pad), { recursive: true });
  writeFileSync(pad, (mooi ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + '\n');
}

const veiligeNaam = (id) => String(id).replace(/[^a-z0-9-]/gi, '-').slice(0, 100);

export function leesHistorie(map = DATA) {
  const dir = join(map, 'historie');
  const producten = new Map();
  const vluchten = new Map();
  if (!existsSync(dir)) return { producten, vluchten };
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const r = leesJson(join(dir, f), null);
    if (!r?.id) continue;
    (r.route ? vluchten : producten).set(r.id, r);
  }
  return { producten, vluchten };
}

export function schrijfHistorie({ producten, vluchten }, map = DATA) {
  const dir = join(map, 'historie');
  mkdirSync(dir, { recursive: true });
  const namen = new Set();
  for (const r of [...producten.values(), ...vluchten.values()]) {
    const naam = `${veiligeNaam(r.id)}.json`;
    namen.add(naam);
    schrijfJson(join(dir, naam), r);
  }
  return namen.size;
}

// Opt-out van winkels: data/deals/optout.json = ["winkel.nl", …]
export function optoutLijst(map = DATA) {
  const lijst = leesJson(join(map, 'optout.json'), []).map((d) => String(d).toLowerCase().replace(/^www\./, ''));
  return (url) => {
    try {
      const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      return lijst.some((d) => h === d || h.endsWith('.' + d));
    } catch {
      return false;
    }
  };
}

// Winkelinfo (verzending, drempel, betrouwbaarheid) uit data/deals/winkels.json
export function winkelInfo(map = DATA) {
  const winkels = leesJson(join(map, 'winkels.json'), { winkels: [] }).winkels || [];
  return (naam, host) =>
    winkels.find((w) => (naam && w.naam?.toLowerCase() === String(naam).toLowerCase()) || (host && (w.domein === host || host.endsWith('.' + w.domein)))) || null;
}
