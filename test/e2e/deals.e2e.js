// Browsertests voor DealBuddy (/deals/): filteren, kaarten, productgrafiek,
// prijsalarm → volglijst, vluchtkalender, export/import, jagers, live zoeken
// (met nagebootste SSE) en toegankelijkheid op alle deals-pagina's.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { start, open, axeBron } from './helpers.js';

const DIST = join(import.meta.dirname, '../../dist');
let s;
const fouten = [];
const tekst = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
before(async () => (s = await start()));
after(async () => {
  await s.stop();
  assert.deepEqual(fouten, [], 'geen JavaScript-fouten');
});

async function dealsPaginas() {
  const uit = ['/deals/', '/deals/vluchten/', '/deals/volglijst/', '/deals/jagers/', '/deals/over/'];
  for (const map of ['p', 'bewijs']) for (const d of await readdir(join(DIST, 'deals', map))) uit.push(`/deals/${map}/${d}/`);
  return uit;
}

test('deals: parfum is de start, filteren op categorie en echte korting, teller', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/deals/', fouten);
  const chips = p.locator('.chips .chip');
  assert.equal(await chips.first().innerText(), 'Parfum');
  assert.equal(await chips.first().getAttribute('aria-pressed'), 'true');
  const zichtbaar = p.locator('.deal-kaart:visible');
  const nParfum = await zichtbaar.count();
  assert.ok(nParfum > 0);
  for (const c of await zichtbaar.all()) assert.equal(await c.getAttribute('data-categorie'), 'parfum');
  assert.equal(await p.locator('[data-teller]').innerText(), String(nParfum));
  await p.click('.chip[data-cat=""]');
  const nAlles = await zichtbaar.count();
  assert.ok(nAlles > nParfum);
  await p.click('.chip[data-cat="elektronica"]');
  for (const c of await zichtbaar.all()) assert.equal(await c.getAttribute('data-categorie'), 'elektronica');
  // Schuif: alleen ≥ 20% onder gangbaar
  await p.click('.chip[data-cat=""]');
  await p.locator('#deals-min').fill('20');
  assert.equal(await p.locator('[data-min-uit]').innerText(), '20');
  const na = await zichtbaar.count();
  assert.ok(na < nAlles);
  for (const c of await zichtbaar.all()) assert.ok(Number(await c.getAttribute('data-korting')) >= 20);
  await p.locator('#deals-min').fill('60');
  assert.ok(await p.locator('[data-leeg]').isVisible());
  // Zoeken
  await p.locator('#deals-min').fill('0');
  await p.locator('#deals-zoek').fill('koptelefoon');
  assert.equal(await zichtbaar.count(), 1);
  await ctx.close();
});

test('deals: kaart toont totaal incl. verzending, gangbare prijs, partnerlink en volgen', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/deals/', fouten);
  await p.click('.chip[data-cat=""]');
  const kaart = p.locator('.deal-kaart:visible').first();
  const t = await tekst(kaart);
  assert.match(t, /€ \d+,\d\d (incl\. € \d+,\d\d verzending|incl\. gratis verzending|verzendkosten onbekend|Rechtstreeks|.*indicatie)/);
  assert.match(t, /Gangbare prijs: € \d/);
  const link = kaart.locator('a.deal-knop');
  assert.equal(await link.getAttribute('rel'), 'sponsored nofollow noopener');
  assert.ok((await p.locator('.deal-kaart .partner-label-klein').count()) > 0, 'partnerlink-label');
  assert.ok((await p.locator('.nep-waarschuwing').count()) > 0, 'demo bevat een nep-korting');
  assert.ok(await kaart.locator('svg.spark').count());
  const volg = kaart.locator('.volg-knop');
  await volg.click();
  assert.equal(await volg.getAttribute('aria-pressed'), 'true');
  await p.reload();
  await p.click('.chip[data-cat=""]');
  assert.equal(await p.locator('.deal-kaart:visible').first().locator('.volg-knop').getAttribute('aria-pressed'), 'true', 'blijft gevolgd na herladen');
  await ctx.close();
});

