// Prijshistorie per product en de eerlijke maatstaven daarop: gangbare prijs
// (mediaan), modus-band, laagste prijs van 30 dagen (Omnibus), echte korting,
// nep-kortingen en een dealscore. Puur: browser en Node.
//
// Record (opslag, compact): {
//   id, titel, categorie, merk, afbeelding, demo,
//   dagen:   { 'JJJJ-MM-DD': { winkel: totaal in centen } }   // laagste per dag per winkel
//   winkels: { winkel: laatste aanbod (zonder product/titel) + eerst }
//   bronnen: { bron: 'JJJJ-MM-DD' (laatst gezien) }
// }

const DAG = 864e5;
export const dag = (t) => new Date(typeof t === 'number' ? t : Date.parse(t)).toISOString().slice(0, 10);
const ms = (t) => (t instanceof Date ? t.getTime() : typeof t === 'number' ? t : Date.parse(t));
export const centen = (e) => Math.round(e * 100);
export const euro = (c) => Math.round(c) / 100;

export function mediaan(rij) {
  const s = rij.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function nieuwRecord(a) {
  return { id: a.product, titel: a.titel, categorie: a.categorie, merk: a.merk || null, afbeelding: a.afbeelding || null, demo: !!a.demo, dagen: {}, winkels: {}, bronnen: {} };
}

// Eén genormaliseerd aanbod (zie aanbod.js) in de historie zetten
export function voegToe(record, a) {
  const r = record || nieuwRecord(a);
  const d = dag(a.tijd);
  const c = centen(a.totaal);
  const dagRij = (r.dagen[d] ||= {});
  if (!(a.winkel in dagRij) || c < dagRij[a.winkel]) dagRij[a.winkel] = c;
  const oud = r.winkels[a.winkel];
  if (!oud || Date.parse(a.tijd) >= Date.parse(oud.tijd)) {
    r.winkels[a.winkel] = {
      prijs: a.prijs,
      verzendkosten: a.verzendkosten,
      gratisVerzendingVanaf: a.gratisVerzendingVanaf,
      totaal: a.totaal,
      verzendBekend: a.verzendBekend,
      vanPrijs: a.vanPrijs,
      url: a.url,
      bron: a.bron,
      affiliate: !!a.affiliate,
      tijd: a.tijd,
      eerst: oud?.eerst || d,
    };
  }
  if (!r.bronnen[a.bron] || r.bronnen[a.bron] < d) r.bronnen[a.bron] = d;
  // Echte gegevens gaan voor demo: één echte bron maakt het record echt
  if (!a.demo) r.demo = false;
  if (!r.afbeelding && a.afbeelding) r.afbeelding = a.afbeelding;
  return r;
}

// Alles ouder dan `max` dagen weg (opslag blijft klein)
export function afkappen(r, nu, max = 180) {
  const grens = dag(ms(nu) - max * DAG);
  for (const d of Object.keys(r.dagen)) if (d < grens) delete r.dagen[d];
  for (const [w, o] of Object.entries(r.winkels)) if (dag(o.tijd) < grens) delete r.winkels[w];
  for (const [b, d] of Object.entries(r.bronnen)) if (d < grens) delete r.bronnen[b];
  return r;
}

// Laagste totaal per dag over alle winkels: [{ datum, totaal (€), winkel }]
// Bij gelijke prijs wint de winkelnaam die alfabetisch eerst komt (vast).
export function dagReeks(r, winkel = null) {
  return Object.keys(r.dagen)
    .sort()
    .map((d) => {
      const rij = Object.entries(r.dagen[d]).filter(([w]) => !winkel || w === winkel);
      if (!rij.length) return null;
      rij.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
      return { datum: d, totaal: euro(rij[0][1]), winkel: rij[0][0] };
    })
    .filter(Boolean);
}

// Punten in [nu - venster dagen, vandaag) – vandaag telt niet mee, zodat een
// deal van vandaag de vergelijkingsprijs niet zelf omlaag trekt.
export function venster(reeks, nu, dagen) {
  const van = dag(ms(nu) - dagen * DAG);
  const tot = dag(nu);
  return reeks.filter((p) => p.datum >= van && p.datum < tot);
}

// Gangbare prijs = mediaan van de laagste dagprijzen over 90 dagen. Minder
// dagen beschikbaar: wat er is, maar minimaal 7 punten; anders null.
export function gangbarePrijs(reeks, nu, { dagen = 90, minPunten = 7 } = {}) {
  const v = venster(reeks, nu, dagen);
  if (v.length < minPunten) return null;
  return Math.round(mediaan(v.map((p) => p.totaal)) * 100) / 100;
}

// De prijsband waarin de prijs het vaakst lag. Breedte: 5% van de mediaan
// (minimaal € 1). Bij gelijk aantal wint de goedkoopste band.
export function modusBand(reeks, nu, { dagen = 90, minPunten = 7, breedte = null } = {}) {
  const v = venster(reeks, nu, dagen);
  if (v.length < minPunten) return null;
  const m = mediaan(v.map((p) => p.totaal));
  const b = breedte || Math.max(1, Math.round(m * 0.05));
  const tel = new Map();
  for (const p of v) {
    const k = Math.floor(p.totaal / b);
    tel.set(k, (tel.get(k) || 0) + 1);
  }
  const [k, aantal] = [...tel].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0];
  return { van: k * b, tot: (k + 1) * b, aantal, punten: v.length };
}

