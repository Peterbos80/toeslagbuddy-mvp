// Supabase Edge Function (Deno): live zoeken voor DealBuddy.
// POST { q, categorie?, vlucht?: { van, naar, maand } } → Server-Sent Events:
//   event: start  { bronnen: [...] }
//   event: bron   { bron, status: ok|timeout|fout, ms, aanbiedingen: [...] }  (één per bron, zodra klaar)
//   event: klaar  {}
// Bronnen draaien parallel, elk met een time-out van 2,5 s. Antwoorden blijven
// 10 minuten in de cache. Te veel verzoeken → 429 (de site toont dan de index).
//
// Geheimen (Supabase → Edge Functions → Secrets), nooit naar de browser:
//   TRAVELPAYOUTS_TOKEN   vluchten (gratis Travelpayouts-account)
//   BOL_CLIENT_ID / BOL_CLIENT_SECRET   bol.com partner-API (gratis partnerprogramma)
//   DEALS_SITE_URL        https://www.toeslagbuddy.nl (voor de index en CORS)
// Geen massaal crawlen: alleen API's en het nakijken van bekende product-URL's
// uit onze eigen index (robots.txt, herkenbare User-Agent, korte time-out).
import { parseVraag, sseEvent, Snelheid, Cache, metTimeout, parseBol, parseTravelpayouts, robotsToegestaan, jsonLdPrijs, UA, type Aanbieding, type BronUitslag, type Vraag } from './logica.ts';

const SITE = Deno.env.get('DEALS_SITE_URL') ?? 'https://www.toeslagbuddy.nl';
const TIMEOUT = 2500;
const perIp = new Snelheid(20);
const totaal = new Snelheid(600);
const cache = new Cache<BronUitslag[]>(10 * 60000);
const robotsCache = new Cache<string>(60 * 60000);
const laatstePerHost = new Map<string, number>();
let bolToken: { waarde: string; tot: number } | null = null;

