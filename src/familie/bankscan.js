// Bankafschrift lezen (CSV, MT940 of CAMT.053) en terugkerende betalingen
// vinden. Alles gebeurt in de browser: het bestand wordt niet geüpload.
// Uitvoer per transactie: { datum, bedragCent (negatief = af), tegenpartij, omschrijving, rekening }

const schoon = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// CSV-regel splitsen met aanhalingstekens; scheidingsteken , ; of tab
export function csvRijen(tekst) {
  const eerste = tekst.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].sort((a, b) => eerste.split(b).length - eerste.split(a).length)[0];
  const rijen = [];
  let rij = [];
  let veld = '';
  let inQuote = false;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (inQuote) {
      if (c === '"' && tekst[i + 1] === '"') { veld += '"'; i++; }
      else if (c === '"') inQuote = false;
      else veld += c;
    } else if (c === '"') inQuote = true;
    else if (c === sep) { rij.push(veld); veld = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && tekst[i + 1] === '\n') i++;
      rij.push(veld); veld = '';
      if (rij.some((v) => v !== '')) rijen.push(rij);
      rij = [];
    } else veld += c;
  }
  rij.push(veld);
  if (rij.some((v) => v !== '')) rijen.push(rij);
  return rijen;
}

function datumIso(s) {
  const t = schoon(s);
  let m = t.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function bedragCent(s) {
  const t = schoon(s).replace(/[€\s]/g, '');
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const laatste4 = (iban) => {
  const c = schoon(iban).replace(/\s/g, '');
  return c ? `…${c.slice(-4)}` : '';
};

export function leesCsv(tekst) {
  const rijen = csvRijen(tekst.replace(/^\uFEFF/, ''));
  if (rijen.length < 2) return [];
  const kop = rijen[0].map((k) => schoon(k).toLowerCase());
  // Patronen op volgorde van voorkeur: het eerste patroon dat een kolom vindt, wint
  const kolom = (...patronen) => {
    for (const p of patronen) {
      const i = kop.findIndex((k) => p.test(k));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iDatum = kolom(/^datum$/, /transactiondate|boekdatum|^date$/, /datum/);
  const iBedrag = kolom(/^bedrag/, /^amount$|transactiebedrag/, /bedrag/);
  const iAfBij = kolom(/af.?bij|debet.?credit|^d\/c$/);
  const iNaam = kolom(/naam tegenpartij/, /naam \/ omschrijving|^naam$|tegenpartij|counterparty|^name$/);
  const iOms = kolom(/mededelingen|omschrijving-1|^omschrijving$|description|^memo$/, /^(?!naam).*omschrijving/);
  const iRek = kolom(/^iban\/bban$|^rekening$|accountnumber|rekeningnummer/);
  if (iDatum < 0 || iBedrag < 0) return [];
  const uit = [];
  for (const r of rijen.slice(1)) {
    const datum = datumIso(r[iDatum]);
    let cent = bedragCent(r[iBedrag]);
    if (!datum || cent === null) continue;
    if (iAfBij >= 0 && /^(af|d|debet|debit)$/i.test(schoon(r[iAfBij]))) cent = -Math.abs(cent);
    const oms = iOms >= 0 ? schoon(r[iOms]) : '';
    let naam = iNaam >= 0 ? schoon(r[iNaam]) : '';
    // ABN AMRO zet alles in de omschrijving: "…/NAME/Ziggo BV/REMI/…" of "Naam: Ziggo"
    if (!naam) naam = schoon((oms.match(/\/NAME\/([^/]+)/i) || oms.match(/Naam:\s*(.+?)(?:\s{2,}|Omschrijving:|IBAN:|Kenmerk:|$)/i) || [])[1] || oms.split(/[,/]/)[0]);
    uit.push({ datum, bedragCent: cent, tegenpartij: naam.slice(0, 80), omschrijving: oms.slice(0, 200), rekening: iRek >= 0 ? laatste4(r[iRek]) : '' });
  }
  return uit;
}

export function leesMt940(tekst) {
  const uit = [];
  const blokken = tekst.split(/\r?\n(?=:61:)/).slice(1);
  for (const blok of blokken) {
    const m = blok.match(/^:61:(\d{2})(\d{2})(\d{2})(?:\d{4})?(R?[CD])[A-Z]?(\d+,\d{0,2})/);
    if (!m) continue;
    const cent = Math.round(Number(m[5].replace(',', '.')) * 100) * (m[4].endsWith('D') ? -1 : 1);
    const info = schoon((blok.match(/:86:([\s\S]*?)(?=\r?\n:\d{2}[A-Z]?:|\r?\n-|$)/) || [])[1] || '');
    const naam = schoon((info.match(/\/NAME\/([^/]+)/i) || info.match(/NAAM:\s*(.+?)(?:\s{2,}|OMSCHRIJVING:|$)/i) || [])[1] || info.split('/')[0]);
    uit.push({ datum: `20${m[1]}-${m[2]}-${m[3]}`, bedragCent: cent, tegenpartij: naam.slice(0, 80), omschrijving: info.slice(0, 200), rekening: '' });
  }
  return uit;
}

export function leesCamt(xml) {
  const uit = [];
  const tag = (s, t) => schoon((s.match(new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '');
  for (const m of xml.matchAll(/<Ntry>([\s\S]*?)<\/Ntry>/g)) {
    const e = m[1];
    const cent = Math.round(Number(tag(e, 'Amt')) * 100) * (tag(e, 'CdtDbtInd') === 'DBIT' ? -1 : 1);
    const datum = datumIso(tag(tag(e, 'BookgDt') ? e.match(/<BookgDt>([\s\S]*?)<\/BookgDt>/)[1] : e, 'Dt'));
    const partij = cent < 0 ? e.match(/<Cdtr>([\s\S]*?)<\/Cdtr>/) : e.match(/<Dbtr>([\s\S]*?)<\/Dbtr>/);
    const naam = partij ? tag(partij[1], 'Nm') : '';
    if (!datum || !Number.isFinite(cent)) continue;
    uit.push({ datum, bedragCent: cent, tegenpartij: naam.slice(0, 80), omschrijving: tag(e, 'Ustrd').slice(0, 200), rekening: '' });
  }
  return uit;
}

// Herkent het formaat aan de inhoud
export function leesAfschrift(tekst) {
  const t = String(tekst || '');
  if (/<Document[\s>][\s\S]*<BkToCstmrStmt>/.test(t) || /<Ntry>/.test(t)) return { formaat: 'camt', transacties: leesCamt(t) };
  if (/^:20:|\n:61:/m.test(t)) return { formaat: 'mt940', transacties: leesMt940(t) };
  return { formaat: 'csv', transacties: leesCsv(t) };
}

// Naam van een tegenpartij gelijktrekken: "ZIGGO SERVICES BV" → "ziggo services"
export function sleutelVan(naam) {
  return schoon(naam)
    .toLowerCase()
    .replace(/\b(b\.?v\.?|n\.?v\.?|via |inz\.? |hr |mw |stichting|ideal|sepa|incasso|betaling|nederland)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DAG = 864e5;
const mediaan = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// Terugkerende afschrijvingen: zelfde tegenpartij, vast ritme
export function terugkerend(transacties) {
  const groepen = new Map();
  for (const t of transacties.filter((t) => t.bedragCent < 0 && t.tegenpartij)) {
    const k = sleutelVan(t.tegenpartij);
    if (!k) continue;
    if (!groepen.has(k)) groepen.set(k, []);
    groepen.get(k).push(t);
  }
  const uit = [];
  for (const [sleutel, lijst] of groepen) {
    lijst.sort((a, b) => a.datum.localeCompare(b.datum));
    if (lijst.length < 2) continue;
    const tussen = lijst.slice(1).map((t, i) => (Date.parse(t.datum) - Date.parse(lijst[i].datum)) / DAG);
    const med = mediaan(tussen);
    let ritme = null;
    if (lijst.length >= 3 && med >= 26 && med <= 35) ritme = 'maand';
    else if (lijst.length >= 3 && med >= 6 && med <= 8) ritme = 'week';
    else if (lijst.length >= 2 && med >= 85 && med <= 96) ritme = 'kwartaal';
    else if (lijst.length >= 2 && med >= 350 && med <= 380) ritme = 'jaar';
    if (!ritme) continue;
    const bedragen = lijst.map((t) => -t.bedragCent);
    const perKeer = Math.round(mediaan(bedragen));
    const perMaand = Math.round(ritme === 'maand' ? perKeer : ritme === 'week' ? (perKeer * 52) / 12 : ritme === 'kwartaal' ? perKeer / 3 : perKeer / 12);
    uit.push({ sleutel, tegenpartij: lijst[lijst.length - 1].tegenpartij, ritme, aantal: lijst.length, perKeerCent: perKeer, perMaandCent: perMaand, vast: Math.max(...bedragen) - Math.min(...bedragen) <= perKeer * 0.1, laatste: lijst[lijst.length - 1].datum });
  }
  return uit.sort((a, b) => b.perMaandCent - a.perMaandCent);
}

// Zoekt de organisatie bij een tegenpartij (lijst uit data/familie/organisaties.json)
export function koppelOrganisatie(tegenpartij, organisaties) {
  const k = ` ${sleutelVan(tegenpartij)} `;
  let beste = null;
  for (const o of organisaties) {
    for (const h of o.herken || [o.naam]) {
      const p = ` ${sleutelVan(h)} `;
      if (p.trim() && k.includes(p) && (!beste || p.length > beste.lengte)) beste = { organisatie: o, lengte: p.length };
    }
  }
  return beste ? beste.organisatie : null;
}

// Voorstel voor contracten uit een afschrift
export function voorstel(transacties, organisaties) {
  return terugkerend(transacties).map((t) => {
    const o = koppelOrganisatie(t.tegenpartij, organisaties);
    return { ...t, organisatieId: o?.id || null, naam: o?.naam || t.tegenpartij, soort: o?.soort || 'overig', herkend: !!o };
  });
}
