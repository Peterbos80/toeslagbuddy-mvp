// Beleefd ophalen voor alle crawlers en connectors:
// - herkenbare User-Agent met contactpagina, robots.txt altijd eerst
// - per host één verzoek tegelijk en minimaal 5 s ertussen (of Crawl-delay)
// - time-outs, opnieuw proberen met oplopende wachttijd bij 5xx/netwerkfout
// - 403 → host geblokkeerd voor deze ronde; 429 → Retry-After respecteren
// - voorwaardelijke verzoeken (ETag / If-Modified-Since) en een budget per ronde
// Geen proxies, geen vermomming, geen captcha's: een blokkade is een blokkade.
import { gunzipSync } from 'node:zlib';
import { parseRobots, magOphalen, groepVoor, USER_AGENT } from './robots.js';

export class Geweigerd extends Error {
  constructor(reden, url) {
    super(`${reden}: ${url}`);
    this.reden = reden; // 'robots' | 'geblokkeerd' | 'budget' | 'fout'
  }
}

export function maakOphaler({
  fetch: f = globalThis.fetch,
  wacht = (ms) => new Promise((r) => setTimeout(r, ms)),
  nu = () => Date.now(),
  minInterval = 5000,
  timeout = 15000,
  pogingen = 3,
  budget = Infinity,
  cache = {}, // url → { etag, gewijzigd }
  log = () => {},
  userAgent = USER_AGENT,
} = {}) {
  const hosts = new Map(); // host → { volgende, rij (promise), robots, status, crawlDelay }
  let verbruikt = 0;

  const host = (h) => {
    if (!hosts.has(h)) hosts.set(h, { volgende: 0, rij: Promise.resolve(), robots: null, status: 'ok', reden: '' });
    return hosts.get(h);
  };

  // Eén verzoek met time-out
  async function verzoek(url, headers) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      return await f(url, { headers: { 'User-Agent': userAgent, Accept: '*/*', ...headers }, signal: ctrl.signal, redirect: 'follow' });
    } finally {
      clearTimeout(t);
    }
  }

  // Wacht op de beurt voor deze host (per host één tegelijk)
  function inRij(h, taak) {
    const st = host(h);
    const volgende = st.rij.then(async () => {
      const wachten = st.volgende - nu();
      if (wachten > 0) await wacht(wachten);
      try {
        return await taak();
      } finally {
        st.volgende = nu() + Math.max(minInterval, (st.crawlDelay || 0) * 1000);
      }
    });
    st.rij = volgende.catch(() => {});
    return volgende;
  }

  async function robots(origin) {
    const h = new URL(origin).host;
    const st = host(h);
    if (st.robots) return st.robots;
    const url = new URL('/robots.txt', origin).href;
    let r;
    try {
      verbruikt++;
      r = await inRij(h, () => verzoek(url, {}));
    } catch {
      st.robots = { groepen: [{ agents: ['*'], regels: [{ allow: false, pad: '/' }], crawlDelay: null }], sitemaps: [] };
      st.status = 'fout';
      st.reden = 'robots.txt niet bereikbaar';
      return st.robots;
    }
    if (r.ok) st.robots = parseRobots(await r.text());
    else if (r.status >= 500 || r.status === 401 || r.status === 403 || r.status === 429) {
      // Niet te lezen of toegang geweigerd: voorzichtig, dan niets ophalen
      st.robots = { groepen: [{ agents: ['*'], regels: [{ allow: false, pad: '/' }], crawlDelay: null }], sitemaps: [] };
      st.status = r.status >= 500 ? 'fout' : 'geblokkeerd';
      st.reden = `robots.txt gaf HTTP ${r.status}`;
    } else st.robots = { groepen: [], sitemaps: [] }; // 404/410: geen regels
    st.crawlDelay = groepVoor(st.robots).crawlDelay;
    if (groepVoor(st.robots).regels.some((x) => !x.allow && x.pad === '/') && !groepVoor(st.robots).regels.some((x) => x.allow) && st.status === 'ok') {
      st.status = 'robots';
      st.reden = 'robots.txt staat bots niet toe';
    }
    return st.robots;
  }

  async function haal(url, { soort = 'tekst', voorwaardelijk = true, headers = {}, robotsNegeren = false } = {}) {
    const u = new URL(url);
    const st = host(u.host);
    if (st.status === 'geblokkeerd') throw new Geweigerd('geblokkeerd', url);
    if (!robotsNegeren) {
      const r = await robots(u.origin);
      if (!magOphalen(r, url)) {
        if (st.status === 'ok') st.status = 'robots';
        throw new Geweigerd('robots', url);
      }
    }
    if (verbruikt >= budget) throw new Geweigerd('budget', url);
    const c = voorwaardelijk ? cache[url] : null;
    const kop = { ...headers, ...(c?.etag ? { 'If-None-Match': c.etag } : {}), ...(c?.gewijzigd ? { 'If-Modified-Since': c.gewijzigd } : {}) };
    for (let poging = 1; ; poging++) {
      verbruikt++;
      let r;
      try {
        r = await inRij(u.host, () => verzoek(url, kop));
      } catch (e) {
        if (poging >= pogingen) {
          st.status = st.status === 'ok' ? 'fout' : st.status;
          st.reden = e.name === 'AbortError' ? 'time-out' : 'netwerkfout';
          throw new Geweigerd('fout', url);
        }
        await wacht(1000 * 2 ** poging);
        continue;
      }
      if (r.status === 304) return { status: 304, ok: true, ongewijzigd: true, url };
      if (r.status === 403 || r.status === 401) {
        st.status = 'geblokkeerd';
        st.reden = `HTTP ${r.status}`;
        throw new Geweigerd('geblokkeerd', url);
      }
      if (r.status === 429) {
        const na = retryAfter(r.headers.get('retry-after'), nu());
        if (na !== null && na <= 60000 && poging < pogingen) {
          log(`429 van ${u.host}, wacht ${Math.round(na / 1000)} s`);
          st.volgende = Math.max(st.volgende, nu() + na);
          continue;
        }
        st.status = 'geblokkeerd';
        st.reden = 'HTTP 429 (te veel verzoeken)';
        throw new Geweigerd('geblokkeerd', url);
      }
      if (r.status >= 500 && poging < pogingen) {
        await wacht(1000 * 2 ** poging);
        continue;
      }
      if (!r.ok) return { status: r.status, ok: false, url };
      const etag = r.headers.get('etag');
      const gewijzigd = r.headers.get('last-modified');
      if (etag || gewijzigd) cache[url] = { ...(etag ? { etag } : {}), ...(gewijzigd ? { gewijzigd } : {}) };
      const uit = { status: r.status, ok: true, url: r.url || url, headers: r.headers };
      if (soort === 'json') uit.json = await r.json();
      else {
        const buf = Buffer.from(await r.arrayBuffer());
        uit.tekst = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString('utf8');
      }
      return uit;
    }
  }

  return {
    haal,
    robots,
    get verbruikt() {
      return verbruikt;
    },
    status: () => Object.fromEntries([...hosts].map(([h, s]) => [h, { status: s.status, reden: s.reden }])),
    cache,
  };
}

// Retry-After: seconden of een HTTP-datum → milliseconden (of null)
export function retryAfter(waarde, nu = Date.now()) {
  if (!waarde) return null;
  if (/^\d+$/.test(waarde.trim())) return Number(waarde) * 1000;
  const t = Date.parse(waarde);
  return Number.isFinite(t) ? Math.max(0, t - nu) : null;
}
