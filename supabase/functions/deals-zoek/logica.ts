// Pure hulpfuncties voor de Edge Function deals-zoek (ook getest in Node via
// type stripping: test/deals-live.test.js). Geen geheimen hier.

export type Vraag = { q: string; categorie?: string; vlucht?: { van: string; naar: string; maand?: string } };
export type Aanbieding = { product?: string; titel: string; winkel: string; prijs?: number; verzendkosten?: number | null; totaal: number; url?: string | null; geverifieerd?: string };
export type BronUitslag = { bron: string; status: 'ok' | 'timeout' | 'fout'; ms: number; aanbiedingen: Aanbieding[] };

export const UA = 'DealBuddyBot/1.0 (+https://www.toeslagbuddy.nl/deals/over/)';

// Verzoek controleren: korte zoekterm, geldige luchthavencodes
export function parseVraag(body: unknown): Vraag | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const q = String(b.q ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 80);
  const v = b.vlucht as Record<string, unknown> | undefined;
  const vlucht = v && /^[A-Z]{3}$/.test(String(v.van)) && /^[A-Z]{3}$/.test(String(v.naar)) ? { van: String(v.van), naar: String(v.naar), ...(/^\d{4}-\d{2}$/.test(String(v.maand ?? '')) ? { maand: String(v.maand) } : {}) } : undefined;
  if (!q && !vlucht) return null;
  const categorie = typeof b.categorie === 'string' && /^[a-z]{2,20}$/.test(b.categorie) ? b.categorie : undefined;
  return { q, ...(categorie ? { categorie } : {}), ...(vlucht ? { vlucht } : {}) };
}

export const sseEvent = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

// Eenvoudige teller per sleutel en minuut (per isolate; zie docs voor de DB-variant)
export class Snelheid {
  private tellers = new Map<string, { venster: number; n: number }>();
  private perMinuut: number;
  constructor(perMinuut: number) {
    this.perMinuut = perMinuut;
  }
  mag(sleutel: string, nu = Date.now()): boolean {
    const venster = Math.floor(nu / 60000);
    const t = this.tellers.get(sleutel);
    if (!t || t.venster !== venster) {
      if (this.tellers.size > 5000) this.tellers.clear();
      this.tellers.set(sleutel, { venster, n: 1 });
      return true;
    }
    t.n++;
    return t.n <= this.perMinuut;
  }
}

// Antwoorden 10 minuten bewaren (zelfde vraag = zelfde antwoord)
export class Cache<T> {
  private m = new Map<string, { tot: number; waarde: T }>();
  private ms: number;
  private max: number;
  constructor(ms = 600000, max = 500) {
    this.ms = ms;
    this.max = max;
  }
  pak(k: string, nu = Date.now()): T | undefined {
    const x = this.m.get(k);
    if (!x) return undefined;
    if (x.tot < nu) {
      this.m.delete(k);
      return undefined;
    }
    return x.waarde;
  }
  zet(k: string, waarde: T, nu = Date.now()) {
    if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value as string);
    this.m.set(k, { tot: nu + this.ms, waarde });
  }
}

// Een bron met time-out draaien; fouten worden een status, nooit een crash
export async function metTimeout(bron: string, ms: number, taak: (signal: AbortSignal) => Promise<Aanbieding[]>): Promise<BronUitslag> {
  const start = Date.now();
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tijd = new Promise<'timeout'>((r) => (timer = setTimeout(() => (ctrl.abort(), r('timeout')), ms)));
  try {
    const r = await Promise.race([taak(ctrl.signal), tijd]);
    if (r === 'timeout') return { bron, status: 'timeout', ms: Date.now() - start, aanbiedingen: [] };
    return { bron, status: 'ok', ms: Date.now() - start, aanbiedingen: r };
  } catch {
    return { bron, status: ctrl.signal.aborted ? 'timeout' : 'fout', ms: Date.now() - start, aanbiedingen: [] };
  } finally {
    clearTimeout(timer);
  }
}

const getal = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

// bol.com Marketing Catalog API (zoeken met aanbod); verdedigend gelezen
export function parseBol(json: any): Aanbieding[] {
  const lijst = json?.results ?? json?.products ?? [];
  const uit: Aanbieding[] = [];
  for (const r of lijst) {
    const p = r.product ?? r;
    const o = r.offer ?? p.offer ?? p.offerData?.offers?.[0] ?? {};
    const prijs = getal(o.price ?? o.prijs);
    if (!prijs || !p.title) continue;
    const verzend = o.deliveryCosts !== undefined ? getal(o.deliveryCosts) ?? 0 : prijs >= 25 ? 0 : null;
    uit.push({ product: p.ean || undefined, titel: String(p.title).slice(0, 160), winkel: 'bol', prijs, verzendkosten: verzend, totaal: Math.round((prijs + (verzend ?? 0)) * 100) / 100, url: p.url || r.url || null });
  }
  return uit;
}

export function parseTravelpayouts(json: any): Aanbieding[] {
  if (!json?.data || !Array.isArray(json.data)) return [];
  return json.data
    .filter((v: any) => getal(v.price))
    .slice(0, 10)
    .map((v: any) => ({ titel: `${v.origin} → ${v.destination} ${String(v.departure_at).slice(0, 10)}`, winkel: String(v.airline || 'vlucht'), prijs: getal(v.price)!, verzendkosten: 0, totaal: getal(v.price)!, url: v.link ? `https://www.aviasales.com${v.link}` : null }));
}

// Mini-robots.txt: alleen de regels voor * en DealBuddyBot, langste match wint
export function robotsToegestaan(tekst: string, pad: string): boolean {
  let actief = false;
  let vorigeAgent = false;
  let beste: { l: number; mag: boolean } | null = null;
  for (const ruw of tekst.split(/\r?\n/)) {
    const r = ruw.replace(/#.*/, '').trim();
    const m = r.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const veld = m[1].toLowerCase();
    const w = m[2].trim();
    if (veld === 'user-agent') {
      const past = w === '*' || 'dealbuddybot'.includes(w.toLowerCase());
      actief = vorigeAgent ? actief || past : past;
      vorigeAgent = true;
      continue;
    }
    vorigeAgent = false;
    if (!actief || (veld !== 'allow' && veld !== 'disallow') || !w) continue;
    const re = new RegExp('^' + w.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(pad) && (!beste || w.length > beste.l || (w.length === beste.l && veld === 'allow'))) beste = { l: w.length, mag: veld === 'allow' };
  }
  return beste ? beste.mag : true;
}

// Prijs uit JSON-LD van een productpagina (verificatie van bekende URL's)
export function jsonLdPrijs(html: string): { prijs: number; verzendkosten: number | null } | null {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let j: any;
    try {
      j = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const knopen = [j, ...(Array.isArray(j) ? j : []), ...(j?.['@graph'] ?? [])];
    for (const k of knopen) {
      const types = [].concat(k?.['@type'] ?? []).map((t: string) => String(t).toLowerCase());
      if (!types.includes('product')) continue;
      const o = [].concat(k.offers ?? [])[0] as any;
      const prijs = getal(o?.price ?? o?.lowPrice);
      if (!prijs) continue;
      const rate = [].concat(o?.shippingDetails ?? [])[0] as any;
      const v = rate?.shippingRate?.value;
      return { prijs, verzendkosten: v === undefined ? null : getal(v) ?? 0 };
    }
  }
  return null;
}
