// Productpagina's vinden via robots.txt → sitemap(s) (ook sitemap-index en
// .gz), met voorrang voor productachtige adressen en categorie-woorden.
import { parseXml, zoekAlle, tekstVan } from '../xml.js';

export function leesSitemap(xml) {
  const doc = parseXml(xml);
  const index = zoekAlle(doc, 'sitemapindex').length > 0;
  const knopen = zoekAlle(doc, index ? 'sitemap' : 'url');
  return { soort: index ? 'index' : 'urlset', urls: knopen.map((k) => ({ loc: tekstVan(k, 'loc'), lastmod: tekstVan(k, 'lastmod') || null })).filter((u) => /^https?:\/\//.test(u.loc)) };
}

const PRODUCT = /\/(p|product|products|artikel|item|produkt|pd)\/|\/p\d+|-p-\d+|\.html$|\/[a-z0-9-]+-\d{5,}\/?$/i;
const GEEN = /\/(blog|nieuws|news|klantenservice|service|faq|vacature|winkels|stores|account|cart|winkelwagen|checkout|login|search|zoeken)\b/i;

// Score: hoger = eerder bezoeken
export function urlScore(u, { trefwoorden = [], lastmod = null, nu = Date.now() } = {}) {
  let s = 0;
  if (PRODUCT.test(u)) s += 5;
  if (GEEN.test(u)) s -= 10;
  const l = u.toLowerCase();
  for (const w of trefwoorden) if (w && l.includes(w.toLowerCase())) s += 3;
  if (lastmod) {
    const dagen = (nu - Date.parse(lastmod)) / 864e5;
    if (dagen >= 0 && dagen < 7) s += 2;
  }
  return s;
}

// Alle product-URL's van een winkel, beste eerst. Volgt sitemap-indexen tot
// `maxSitemaps` bestanden; haalt niets op wat robots.txt verbiedt (ophaler).
export async function ontdek(ophaler, origin, { trefwoorden = [], maxSitemaps = 6, maxUrls = 500, nu = Date.now() } = {}) {
  const robots = await ophaler.robots(origin);
  const rij = robots.sitemaps.length ? [...robots.sitemaps] : [new URL('/sitemap.xml', origin).href];
  const gezien = new Set();
  const urls = [];
  let n = 0;
  while (rij.length && n < maxSitemaps) {
    // Productsitemaps eerst
    rij.sort((a, b) => Number(/product/i.test(b)) - Number(/product/i.test(a)));
    const sm = rij.shift();
    if (gezien.has(sm)) continue;
    gezien.add(sm);
    n++;
    try {
      const r = await ophaler.haal(sm, { voorwaardelijk: false });
      if (!r.ok || !r.tekst) continue;
      const { soort, urls: lijst } = leesSitemap(r.tekst);
      if (soort === 'index') rij.push(...lijst.map((u) => u.loc));
      else for (const u of lijst) urls.push({ url: u.loc, score: urlScore(u.loc, { trefwoorden, lastmod: u.lastmod, nu }) });
    } catch {
      /* robots/blokkade/fout: volgende sitemap */
    }
  }
  return urls
    .filter((u) => u.score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, maxUrls)
    .map((u) => u.url);
}
