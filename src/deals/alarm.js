// Prijsalarmen: regels, matchen tegen actuele deals, bewijs-drempels en
// ontdubbelen van meldingen. Puur: browser (volglijst) en Node (meld.js).
//
// Regel: { id, type: 'product'|'categorie'|'zoekterm'|'vlucht', waarde,
//          minKorting (procent 0–95), maxPrijs?, inclusiefVerzending: true, maand? }
// Deal:  samenvatting uit deals.json (zie src/site/deals-pages.js → dealSamenvatting)

export const TYPES = ['product', 'categorie', 'zoekterm', 'vlucht'];

const woorden = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// Regel controleren en opschonen; ongeldig → null
export function normaliseerRegel(r) {
  if (!r || !TYPES.includes(r.type)) return null;
  const waarde = String(r.waarde ?? '').trim();
  if (!waarde) return null;
  const min = Number(r.minKorting ?? 0);
  const max = r.maxPrijs === null || r.maxPrijs === undefined || r.maxPrijs === '' ? null : Number(r.maxPrijs);
  if (!Number.isFinite(min) || min < 0 || min > 95) return null;
  if (max !== null && (!Number.isFinite(max) || max <= 0)) return null;
  const waardeNorm = r.type === 'vlucht' ? waarde.toUpperCase().replace(/\s*[→>-]\s*/, '-') : r.type === 'categorie' ? waarde.toLowerCase() : waarde;
  if (r.type === 'vlucht' && !/^[A-Z]{3}-[A-Z]{3}$/.test(waardeNorm)) return null;
  return {
    id: String(r.id || `${r.type}:${waardeNorm}`.toLowerCase()),
    type: r.type,
    waarde: waardeNorm,
    minKorting: min,
    maxPrijs: max,
    inclusiefVerzending: r.inclusiefVerzending !== false,
    ...(r.maand && /^\d{4}-\d{2}$/.test(r.maand) ? { maand: r.maand } : {}),
    ...(r.titel ? { titel: String(r.titel).slice(0, 160) } : {}),
  };
}

export function matcht(regel, deal) {
  if (!deal || deal.nep) return false;
  switch (regel.type) {
    case 'product':
      if (deal.id !== regel.waarde && deal.pagina !== regel.waarde) return false;
      break;
    case 'categorie':
      if (deal.categorie !== regel.waarde) return false;
      break;
    case 'zoekterm': {
      const t = new Set(woorden(`${deal.titel} ${deal.merk || ''}`));
      const z = woorden(regel.waarde);
      if (!z.length || !z.every((w) => t.has(w) || [...t].some((x) => x.startsWith(w) && w.length >= 4))) return false;
      break;
    }
    case 'vlucht':
      if (deal.route !== regel.waarde) return false;
      if (regel.maand && deal.maand !== regel.maand) return false;
      break;
    default:
      return false;
  }
  const korting = deal.echteKorting === null || deal.echteKorting === undefined ? null : deal.echteKorting * 100;
  if (regel.minKorting > 0 && (korting === null || korting + 1e-9 < regel.minKorting)) return false;
  const prijs = regel.inclusiefVerzending ? deal.totaal : deal.prijs ?? deal.totaal;
  if (regel.maxPrijs !== null && prijs > regel.maxPrijs) return false;
  return true;
}

// Alle (regel, deal)-paren die matchen
export function zoekMatches(regels, deals) {
  const uit = [];
  for (const ruw of regels) {
    const regel = normaliseerRegel(ruw);
    if (!regel) continue;
    for (const deal of deals) if (matcht(regel, deal)) uit.push({ regel, deal });
  }
  return uit;
}

// Is het bewijs sterk genoeg om iemand te mailen? Alleen echte (niet-demo)
// waarnemingen tellen. Product: ≥ 2 winkels/bronnen én ≥ 30 dagen historie.
// Vlucht: ≥ 2 bronnen of ≥ 14 dagen. Altijd: echte korting ≥ drempel én
// totaal onder de laagste prijs van 30 dagen.
export const STANDAARD_BEWIJS = { minWinkels: 2, minDagen: 30, vluchtMinBronnen: 2, vluchtMinDagen: 14 };

export function bewijsSterk(deal, regel, opties = {}) {
  const o = { ...STANDAARD_BEWIJS, ...opties };
  const redenen = [];
  if (deal.demo && !o.demoToestaan) redenen.push('alleen demo-gegevens');
  if (deal.soort === 'vlucht') {
    if ((deal.bronnen ?? 0) < o.vluchtMinBronnen && (deal.dagen ?? 0) < o.vluchtMinDagen) redenen.push(`te weinig waarnemingen (${deal.bronnen} bron(nen), ${deal.dagen} dagen)`);
  } else {
    const winkels = Math.max(deal.winkelsGezien ?? 0, deal.bronnen ?? 0);
    if (winkels < o.minWinkels) redenen.push(`maar ${winkels} winkel(s) of bron(nen) gezien`);
    if ((deal.dagen ?? 0) < o.minDagen) redenen.push(`maar ${deal.dagen ?? 0} dagen historie`);
  }
  if (deal.gangbaar === null || deal.gangbaar === undefined) redenen.push('geen gangbare prijs');
  const k = (deal.echteKorting ?? -1) * 100;
  if (k + 1e-9 < Math.max(regel?.minKorting ?? 0, o.minKorting ?? 0)) redenen.push(`echte korting ${Math.round(k)}% is te laag`);
  if (!(deal.laagste30 !== null && deal.laagste30 !== undefined && deal.totaal < deal.laagste30)) redenen.push('niet lager dan de laagste prijs van 30 dagen');
  if (deal.verdacht) redenen.push('verdacht lage prijs (mogelijk prijsfout)');
  return { sterk: redenen.length === 0, redenen };
}

// Niet twee keer mailen over hetzelfde product voor dezelfde prijs; wel
// opnieuw als de prijs nog eens ≥ 5% daalt. verzonden: { dealId: { prijs, tijd } }
export function filterMeldingen(matches, verzonden = {}, { daling = 0.05, nu = Date.now() } = {}) {
  const nieuw = new Map();
  for (const m of matches) {
    const vorig = verzonden[m.deal.id];
    if (vorig && !(m.deal.totaal <= vorig.prijs * (1 - daling) + 1e-9)) continue;
    const al = nieuw.get(m.deal.id);
    if (al) al.regels.push(m.regel);
    else nieuw.set(m.deal.id, { deal: m.deal, regels: [m.regel] });
  }
  const bijgewerkt = { ...verzonden };
  const tijd = new Date(nu).toISOString();
  for (const { deal } of nieuw.values()) bijgewerkt[deal.id] = { prijs: deal.totaal, tijd };
  return { nieuw: [...nieuw.values()], verzonden: bijgewerkt };
}

// Status van een regel uit de volglijst tegenover de actuele deals
export function regelStatus(ruw, deals) {
  const regel = normaliseerRegel(ruw);
  if (!regel) return { regel: null, status: 'ongeldig', beste: null };
  const kandidaten = deals.filter((d) => matcht({ ...regel, minKorting: 0, maxPrijs: null }, d));
  const beste = kandidaten.sort((a, b) => (b.echteKorting ?? -1) - (a.echteKorting ?? -1) || a.totaal - b.totaal)[0] || null;
  if (!beste) return { regel, status: 'geen-aanbod', beste: null };
  return { regel, status: matcht(regel, beste) ? 'gehaald' : 'wachten', beste };
}