test('product: grafiek per winkel, periode, winkel uitzetten, tooltip; alarm naar volglijst', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
  const p = await open(ctx, s.basis + '/deals/p/eau-de-parfum-bloesem-50-ml/', fouten);
  const lijnen = p.locator('[data-pg-teken] .pg-lijn');
  const n = await lijnen.count();
  assert.ok(n >= 4, `${n} winkels`);
  assert.match(await p.locator('[data-pg-teken] svg').getAttribute('aria-label'), /Prijsverloop bij \d winkels/);
  assert.ok(await p.locator('.gr-gangbaar').count());
  assert.ok(await p.locator('.gr-l30').count());
  assert.ok(await p.locator('.badge-demo').first().isVisible());
  // Periode
  await p.click('[data-periode="30"]');
  assert.equal(await p.locator('[data-periode="30"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await p.locator('[data-periode="90"]').getAttribute('aria-pressed'), 'false');
  await p.click('[data-periode="alles"]');
  // Winkel uitzetten
  await p.locator('.pg-winkel').first().click();
  assert.equal(await lijnen.count(), n - 1);
  assert.equal(await p.locator('.pg-winkel').first().getAttribute('aria-pressed'), 'false');
  await p.locator('.pg-winkel').first().click();
  assert.equal(await lijnen.count(), n);
  // Tooltip met aanraken
  const box = await p.locator('[data-pg-teken] svg').boundingBox();
  await p.touchscreen.tap(box.x + box.width * 0.7, box.y + box.height * 0.5);
  const tip = p.locator('[data-pg-tip]');
  assert.ok(await tip.isVisible());
  assert.match(await tekst(tip), /€ \d+,\d\d/);
  assert.match(await tekst(tip), /verzending/);
  // Tekstalternatief
  await p.click('.pg-tabel summary');
  assert.ok((await p.locator('.pg-tabel tbody tr').count()) > 4);
  // Alarm
  await p.locator('#alarm-korting').fill('30');
  assert.equal(await p.locator('[data-alarm-uit]').innerText(), '30');
  await p.locator('#alarm-max').fill('45,50');
  await p.click('[data-alarm] button[type=submit]');
  assert.match(await p.locator('[data-alarm-status]').innerText(), /Bewaard/);
  await p.goto(s.basis + '/deals/volglijst/');
  const item = p.locator('.volg-item').first();
  await item.waitFor();
  assert.match(await tekst(item), /Bloesem/);
  assert.match(await tekst(item), /≥ 30% onder gangbaar · max\. € 45,50/);
  assert.match(await tekst(item), /Nu: € \d/);
  await ctx.close();
});

test('vluchten: prijskalender, andere route kiezen, route volgen', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/deals/vluchten/', fouten);
  assert.ok((await p.locator('.kalender td.kal-dag').count()) >= 28);
  assert.match(await tekst(p.locator('.vlucht-noot')), /indicatie/);
  await p.waitForFunction(() => document.querySelector('[name=maand]').options.length > 0);
  await p.selectOption('[name=naar]', 'LIS');
  await p.click('[data-vluchten] button[type=submit]');
  assert.match(await tekst(p.locator('.kalender caption')), /Laagste prijs per vertrekdag/);
  assert.match(await tekst(p.locator('[data-vlucht-resultaat] h2').first()), /Amsterdam → Lissabon/);
  assert.match(p.url(), /route=AMS-LIS/);
  assert.ok((await p.locator('.goedkoopst li').count()) === 3);
  await p.click('[data-vlucht-alarm]');
  assert.match(await p.locator('[data-vlucht-status]').innerText(), /Gevolgd/);
  // Route die niet bestaat
  await p.selectOption('[name=van]', 'RTM');
  await p.selectOption('[name=naar]', 'NYC');
  assert.match(await tekst(p.locator('[data-vlucht-resultaat]')), /volgen we \(nog\) niet/);
  await ctx.close();
});

test('volglijst: exporteren en importeren als JSON', async () => {
  const ctx = await s.browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/deals/volglijst/', fouten);
  assert.match(await tekst(p.locator('[data-volglijst]')), /Je volgt nog niets/);
  const bestand = JSON.stringify({ soort: 'dealbuddy-volglijst', regels: [{ type: 'vlucht', waarde: 'AMS-BCN', minKorting: 15 }, { type: 'categorie', waarde: 'parfum', minKorting: 10 }, { type: 'onzin' }] });
  await p.locator('[data-import]').setInputFiles({ name: 'v.json', mimeType: 'application/json', buffer: Buffer.from(bestand) });
  assert.match(await p.locator('[data-volg-status]').innerText(), /2 regel\(s\) geïmporteerd/);
  assert.equal(await p.locator('.volg-item').count(), 2);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]);
  const json = JSON.parse(await readFile(await dl.path(), 'utf8'));
  assert.equal(json.regels.length, 2);
  assert.ok(json.regels.some((r) => r.waarde === 'AMS-BCN'));
  await p.locator('.volg-item').first().locator('[data-weg]').click();
  assert.equal(await p.locator('.volg-item').count(), 1);
  // Kapot bestand
  await p.locator('[data-import]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('geen json') });
  assert.match(await p.locator('[data-volg-status]').innerText(), /kan ik niet lezen/);
  await ctx.close();
});

