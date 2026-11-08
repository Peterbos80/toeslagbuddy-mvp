// Een jacht-opdracht in gewone taal → zoekcriteria. Regels, geen AI:
//   "Dior Sauvage EDT 100 ml onder €70 incl. verzending"
//   "vlucht Amsterdam–Lissabon in mei, max €120"
//   "Lego 42115 minstens 25% onder gangbare prijs"
// Criteria: { tekst, soort, zoekterm, merk, inhoud, variant, categorie,
//   maxTotaal, minKorting, inclusiefVerzending, vlucht, uitsluiten }
import { raadCategorie, bedrag } from './aanbod.js';

export const STEDEN = {
  amsterdam: 'AMS', schiphol: 'AMS', eindhoven: 'EIN', rotterdam: 'RTM', brussel: 'BRU', brussels: 'BRU', dusseldorf: 'DUS', 'düsseldorf': 'DUS',
  lissabon: 'LIS', lisbon: 'LIS', barcelona: 'BCN', 'new york': 'NYC', newyork: 'NYC', rome: 'ROM', londen: 'LON', london: 'LON', istanbul: 'IST',
  alicante: 'ALC', mallorca: 'PMI', palma: 'PMI', malaga: 'AGP', 'málaga': 'AGP', madrid: 'MAD', parijs: 'PAR', athene: 'ATH', berlijn: 'BER',
  praag: 'PRG', kopenhagen: 'CPH', dubai: 'DXB', bangkok: 'BKK', curacao: 'CUR', 'curaçao': 'CUR', porto: 'OPO', faro: 'FAO', nice: 'NCE', milaan: 'MIL', wenen: 'VIE',
};
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MAAND_KORT = { jan: 0, feb: 1, mrt: 2, maa: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, okt: 9, nov: 10, dec: 11 };
export const MERKEN = [
  'Dior', 'Chanel', 'Yves Saint Laurent', 'YSL', 'Hugo Boss', 'Armani', 'Giorgio Armani', 'Lancôme', 'Lancome', 'Paco Rabanne', 'Rabanne', 'Calvin Klein', 'Versace', 'Gucci', 'Prada', 'Tom Ford',
  'Jean Paul Gaultier', 'Carolina Herrera', 'Davidoff', 'Rituals', 'Lego', 'Playmobil', 'Ravensburger', 'Nintendo', 'PlayStation', 'Sony', 'Apple', 'Samsung', 'Philips', 'Bose', 'JBL',
  'Dyson', 'Bosch', 'Siemens', 'Miele', 'De\'Longhi', 'DeLonghi', 'Nespresso', 'Garmin', 'Fitbit', 'Xiaomi', 'Google', 'Lenovo', 'HP', 'Asus', 'Nike', 'Adidas', 'Asics',
  // demo-merken
  'Maison Lumière', 'Atelier Nord', 'Kustlijn', 'Velours & Co', 'Dermaya', 'Sonora', 'Pulsa', 'Visio', 'Leeslicht', 'Schoonhuis', 'Keukenheld', 'Barista Thuis', 'Slaapwel', 'Bouwblok', 'Speelhout', 'Spelvreugd', 'Zachtjes', 'Loopsnel', 'Zenfit',
];
const VARIANTEN = [
  ['edp', /\b(edp|eau de parfum)\b/i],
  ['edt', /\b(edt|eau de toilette)\b/i],
  ['edc', /\b(edc|eau de cologne)\b/i],
  ['parfum', /\b(extrait de parfum|extrait)\b/i],
];
const schoon = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const BEDRAG = String.raw`(?:€\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}|-{1,2}))?(?:\s*(?:euro|eur)\b|\s*€|,-)?`;

// 100 ml / 0,5 l / 250 g / 1 kg / 3 x 50 ml → { waarde, eenheid: 'ml'|'g' }
export function inhoud(tekst) {
  const t = schoon(tekst).replace(/(\d),(\d)/g, '$1.$2');
  const m = t.match(/(?:(\d+)\s*x\s*)?(\d+(?:\.\d+)?)\s*(ml|cl|l|liter|g|gr|gram|kg)\b/);
  if (!m) return null;
  let w = Number(m[2]) * (m[1] ? Number(m[1]) : 1);
  let e = m[3];
  if (e === 'cl') (w *= 10), (e = 'ml');
  else if (e === 'l' || e === 'liter') (w *= 1000), (e = 'ml');
  else if (e === 'kg') (w *= 1000), (e = 'g');
  else if (e === 'gr' || e === 'gram') e = 'g';
  return { waarde: Math.round(w * 10) / 10, eenheid: e };
}

function bedragUit(m) {
  const geheel = m[1].replace(/\./g, '');
  const dec = m[2] && !m[2].startsWith('-') ? m[2].padEnd(2, '0') : '00';
  return bedrag(`${geheel}.${dec}`);
}

