// DealBuddy-bronnen en jager: feeds (Daisycon, TradeTracker, Awin), vluchten
// (Travelpayouts), productpagina's (JSON-LD, microdata, OpenGraph), robots.txt,
// beleefd ophalen, platform-adapters, sitemaps, tips, wachtrij, koppelen,
// demo-bron en de verzamel-agent. Geen echt netwerk: alles met fixtures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseXml, zoekAlle } from '../scripts/deals/xml.js';
import { parseCsv } from '../scripts/deals/csv.js';
import { parseRobots, magOphalen, groepVoor } from '../scripts/deals/robots.js';
import { maakOphaler, retryAfter, Geweigerd } from '../scripts/deals/http.js';
import { parseDaisycon, bron as daisycon } from '../scripts/deals/bronnen/daisycon.js';
import { parseTradeTracker } from '../scripts/deals/bronnen/tradetracker.js';
import { parseAwin } from '../scripts/deals/bronnen/awin.js';
import { parseTravelpayouts, bron as travelpayouts } from '../scripts/deals/bronnen/travelpayouts.js';
import { bron as jsonld } from '../scripts/deals/bronnen/jsonld.js';
import { feedLijst } from '../scripts/deals/bronnen/feed-hulp.js';
import { demoAanbod, demoVluchten, demoEan, bron as demo } from '../scripts/deals/bronnen/demo.js';
import { prijsFeiten, uitJsonLd, uitMicrodata, uitMeta } from '../scripts/deals/jager/html.js';
import { herkenPlatform, shopifyProducten, shopifyProductJs, wooProducten, lightspeedProduct } from '../scripts/deals/jager/adapters.js';
import { leesSitemap, ontdek, urlScore } from '../scripts/deals/jager/ontdek.js';
import { verzendBeleid } from '../scripts/deals/jager/verzending.js';
import { leesTips } from '../scripts/deals/jager/tips.js';
import { Wachtrij, prioriteit, shardVan } from '../scripts/deals/jager/wachtrij.js';
import { koppel, gelijkenis, kenmerken } from '../scripts/deals/jager/koppelen.js';
import { jaag, jaagWinkel } from '../scripts/deals/jager/jager.js';
import { verzamel, verwerk } from '../scripts/deals/verzamel.js';
import { normaliseer, gtin } from '../src/deals/aanbod.js';

const FIX = join(import.meta.dirname, 'fixtures/deals');
const fx = (n) => readFileSync(join(FIX, n), 'utf8');
const NU = Date.parse('2026-11-08T12:00:00Z');

// Nep-internet: url → { status, body, headers } (of een functie)
function nepFetch(routes, log = []) {
  return async (url, opties = {}) => {
    log.push({ url, opties });
    let r = routes[url] ?? routes[url.split('?')[0]] ?? { status: 404, body: '' };
    if (typeof r === 'function') r = r(url, opties);
    if (r instanceof Error) throw r;
    const body = typeof r.body === 'string' || Buffer.isBuffer(r.body) ? r.body : JSON.stringify(r.body ?? '');
    return new Response(r.status === 304 ? null : body, { status: r.status ?? 200, headers: r.headers || {} });
  };
}
// Ophaler zonder echte wachttijd, met een klok die meeloopt
function testOphaler(routes, opties = {}) {
  let klok = NU;
  const wachten = [];
  const log = [];
  const o = maakOphaler({ fetch: nepFetch(routes, log), wacht: async (ms) => (wachten.push(ms), (klok += ms)), nu: () => klok, ...opties });
  return { o, wachten, log };
}

// ── parsers ──
test('xml: CDATA, entiteiten, namespaces, attributen, geen DTD', () => {
  const d = parseXml('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><a:root x="1 &amp; 2"><g:item><t><![CDATA[<b>vet</b>]]></t><u>A &amp; B &#233; &euro;</u></g:item><leeg/></a:root>');
  const item = zoekAlle(d, 'item')[0];
  assert.equal(item.kinderen[0].tekst, '<b>vet</b>');
  assert.equal(item.kinderen[1].tekst, 'A & B é €');
  assert.equal(zoekAlle(d, 'root')[0].attr.x, '1 & 2');
  assert.equal(zoekAlle(d, 'leeg').length, 1);
});

