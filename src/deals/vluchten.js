// Vliegtickets: aanbod per route, gangbare prijs per route en maand en een
// prijskalender. Puur: browser en Node.
//
// Record: { id: 'vlucht-AMS-BCN', route, van, naar, demo,
//   dagen:   { waarneemdag: { 'JJJJ-MM': laagste in centen } },
//   actueel: { vertrekdatum: { prijs, maatschappij, stops, bagageInbegrepen, terug, bron, url, tijd, affiliate } },
//   bronnen: { bron: laatst gezien } }
import { bedrag, rond } from './aanbod.js';
import { mediaan, dag, centen, euro } from './historie.js';

export const LUCHTHAVENS = {
  AMS: 'Amsterdam', EIN: 'Eindhoven', RTM: 'Rotterdam', BRU: 'Brussel', DUS: 'Düsseldorf',
  BCN: 'Barcelona', LIS: 'Lissabon', JFK: 'New York', NYC: 'New York', MAD: 'Madrid', ROM: 'Rome', FCO: 'Rome',
  LON: 'Londen', LHR: 'Londen', PAR: 'Parijs', CDG: 'Parijs', AGP: 'Málaga', ALC: 'Alicante', PMI: 'Palma de Mallorca',
  IST: 'Istanbul', ATH: 'Athene', BER: 'Berlijn', PRG: 'Praag', CPH: 'Kopenhagen', DXB: 'Dubai', BKK: 'Bangkok', CUR: 'Curaçao',
};
export const plaats = (code) => LUCHTHAVENS[code] || code;
const DAG = 864e5;
const IATA = /^[A-Z]{3}$/;

export function normaliseerVlucht(ruw, opties = {}) {
  if (!ruw) return null;
  const van = String(ruw.van || '').toUpperCase().trim();
  const naar = String(ruw.naar || '').toUpperCase().trim();
  if (!IATA.test(van) || !IATA.test(naar) || van === naar) return null;
  const valuta = String(ruw.valuta || 'EUR').toUpperCase();
  const koers = valuta === 'EUR' ? 1 : opties.koersen?.[valuta];
  const p = bedrag(ruw.prijs);
  if (!koers || p === null || p <= 0) return null;
  const vertrek = String(ruw.vertrek || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vertrek)) return null;
  const terug = ruw.terug ? String(ruw.terug).slice(0, 10) : null;
  return {
    route: `${van}-${naar}`,
    van,
    naar,
    vertrek,
    terug: terug && terug >= vertrek ? terug : null,
    prijs: rond(p * koers),
    maatschappij: String(ruw.maatschappij || 'Onbekend').slice(0, 60),
    stops: Number.isInteger(ruw.stops) && ruw.stops >= 0 ? ruw.stops : null,
    bagageInbegrepen: typeof ruw.bagageInbegrepen === 'boolean' ? ruw.bagageInbegrepen : null,
    bron: String(ruw.bron || 'onbekend'),
    url: /^https?:\/\//.test(ruw.url || '') ? ruw.url : null,
    tijd: new Date(ruw.tijd || opties.nu || Date.now()).toISOString(),
    affiliate: !!ruw.affiliate,
    demo: !!ruw.demo,
  };
}

export function voegVluchtToe(record, v) {
  const r = record || { id: `vlucht-${v.route}`, route: v.route, van: v.van, naar: v.naar, demo: !!v.demo, dagen: {}, actueel: {}, bronnen: {} };
  const d = dag(v.tijd);
  const maand = v.vertrek.slice(0, 7);
  const rij = (r.dagen[d] ||= {});
  const c = centen(v.prijs);
  if (!(maand in rij) || c < rij[maand]) rij[maand] = c;
  const oud = r.actueel[v.vertrek];
  // Nieuwere waarneming vervangt; op dezelfde dag telt de goedkoopste
  if (!oud || dag(oud.tijd) < d || (dag(oud.tijd) === d && v.prijs < oud.prijs)) {
    const { route, van, naar, vertrek, demo, ...rest } = v;
    r.actueel[v.vertrek] = rest;
  }
  if (!r.bronnen[v.bron] || r.bronnen[v.bron] < d) r.bronnen[v.bron] = d;
  if (!v.demo) r.demo = false;
  return r;
}

