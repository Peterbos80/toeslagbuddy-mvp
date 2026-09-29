// Rainy-day-tests (spec §6): foutpaden moeten werken of netjes falen.
//   npm run build && npm run test:e2e
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { start, axeBron } from './helpers.js';

const DIST = join(import.meta.dirname, '../../dist');
// Toont de Pro-app de meldingen van het privacyfilter al? (koppeling in pro-app.js)
const proAppMetFilter = /leesCsvVeilig|importMeldingen/.test(readFileSync(join(DIST, 'js/pro-app.js'), 'utf8'));
const NOG_NIET_GEKOPPELD = 'pro-app.js gebruikt leesCsvVeilig/importMeldingen nog niet (koppeling door de Pro-app)';

let s;
const fouten = [];
const tekst = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
before(async () => (s = await start()));
after(async () => s.stop());

// Opent een pagina en verzamelt fouten. 'verwacht' filtert netwerkmeldingen
// die bij het scenario horen (zoals een 404 of een afgebroken verzoek).
async function open(ctx, url, { verwacht = null } = {}) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fouten.push(`${url}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (verwacht && verwacht.test(m.text())) return;
    fouten.push(`${url}: ${m.text()}`);
  });
  await page.goto(url);
  return page;
}

test('R1: geen internet bij versturen: melding, invoer blijft staan, opnieuw proberen kan', async () => {
  // bypassCSP: het nep-Supabase-adres staat niet in de CSP van de build
  const ctx = await s.browser.newContext({ bypassCSP: true });
  // Alles buiten deze server en elke POST mislukt, alsof de verbinding wegvalt
  await ctx.route('**/*', (r) => {
    const req = r.request();
    const u = new URL(req.url());
    if (u.hostname !== 'localhost' || req.method() !== 'GET') return r.abort('internetdisconnected');
    return r.continue();
  });
  // Doen alsof het formulier is ingesteld, zodat het echt probeert te versturen.
  // (Zonder ingestelde verzendroute toont het formulier ook een melding; ook dan moet de invoer blijven staan.)
  await ctx.route(`${s.basis}/contact/`, async (r) => {
    const res = await r.fetch();
    const html = (await res.text()).replace(/(<script type="application\/json" id="tb-config">)(.*?)(<\/script>)/, (_, a, json, b) => {
      const c = JSON.parse(json);
      Object.assign(c, { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'anon-test' });
      return a + JSON.stringify(c) + b;
    });
    await r.fulfill({ response: res, body: html });
  });
  const p = await open(ctx, s.basis + '/contact/', { verwacht: /Failed to load resource|ERR_INTERNET_DISCONNECTED/ });
  const f = p.locator('form[data-formulier=contact]');
  await f.locator('[name=naam]').fill('Jan');
  await f.locator('[name=email]').fill('jan@example.nl');
  await f.locator('[name=bericht]').fill('Mijn vraag over huurtoeslag');
  await p.waitForTimeout(3500); // minimale invultijd tegen robots
  await f.locator('button[type=submit]').click();
  await p.waitForFunction(() => {
    const st = document.querySelector('form[data-formulier=contact] .formulier-status');
    return st && st.textContent.trim() && !/bezig/i.test(st.textContent);
  });
  const melding = await tekst(f.locator('.formulier-status'));
  assert.ok(melding.length > 10, melding);
  assert.doesNotMatch(melding, /bedankt/i);
  assert.equal(await f.locator('[name=naam]').inputValue(), 'Jan');
  assert.equal(await f.locator('[name=email]').inputValue(), 'jan@example.nl');
  assert.equal(await f.locator('[name=bericht]').inputValue(), 'Mijn vraag over huurtoeslag');
  assert.equal(await f.locator('button[type=submit]').isDisabled(), false, 'opnieuw proberen kan');
  await ctx.close();
});

test('R2: opslag geblokkeerd: rekenen werkt, toeslagbewaker meldt dat opslaan niet kan', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  await ctx.addInitScript(() => {
    for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
      Storage.prototype[m] = function () {
        throw new DOMException('Opslag geblokkeerd', 'SecurityError');
      };
    }
  });
  const z = await open(ctx, s.basis + '/zorgtoeslag-berekenen/');
  await z.locator('[name=inkomen]').fill('20000');
  await z.locator('button[type=submit]').click();
  assert.match(await tekst(z.locator('[data-result]')), /€ 129 per maand/);
  const p = await open(ctx, s.basis + '/zzp-toeslagen/');
  assert.match(await tekst(p.locator('[data-opslag-uit]')), /Opslaan is niet mogelijk/);
  const f = p.locator('form[data-calc=zzp]');
  await f.locator('[name=winstTotNu]').fill('20.000');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=opgegevenInkomen]').fill('25.000');
  await f.locator('[data-volgende]').click();
  await f.locator('button[type=submit]').click();
  assert.match(await tekst(p.locator('[data-result]')), /Verwacht toetsingsinkomen/);
  await p.waitForTimeout(100);
  assert.equal(await p.locator('[data-bewaar]').count(), 0, 'geen bewaarknop als bewaren niet kan');
  await ctx.close();
});

// De demo toont het plakveld niet; vul het via de pagina en klik op 'Controleer lijst'
async function plakLijst(p, csv) {
  await p.evaluate((t) => {
    document.querySelector('#pro-uitkomst').innerHTML = '';
    document.querySelector('#pro-invoer').value = t;
    document.querySelector('#pro-controleer').click();
  }, csv);
}

const BSN_CSV = 'clientnr;bsn;Naam cliënt;geboortedatum;inkomen;huurt;kale_huur\nC-1;111222333;Jan Jansen;01-02-1970;9000;ja;560\n123456782;;;;9000;ja;560';

test('R3: CSV met BSN- en naamkolom: geen BSN of naam in de pagina of de export', async () => {
  const ctx = await s.browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/pro/check/');
  await plakLijst(p, BSN_CSV);
  await p.waitForSelector('article.client, .tegels');
  await p.uncheck('#pro-filter');
  const zichtbaar = await tekst(p.locator('#pro-uitkomst'));
  for (const geheim of ['111222333', '123456782', 'Jan Jansen', '1970']) assert.ok(!zichtbaar.includes(geheim), `${geheim} staat in de pagina`);
  assert.match(zichtbaar, /C-1/);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#pro-export')]);
  const csv = readFileSync(await dl.path(), 'utf8');
  assert.ok(!/111222333|123456782|Jansen/.test(csv), 'geen BSN of naam in de export');
  // De rekenmotor in de browser geeft dezelfde veilige uitkomst
  const r = await p.evaluate(async (csvTekst) => {
    const v = document.querySelector('script[src*="site.js"]').src.split('?')[1];
    const m = await import(`/js/pro.js?${v}`);
    const uit = m.leesCsvVeilig(csvTekst);
    return { ...uit, meldingen: m.importMeldingen(uit) };
  }, BSN_CSV);
  assert.deepEqual(r.verwijderdeKolommen, ['bsn', 'Naam cliënt', 'geboortedatum']);
  assert.equal(r.geweigerd.length, 1);
  assert.equal(r.meldingen.length, 2);
  await ctx.close();
});

test('R3: de Pro-app toont een melding over weggelaten kolommen en BSN', { skip: !proAppMetFilter && NOG_NIET_GEKOPPELD }, async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/pro/check/');
  await plakLijst(p, BSN_CSV);
  await p.waitForSelector('#pro-uitkomst article.client, #pro-uitkomst .tegels');
  const pagina = await tekst(p.locator('main'));
  assert.match(pagina, /weggelaten/);
  assert.match(pagina, /op een BSN lijkt/);
  await ctx.close();
});

test('R4/R26: te groot, te veel regels of een xlsx-bestand wordt geweigerd', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/pro/check/');
  const kop = 'clientnr;inkomen;huurt;kale_huur\n';
  const gevallen = [
    ['groot.csv', Buffer.from(kop + 'C1;9000;ja;560;' + 'x'.repeat(6 * 1024 * 1024)), /groter dan 5 MB/],
    ['lang.csv', Buffer.from(kop + Array(10001).fill('C;9000;ja;560').join('\n')), /10\.001 regels/],
    ['lijst.xlsx', Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 6, 0]), Buffer.alloc(2000, 0)]), /Sla op als CSV/],
  ];
  for (const [naam, inhoud, melding] of gevallen) {
    await plakLijst(p, inhoud.toString('utf8'));
    await p.waitForSelector('#pro-uitkomst .melding, #pro-uitkomst [role=alert], #pro-uitkomst .let-op');
    assert.equal(await p.locator('#pro-uitkomst article.client').count(), 0, `${naam}: geen uitkomst`);
    if (proAppMetFilter) assert.match(await tekst(p.locator('#pro-uitkomst')), melding, naam);
    // De rekenmotor zelf weigert altijd, ook zonder koppeling in de app
    const fout = await p.evaluate(async (tekstInhoud) => {
      const v = document.querySelector('script[src*="site.js"]').src.split('?')[1];
      return (await import(`/js/pro.js?${v}`)).leesCsvVeilig(tekstInhoud).fout;
    }, inhoud.toString('utf8'));
    assert.match(fout, melding, naam);
  }
  await ctx.close();
});

test('R7: negatief of absurd inkomen en leeftijd 200 geven een melding in gewone taal', async () => {
  // bypassCSP: alleen om axe in de pagina te kunnen laden
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/');
  const inkomen = p.locator('form[data-calc] [name=inkomen]');
  await inkomen.fill('1e12');
  await p.locator('form[data-calc] button[type=submit]').click();
  const uit = p.locator('[data-result]');
  assert.match(await tekst(uit), /Controleer je invoer/);
  assert.match(await tekst(uit), /Het inkomen is te hoog/);
  assert.equal(await p.locator('[data-result] .resultaat').count(), 0, 'geen uitkomst bij foute invoer');
  assert.equal(await inkomen.getAttribute('aria-invalid'), 'true');
  const beschrijving = await inkomen.getAttribute('aria-describedby');
  assert.match(await tekst(p.locator(`#${beschrijving.split(' ').pop()}`)), /te hoog/);
  assert.equal(await p.evaluate(() => document.activeElement.name), 'inkomen', 'focus op het foute veld');
  assert.equal(await uit.getAttribute('aria-live'), 'polite');
  // Toegankelijk, ook met de foutmelding
  await p.addScriptTag({ content: axeBron });
  const problemen = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
  assert.deepEqual(problemen, []);
  await inkomen.fill('-500');
  await p.waitForTimeout(400);
  assert.match(await tekst(uit), /kan niet negatief zijn/);
  await inkomen.fill('veel geld');
  await p.waitForTimeout(400);
  assert.match(await tekst(uit), /geen getal/);
  // Verbeterd: de uitkomst komt vanzelf terug en de fout verdwijnt
  await inkomen.fill('20000');
  await p.waitForTimeout(400);
  assert.match(await tekst(uit), /€ 129 per maand/);
  assert.equal(await inkomen.getAttribute('aria-invalid'), null);
  assert.equal(await p.locator('.veld-fout').count(), 0);

  // Stappenplan: leeftijd 200 houdt je bij stap 1
  const h = await open(ctx, s.basis + '/');
  const f = h.locator('form[data-calc=alles]');
  await f.locator('[name=leeftijd]').fill('200');
  await f.locator('[data-volgende]').click();
  assert.equal(await tekst(f.locator('.voortgang-tekst')), 'Stap 1 van 4');
  assert.match(await tekst(f.locator('.veld-fout')), /De leeftijd is te hoog/);
  await f.locator('[name=leeftijd]').fill('30');
  await f.locator('[data-volgende]').click();
  assert.equal(await tekst(f.locator('.voortgang-tekst')), 'Stap 2 van 4');
  // Huur van een ton per maand
  await f.locator('[name=inkomen]').fill('22000');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=kaleHuur]').fill('100000');
  await f.locator('[data-volgende]').click();
  assert.match(await tekst(f.locator('.veld-fout')), /huur per maand is te hoog/);

  // Kinderopvang: onmogelijk aantal uren
  const k = await open(ctx, s.basis + '/kinderopvangtoeslag-berekenen/');
  await k.locator('[name=inkomen]').fill('50000');
  await k.locator('[name=uren]').fill('900');
  await k.locator('[name=uurprijs]').fill('10');
  await k.locator('button[type=submit]').click();
  assert.match(await tekst(k.locator('[data-result]')), /uren opvang per maand is te hoog/);
  await ctx.close();
});

