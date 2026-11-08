// Aanbiedingen gelijk maken: één vorm voor alle bronnen (feeds, API's,
// winkelpagina's, demo). Puur: werkt in de browser en in Node.
//
// Aanbod: { product, titel, categorie, merk, winkel, prijs, verzendkosten,
//   gratisVerzendingVanaf, valuta: 'EUR', url, bron, tijd, vanPrijs,
//   afbeelding, affiliate, demo, totaal, verzendBekend }
// Bedragen in euro's met 2 decimalen. verzendkosten null = onbekend.

export const CATEGORIEEN = [
  ['parfum', 'Parfum'],
  ['beauty', 'Beauty'],
  ['elektronica', 'Elektronica'],
  ['huis', 'Huis'],
  ['speelgoed', 'Speelgoed'],
  ['sport', 'Sport'],
  ['vliegtickets', 'Vliegtickets'],
  ['overig', 'Overig'],
];
const CATEGORIE_WOORDEN = [
  ['parfum', /parfum|eau de|fragrance|geur|cologne|aftershave|\bed[tpc]\b/i],
  ['beauty', /beauty|make-?up|huidverzorging|skincare|cosmetica|haarverzorging|verzorging/i],
  ['speelgoed', /speelgoed|toys?\b|lego|puzzel|bouwset|knuffel/i],
  ['elektronica', /elektronica|electronic|computer|laptop|telefoon|smartphone|audio|\btv\b|televisie|tablet|koptelefoon|oordop|camera|gaming|console/i],
  ['sport', /sport|fiets|fitness|hardloop|outdoor|kamperen/i],
  ['huis', /huis|wonen|keuken|meubel|tuin|huishoud|stofzuig|koffie|beddengoed|verlichting|klussen/i],
  ['vliegtickets', /vlucht|vliegticket|flight/i],
];

export const rond = (n) => Math.round(n * 100) / 100;