export function afkappenVlucht(r, nu, max = 180) {
  const t = typeof nu === 'number' ? nu : Date.parse(nu);
  const grens = dag(t - max * DAG);
  const vandaag = dag(t);
  for (const d of Object.keys(r.dagen)) if (d < grens) delete r.dagen[d];
  for (const [vd, o] of Object.entries(r.actueel)) if (vd < vandaag || t - Date.parse(o.tijd) > 3 * DAG) delete r.actueel[vd];
  return r;
}

// Gangbare prijs voor vertrek in `maand`: mediaan van de laagste prijs per
// waarneemdag (90 dagen, zonder vandaag), minimaal 7 dagen; anders null.
export function gangbaarRoute(r, maand, nu, { dagen = 90, minPunten = 7 } = {}) {
  const t = typeof nu === 'number' ? nu : Date.parse(nu);
  const van = dag(t - dagen * DAG);
  const tot = dag(t);
  const rij = Object.entries(r.dagen)
    .filter(([d, m]) => d >= van && d < tot && maand in m)
    .map(([, m]) => euro(m[maand]));
  return rij.length >= minPunten ? rond(mediaan(rij)) : null;
}

// Laagste prijs (per waarneemdag) in de 30 dagen vóór vandaag, voor vertrek in `maand`
export function laagste30Route(r, maand, nu) {
  const t = typeof nu === 'number' ? nu : Date.parse(nu);
  const van = dag(t - 30 * DAG);
  const tot = dag(t);
  const rij = Object.entries(r.dagen).filter(([d, m]) => d >= van && d < tot && maand in m).map(([, m]) => euro(m[maand]));
  return rij.length ? Math.min(...rij) : null;
}

const dagenInMaand = (maand) => new Date(Date.UTC(+maand.slice(0, 4), +maand.slice(5, 7), 0)).getUTCDate();

// Prijskalender voor een maand: elke dag met de goedkoopste prijs (of null)
// en een niveau 0–4 (kwintielen van de prijzen in die maand) voor de heatmap.
export function prijsKalender(r, maand) {
  const n = dagenInMaand(maand);
  const dagen = [];
  for (let i = 1; i <= n; i++) {
    const datum = `${maand}-${String(i).padStart(2, '0')}`;
    const o = r.actueel[datum];
    dagen.push(o ? { datum, ...o } : { datum, prijs: null });
  }
  const prijzen = dagen.filter((d) => d.prijs !== null).map((d) => d.prijs).sort((a, b) => a - b);
  const grens = (q) => prijzen[Math.min(prijzen.length - 1, Math.floor(q * prijzen.length))];
  const grenzen = prijzen.length ? [grens(0.2), grens(0.4), grens(0.6), grens(0.8)] : [];
  for (const d of dagen) d.niveau = d.prijs === null ? null : grenzen.filter((g) => d.prijs > g).length;
  return { maand, dagen, laagste: prijzen[0] ?? null, hoogste: prijzen.at(-1) ?? null, aantal: prijzen.length };
}

// Goedkoopste vertrekdagen; bij gelijke prijs de vroegste datum
export const goedkoopste = (kalender, n = 3) =>
  kalender.dagen.filter((d) => d.prijs !== null).sort((a, b) => a.prijs - b.prijs || a.datum.localeCompare(b.datum)).slice(0, n);

export function routeOverzicht(r, nu, opties = {}) {
  const maanden = [...new Set(Object.keys(r.actueel).map((d) => d.slice(0, 7)))].sort();
  const lijst = maanden.map((maand) => {
    const kalender = prijsKalender(r, maand);
    const gangbaar = gangbaarRoute(r, maand, nu, opties);
    const top = goedkoopste(kalender, 3);
    const korting = gangbaar && top[0] ? Math.round((1 - top[0].prijs / gangbaar) * 1000) / 1000 : null;
    return { maand, gangbaar, laagste30: laagste30Route(r, maand, nu), kalender, goedkoopste: top, echteKorting: korting };
  });
  const beste = lijst.filter((m) => m.goedkoopste[0]).sort((a, b) => (b.echteKorting ?? -1) - (a.echteKorting ?? -1))[0] || null;
  const waarneemdagen = Object.keys(r.dagen).length;
  return { id: r.id, route: r.route, van: r.van, naar: r.naar, vanNaam: plaats(r.van), naarNaam: plaats(r.naar), demo: !!r.demo, maanden: lijst, beste, dagen: waarneemdagen, bronnen: Object.keys(r.bronnen) };
}