for (const [naam, antwoord] of [
  ['404', { status: 404, contentType: 'text/html', body: 'Niet gevonden' }],
  ['ongeldige JSON', { status: 200, contentType: 'application/json', body: '{kapot' }],
  ['null', { status: 200, contentType: 'application/json', body: 'null' }],
  ['lijst', { status: 200, contentType: 'application/json', body: '["buddy"]' }],
]) {
  test(`R8: video-manifest (${naam}) → getekende persona, zonder fouten`, async () => {
    const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
    await ctx.route('**/video/manifest.json', (r) => r.fulfill(antwoord));
    // Een 404 meldt de browser zelf in de console; dat is verwacht
    const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/', { verwacht: /Failed to load resource: the server responded with a status of 404/ });
    await p.locator('[name=inkomen]').fill('20000');
    await p.locator('button[type=submit]').click();
    await p.waitForSelector('[data-uitleg] .speler');
    assert.equal(await p.locator('.speler-video').count(), 0);
    assert.equal(await p.locator('[data-uitleg] .speler').getAttribute('data-persona'), 'buddy');
    await ctx.close();
  });
}

// Stemmen nabootsen: speechSynthesis.getVoices() geeft deze lijst
const metStemmen = (stemmen) => (ctx) =>
  ctx.addInitScript((lijst) => {
    Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => lijst });
    Object.defineProperty(window.speechSynthesis, 'speak', { value: (u) => setTimeout(() => u.onend && u.onend(), 10) });
  }, stemmen);

