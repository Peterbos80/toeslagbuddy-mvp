// Producten over winkels heen koppelen. Eerst op EAN/GTIN. Zonder EAN:
// merk + inhoud (bijv. 100 ml) + variant (tester, set, navulling…) + soort
// (EDP/EDT) moeten gelijk zijn, en de titels moeten genoeg lijken.
// Twijfel = niet koppelen (en dus ook geen alarm).
import { gtin, slug } from '../../../src/deals/aanbod.js';

const STOP = new Set(['de', 'het', 'een', 'en', 'met', 'voor', 'van', 'in', 'the', 'for', 'and', 'with', 'ml', 'g', 'gr', 'cl', 'l', 'kg', 'stuks', 'stuk', 'x', 'new', 'nieuw']);
const VARIANTEN = [
  ['tester', /\btester\b/],
  ['set', /\b(gift ?set|geschenkset|cadeauset|set|coffret|duo|trio)\b/],
  ['navulling', /\b(refill|navulling|navul)\b/],
  ['unboxed', /\b(unboxed|zonder doos|no box)\b/],
  ['sample', /\b(sample|proefje|miniatuur|mini|travel ?size)\b/],
];
const SOORTEN = [
  ['edp', /\b(edp|eau de parfum)\b/],
  ['edt', /\b(edt|eau de toilette)\b/],
  ['edc', /\b(edc|eau de cologne)\b/],
  ['parfum', /\b(extrait|parfum)\b/],
];

const schoon = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

// 100ml / 100 ml / 0,1 l / 10 cl / 250 g / 1 kg / 3 x 50 ml
export function inhoud(titel) {
  const t = schoon(titel).replace(/(\d),(\d)/g, '$1.$2');
  const m = t.match(/(?:(\d+)\s*x\s*)?(\d+(?:\.\d+)?)\s*(ml|cl|l|liter|g|gr|gram|kg)\b/);
  if (!m) return null;
  const aantal = m[1] ? Number(m[1]) : 1;
  let w = Number(m[2]);
  let e = m[3];
  if (e === 'cl') (w *= 10), (e = 'ml');
  else if (e === 'l' || e === 'liter') (w *= 1000), (e = 'ml');
  else if (e === 'kg') (w *= 1000), (e = 'g');
  else if (e === 'gr' || e === 'gram') e = 'g';
  return { waarde: Math.round(w * aantal * 10) / 10, eenheid: e };
}

export function kenmerken({ titel, merk, ean }) {
  const t = schoon(titel);
  const m = slug(merk);
  return {
    ean: gtin(ean),
    merk: m || null,
    inhoud: inhoud(titel),
    varianten: VARIANTEN.filter(([, re]) => re.test(t)).map(([k]) => k).sort(),
    soort: (SOORTEN.find(([, re]) => re.test(t)) || [null])[0],
    woorden: new Set(
      [...SOORTEN, ...VARIANTEN]
        .reduce((x, [, re]) => x.replace(new RegExp(re.source, 'g'), ' '), t)
        .replace(/\d+(?:[.,]\d+)?\s*(ml|cl|l|g|gr|kg)\b/g, ' ')
        .split(/[^a-z0-9]+/)
        .filter((w) => w && !STOP.has(w) && !(m && m.split('-').includes(w))),
    ),
  };
}

// 0–1: hoe zeker is het hetzelfde product?
export function gelijkenis(a, b) {
  const ka = a.woorden ? a : kenmerken(a);
  const kb = b.woorden ? b : kenmerken(b);
  if (ka.ean && kb.ean) return ka.ean === kb.ean ? 1 : 0;
  if (ka.merk && kb.merk && ka.merk !== kb.merk) return 0;
  if (ka.inhoud && kb.inhoud && (ka.inhoud.eenheid !== kb.inhoud.eenheid || ka.inhoud.waarde !== kb.inhoud.waarde)) return 0;
  if (!!ka.inhoud !== !!kb.inhoud) return Math.min(0.5, jaccard(ka.woorden, kb.woorden));
  if (ka.varianten.join() !== kb.varianten.join()) return 0;
  if (ka.soort && kb.soort && ka.soort !== kb.soort) return 0;
  const j = jaccard(ka.woorden, kb.woorden);
  // Zonder merk aan beide kanten: minder zeker
  return ka.merk && kb.merk ? j : j * 0.85;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let gedeeld = 0;
  for (const w of a) if (b.has(w)) gedeeld++;
  return gedeeld / (a.size + b.size - gedeeld);
}

// Beste kandidaat boven de drempel; bij twee bijna gelijke kandidaten: geen
export function koppel(aanbod, kandidaten, { drempel = 0.8, marge = 0.05 } = {}) {
  const k = kenmerken(aanbod);
  const scores = kandidaten.map((c) => ({ id: c.id, score: gelijkenis(k, c.kenmerken || kenmerken(c)) })).filter((x) => x.score >= drempel);
  scores.sort((x, y) => y.score - x.score);
  if (!scores.length) return null;
  if (scores[1] && scores[0].score - scores[1].score < marge) return null;
  return scores[0];
}