test('csv: scheidingsteken raden, aanhalingstekens, lege regels', () => {
  const r = parseCsv('a;b;c\n1;"x;y";"z ""q"""\n\n2;;\n');
  assert.deepEqual(r, [{ a: '1', b: 'x;y', c: 'z "q"' }, { a: '2', b: '', c: '' }]);
  assert.equal(parseCsv('x,y\r\n1,2').length, 1);
  assert.deepEqual(parseCsv(''), []);
});

// ── feeds ──
test('Daisycon XML: programma-naam, verzending, van-prijs, voorraad', () => {
  const a = parseDaisycon(fx('daisycon.xml'), { nu: NU });
  assert.equal(a.length, 2, 'uitverkocht product overgeslagen');
  assert.equal(a[0].winkel, 'Voorbeeld Parfumerie');
  assert.equal(a[0].titel, 'Voorbeeld Eau de Parfum 50 ml & meer');
  assert.equal(a[0].afbeelding, 'https://voorbeeld-parfumerie.example/img/123.jpg');
  const n = normaliseer(a[0], { nu: NU });
  assert.equal(n.product, '4006381333931');
  assert.equal(n.totaal, 53.9);
  assert.equal(n.vanPrijs, 69.95);
  assert.equal(n.affiliate, true);
  assert.equal(n.categorie, 'parfum');
  const geenVerzending = normaliseer(a[1], { nu: NU });
  assert.equal(geenVerzending.verzendBekend, false);
  assert.equal(geenVerzending.prijs, 24.5);
});

test('Daisycon CSV en winkelinfo (gratis verzending vanaf)', () => {
  const a = parseDaisycon(fx('daisycon.csv'), { winkel: 'Elektro', winkelInfo: () => ({ gratisVerzendingVanaf: 50 }) });
  assert.equal(a.length, 1);
  assert.equal(a[0].titel, 'Voorbeeld koptelefoon "Pro" ANC');
  assert.equal(normaliseer(a[0]).totaal, 129);
  assert.equal(a[0].gratisVerzendingVanaf, 50);
});

test('TradeTracker XML: properties, valuta, voorraad', () => {
  const a = parseTradeTracker(fx('tradetracker.xml'), { nu: NU });
  assert.equal(a.length, 1);
  assert.equal(a[0].merk, 'Bouwblok');
  assert.equal(a[0].categorie, 'Speelgoed > Bouwen');
  const n = normaliseer(a[0]);
  assert.equal(n.totaal, 84.94);
  assert.equal(n.vanPrijs, 99.99);
  assert.equal(n.winkel, 'speelgoed.example');
  assert.equal(n.categorie, 'speelgoed');
});

test('Awin CSV: komma als scheiding, GTIN-14, rrp als van-prijs', () => {
  const a = parseAwin(fx('awin.csv'));
  assert.equal(a.length, 2);
  const n = normaliseer(a[0]);
  assert.equal(n.product, '4006381333931', 'GTIN-14 met voorloopnul → EAN-13');
  assert.equal(n.vanPrijs, 119.99);
  assert.equal(n.verzendBekend, false);
  assert.equal(normaliseer(a[1]).totaal, 35.94);
  assert.equal(n.url.startsWith('https://www.awin1.com/'), true);
});

test('feedlijst uit een geheim: komma’s, regels, optionele winkelnaam', () => {
  assert.deepEqual(feedLijst('https://a.example/f.xml,\nWinkel B=https://b.example/f.csv\nonzin'), [
    { naam: null, url: 'https://a.example/f.xml' },
    { naam: 'Winkel B', url: 'https://b.example/f.csv' },
  ]);
  assert.equal(daisycon.actief({}), false);
  assert.equal(daisycon.actief({ DAISYCON_FEED_URLS: 'https://x.example/f' }), true);
});

test('feed-bron: fouten in één feed stoppen de rest niet', async () => {
  const fouten = [];
  const r = await daisycon.haal({ env: { DAISYCON_FEED_URLS: 'https://kapot.example/f,https://goed.example/f' }, fetch: nepFetch({ 'https://kapot.example/f': { status: 500 }, 'https://goed.example/f': { body: fx('daisycon.xml') } }), fouten, nu: NU });
  assert.equal(r.length, 2);
  assert.equal(fouten.length, 1);
});