test('R9: alleen netwerkstemmen: voorleesknop verborgen, persona met alleen ondertitels', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  await metStemmen([{ name: 'Google Nederlands', lang: 'nl-NL', localService: false, voiceURI: 'Google Nederlands', default: true }])(ctx);
  const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/');
  await p.waitForTimeout(200);
  assert.equal(await p.locator('.voorlees').isHidden(), true);
  await p.locator('[name=inkomen]').fill('20000');
  await p.locator('button[type=submit]').click();
  await p.waitForSelector('[data-uitleg] .speler');
  assert.equal(await p.locator('[data-uitleg] [data-geluid]').count(), 0, 'geen geluidsknop');
  await p.click('[data-uitleg] [data-start]', { force: true });
  assert.match(await tekst(p.locator('[data-uitleg] .speler-teller')), /^1\//);
  assert.match((await p.locator('[data-uitleg] .speler-tekstversie').textContent()).replace(/\s+/g, ' '), /€ 129 per maand/);
  await ctx.close();
});

test('R9: met een lokale Nederlandse stem: voorleesknop en geluid zichtbaar', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  await metStemmen([
    { name: 'Google Nederlands', lang: 'nl-NL', localService: false, voiceURI: 'g', default: true },
    { name: 'Xander', lang: 'nl-NL', localService: true, voiceURI: 'x', default: false },
  ])(ctx);
  const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/');
  await p.waitForSelector('.voorlees:not([hidden])');
  await p.locator('[name=inkomen]').fill('20000');
  await p.locator('button[type=submit]').click();
  await p.waitForSelector('[data-uitleg] [data-geluid]');
  await ctx.close();
});