// Laagste prijs in de 30 dagen vóór vandaag (EU Omnibus-richtlijn, art. 6 bis Pri)
export function laagste30(reeks, nu) {
  const v = venster(reeks, nu, 30);
  return v.length ? Math.min(...v.map((p) => p.totaal)) : null;
}

export function echteKorting(huidig, gangbaar) {
  if (!gangbaar || huidig === null || huidig === undefined) return null;
  return Math.round((1 - huidig / gangbaar) * 1000) / 1000;
}

// Nep-korting: de winkel noemt een 'van'-prijs, maar de prijs is niet echt
// lager dan normaal (minder dan minKorting onder de gangbare prijs) of niet
// lager dan de laagste prijs van de afgelopen 30 dagen.
export function nepKorting({ vanPrijs, huidig, gangbaar, laagste30: l30 }, { minKorting = 0.05 } = {}) {
  if (!vanPrijs || !(vanPrijs > huidig)) return { nep: false, geclaimd: null, redenen: [] };
  const geclaimd = Math.round((1 - huidig / vanPrijs) * 1000) / 1000;
  const redenen = [];
  const echt = echteKorting(huidig, gangbaar);
  const teWeinig = echt !== null && echt < minKorting;
  const nietLaagste = l30 !== null && l30 !== undefined && huidig >= l30;
  if (teWeinig) redenen.push(`Maar ${Math.max(0, Math.round(echt * 100))}% onder de gangbare prijs, niet ${Math.round(geclaimd * 100)}%`);
  if (nietLaagste) redenen.push('Niet lager dan de laagste prijs van de afgelopen 30 dagen');
  if (gangbaar && vanPrijs > gangbaar * 1.25) redenen.push('De ‘van’-prijs ligt ver boven de gangbare prijs');
  return { nep: teWeinig || nietLaagste, geclaimd, redenen };
}

// Dealscore 0–100: echte korting (max 70), versheid (max 15),
// betrouwbaarheid van de winkel (max 15). Nep-korting halveert, onbekende
// verzendkosten kosten 5 punten, verdacht lage prijs (prijsfout?) max 40.
export function dealScore({ echteKorting: k, uurOud = 0, betrouwbaarheid = 0.7, verzendBekend = true, nep = false, verdacht = false }) {
  if (k === null || k === undefined) return 0;
  const korting = 70 * Math.min(1, Math.max(0, k) / 0.5);
  const vers = 15 * (uurOud <= 6 ? 1 : uurOud >= 72 ? 0 : 1 - (uurOud - 6) / 66);
  let s = korting + vers + 15 * Math.min(1, Math.max(0, betrouwbaarheid));
  if (!verzendBekend) s -= 5;
  if (nep) s /= 2;
  if (verdacht) s = Math.min(s, 40);
  return Math.max(0, Math.min(100, Math.round(s)));
}

