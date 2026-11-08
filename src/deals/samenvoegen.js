// Live zoeken: resultaten uit de index direct tonen en live-resultaten
// (Server-Sent Events van de Edge Function deals-zoek) erin samenvoegen.
// Puur: browser en Node (tests).

const norm = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// SSE-lezer: geef stukken tekst (zoals ze binnenkomen) en krijg per bericht
// { event, data } terug. Volgt de WHATWG-regels: 'event:', 'data:' (meerdere
// regels worden met \n samengevoegd), commentaar ':' en een lege regel sluit af.
export function sseLezer(opBericht) {
  let buffer = '';
  let event = '';
  let data = [];
  const regel = (r) => {
    if (r === '') {
      if (data.length) {
        const tekst = data.join('\n');
        let json = null;
        try {
          json = JSON.parse(tekst);
        } catch {
          json = null;
        }
        opBericht({ event: event || 'message', data: json, tekst });
      }
      event = '';
      data = [];
      return;
    }
    if (r.startsWith(':')) return;
    const i = r.indexOf(':');
    const veld = i < 0 ? r : r.slice(0, i);
    let waarde = i < 0 ? '' : r.slice(i + 1);
    if (waarde.startsWith(' ')) waarde = waarde.slice(1);
    if (veld === 'event') event = waarde;
    else if (veld === 'data') data.push(waarde);
  };
  return {
    voeg(stuk) {
      buffer += stuk;
      const regels = buffer.split(/\r\n|\r|\n/);
      buffer = regels.pop();
      for (const r of regels) regel(r);
    },
    einde() {
      if (buffer) regel(buffer);
      buffer = '';
      regel('');
    },
  };
}

// Index doorzoeken: alle woorden moeten in titel/merk/winkel/categorie staan
export function zoekInIndex(deals, q = '', categorie = '') {
  const z = norm(q).split(' ').filter(Boolean);
  return deals.filter((d) => {
    if (categorie && d.categorie !== categorie) return false;
    const t = norm(`${d.titel} ${d.merk || ''} ${d.winkel || ''} ${d.categorie} ${d.route || ''} ${d.naarNaam || ''}`);
    return z.every((w) => t.includes(w));
  });
}

const sleutel = (a) => (a.product ? `${a.product}|${norm(a.winkel)}` : a.url ? `url|${a.url}` : `${norm(a.titel)}|${norm(a.winkel)}`);

// Index-deal → resultaatregel
export const uitIndex = (d) => ({
  sleutel: sleutel({ product: d.id, winkel: d.winkel }),
  product: d.id,
  titel: d.titel,
  winkel: d.winkel,
  totaal: d.totaal,
  verzendkosten: d.verzendkosten ?? null,
  url: d.url || d.pagina,
  pagina: d.pagina,
  bron: 'index',
  laagsteBekend: d.laagste30 ?? null,
  geverifieerd: null,
  nieuwLaagste: false,
  live: false,
  demo: !!d.demo,
});

// Eén SSE-bericht van een bron samenvoegen in de lijst. Live-prijzen zijn
// nieuwer en vervangen die uit de index. 'nieuwLaagste' als de live prijs
// lager is dan alles wat we van dat product wisten.
export function voegLiveSamen(lijst, bericht, nu = Date.now()) {
  const uit = lijst.map((r) => ({ ...r }));
  if (!bericht || bericht.status !== 'ok' || !Array.isArray(bericht.aanbiedingen)) return sorteer(uit);
  const perSleutel = new Map(uit.map((r) => [r.sleutel, r]));
  const laagstePerProduct = new Map();
  for (const r of uit) {
    if (!r.product) continue;
    const l = Math.min(r.totaal, r.laagsteBekend ?? Infinity);
    laagstePerProduct.set(r.product, Math.min(laagstePerProduct.get(r.product) ?? Infinity, l));
  }
  for (const a of bericht.aanbiedingen) {
    const totaal = Number(a.totaal ?? (Number(a.prijs) + Number(a.verzendkosten || 0)));
    if (!Number.isFinite(totaal) || totaal <= 0 || !a.titel || !a.winkel) continue;
    const k = sleutel(a);
    const bekend = a.product ? laagstePerProduct.get(a.product) : undefined;
    const regel = {
      ...(perSleutel.get(k) || { sleutel: k, product: a.product || null, pagina: null, laagsteBekend: null, demo: false }),
      titel: a.titel,
      winkel: a.winkel,
      totaal: Math.round(totaal * 100) / 100,
      verzendkosten: a.verzendkosten ?? null,
      url: a.url || perSleutel.get(k)?.url || null,
      bron: bericht.bron,
      geverifieerd: a.geverifieerd ? new Date(a.geverifieerd === true ? nu : a.geverifieerd).toISOString() : perSleutel.get(k)?.geverifieerd || null,
      nieuwLaagste: bekend !== undefined && bekend !== Infinity && totaal < bekend - 0.005,
      live: true,
    };
    perSleutel.set(k, regel);
  }
  return sorteer([...perSleutel.values()]);
}

// Op totaalprijs incl. verzending; gelijk: geverifieerd eerst, dan winkelnaam
export const sorteer = (lijst) => lijst.sort((a, b) => a.totaal - b.totaal || (b.geverifieerd ? 1 : 0) - (a.geverifieerd ? 1 : 0) || a.winkel.localeCompare(b.winkel));

const BRONNAMEN = { index: 'onze index', travelpayouts: 'vluchten', bol: 'bol.com', verificatie: 'winkels nagekeken' };
export const bronNaam = (b) => BRONNAMEN[b] || b;

// Tekst voor een statuschip: 'bol.com ✓ 0,8 s' / 'winkel X ✗ time-out'
export function chipTekst({ bron, status, ms }) {
  const naam = bronNaam(bron);
  if (status === 'bezig') return `${naam} …`;
  const tijd = Number.isFinite(ms) ? `${(ms / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s` : '';
  if (status === 'ok') return `${naam} ✓ ${tijd}`.trim();
  if (status === 'timeout') return `${naam} ✗ time-out`;
  if (status === 'uit') return `${naam} – niet ingesteld`;
  return `${naam} ✗ fout`;
}