test('R17: zonder JavaScript: uitleg leesbaar, rekenhulp vraagt om JavaScript', async () => {
  const ctx = await s.browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  for (const pad of ['/', '/zorgtoeslag-berekenen/', '/zzp-toeslagen/']) {
    await p.goto(s.basis + pad);
    assert.ok(await p.locator('.rekenkaart .geen-js').isVisible(), pad);
    assert.match(await tekst(p.locator('.rekenkaart .geen-js')), /Zet JavaScript aan/, pad);
  }
  await p.goto(s.basis + '/toeslagpartner/');
  assert.ok(await p.locator('h1').isVisible());
  assert.equal(await p.locator('.geen-js').count(), 0);
  await p.goto(s.basis + '/pro/app/');
  assert.ok(await p.locator('.geen-js').isVisible());
  await ctx.close();
});

test('Pro-pagina’s: CSP-meta, geen scripts van derden, geen CSP-overtredingen', async () => {
  const ctx = await s.browser.newContext();
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  for (const pad of ['/pro/', '/pro/check/', '/pro/aanmelden/', '/pro/inloggen/', '/pro/app/', '/pro/voorwaarden/', '/pro/beveiliging/']) {
    const p = await open(ctx, s.basis + pad);
    const beleid = await p.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    assert.match(beleid, /script-src 'self';/, pad);
    const bronnen = await p.$$eval('script[src]', (els) => els.map((e) => e.src));
    for (const b of bronnen) assert.ok(b.startsWith(s.basis + '/'), `${pad}: extern script ${b}`);
    if (pad === '/pro/check/') await p.click('#pro-voorbeeld');
    assert.deepEqual(await p.evaluate(() => window.__csp), [], pad);
    await p.close();
  }
  // Ook op gewone pagina’s geen overtredingen bij rekenen (inline stijlen, balken)
  const h = await open(ctx, s.basis + '/');
  const f = h.locator('form[data-calc=alles]');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=inkomen]').fill('22000');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=kaleHuur]').fill('650');
  await f.locator('[data-volgende]').click();
  await f.locator('button[type=submit]').click();
  await h.waitForSelector('.balken');
  assert.deepEqual(await h.evaluate(() => window.__csp), []);
  await ctx.close();
});