test('jagers: opdracht in gewone taal, bevestigen en aanpassen, rapport en tijdlijn', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/deals/jagers/', fouten);
  await p.locator('#jager-opdracht').fill('Maison Lumière Bloesem 50 ml onder €70 incl. verzending');
  await p.click('[data-jager-form] button[type=submit]');
  const kaart = p.locator('[data-bevestig]');
  assert.match(await tekst(kaart), /Klopt dit\?/);
  assert.equal(await p.locator('#c-maxTotaal').inputValue(), '70');
  assert.equal(await p.locator('#c-merk').inputValue(), 'Maison Lumière');
  assert.equal(await p.locator('#c-inhoud').inputValue(), '50');
  await p.locator('#c-maxTotaal').fill('90');
  assert.match(await tekst(p.locator('[data-samenvatting]')), /max\. € 90 incl\. verzending/);
  await p.click('[data-criteria] button[type=submit]');
  const jager = p.locator('.jager-kaart').first();
  await jager.waitFor();
  assert.match(await tekst(jager), /agent actief/);
  assert.match(await tekst(jager), /bronnen doorzocht/);
  assert.match(await tekst(jager), /Beste prijs nu: € \d/);
  assert.match(await jager.locator('[data-oordeel]').innerText(), /Nu kopen|Wachten|Nep-korting|Nog te weinig data/);
  // Vlucht via voorbeeld
  await p.click('[data-voorbeeld^="vlucht"]');
  assert.equal(await p.locator('#c-van').inputValue(), 'AMS');
  assert.equal(await p.locator('#c-naar').inputValue(), 'LIS');
  await p.click('[data-criteria] button[type=submit]');
  assert.equal(await p.locator('.jager-kaart').count(), 2);
  // Herladen: jagers draaien opnieuw; tijdlijn bestaat
  await p.reload();
  await p.locator('.jager-kaart').first().waitFor();
  assert.equal(await p.locator('.jager-kaart').count(), 2);
  await p.locator('.jager-kaart').nth(1).locator('details summary').click();
  assert.ok((await p.locator('.jager-kaart').nth(1).locator('.tijdlijn li').count()) >= 1);
  // Pauzeren en verwijderen
  await p.locator('.jager-kaart').first().locator('[data-actie=pauze]').click();
  assert.match(await tekst(p.locator('.jager-kaart').first()), /gepauzeerd/);
  await p.locator('.jager-kaart').first().locator('[data-actie=weg]').click();
  assert.equal(await p.locator('.jager-kaart').count(), 1);
  await ctx.close();
});

test('jagers: "Ik ben er weer" na een vorig bezoek met een ander rapport', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => fouten.push(`jagers: ${e.message}`));
  await p.addInitScript(() => {
    if (sessionStorage.getItem('klaar')) return;
    sessionStorage.setItem('klaar', '1');
    const c = { tekst: 'yogamat', soort: 'product', zoekterm: 'yogamat', merk: null, inhoud: null, variant: null, categorie: 'sport', maxTotaal: null, minKorting: null, inclusiefVerzending: true, vlucht: null, uitsluiten: [] };
    const oud = { tijd: '2026-01-01T10:00:00Z', beste: { titel: 'Yogamat extra dik 8 mm', winkel: 'Oud', totaal: 99, pagina: '/deals/' }, oordeel: { soort: 'wachten', tekst: 'Wachten', reden: '' }, cijfers: { bronnen: 1, prijzen: 1 }, alternatieven: [], trend: { richting: 'stabiel' }, spark: [] };
    localStorage.setItem('dealbuddy-jagers', JSON.stringify([{ id: 'j1', omschrijving: 'yogamat', criteria: c, aangemaakt: '2026-01-01', actief: true, rapporten: [oud] }]));
    localStorage.setItem('dealbuddy-bezoek', JSON.stringify('2026-01-01T10:00:00Z'));
  });
  await p.goto(s.basis + '/deals/jagers/');
  const terug = p.locator('[data-terug]');
  await terug.waitFor();
  assert.match(await tekst(terug), /Ik ben er weer/);
  assert.match(await tekst(terug), /gedaald van € 99,00/);
  await ctx.close();
});