const cors = { 'Access-Control-Allow-Origin': SITE, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, accept', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };

async function bol(v: Vraag, signal: AbortSignal): Promise<Aanbieding[]> {
  const id = Deno.env.get('BOL_CLIENT_ID');
  const geheim = Deno.env.get('BOL_CLIENT_SECRET');
  if (!id || !geheim || !v.q) return [];
  if (!bolToken || bolToken.tot < Date.now()) {
    const r = await fetch('https://login.bol.com/token?grant_type=client_credentials', { method: 'POST', headers: { Authorization: `Basic ${btoa(`${id}:${geheim}`)}`, Accept: 'application/json' }, signal });
    if (!r.ok) throw new Error('bol token');
    const j = await r.json();
    bolToken = { waarde: j.access_token, tot: Date.now() + (j.expires_in - 30) * 1000 };
  }
  const q = new URLSearchParams({ 'search-term': v.q, 'country-code': 'NL', 'page-size': '10', 'include-offer': 'true' });
  const r = await fetch(`https://api.bol.com/marketing/catalog/v1/products/search?${q}`, { headers: { Authorization: `Bearer ${bolToken.waarde}`, Accept: 'application/json', 'Accept-Language': 'nl' }, signal });
  if (!r.ok) throw new Error(`bol ${r.status}`);
  return parseBol(await r.json());
}

async function vluchten(v: Vraag, signal: AbortSignal): Promise<Aanbieding[]> {
  const token = Deno.env.get('TRAVELPAYOUTS_TOKEN');
  if (!token || !v.vlucht) return [];
  const q = new URLSearchParams({ origin: v.vlucht.van, destination: v.vlucht.naar, one_way: 'true', currency: 'eur', sorting: 'price', limit: '30', ...(v.vlucht.maand ? { departure_at: v.vlucht.maand } : {}) });
  const r = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${q}`, { headers: { 'X-Access-Token': token }, signal });
  if (!r.ok) throw new Error(`tp ${r.status}`);
  return parseTravelpayouts(await r.json());
}

// Bekende product-URL's uit onze index opnieuw nakijken (max. 4, één per host)
async function verificatie(v: Vraag, signal: AbortSignal): Promise<Aanbieding[]> {
  if (!v.q) return [];
  const idx = await fetch(`${SITE}/deals/data/deals.json`, { signal }).then((r) => r.json());
  const woorden = v.q.toLowerCase().split(/\s+/).filter(Boolean);
  const kandidaten = (idx.deals ?? [])
    .filter((d: any) => !d.demo && d.soort === 'product' && woorden.every((w: string) => `${d.titel} ${d.merk ?? ''}`.toLowerCase().includes(w)))
    .flatMap((d: any) => (d.winkels ?? []).map((w: any) => ({ ...w, product: d.id, titel: d.titel })))
    .filter((w: any) => w.url);
  const perHost = new Map<string, any>();
  for (const k of kandidaten) {
    const h = new URL(k.url).host;
    if (!perHost.has(h)) perHost.set(h, k);
  }
  const lijst = [...perHost.values()].slice(0, 4);
  const uit = await Promise.all(
    lijst.map(async (k: any): Promise<Aanbieding | null> => {
      const u = new URL(k.url);
      // Per host hooguit één verzoek per 5 s (over alle bezoekers in deze isolate)
      if (Date.now() - (laatstePerHost.get(u.host) ?? 0) < 5000) return null;
      let robots = robotsCache.pak(u.origin);
      if (robots === undefined) {
        const r = await fetch(`${u.origin}/robots.txt`, { headers: { 'User-Agent': UA }, signal }).catch(() => null);
        robots = r && r.ok ? await r.text() : r && r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403 ? '' : 'User-agent: *\nDisallow: /';
        robotsCache.zet(u.origin, robots);
      }
      if (!robotsToegestaan(robots, u.pathname + u.search)) return null;
      laatstePerHost.set(u.host, Date.now());
      const r = await fetch(u.href, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal });
      if (!r.ok) return null;
      const p = jsonLdPrijs(await r.text());
      if (!p) return null;
      const verzend = p.verzendkosten ?? k.verzendkosten ?? null;
      return { product: k.product, titel: k.titel, winkel: k.winkel, prijs: p.prijs, verzendkosten: verzend, totaal: Math.round((p.prijs + (verzend ?? 0)) * 100) / 100, url: k.url, geverifieerd: new Date().toISOString() };
    }),
  );
  return uit.filter((x): x is Aanbieding => !!x);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('alleen POST', { status: 405, headers: cors });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'onbekend';
  if (!perIp.mag(ip) || !totaal.mag('alles')) return new Response(JSON.stringify({ fout: 'te veel verzoeken' }), { status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' } });
  const vraag = parseVraag(await req.json().catch(() => null));
  if (!vraag) return new Response(JSON.stringify({ fout: 'ongeldige vraag' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });

  const bronnen: [string, (v: Vraag, s: AbortSignal) => Promise<Aanbieding[]>][] = [];
  if (vraag.vlucht && Deno.env.get('TRAVELPAYOUTS_TOKEN')) bronnen.push(['travelpayouts', vluchten]);
  if (vraag.q && Deno.env.get('BOL_CLIENT_ID')) bronnen.push(['bol', bol]);
  if (vraag.q) bronnen.push(['verificatie', verificatie]);
  const sleutel = JSON.stringify(vraag);
  const bewaard = cache.pak(sleutel);
  const enc = new TextEncoder();

  const stroom = new ReadableStream({
    async start(ctrl) {
      const stuur = (e: string, d: unknown) => ctrl.enqueue(enc.encode(sseEvent(e, d)));
      stuur('start', { bronnen: bronnen.map(([n]) => n), cache: !!bewaard });
      if (bewaard) {
        for (const u of bewaard) stuur('bron', u);
      } else {
        const uitslagen = await Promise.all(
          bronnen.map(async ([naam, f]) => {
            const u = await metTimeout(naam, TIMEOUT, (s) => f(vraag, s));
            stuur('bron', u);
            return u;
          }),
        );
        if (uitslagen.every((u) => u.status === 'ok')) cache.zet(sleutel, uitslagen);
      }
      stuur('klaar', {});
      ctrl.close();
    },
  });
  return new Response(stroom, { headers: { ...cors, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
});