// Winkels met een recent aanbod (standaard: gezien in de laatste 48 uur),
// gesorteerd op totaalprijs; bij gelijke prijs: betrouwbaarder, dan naam.
export function huidigAanbod(r, nu, { maxUur = 48, betrouwbaarheid = {} } = {}) {
  return Object.entries(r.winkels)
    .filter(([, o]) => ms(nu) - Date.parse(o.tijd) <= maxUur * 36e5)
    .map(([winkel, o]) => ({ winkel, ...o, betrouwbaarheid: betrouwbaarheid[winkel] ?? 0.7 }))
    .sort((a, b) => a.totaal - b.totaal || b.betrouwbaarheid - a.betrouwbaarheid || a.winkel.localeCompare(b.winkel));
}

// ISO-week van een datum: '2026-W45'
export function isoWeek(d) {
  const t = new Date(d + 'T00:00:00Z');
  const dagNr = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dagNr + 3);
  const jaar = t.getUTCFullYear();
  const eerste = new Date(Date.UTC(jaar, 0, 4));
  const w = 1 + Math.round(((t - eerste) / DAG - 3 + ((eerste.getUTCDay() + 6) % 7)) / 7);
  return `${jaar}-W${String(w).padStart(2, '0')}`;
}

// Per week: laagste en mediaan van de dagprijzen (voor het bewijs in de mail)
export function weekOverzicht(reeks) {
  const weken = new Map();
  for (const p of reeks) {
    const w = isoWeek(p.datum);
    if (!weken.has(w)) weken.set(w, []);
    weken.get(w).push(p.totaal);
  }
  return [...weken].map(([week, rij]) => ({ week, laagste: Math.min(...rij), mediaan: Math.round(mediaan(rij) * 100) / 100, dagen: rij.length }));
}

// Alles over één product op moment `nu`
export function productOverzicht(r, nu, opties = {}) {
  const reeks = dagReeks(r);
  const aanbod = huidigAanbod(r, nu, opties);
  const beste = aanbod[0] || null;
  const gangbaar = gangbarePrijs(reeks, nu, opties);
  const l30 = laagste30(reeks, nu);
  const huidig = beste ? beste.totaal : null;
  const korting = echteKorting(huidig, gangbaar);
  const nep = beste ? nepKorting({ vanPrijs: beste.vanPrijs, huidig, gangbaar, laagste30: l30 }) : { nep: false, geclaimd: null, redenen: [] };
  // Meer dan 70% onder normaal is eerder een prijsfout of ander product
  const verdacht = korting !== null && korting > 0.7;
  const winkelsGezien = new Set(Object.values(r.dagen).flatMap((d) => Object.keys(d)));
  const dagenGezien = reeks.length;
  return {
    id: r.id,
    titel: r.titel,
    categorie: r.categorie,
    merk: r.merk,
    afbeelding: r.afbeelding,
    demo: !!r.demo,
    huidig,
    beste,
    aanbod,
    gangbaar,
    modus: modusBand(reeks, nu, opties),
    laagste30: l30,
    echteKorting: korting,
    nep,
    verdacht,
    onderLaagste30: huidig !== null && l30 !== null && huidig < l30,
    score: beste
      ? dealScore({ echteKorting: korting, uurOud: (ms(nu) - Date.parse(beste.tijd)) / 36e5, betrouwbaarheid: beste.betrouwbaarheid, verzendBekend: beste.verzendBekend, nep: nep.nep, verdacht })
      : 0,
    reeks,
    dagen: dagenGezien,
    eersteDag: reeks[0]?.datum || null,
    winkelsGezien: winkelsGezien.size,
    bronnen: Object.keys(r.bronnen),
    bijgewerkt: beste?.tijd || null,
  };
}