test('Travelpayouts: token in de kop, niet in de url; prijzen als indicatie met vindtijd', async () => {
  const v = parseTravelpayouts(JSON.parse(fx('travelpayouts.json')), { nu: NU, marker: '12345' });
  assert.equal(v.length, 2, 'AMS→AMS overgeslagen');
  assert.equal(v[0].route, 'AMS-LIS');
  assert.equal(v[0].vertrek, '2027-01-14');
  assert.equal(v[0].stops, 0);
  assert.equal(v[0].bagageInbegrepen, null);
  assert.equal(v[0].tijd, '2026-11-05T10:12:00.000Z');
  assert.match(v[0].url, /marker=12345/);
  assert.equal(v[1].prijs, 112.4);
  const log = [];
  const uit = await travelpayouts.haal({ env: { TRAVELPAYOUTS_TOKEN: 'geheim-token' }, nu: NU, routes: [['AMS', 'LIS']], fetch: nepFetch({ 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates': { body: fx('travelpayouts.json') } }, log) });
  assert.equal(uit.length, 8, '4 maanden × 2');
  assert.ok(log.every((l) => !l.url.includes('geheim-token')));
  assert.equal(log[0].opties.headers['X-Access-Token'], 'geheim-token');
});

// ── productpagina's ──
test('JSON-LD in @graph met verzending; kapotte blokken overslaan', () => {
  const f = uitJsonLd(fx('product-jsonld.html'), 'https://winkel.example/p/vb-50');
  assert.equal(f.length, 1);
  assert.equal(f[0].ean, '4006381333931');
  assert.equal(f[0].merk, 'Voorbeeldmerk');
  assert.equal(f[0].verzendkosten, 3.95);
  assert.equal(f[0].url, 'https://winkel.example/p/vb-50');
  assert.equal(f[0].afbeelding, 'https://winkel.example/img/50.jpg');
  assert.ok(!JSON.stringify(f).includes('Lange tekst'), 'geen beschrijving overnemen');
});

test('microdata en OpenGraph als terugval', () => {
  const m = uitMicrodata(fx('product-microdata.html'), 'https://w.example/k');
  assert.equal(m[0].prijs, '199.00');
  assert.equal(m[0].titel, 'Voorbeeld Koptelefoon ANC');
  assert.equal(m[0].ean, '4006381333931');
  const o = uitMeta(fx('product-og.html'), 'https://w.example/r');
  assert.equal(o[0].prijs, '249,00');
  assert.equal(o[0].titel, 'Robotstofzuiger met dweilfunctie');
  assert.equal(prijsFeiten(fx('product-og.html'), 'https://w.example/r')[0].methode, 'og');
  assert.equal(prijsFeiten('<html>niets</html>', 'https://w.example').length, 0);
});

test('JSON-LD-bron: robots.txt en 5 s per host, fouten overslaan', async () => {
  const { o, wachten } = testOphaler({
    'https://winkel.example/robots.txt': { body: 'User-agent: *\nDisallow: /verboden' },
    'https://winkel.example/p/vb-50': { body: fx('product-jsonld.html') },
    'https://winkel.example/p/stuk': { status: 500 },
  }, { pogingen: 1 });
  const config = JSON.stringify([{ winkel: 'Voorbeeldwinkel', urls: ['https://winkel.example/p/vb-50', 'https://winkel.example/verboden/x', 'https://winkel.example/p/stuk'] }]);
  const r = await jsonld.haal({ env: { JSONLD_WINKELS: config }, ophaler: o, nu: NU, log: () => {} });
  assert.equal(r.length, 1);
  assert.equal(normaliseer(r[0]).totaal, 51.45);
  assert.ok(wachten.every((w) => w >= 4999), `wachttijden ${wachten}`);
});

// ── robots.txt ──
test('robots.txt: eigen groep, langste regel, wildcards, $ en Crawl-delay', () => {
  const r = parseRobots(fx('robots.txt'));
  assert.deepEqual(r.sitemaps, ['https://winkel.example/sitemap_index.xml']);
  assert.equal(magOphalen(r, 'https://winkel.example/privé/x'), false, 'eigen groep');
  assert.equal(magOphalen(r, 'https://winkel.example/checkout'), true, 'eigen groep vervangt *');
  assert.equal(magOphalen(r, 'https://winkel.example/zoeken?q=x'), false);
  assert.equal(magOphalen(r, 'https://winkel.example/zoeken/parfum'), true, 'langere Allow wint');
  assert.equal(magOphalen(r, 'https://winkel.example/p/1'), true);
  assert.equal(magOphalen(r, 'https://winkel.example/x', 'anderebot'), true);
  const ster = parseRobots('User-agent: *\nDisallow: /checkout\nDisallow: /*?sort=\nAllow: /checkout/hulp$\nCrawl-delay: 2');
  assert.equal(magOphalen(ster, 'https://w.example/checkout/hulp'), true);
  assert.equal(magOphalen(ster, 'https://w.example/checkout/hulp/meer'), false);
  assert.equal(magOphalen(ster, 'https://w.example/cat?sort=prijs'), false);
  assert.equal(groepVoor(ster).crawlDelay, 2);
  assert.equal(magOphalen(parseRobots('User-agent: *\nDisallow:'), 'https://w.example/a'), true, 'lege Disallow');
  assert.equal(magOphalen(parseRobots(''), 'https://w.example/a'), true);
});

// ── beleefd ophalen ──
test('ophaler: User-Agent, robots eerst, 5 s per host, Crawl-delay', async () => {
  const { o, wachten, log } = testOphaler({
    'https://a.example/robots.txt': { body: 'User-agent: *\nCrawl-delay: 9' },
    'https://a.example/1': { body: 'een' },
    'https://a.example/2': { body: 'twee' },
    'https://b.example/robots.txt': { status: 404 },
    'https://b.example/1': { body: 'b' },
  });
  assert.equal((await o.haal('https://a.example/1')).tekst, 'een');
  await o.haal('https://a.example/2');
  await o.haal('https://b.example/1');
  assert.match(log[0].opties.headers['User-Agent'], /^DealBuddyBot\/1\.0 \(\+https:\/\/www\.toeslagbuddy\.nl\/deals\/over\/\)$/);
  assert.equal(log[0].url, 'https://a.example/robots.txt');
  assert.ok(wachten.includes(9000), `Crawl-delay 9 s: ${wachten}`);
  assert.equal(o.status()['b.example'].status, 'ok');
});

test('ophaler: 403 = geblokkeerd, 429 met Retry-After, 5xx opnieuw, budget', async () => {
  let n = 0;
  const { o, wachten } = testOphaler({
    'https://x.example/robots.txt': { status: 404 },
    'https://x.example/403': { status: 403 },
    'https://y.example/robots.txt': { status: 404 },
    'https://y.example/429': () => (n++ === 0 ? { status: 429, headers: { 'Retry-After': '20' } } : { body: 'ok' }),
    'https://z.example/robots.txt': { status: 404 },
    'https://z.example/500': () => (n++ < 3 ? { status: 503 } : { body: 'eindelijk' }),
  });
  await assert.rejects(o.haal('https://x.example/403'), (e) => e instanceof Geweigerd && e.reden === 'geblokkeerd');
  await assert.rejects(o.haal('https://x.example/ander'), /geblokkeerd/, 'host blijft geblokkeerd');
  assert.equal((await o.haal('https://y.example/429')).tekst, 'ok');
  assert.ok(wachten.some((w) => w >= 20000), 'Retry-After gerespecteerd');
  assert.equal((await o.haal('https://z.example/500')).tekst, 'eindelijk');
  const klein = testOphaler({ 'https://q.example/robots.txt': { status: 404 }, 'https://q.example/a': { body: 'a' } }, { budget: 2 }).o;
  await klein.haal('https://q.example/a');
  await assert.rejects(klein.haal('https://q.example/a'), (e) => e.reden === 'budget');
  assert.equal(retryAfter('120'), 120000);
  assert.equal(retryAfter('Sun, 08 Nov 2026 12:01:00 GMT', NU), 60000);
});

test('ophaler: robots.txt met 5xx/403 = niets ophalen; 304 = ongewijzigd met ETag', async () => {
  const { o } = testOphaler({ 'https://s.example/robots.txt': { status: 503 }, 'https://s.example/p': { body: 'x' } }, { pogingen: 1 });
  await assert.rejects(o.haal('https://s.example/p'), (e) => e.reden === 'robots');
  const cache = {};
  let keer = 0;
  const t = testOphaler({
    'https://e.example/robots.txt': { status: 404 },
    'https://e.example/p': (u, op) => (keer++ === 0 ? { body: 'v1', headers: { ETag: '"abc"' } } : op.headers['If-None-Match'] === '"abc"' ? { status: 304 } : { body: 'v2' }),
  }, { cache });
  assert.equal((await t.o.haal('https://e.example/p')).tekst, 'v1');
  assert.equal(cache['https://e.example/p'].etag, '"abc"');
  assert.equal((await t.o.haal('https://e.example/p')).ongewijzigd, true);
});

// ── jager: adapters ──
test('platform herkennen', () => {
  assert.equal(herkenPlatform('<script src="https://cdn.shopify.com/x.js">'), 'shopify');
  assert.equal(herkenPlatform('', { 'x-shopid': '1' }), 'shopify');
  assert.equal(herkenPlatform('<link href="/wp-content/plugins/woocommerce/a.css">'), 'woocommerce');
  assert.equal(herkenPlatform('<img src="https://cdn.webshopapp.com/x.jpg">'), 'lightspeed');
  assert.equal(herkenPlatform('<div data-mage-init="{}">'), 'magento');
  assert.equal(herkenPlatform('<html></html>'), 'html');
});

test('Shopify: products.json en product.js (centen), varianten en voorraad', () => {
  const p = shopifyProducten(JSON.parse(fx('shopify-products.json')), 'https://s.example', 'Shop');
  assert.equal(p.length, 2, 'uitverkochte variant overgeslagen');
  assert.equal(p[0].titel, 'Voorbeeld Eau de Parfum 50 ml');
  assert.equal(p[0].url, 'https://s.example/products/voorbeeld-edp?variant=11');
  assert.equal(normaliseer(p[0]).vanPrijs, 69.95);
  assert.equal(p[1].titel, 'Voorbeeld Bodylotion');
  assert.equal(p[1].vanPrijs, null);
  const js = shopifyProductJs({ title: 'X', handle: 'x', vendor: 'V', variants: [{ title: 'Default Title', price: 4995, compare_at_price: 5995, barcode: '4006381333931', available: true }] }, 'https://s.example', 'Shop');
  assert.equal(js[0].prijs, 49.95);
  assert.equal(js[0].vanPrijs, 59.95);
});

test('WooCommerce Store API en Lightspeed ?format=json', () => {
  const w = wooProducten(JSON.parse(fx('woo-products.json')), 'Speel');
  assert.equal(w.length, 1);
  assert.equal(w[0].titel, 'Houten treinbaan & brug');
  assert.equal(w[0].prijs, 34.95);
  assert.equal(w[0].vanPrijs, 39.95);
  assert.equal(w[0].ean, '4006381333931');
  const l = lightspeedProduct(JSON.parse(fx('lightspeed.json')), 'LS', 'https://ls.example/yogamat-extra-dik.html');
  assert.equal(l[0].prijs, 24.95);
  assert.equal(l[0].vanPrijs, 29.95);
  assert.equal(l[0].merk, 'Zenfit');
  assert.equal(l[0].url, 'https://ls.example/yogamat-extra-dik.html');
});

test('verzendbeleid: drempel en kosten uit tekst', () => {
  assert.deepEqual(verzendBeleid('<h1>Verzending</h1><p>Gratis verzending vanaf &euro; 25,- binnen NL. Daaronder zijn de verzendkosten € 3,95.</p>'), { gratisVerzendingVanaf: 25, verzendkosten: 3.95 });
  assert.deepEqual(verzendBeleid('<p>Wij bezorgen gratis thuisbezorgd boven 50 euro; verzendkosten 4,95 euro</p>').gratisVerzendingVanaf, 50);
  assert.deepEqual(verzendBeleid('Bij ons wordt alles altijd gratis verzonden!'), { gratisVerzendingVanaf: 0, verzendkosten: 0 });
  assert.deepEqual(verzendBeleid('Geen informatie'), { gratisVerzendingVanaf: null, verzendkosten: null });
});

// ── jager: ontdekken ──
test('sitemaps: index, .gz, productadressen eerst, robots.txt gerespecteerd', async () => {
  assert.equal(leesSitemap(fx('sitemap-index.xml')).soort, 'index');
  assert.equal(leesSitemap(fx('sitemap-products.xml')).urls.length, 4);
  const { o } = testOphaler({
    'https://winkel.example/robots.txt': { body: fx('robots.txt').replace('sitemap_index.xml', 'sitemap-index.xml') },
    'https://winkel.example/sitemap-index.xml': { body: fx('sitemap-index.xml') },
    'https://winkel.example/sitemap-pages.xml': { body: '<urlset><url><loc>https://winkel.example/over-ons</loc></url></urlset>' },
    'https://winkel.example/sitemap-products.xml.gz': { body: gzipSync(Buffer.from(fx('sitemap-products.xml'))), headers: { 'Content-Type': 'application/x-gzip' } },
  });
  const urls = await ontdek(o, 'https://winkel.example', { trefwoorden: ['parfum'], nu: NU });
  assert.equal(urls[0], 'https://winkel.example/p/eau-de-parfum-bloesem-50-ml', 'trefwoord + recent gewijzigd eerst');
  assert.ok(urls.includes('https://winkel.example/p/koptelefoon-anc'));
  assert.ok(!urls.some((u) => u.includes('/blog/')));
  assert.ok(urlScore('https://w.example/products/x') > urlScore('https://w.example/klantenservice/x'));
});

test('tips uit RSS: titel, prijs, winkellink (niet de feed-site zelf)', () => {
  const t = leesTips(fx('pepper.rss'), { feedHost: 'nl.pepper.com' });
  assert.equal(t.length, 2);
  assert.equal(t[0].prijs, 39.95);
  assert.equal(t[0].winkel, 'Geurwinkel');
  assert.equal(t[0].winkelUrl, 'https://geurwinkel.example/p/2000000010007');
  assert.equal(t[1].winkelUrl, null);
  const atom = leesTips('<feed><entry><title>Koptelefoon € 99</title><link href="https://x.example/a"/></entry></feed>');
  assert.equal(atom[0].link, 'https://x.example/a');
  assert.equal(atom[0].prijs, 99);
});

test('wachtrij: alarm en gevolgd eerst, lange staart later, geen dubbele', () => {
  const q = new Wachtrij();
  q.voegToe({ url: 'staart' }, prioriteit({ laatstBezocht: new Date(NU - 36e5).toISOString(), nu: NU }));
  q.voegToe({ url: 'nieuw' }, prioriteit({ nu: NU }));
  q.voegToe({ url: 'alarm' }, prioriteit({ alarm: true, nu: NU }));
  q.voegToe({ url: 'gevolgd' }, prioriteit({ gevolgd: true, nu: NU }));
  q.voegToe({ url: 'gedaald' }, prioriteit({ recentGedaald: true, nu: NU }));
  assert.equal(q.voegToe({ url: 'alarm' }, 999), false);
  assert.deepEqual([q.pak(), q.pak(), q.pak(), q.pak(), q.pak(), q.pak()].map((x) => x?.url ?? null), ['alarm', 'gevolgd', 'gedaald', 'nieuw', 'staart', null]);
  const shards = new Set(['douglas.nl', 'coolblue.nl', 'bol.com', 'hema.nl', 'action.com', 'ikea.com', 'notino.nl', 'intertoys.nl'].map((d) => shardVan(d, 8)));
  assert.ok(shards.size >= 3, 'winkels verdeeld over shards');
  assert.equal(shardVan('douglas.nl', 8), shardVan('douglas.nl', 8));
});

// ── koppelen ──
test('koppelen: EAN, inhoud, varianten en twijfel', () => {
  const k = (titel, merk, ean) => ({ id: titel, kenmerken: kenmerken({ titel, merk, ean }) });
  const kandidaten = [k('Eau de Parfum Bloesem 50 ml', 'Maison Lumière'), k('Eau de Parfum Bloesem 100 ml', 'Maison Lumière'), k('Eau de Parfum Bloesem 50 ml Tester', 'Maison Lumière'), k('Bloesem giftset 50 ml + bodylotion', 'Maison Lumière')];
  assert.equal(koppel({ titel: 'Maison Lumière Bloesem EDP 50ml', merk: 'Maison Lumière' }, kandidaten)?.id, 'Eau de Parfum Bloesem 50 ml');
  assert.equal(koppel({ titel: 'Bloesem Eau de Parfum 100 ml', merk: 'Maison Lumière' }, kandidaten)?.id, 'Eau de Parfum Bloesem 100 ml');
  assert.equal(koppel({ titel: 'Bloesem eau de toilette 50 ml', merk: 'Maison Lumière' }, kandidaten), null, 'EDT ≠ EDP');
  assert.equal(koppel({ titel: 'Bloesem 50 ml', merk: 'Ander Merk' }, kandidaten), null);
  assert.equal(gelijkenis({ titel: 'x', ean: '4006381333931' }, { titel: 'y', ean: '4006381333931' }), 1);
  assert.equal(gelijkenis({ titel: 'x', ean: '4006381333931' }, { titel: 'x', ean: gtin('036000291452') }), 0);
  // Twee bijna gelijke kandidaten: liever niet koppelen
  assert.equal(koppel({ titel: 'Bloesem parfum' }, [k('Bloesem parfum', null), k('Bloesem parfum', null)]), null);
});

// ── jager: één winkel en meerdere shards ──
test('jager: Shopify-winkel met verzendbeleid en robots-blokkade elders', async () => {
  const routes = {
    'https://shop.example/robots.txt': { body: 'User-agent: *\nDisallow: /checkout' },
    'https://shop.example/': { body: '<script src="https://cdn.shopify.com/s.js"></script>' },
    'https://shop.example/policies/shipping-policy': { body: '<p>Gratis verzending vanaf € 40. Verzendkosten € 4,95.</p>' },
    'https://shop.example/products.json': { body: fx('shopify-products.json') },
    'https://dicht.example/robots.txt': { body: 'User-agent: *\nDisallow: /' },
    'https://boos.example/robots.txt': { status: 404 },
    'https://boos.example/': { status: 403 },
  };
  const { o } = testOphaler(routes);
  const r = await jaagWinkel({ naam: 'Shop', domein: 'shop.example', categorie: 'parfum', platform: 'auto' }, { ophaler: o, nu: NU });
  assert.equal(r.status.platform, 'shopify');
  assert.equal(r.aanbod.length, 2);
  assert.equal(r.aanbod[0].gratisVerzendingVanaf, 40);
  assert.equal(r.aanbod[0].verzendkosten, 4.95);
  assert.equal(normaliseer(r.aanbod[0]).totaal, 49.95, 'boven de drempel: gratis');
  assert.equal(normaliseer(r.aanbod[1]).totaal, 17.45);
  const alle = await jaag({ winkels: [{ naam: 'Dicht', domein: 'dicht.example' }, { naam: 'Boos', domein: 'boos.example' }, { naam: 'Uit', domein: 'uit.example', uitgesloten: 'test' }, { naam: 'Opt', domein: 'opt.example' }], ophaler: testOphaler(routes).o, optout: (u) => u.includes('opt.example'), nu: NU });
  assert.equal(alle.status['dicht.example'].status, 'robots');
  assert.equal(alle.status['boos.example'].status, 'geblokkeerd');
  assert.ok(!('uit.example' in alle.status));
  assert.ok(!('opt.example' in alle.status), 'opt-out van de winkel');
});

test('jager: HTML-winkel via sitemap, gevolgde URL eerst, WooCommerce', async () => {
  const routes = {
    'https://html.example/robots.txt': { body: 'User-agent: *\nAllow: /\nSitemap: https://html.example/sm.xml' },
    'https://html.example/': { body: '<html>gewone winkel</html>' },
    'https://html.example/sm.xml': { body: '<urlset><url><loc>https://html.example/p/a</loc></url></urlset>' },
    'https://html.example/p/a': { body: fx('product-microdata.html') },
    'https://html.example/p/gevolgd': { body: fx('product-jsonld.html') },
    'https://woo.example/robots.txt': { status: 404 },
    'https://woo.example/': { body: '<link rel="stylesheet" href="/wp-content/plugins/woocommerce/x.css">' },
    'https://woo.example/wp-json/wc/store/v1/products': { body: fx('woo-products.json') },
  };
  const { o, log } = testOphaler(routes);
  const r = await jaag({ winkels: [{ naam: 'Html', domein: 'html.example', categorie: 'elektronica' }, { naam: 'Woo', domein: 'woo.example', categorie: 'speelgoed' }], ophaler: o, gevolgdeUrls: ['https://html.example/p/gevolgd'], nu: NU });
  const html = r.aanbod.filter((a) => a.winkel === 'Html');
  assert.equal(html.length, 2);
  const volgorde = log.map((l) => l.url).filter((u) => u.startsWith('https://html.example/p/'));
  assert.equal(volgorde[0], 'https://html.example/p/gevolgd', 'gevolgde URL eerst');
  assert.equal(r.aanbod.filter((a) => a.winkel === 'Woo').length, 1);
  assert.equal(r.status['woo.example'].platform, 'woocommerce');
  assert.ok(r.aanbod.every((a) => a.bron === 'jager'));
});

// ── demo ──
test('demo-bron: verzonnen maar realistisch, herkenbaar, vast per dag', () => {
  assert.equal(gtin(demoEan(1000)), demoEan(1000));
  assert.ok(demoEan(1).startsWith('200'));
  const a = demoAanbod(NU, { terugvullen: () => 180 });
  const b = demoAanbod(NU, { terugvullen: () => 180 });
  assert.deepEqual(a.slice(0, 50), b.slice(0, 50), 'zelfde dag = zelfde prijzen');
  assert.ok(a.every((x) => x.demo && x.bron === 'demo' && /\.example\//.test(x.url)));
  const parfum = a.filter((x) => x.titel.includes('Bloesem'));
  assert.ok(new Set(parfum.map((x) => x.winkel)).size >= 4, '≥ 4 winkels');
  assert.ok(new Set(parfum.map((x) => x.tijd.slice(0, 10))).size >= 180, '≥ 180 dagen');
  assert.ok(a.some((x) => x.vanPrijs), 'ook nep-kortingen');
  const v = demoVluchten(NU, { terugvullen: () => 0 });
  assert.ok(v.length > 500 && v.every((x) => x.demo));
  assert.equal(demo.actief({}, { echteBronnen: 0 }), true);
  assert.equal(demo.actief({}, { echteBronnen: 1 }), false);
  assert.equal(demo.actief({ DEALS_DEMO: 'aan' }, { echteBronnen: 1 }), true);
  assert.equal(demo.actief({ DEALS_DEMO: 'uit' }, { echteBronnen: 0 }), false);
});

// ── verzamel ──
test('verzamel: bronnen aan/uit, historie per product, opt-out, status', async () => {
  const map = mkdtempSync(join(tmpdir(), 'deals-'));
  try {
    writeFileSync(join(map, 'optout.json'), JSON.stringify(['weg.example']));
    const env = { DAISYCON_FEED_URLS: 'https://feed.example/d.xml', DEALS_DEMO: 'uit' };
    const s = await verzamel({ env, nu: NU, map, log: () => {}, fetch: nepFetch({ 'https://feed.example/d.xml': { body: fx('daisycon.xml') } }), extraAanbod: [{ titel: 'Weg', winkel: 'Weg', prijs: 1, url: 'https://weg.example/p' }] });
    assert.equal(s.bronnen.find((b) => b.naam === 'daisycon').status, 'ok');
    assert.equal(s.bronnen.find((b) => b.naam === 'awin').actief, false);
    assert.equal(s.demo, false);
    assert.equal(s.producten, 2);
    assert.ok(existsSync(join(map, 'historie/4006381333931.json')));
    assert.equal(s.weg, 1, 'opt-out overgeslagen');
    // Tweede ronde op een andere dag: historie groeit
    await verzamel({ env, nu: NU + 864e5, map, log: () => {}, fetch: nepFetch({ 'https://feed.example/d.xml': { body: fx('daisycon.xml').replace('49.95', '44.95') } }) });
    const r = JSON.parse(readFileSync(join(map, 'historie/4006381333931.json'), 'utf8'));
    assert.equal(Object.keys(r.dagen).length, 2);
    assert.equal(r.winkels['Voorbeeld Parfumerie'].prijs, 44.95);
    assert.equal(readdirSync(join(map, 'historie')).length, 2);
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});

test('verzamel: jager-invoer met winkelstatus, en koppelen zonder EAN', async () => {
  const map = mkdtempSync(join(tmpdir(), 'deals-'));
  try {
    mkdirSync(join(map, 'invoer'));
    const historie = { producten: new Map(), vluchten: new Map() };
    verwerk([{ titel: 'Eau de Parfum Bloesem 50 ml', merk: 'Maison Lumière', ean: '4006381333931', winkel: 'A', prijs: 50, tijd: new Date(NU).toISOString() }], historie, { nu: NU });
    const t = verwerk([{ titel: 'Maison Lumière Bloesem EDP 50 ml', merk: 'Maison Lumière', winkel: 'B', prijs: 48, tijd: new Date(NU).toISOString() }], historie, { nu: NU });
    assert.equal(t.gekoppeld, 1);
    assert.equal(Object.keys(historie.producten.get('4006381333931').winkels).length, 2);
    writeFileSync(join(map, 'invoer/shard-1.json'), JSON.stringify({ aanbod: [{ titel: 'Yogamat 8 mm', winkel: 'LS', prijs: 24.95, ean: '4006381333931' }], status: { 'ls.example': { status: 'robots' } } }));
    const s = await verzamel({ env: { DEALS_DEMO: 'uit' }, nu: NU, map, invoer: join(map, 'invoer'), log: () => {} });
    assert.equal(s.winkels['ls.example'].status, 'robots');
    assert.ok(s.bronnen.some((b) => b.naam === 'jager' && b.aantal === 1));
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});