test('framebuster: Pro-pagina in een frame van een andere site wordt verborgen of breekt uit', async () => {
  // Een 'aanvaller' op een andere origin (ander adres en andere poort)
  const aanval = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>Aanvaller</title><iframe src="${s.basis}/pro/app/" width="800" height="600"></iframe>`);
  });
  await new Promise((r) => aanval.listen(0, '127.0.0.1', r));
  const ctx = await s.browser.newContext();
  const p = await ctx.newPage();
  const paginafouten = [];
  p.on('pageerror', (e) => paginafouten.push(e.message));
  await p.goto(`http://127.0.0.1:${aanval.address().port}/`);
  await p.waitForTimeout(1000);
  const frame = p.frames().find((fr) => fr.url().startsWith(s.basis));
  const uitgebroken = p.url().startsWith(s.basis);
  const verborgen = frame ? await frame.evaluate(() => getComputedStyle(document.documentElement).display === 'none').catch(() => false) : false;
  assert.ok(uitgebroken || verborgen, `uitgebroken of verborgen (frame: ${frame?.url()})`);
  assert.deepEqual(paginafouten, []);
  aanval.close();
  // Zelfde site in een frame: breekt uit naar de echte pagina (CSP even uit om het frame te kunnen maken)
  const ctx2 = await s.browser.newContext({ bypassCSP: true });
  const q = await ctx2.newPage();
  await q.goto(s.basis + '/privacy/');
  await q.evaluate(() => document.body.append(Object.assign(document.createElement('iframe'), { src: '/pro/inloggen/' })));
  await q.waitForURL(`${s.basis}/pro/inloggen/`);
  // Niet in een frame: de pagina is gewoon zichtbaar
  assert.equal(await q.evaluate(() => getComputedStyle(document.documentElement).display), 'block');
  await ctx.close();
  await ctx2.close();
});

test('geen JavaScript-fouten tijdens de rainy-day-tests', () => {
  assert.deepEqual(fouten, []);
});