test('live zoeken: index direct, daarna live bronnen samengevoegd, chips en time-out', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce', bypassCSP: true });
  // Supabase-adres in de pagina zetten (de echte site heeft er nog geen)
  await ctx.route('**/deals/', async (route) => {
    const r = await route.fetch();
    const html = (await r.text()).replace(/("supabaseUrl":)"[^"]*"/, '$1"https://test.supabase.co"').replace(/("supabaseAnonKey":)"[^"]*"/, '$1"anon"');
    await route.fulfill({ response: r, body: html });
  });
  let loslaten;
  const wacht = new Promise((r) => (loslaten = r));
  let verzoek = null;
  await ctx.route('https://test.supabase.co/functions/v1/deals-zoek', async (route) => {
    verzoek = JSON.parse(route.request().postData());
    await wacht;
    const ev = (e, d) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' },
      body:
        ev('start', { bronnen: ['bol', 'verificatie', 'Winkel X'] }) +
        ev('bron', { bron: 'bol', status: 'ok', ms: 812, aanbiedingen: [{ titel: 'Over-ear koptelefoon ANC Pro', winkel: 'bol.com', totaal: 99.99, verzendkosten: 0, url: 'https://bol.example/p' }] }) +
        ev('bron', { bron: 'verificatie', status: 'ok', ms: 1210, aanbiedingen: [{ product: '2000000010090', titel: 'Over-ear koptelefoon ANC Pro', winkel: 'ElektroDirect', totaal: 150, geverifieerd: '2026-11-08T13:05:00Z' }] }) +
        ev('bron', { bron: 'Winkel X', status: 'timeout', ms: 2500, aanbiedingen: [] }) +
        ev('klaar', {}),
    });
  });
  const p = await open(ctx, s.basis + '/deals/', fouten);
  await p.locator('#deals-zoek').fill('koptelefoon');
  await p.click('[data-filter] button[type=submit]');
  const lijst = p.locator('[data-live-lijst] .live-regel:not(.skelet)');
  await lijst.first().waitFor();
  // Direct uit de index, terwijl live nog loopt
  assert.match(await tekst(lijst.first()), /uit de index/);
  assert.ok(await p.locator('.live-regel.skelet').count(), 'skeletkaart tijdens het wachten');
  assert.match(await tekst(p.locator('[data-live-chips]')), /onze index ✓/);
  loslaten();
  await p.locator('.live-chip[data-status=timeout]').waitFor();
  assert.equal(verzoek.q, 'koptelefoon');
  const chips = await tekst(p.locator('[data-live-chips]'));
  assert.match(chips, /bol\.com ✓ 0,8 s/);
  assert.match(chips, /winkels nagekeken ✓ 1,2 s/);
  assert.match(chips, /Winkel X ✗ time-out/);
  // Gesorteerd op totaal: bol.com eerst en 'nieuwe laagste prijs' niet (ander product)
  assert.match(await tekst(lijst.first()), /bol\.com/);
  assert.match(await tekst(p.locator('[data-live-lijst]')), /nu geverifieerd \d\d:\d\d/);
  assert.equal(await p.locator('.live-regel.skelet').count(), 0);
  await ctx.close();
});

test('live zoeken zonder Supabase: alleen de index, met uitleg', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/deals/', fouten);
  await p.locator('#deals-zoek').fill('parfum');
  await p.click('[data-filter] button[type=submit]');
  await p.locator('[data-live-lijst] .live-regel').first().waitFor();
  assert.match(await p.locator('[data-live-noot]').innerText(), /staat nog niet aan/);
  await ctx.close();
});

test('alle deals-pagina’s: toegankelijk (axe), niet breder dan het scherm, geen consolefouten', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce', bypassCSP: true, viewport: { width: 360, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => fouten.push(`${p.url()}: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && fouten.push(`${p.url()}: ${m.text()}`));
  const problemen = [];
  for (const pad of await dealsPaginas()) {
    await p.goto(s.basis + pad);
    await p.waitForLoadState('networkidle');
    const breedte = await p.evaluate(() => document.documentElement.scrollWidth);
    if (breedte > 360) problemen.push(`${pad}: ${breedte}px breed`);
    await p.addScriptTag({ content: axeBron });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations);
    for (const v of r.filter((v) => ['serious', 'critical'].includes(v.impact))) problemen.push(`${pad}: ${v.id} – ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`);
  }
  // Ook in donkere modus de hoofdpagina's
  const donker = await s.browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce', bypassCSP: true });
  const d = await donker.newPage();
  for (const pad of ['/deals/', '/deals/p/eau-de-parfum-bloesem-50-ml/', '/deals/vluchten/', '/deals/jagers/']) {
    await d.goto(s.basis + pad);
    await d.addScriptTag({ content: axeBron });
    const r = await d.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations);
    for (const v of r.filter((v) => ['serious', 'critical'].includes(v.impact))) problemen.push(`donker ${pad}: ${v.id} – ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`);
  }
  assert.deepEqual(problemen, []);
  await donker.close();
  await ctx.close();
});

test('deals-data: JSON klopt en bewijspagina’s staan niet in de sitemap', async () => {
  const data = JSON.parse(await readFile(join(DIST, 'deals/data/deals.json'), 'utf8'));
  assert.ok(data.deals.length > 10);
  assert.ok(data.deals.every((d) => d.pagina && Number.isFinite(d.totaal)));
  const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /\/deals\/<\/loc>/);
  assert.ok(!/\/deals\/bewijs\//.test(sitemap));
  const bewijs = await readFile(join(DIST, 'deals/bewijs/eau-de-parfum-bloesem-50-ml/index.html'), 'utf8');
  assert.match(bewijs, /<meta name="robots" content="noindex">/);
});