// Volgende keer dat maand m (0–11) begint, vanaf nu (deze maand telt mee)
function maandNa(m, nu, jaar) {
  const d = new Date(nu);
  let j = jaar ?? d.getUTCFullYear();
  if (!jaar && m < d.getUTCMonth()) j++;
  return `${j}-${String(m + 1).padStart(2, '0')}`;
}

export function leesOpdracht(invoer, { nu = Date.now() } = {}) {
  const tekst = String(invoer || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  let rest = ` ${tekst} `;
  const weg = (re) => {
    rest = rest.replace(re, ' ');
  };
  const c = { tekst, soort: 'product', zoekterm: '', merk: null, inhoud: null, variant: null, categorie: null, maxTotaal: null, minKorting: null, inclusiefVerzending: true, vlucht: null, uitsluiten: ['tester', 'set'] };
  const laag = schoon(tekst);

  // Korting: "minstens 25% onder de gangbare prijs", "25% korting", "-25%", "25 procent"
  const korting = rest.match(/(?:(?:minstens|minimaal|min\.?|ten minste|tenminste|wel)\s+)?-?\s*(\d{1,2})\s*(?:%|procent)(?:\s*(?:korting|goedkoper|onder(?:\s+de)?(?:\s+gangbare(?:\s+prijs)?|\s+normaal)?|minder))?/i);
  if (korting) {
    c.minKorting = Math.min(95, Number(korting[1]));
    weg(korting[0]);
  }
  // Verzending
  if (/excl(?:\.|usief)?\s+verzend/i.test(rest)) c.inclusiefVerzending = false;
  weg(/\b(?:incl(?:\.|usief)?|excl(?:\.|usief)?|met|zonder)\s+(?:de\s+)?verzend(?:kosten|ing)?\b\.?/gi);
  // Maximale prijs: "onder €70", "max € 120", "tot 70 euro", "voor 70,-", "niet meer dan 70"
  const prijsRe = new RegExp(String.raw`(?:onder(?:\s+de)?|max(?:\.|imaal|imum)?|tot|hooguit|voor|niet meer dan|minder dan|beneden|<=?|≤)\s*` + BEDRAG, 'i');
  let pm = rest.match(prijsRe);
  if (!pm) pm = rest.match(new RegExp(String.raw`(?:€\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}|-{1,2}))?|(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(?:euro|eur)\b|(\d+),-)`, 'i'));
  if (pm) {
    const m = pm[1] !== undefined ? pm : pm[3] !== undefined ? [pm[0], pm[3], pm[4]] : [pm[0], pm[5], undefined];
    const b = bedragUit(m);
    if (b > 0) c.maxTotaal = b;
    weg(pm[0]);
  }
  // Vlucht: "vlucht Amsterdam–Lissabon", "van Amsterdam naar Lissabon", "AMS-LIS"
  const stad = Object.keys(STEDEN).sort((a, b) => b.length - a.length).join('|');
  const vluchtWoord = /\b(vlucht(?:en)?|vliegen|vliegticket(?:s)?|ticket(?:s)?|retour|enkele reis)\b/i.test(tekst);
  const paar =
    laag.match(new RegExp(String.raw`(?:van\s+)?\b(${stad})\b\s*(?:–|—|-|naar|→|>|to)\s*\b(${stad})\b`, 'i')) ||
    tekst.match(/\b([A-Z]{3})\s*(?:–|—|-|→|>|naar)\s*([A-Z]{3})\b/);
  if (paar && (vluchtWoord || /^[A-Z]{3}$/.test(paar[1]))) {
    const code = (x) => STEDEN[schoon(x)] || x.toUpperCase();
    c.soort = 'vlucht';
    c.categorie = 'vliegtickets';
    c.vlucht = { van: code(paar[1]), naar: code(paar[2]), maand: null };
    const mm = laag.match(new RegExp(String.raw`\b(?:in\s+)?(${MAANDEN.join('|')}|${Object.keys(MAAND_KORT).join('|')})\b\.?(?:\s+(20\d\d))?`, 'i'));
    if (mm) {
      const naam = mm[1].toLowerCase();
      const idx = MAANDEN.indexOf(naam) >= 0 ? MAANDEN.indexOf(naam) : MAAND_KORT[naam];
      c.vlucht.maand = maandNa(idx, nu, mm[2] ? Number(mm[2]) : undefined);
    } else if (/volgende maand/i.test(laag)) {
      const d = new Date(nu);
      c.vlucht.maand = maandNa((d.getUTCMonth() + 1) % 12, nu, d.getUTCMonth() === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear());
    }
    c.uitsluiten = [];
    c.zoekterm = `${c.vlucht.van}-${c.vlucht.naar}`;
    return c;
  }
  // Inhoud en variant
  c.inhoud = inhoud(rest);
  if (c.inhoud) weg(/(?:\d+\s*x\s*)?\d+(?:[.,]\d+)?\s*(?:ml|cl|l|liter|g|gr|gram|kg)\b/i);
  const v = VARIANTEN.find(([, re]) => re.test(rest));
  if (v) {
    c.variant = v[0];
    weg(v[1]);
  }
  // Testers/sets alleen als je ze zelf noemt
  if (/\btester\b/i.test(tekst)) c.uitsluiten = c.uitsluiten.filter((x) => x !== 'tester');
  if (/\b(gift ?set|set|cadeauset|geschenkset)\b/i.test(tekst)) c.uitsluiten = c.uitsluiten.filter((x) => x !== 'set');
  // Merk
  const merk = MERKEN.slice().sort((a, b) => b.length - a.length).find((m) => new RegExp(`(^|[^\\p{L}])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu').test(tekst));
  if (merk) c.merk = merk;
  // Vulwoorden weg; wat overblijft is het zoekwoord
  weg(/\b(?:ik zoek|zoek|ik wil|graag|een|de|het|nieuwe?|goedkope?|goedkoop|deal|aanbieding|prijs|gangbare|onder|in|voor|met|en|of|alleen|minstens|minimaal|max)\b/gi);
  weg(/[,.;:!?()]/g);
  c.zoekterm = rest.replace(/\s+/g, ' ').trim();
  c.categorie = raadCategorie(tekst);
  return c;
}

// Korte samenvatting voor de bevestigingskaart
export function criteriaTekst(c) {
  if (c.soort === 'vlucht') {
    return [`Vlucht ${c.vlucht.van} → ${c.vlucht.naar}`, c.vlucht.maand ? `vertrek in ${MAANDEN[+c.vlucht.maand.slice(5) - 1]} ${c.vlucht.maand.slice(0, 4)}` : 'elke maand', c.maxTotaal ? `max. € ${c.maxTotaal}` : null, c.minKorting ? `≥ ${c.minKorting}% onder gangbaar` : null].filter(Boolean).join(' · ');
  }
  return [
    c.zoekterm || '(alles)',
    c.merk ? `merk ${c.merk}` : null,
    c.inhoud ? `${c.inhoud.waarde} ${c.inhoud.eenheid}` : null,
    c.variant ? c.variant.toUpperCase() : null,
    c.maxTotaal ? `max. € ${c.maxTotaal.toLocaleString('nl-NL')} ${c.inclusiefVerzending ? 'incl.' : 'excl.'} verzending` : null,
    c.minKorting ? `≥ ${c.minKorting}% onder gangbaar` : null,
    c.uitsluiten.length ? `zonder ${c.uitsluiten.join('/')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// Past een deal (uit deals.json) bij de criteria? Drempels tellen hier niet:
// die bepalen het oordeel, niet of iets een kandidaat is.
export function pastBij(c, d) {
  if (!d) return false;
  if (c.soort === 'vlucht') return d.soort === 'vlucht' && d.route === `${c.vlucht.van}-${c.vlucht.naar}` && (!c.vlucht.maand || d.maand === c.vlucht.maand);
  if (d.soort === 'vlucht') return false;
  const t = schoon(`${d.titel} ${d.merk || ''}`);
  const woorden = schoon(c.zoekterm).split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  if (!woorden.every((w) => t.includes(w))) return false;
  if (c.merk && !t.includes(schoon(c.merk))) return false;
  if (c.inhoud) {
    const i = inhoud(d.titel);
    if (!i || i.eenheid !== c.inhoud.eenheid || i.waarde !== c.inhoud.waarde) return false;
  }
  if (c.variant) {
    const v = VARIANTEN.find(([k]) => k === c.variant);
    if (v && !v[1].test(d.titel)) return false;
  }
  if (c.uitsluiten.includes('tester') && /\btester\b/i.test(d.titel)) return false;
  if (c.uitsluiten.includes('set') && /\b(gift ?set|set|cadeauset|geschenkset|coffret)\b/i.test(d.titel)) return false;
  return true;
}

export function geldigeCriteria(c) {
  if (!c || !['product', 'vlucht'].includes(c.soort)) return false;
  if (c.soort === 'vlucht') return !!c.vlucht && /^[A-Z]{3}$/.test(c.vlucht.van) && /^[A-Z]{3}$/.test(c.vlucht.naar);
  if (c.maxTotaal !== null && !(c.maxTotaal > 0)) return false;
  if (c.minKorting !== null && !(c.minKorting >= 0 && c.minKorting <= 95)) return false;
  return !!(c.zoekterm || c.merk || (c.categorie && c.categorie !== 'overig'));
}