// '12,95' / '€ 1.299,00' / '1,299.00' / '12.95 EUR' / 12.95 → 12.95 (of null)
export function bedrag(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? rond(v) : null;
  let s = String(v).replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return null;
  const komma = s.lastIndexOf(',');
  const punt = s.lastIndexOf('.');
  if (komma >= 0 && punt >= 0) {
    // Het laatste teken is het decimaalteken
    s = komma > punt ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (komma >= 0) {
    s = s.replace(/,(?=.*,)/g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, ''); // 1.299.000
  }
  const n = Number(s);
  return Number.isFinite(n) ? rond(n) : null;
}

// GTIN-8/12/13/14 met geldig controlecijfer → vaste vorm (GTIN-12 en GTIN-14
// met voorloopnul worden een EAN-13). Anders null.
export function gtin(v) {
  const s = String(v ?? '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(s.length)) return null;
  const cijfers = [...s].map(Number);
  const controle = cijfers.pop();
  const som = cijfers.reverse().reduce((t, c, i) => t + c * (i % 2 === 0 ? 3 : 1), 0);
  if ((10 - (som % 10)) % 10 !== controle) return null;
  if (s.length === 14) return s.startsWith('0') ? s.slice(1) : s;
  if (s.length === 12) return '0' + s;
  return s;
}

export const slug = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' en ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

// Sleutel van een product: EAN/GTIN als die klopt, anders slug van merk + titel
export function productSleutel({ product, ean, gtin: g, titel, merk } = {}) {
  const code = gtin(ean) || gtin(g) || (/^\d{8,14}$/.test(String(product ?? '')) ? gtin(product) : null);
  if (code) return code;
  if (product && !/^\d+$/.test(String(product))) return slug(product);
  const t = slug(titel);
  const m = slug(merk);
  return m && !t.startsWith(m) ? `${m}-${t}`.slice(0, 80) : t;
}

export function raadCategorie(...teksten) {
  const t = teksten.filter(Boolean).join(' ');
  for (const [k, re] of CATEGORIE_WOORDEN) if (re.test(t)) return k;
  return 'overig';
}

// Verzendkosten na de drempel voor gratis verzending (null = onbekend)
export function verzendkostenVoor(prijs, verzendkosten, gratisVanaf) {
  if (gratisVanaf !== null && gratisVanaf !== undefined && prijs >= gratisVanaf) return 0;
  return verzendkosten === null || verzendkosten === undefined ? null : verzendkosten;
}

// Totaalprijs inclusief verzending. Onbekende verzendkosten tellen als 0,
// maar het aanbod krijgt dan verzendBekend: false (zie dealScore).
export function totaalprijs(a) {
  const v = verzendkostenVoor(a.prijs, a.verzendkosten, a.gratisVerzendingVanaf);
  return rond(a.prijs + (v ?? 0));
}

export const geldigeUrl = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch {
    return null;
  }
};

// Ruw aanbod → genormaliseerd aanbod, of null als het onbruikbaar is.
// opties.koersen: { USD: 0.92 } = euro per eenheid vreemde valuta.
export function normaliseer(ruw, opties = {}) {
  if (!ruw || typeof ruw !== 'object') return null;
  const valuta = String(ruw.valuta || ruw.currency || 'EUR').toUpperCase().trim();
  const koers = valuta === 'EUR' ? 1 : opties.koersen?.[valuta];
  if (!koers) return null; // onbekende valuta: niet raden
  const om = (v) => {
    const b = bedrag(v);
    return b === null ? null : rond(b * koers);
  };
  const prijs = om(ruw.prijs);
  if (prijs === null || prijs <= 0 || prijs > 100000) return null;
  const titel = String(ruw.titel || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const winkel = String(ruw.winkel || '').trim().slice(0, 60);
  if (!titel || !winkel) return null;
  const verzendkosten = om(ruw.verzendkosten);
  const gratis = om(ruw.gratisVerzendingVanaf);
  const vanPrijs = om(ruw.vanPrijs);
  const tijd = new Date(ruw.tijd || opties.nu || Date.now());
  const a = {
    product: productSleutel({ product: ruw.product, ean: ruw.ean, gtin: ruw.gtin, titel, merk: ruw.merk }),
    titel,
    categorie: CATEGORIEEN.some(([k]) => k === ruw.categorie) ? ruw.categorie : raadCategorie(ruw.categorie, titel),
    merk: ruw.merk ? String(ruw.merk).trim().slice(0, 60) : null,
    winkel,
    prijs,
    verzendkosten: verzendkosten !== null && verzendkosten < 0 ? null : verzendkosten,
    gratisVerzendingVanaf: gratis,
    valuta: 'EUR',
    url: geldigeUrl(ruw.url),
    bron: String(ruw.bron || 'onbekend'),
    tijd: isNaN(tijd) ? new Date(opties.nu || Date.now()).toISOString() : tijd.toISOString(),
    vanPrijs: vanPrijs !== null && vanPrijs > prijs ? vanPrijs : null,
    afbeelding: geldigeUrl(ruw.afbeelding),
    affiliate: !!ruw.affiliate,
    demo: !!ruw.demo,
  };
  if (!a.product) return null;
  a.verzendBekend = verzendkostenVoor(a.prijs, a.verzendkosten, a.gratisVerzendingVanaf) !== null;
  a.totaal = totaalprijs(a);
  return a;
}

// Dubbele aanbiedingen (zelfde product, winkel en dag) samenvoegen: de
// nieuwste telt; bij gelijke tijd de laagste totaalprijs, daarna de url (vast).
export function ontdubbel(aanbod) {
  const beste = new Map();
  for (const a of aanbod) {
    if (!a) continue;
    const k = `${a.product}|${a.winkel.toLowerCase()}|${String(a.tijd).slice(0, 10)}`;
    const b = beste.get(k);
    if (!b || beter(a, b)) beste.set(k, a);
  }
  return [...beste.values()];
}
function beter(a, b) {
  const ta = Date.parse(a.tijd);
  const tb = Date.parse(b.tijd);
  if (ta !== tb) return ta > tb;
  if (a.totaal !== b.totaal) return a.totaal < b.totaal;
  return String(a.url) < String(b.url);
}
