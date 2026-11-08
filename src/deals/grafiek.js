// Prijsgrafiek per product: één traplijn per winkel (totaalprijs incl.
// verzending), de gangbare prijs (mediaan 90 d, stippel), de laagste prijs
// van 30 dagen (Omnibus) en de beste prijs van nu. Puur: de build tekent er
// de eerste versie mee (werkt zonder JS), de browser tekent opnieuw bij een
// andere periode of als je een winkel uitzet (public/js/deals-grafiek.js).
import { dagReeks, gangbarePrijs, laagste30, mediaan } from './historie.js';

const DAG = 864e5;
export const PERIODES = [
  ['30', '30 dagen', 30],
  ['90', '90 dagen', 90],
  ['365', '1 jaar', 365],
  ['alles', 'Alles', Infinity],
];
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = (n, d = 2) => `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const t = (d) => Date.parse(d + 'T00:00:00Z');

// Verhoging vóór een 'korting': een winkel verhoogt de prijs (≥ 10% boven
// het niveau ervoor), houdt dat ≥ 3 dagen vol en zakt binnen 30 dagen terug
// naar (bijna) het oude niveau. Dan is de 'korting' geen echte korting.
export function verhogingVoorKorting(punten, { stijging = 0.1, minDagen = 3, venster = 30, marge = 0.03 } = {}) {
  const uit = [];
  let i = 7;
  while (i < punten.length) {
    const basis = mediaan(punten.slice(Math.max(0, i - 14), i).map((p) => p.totaal));
    if (punten[i].totaal >= basis * (1 + stijging)) {
      let j = i;
      while (j < punten.length && punten[j].totaal >= basis * (1 + stijging) * 0.98 && t(punten[j].datum) - t(punten[i].datum) <= venster * DAG) j++;
      const duur = j - i;
      if (j < punten.length && duur >= minDagen && punten[j].totaal <= basis * (1 + marge)) {
        uit.push({ start: punten[i].datum, datum: punten[j].datum, verhoogd: Math.max(...punten.slice(i, j).map((p) => p.totaal)), basis: Math.round(basis * 100) / 100, naar: punten[j].totaal });
        i = j + 1;
        continue;
      }
      i = Math.max(j, i + 1);
      continue;
    }
    i++;
  }
  return uit;
}

// Alle reeksen voor de grafiek uit één historie-record
export function grafiekData(record, nu) {
  const vandaag = new Date(nu).toISOString().slice(0, 10);
  const totaal = dagReeks(record);
  const winkels = Object.keys(record.winkels)
    .sort((a, b) => a.localeCompare(b))
    .map((winkel, i) => {
      const punten = dagReeks(record, winkel).map((p) => ({ datum: p.datum, totaal: p.totaal }));
      const o = record.winkels[winkel];
      return {
        winkel,
        kleur: i % 8,
        punten,
        verzending: o.verzendBekend === false ? null : Math.round((o.totaal - o.prijs) * 100) / 100,
        gratisVanaf: o.gratisVerzendingVanaf ?? null,
        nep: verhogingVoorKorting(punten),
      };
    })
    .filter((w) => w.punten.length);
  const huidig = winkels
    .map((w) => ({ winkel: w.winkel, ...w.punten.at(-1) }))
    .filter((p) => p.datum === vandaag || nu - t(p.datum) <= 2 * DAG)
    .sort((a, b) => a.totaal - b.totaal)[0] || null;
  return { vandaag, gangbaar: gangbarePrijs(totaal, nu), laagste30: laagste30(totaal, nu), beste: huidig, winkels, demo: !!record.demo };
}

// Maat en schaal voor een periode (gedeeld met de tooltip in de browser)
export function schaal(data, { dagen = 90, verborgen = [], B = 760, H = 320, L = 60, R = 16, T = 20, O = 34 } = {}) {
  const eind = t(data.vandaag);
  const vroegst = Math.min(...data.winkels.flatMap((w) => w.punten.map((p) => t(p.datum))), eind - DAG);
  const begin = Number.isFinite(dagen) ? Math.max(vroegst, eind - dagen * DAG) : vroegst;
  const zicht = data.winkels.filter((w) => !verborgen.includes(w.winkel));
  const waarden = zicht.flatMap((w) => w.punten.filter((p) => t(p.datum) >= begin).map((p) => p.totaal));
  if (data.gangbaar) waarden.push(data.gangbaar);
  if (data.laagste30) waarden.push(data.laagste30);
  if (!waarden.length) waarden.push(0, 1);
  let min = Math.min(...waarden);
  let max = Math.max(...waarden);
  const m = Math.max(1, (max - min) * 0.1);
  min = Math.max(0, min - m);
  max += m;
  const x = (ms) => L + ((ms - begin) / Math.max(DAG, eind - begin)) * (B - L - R);
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - O);
  return { begin, eind, min, max, x, y, B, H, L, R, T, O, zicht };
}

// Traplijn: de prijs blijft staan tot de volgende meting
export function trapPad(punten, s) {
  const p = punten.filter((q) => t(q.datum) >= s.begin - 40 * DAG);
  if (!p.length) return '';
  let d = '';
  p.forEach((q, i) => {
    const xx = Math.max(s.L, s.x(t(q.datum)));
    const yy = s.y(q.totaal).toFixed(1);
    d += i === 0 ? `M${xx.toFixed(1)} ${yy}` : `H${xx.toFixed(1)}V${yy}`;
  });
  return d + `H${s.x(s.eind).toFixed(1)}`;
}

export function samenvatting(data) {
  const n = data.winkels.length;
  const dagen = new Set(data.winkels.flatMap((w) => w.punten.map((p) => p.datum))).size;
  return `Prijsverloop bij ${n} winkel${n === 1 ? '' : 's'} over ${dagen} dagen, totaalprijs inclusief verzending. ${data.beste ? `Beste prijs nu ${eur(data.beste.totaal)} bij ${data.beste.winkel}. ` : ''}${data.gangbaar ? `Gangbare prijs ${eur(data.gangbaar)}. ` : ''}${data.laagste30 ? `Laagste prijs in 30 dagen ${eur(data.laagste30)}.` : ''}`;
}

// De hele grafiek als SVG-tekst
// smal: voor telefoons (minder breed, dus hoger en grotere letters)
export const MAAT_SMAL = { B: 440, H: 340, L: 52 };
export function grafiekMeerSvg(data, { dagen = 90, verborgen = [], id = 'pg', smal = false } = {}) {
  const s = schaal(data, { dagen, verborgen, ...(smal ? MAAT_SMAL : {}) });
  const raster = Array.from({ length: 5 }, (_, i) => s.min + ((s.max - s.min) * i) / 4)
    .map((v) => `<line class="gr-raster" x1="${s.L}" x2="${s.B - s.R}" y1="${s.y(v).toFixed(1)}" y2="${s.y(v).toFixed(1)}"/><text class="gr-as" x="${s.L - 8}" y="${(s.y(v) + 4).toFixed(1)}" text-anchor="end">${esc(eur(v, 0))}</text>`)
    .join('');
  const labels = [];
  const stap = s.eind - s.begin > 200 * DAG ? 2 : 1;
  for (let d = new Date(s.begin), n = 0; d.getTime() <= s.eind; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDate() === 1 && n++ % stap === 0) labels.push(`<text class="gr-as" x="${s.x(d.getTime()).toFixed(1)}" y="${s.H - 10}" text-anchor="middle">${MAANDEN[d.getUTCMonth()]}</text>`);
  }
  if (s.eind - s.begin <= 45 * DAG) {
    labels.length = 0;
    for (let ms = s.eind; ms >= s.begin; ms -= 7 * DAG) {
      const d = new Date(ms);
      labels.push(`<text class="gr-as" x="${s.x(ms).toFixed(1)}" y="${s.H - 10}" text-anchor="middle">${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}</text>`);
    }
  }
  const lijnen = s.zicht.map((w) => `<path class="pg-lijn pg-kleur-${w.kleur}" d="${trapPad(w.punten, s)}" data-winkel="${esc(w.winkel)}"/>`).join('');
  const nep = s.zicht
    .flatMap((w) => w.nep.filter((n) => t(n.datum) >= s.begin).map((n) => ({ ...n, w })))
    .map(
      (n) => {
        const xx = s.x(t(n.datum));
        const links = xx > s.B * 0.6;
        return `<g class="pg-nep"><line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${s.T}" y2="${s.H - s.O}"/><text x="${(xx + (links ? -4 : 4)).toFixed(1)}" y="${s.T + 12}" text-anchor="${links ? 'end' : 'start'}">${smal ? 'nep-korting' : `nep-korting: eerst duurder (${esc(n.w.winkel)})`}</text></g>`;
      },
    )
    .join('');
  const gl = data.gangbaar
    ? `<line class="gr-gangbaar" x1="${s.L}" x2="${s.B - s.R}" y1="${s.y(data.gangbaar).toFixed(1)}" y2="${s.y(data.gangbaar).toFixed(1)}"/><text class="gr-label gr-label-gangbaar" x="${s.L + 6}" y="${(s.y(data.gangbaar) - 6).toFixed(1)}">gangbaar ${esc(eur(data.gangbaar))}</text>`
    : '';
  const x30 = Math.max(s.L, s.x(s.eind - 30 * DAG));
  const l30 = data.laagste30
    ? `<line class="gr-l30" x1="${x30.toFixed(1)}" x2="${s.x(s.eind).toFixed(1)}" y1="${s.y(data.laagste30).toFixed(1)}" y2="${s.y(data.laagste30).toFixed(1)}"/><text class="gr-label gr-label-l30" x="${(smal ? s.x(s.eind) : x30).toFixed(1)}" y="${(s.y(data.laagste30) + 16).toFixed(1)}"${smal ? ' text-anchor="end"' : ''}>laagste 30 dagen ${esc(eur(data.laagste30))}</text>`
    : '';
  // 'nu'-label boven de stip, of eronder als de gangbare prijs er vlak boven ligt
  const yb = data.beste ? s.y(data.beste.totaal) : 0;
  const onder = data.gangbaar && s.y(data.gangbaar) < yb && yb - s.y(data.gangbaar) < 26;
  const b = data.beste && !verborgen.includes(data.beste.winkel) ? `<circle class="gr-nu" cx="${s.x(s.eind).toFixed(1)}" cy="${yb.toFixed(1)}" r="7"/><text class="gr-label pg-beste" x="${(s.x(s.eind) - 10).toFixed(1)}" y="${(onder ? yb + 22 : yb - 12).toFixed(1)}" text-anchor="end">nu ${esc(eur(data.beste.totaal))}</text>` : '';
  return `<svg class="grafiek pg" viewBox="0 0 ${s.B} ${s.H}" role="img" aria-label="${esc(samenvatting(data))}" data-id="${esc(id)}">${raster}${labels.join('')}${gl}${l30}${nep}${lijnen}${b}<line class="pg-cursor" x1="0" x2="0" y1="${s.T}" y2="${s.H - s.O}" visibility="hidden"/></svg>`;
}

// Tekstalternatief: prijs per week per winkel (voor <details> en de mail)
export function weekTabel(data, { weken = 26 } = {}) {
  const alle = [...new Set(data.winkels.flatMap((w) => w.punten.map((p) => p.datum)))].sort();
  const rijen = [];
  for (let i = alle.length - 1; i >= 0 && rijen.length < weken; i -= 7) {
    const datum = alle[i];
    rijen.push({ datum, prijzen: data.winkels.map((w) => [...w.punten].reverse().find((p) => p.datum <= datum)?.totaal ?? null) });
  }
  return { winkels: data.winkels.map((w) => w.winkel), rijen: rijen.reverse() };
}

// Punt op de grafiek → de prijzen van die dag (laatste meting ≤ datum)
export function prijzenOp(data, datum, verborgen = []) {
  return data.winkels
    .filter((w) => !verborgen.includes(w.winkel))
    .map((w) => {
      const p = [...w.punten].reverse().find((q) => q.datum <= datum);
      return p ? { winkel: w.winkel, kleur: w.kleur, totaal: p.totaal, verzending: w.verzending, gemeten: p.datum } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.totaal - b.totaal);
}
