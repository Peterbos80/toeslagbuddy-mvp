// Browsertests: elke feature wordt getest vóórdat de site live gaat.
//   npm run build && npm run test:e2e
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, open, axeBron, paginas } from './helpers.js';

let s;
// Tekst ophalen met alle soorten spaties (ook vaste spaties in bedragen) als één spatie
const tekst = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
const fouten = [];
before(async () => (s = await start()));
after(async () => {
  await s.stop();
});

test('home: stappenplan van de complete check', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await open(ctx, s.basis + '/', fouten);
  const f = p.locator('form[data-calc=alles]');
  assert.equal(await tekst(f.locator('.voortgang-tekst')), 'Stap 1 van 4');
  await f.locator('[name=leeftijd]').fill('30');
  await f.locator('[data-volgende]').click();
  // Zonder inkomen mag je niet verder
  await f.locator('[data-volgende]').click();
  assert.ok(await f.locator('.melding').isVisible());
  await f.locator('[name=inkomen]').fill('22.000');
  await f.locator('[data-volgende]').click();
  assert.equal(await tekst(f.locator('.voortgang-tekst')), 'Stap 3 van 4');
  await f.locator('[name=kaleHuur]').fill('650');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=aantalKinderen]').fill('2');
  await f.locator('select[name=kind1]').selectOption('4');
  await f.locator('select[name=kind2]').selectOption('13');
  await f.locator('button[type=submit]').click();
  const uit = await tekst(p.locator('[data-result]').first());
  assert.match(uit, /Zorgtoeslag € 129 p\/m/);
  assert.match(uit, /Huurtoeslag € 396 p\/m/);
  assert.match(uit, /Kindgebonden budget € 765 p\/m/);
  assert.match(uit, /Kwijtschelding/);
  await ctx.close();
});

test('rekenhulpen geven de officiële voorbeeldbedragen', async () => {
  // Zonder animaties, zodat oplopende bedragen meteen hun eindwaarde tonen
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const gevallen = [
    ['/zorgtoeslag-berekenen/', { inkomen: '32000' }, /€ 103 per maand/],
    ['/huurtoeslag-berekenen/', { kaleHuur: '710', inkomen: '29000' }, /€ 307 per maand/],
    ['/kindgebonden-budget-berekenen/', { inkomen: '30000' }, /€ 0|per maand/],
  ];
  for (const [pad, velden, verwacht] of gevallen) {
    const p = await open(ctx, s.basis + pad, fouten);
    const f = p.locator('form[data-calc]');
    for (const [k, v] of Object.entries(velden)) await f.locator(`[name=${k}]`).fill(v);
    await f.locator('button[type=submit]').click();
    assert.match(await tekst(p.locator('[data-result]')), verwacht, pad);
    await p.close();
  }
  // Kinderopvang: uurprijs boven maximum wordt afgetopt
  const k = await open(ctx, s.basis + '/kinderopvangtoeslag-berekenen/', fouten);
  await k.locator('[name=inkomen]').fill('50000');
  await k.locator('[name=uren]').fill('100');
  await k.locator('[name=uurprijs]').fill('12,50');
  await k.locator('button[type=submit]').click();
  assert.match(await tekst(k.locator('[data-result]')), /€ 1\.078,08 per maand/);
  // Kinderbijslag
  const b = await open(ctx, s.basis + '/kinderbijslag-berekenen/', fouten);
  await b.locator('[name=aantalKinderen]').fill('1');
  await b.locator('select[name=kind1]').selectOption('3');
  await b.locator('button[type=submit]').click();
  assert.match(await tekst(b.locator('[data-result]')), /€ 298,40 per kwartaal/);
  // Toetsingsinkomen
  const t = await open(ctx, s.basis + '/toetsingsinkomen/', fouten);
  await t.locator('[name=brutoMaand]').fill('2.500');
  await t.locator('button[type=submit]').click();
  assert.match(await tekst(t.locator('[data-result]')), /€ 32\.400/);
  await ctx.close();
});

test('zzp-toeslagbewaker en agenda-herinnering', async () => {
  const ctx = await s.browser.newContext({ acceptDownloads: true });
  const p = await open(ctx, s.basis + '/zzp-toeslagen/', fouten);
  const f = p.locator('form[data-calc=zzp]');
  await f.locator('[name=winstTotNu]').fill('27.000');
  await f.locator('select[name=maand]').selectOption('8');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=opgegevenInkomen]').fill('22.000');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=kaleHuur]').fill('780');
  await f.locator('button[type=submit]').click();
  const uit = await tekst(p.locator('[data-result]'));
  assert.match(uit, /waarschijnlijk terugbetalen/);
  assert.match(uit, /€ 34\.309/);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-ics]')]);
  assert.equal(dl.suggestedFilename(), 'toeslagcheck-zzp.ics');
  await ctx.close();
});

test('ToeslagBuddy Pro: voorbeeldlijst, filter en export', async () => {
  const ctx = await s.browser.newContext({ acceptDownloads: true });
  const p = await open(ctx, s.basis + '/pro/check/', fouten);
  await p.click('#pro-voorbeeld');
  assert.match(await tekst(p.locator('.tegels')), /Cliënten gecontroleerd 6/);
  assert.ok((await p.locator('article.client').count()) >= 1);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#pro-export')]);
  assert.match(dl.suggestedFilename(), /^actielijst-toeslagen-\d{4}-\d{2}-\d{2}\.csv$/);
  await p.uncheck('#pro-filter');
  assert.equal(await p.locator('article.client').count(), 6);
  await ctx.close();
});

test('mobiel: menu werkt en geen horizontaal scrollen op alle pagina’s', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 360, height: 740 } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => fouten.push(e.message));
  await p.goto(s.basis + '/');
  assert.equal(await p.locator('#hoofdmenu').isVisible(), false);
  await p.click('.menu-knop');
  assert.equal(await p.locator('#hoofdmenu').isVisible(), true);
  for (const pad of await paginas()) {
    await p.goto(s.basis + pad);
    const breedte = await p.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(breedte <= 360, `${pad} is ${breedte}px breed`);
  }
  await ctx.close();
});

test('toegankelijkheid (axe): geen ernstige problemen op alle pagina’s', async () => {
  // Meet het eindbeeld (zonder in-vliegende animaties)
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const problemen = [];
  for (const pad of await paginas()) {
    await p.goto(s.basis + pad);
    await p.addScriptTag({ content: axeBron });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations);
    for (const v of r.filter((v) => ['serious', 'critical'].includes(v.impact))) {
      problemen.push(`${pad}: ${v.id} – ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`);
    }
  }
  assert.deepEqual(problemen, []);
  await ctx.close();
});


test('zzp-dashboard: check bewaren, blijft na herladen, exporteren', async () => {
  const ctx = await s.browser.newContext({ acceptDownloads: true });
  const p = await open(ctx, s.basis + '/zzp-toeslagen/', fouten);
  const f = p.locator('form[data-calc=zzp]');
  await f.locator('[name=winstTotNu]').fill('20.000');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=opgegevenInkomen]').fill('25.000');
  await f.locator('[data-volgende]').click();
  await f.locator('button[type=submit]').click();
  await p.click('[data-bewaar]');
  assert.match(await tekst(p.locator('[data-bewaar]')), /Bewaard/);
  await p.reload();
  assert.equal(await p.locator('#mijn-overzicht tbody tr').count(), 1);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]);
  assert.equal(dl.suggestedFilename(), 'mijn-toeslagbewaker.json');
  await ctx.close();
});

test('persona-uitleg: juiste persona, ondertitels en bediening', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/', fouten);
  // Zonder leeftijd: algemene persona Buddy
  await p.locator('[name=inkomen]').fill('20000');
  await p.locator('button[type=submit]').click();
  const speler = p.locator('[data-uitleg] .speler');
  assert.equal(await speler.getAttribute('data-persona'), 'buddy');
  await p.click('[data-uitleg] [data-start]', { force: true });
  assert.match(await tekst(p.locator('[data-uitleg] .speler-teller')), /^1\//);
  await p.click('[data-uitleg] [data-volgende]');
  await p.waitForTimeout(600);
  assert.match(await tekst(p.locator('[data-uitleg] .speler-tekst')), /Goed nieuws/);
  assert.match((await p.locator('[data-uitleg] .speler-tekstversie').textContent()).replace(/\s+/g, ' '), /€ 129 per maand/);
  // Met leeftijd 70 in de complete check: Henk
  const h = await open(ctx, s.basis + '/', fouten);
  const f = h.locator('form[data-calc=alles]');
  await f.locator('[name=leeftijd]').fill('70');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=inkomen]').fill('21000');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=kaleHuur]').fill('700');
  await f.locator('[data-volgende]').click();
  await f.locator('button[type=submit]').click();
  assert.equal(await h.locator('[data-uitleg] .speler').getAttribute('data-persona'), 'henk');
  await ctx.close();
});

test('Pro: aanmelden, omgeving, proefstatus, tabs en uitloggen (demo)', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/pro/aanmelden/?demo=1', fouten);
  const f = p.locator('form[data-pro-aanmelden]');
  await f.locator('button[type=submit]').click();
  assert.match(await tekst(f.locator('.formulier-status')), /akkoord/);
  await f.locator('[name=naam]').fill('Test Bewindvoerder');
  await f.locator('[name=organisatie]').fill('Bewind BV');
  await f.locator('[name=email]').fill('test@bewind.nl');
  await f.locator('[name=akkoord]').check();
  await f.locator('button[type=submit]').click();
  await p.waitForURL('**/pro/app/?demo=1');
  assert.match(await tekst(p.locator('[data-pro-status]')), /Proef: nog 7 dagen/);
  assert.match(await tekst(p.locator('.pro-welkom')), /Test Bewindvoerder/);
  await p.click('#pro-voorbeeld');
  assert.match(await tekst(p.locator('.tegels').first()), /Cliënten gecontroleerd 6/);
  await p.click('[data-pro-tab=account]');
  assert.equal(await p.locator('[data-pro-paneel=account] [name=email]').inputValue(), 'test@bewind.nl');
  // Verlopen proef: geen toegang tot het hulpmiddel
  await p.goto(s.basis + '/pro/app/?demo=1&verlopen=1');
  await p.waitForSelector('[data-pro-scherm=verlopen]:not([hidden])');
  assert.equal(await p.locator('[data-pro-scherm=actief]').isHidden(), true);
  await p.locator('[data-pro-scherm=verlopen] [data-pro-uitloggen]').click();
  await p.waitForURL('**/pro/inloggen/?demo=1');
  // Na uitloggen: omgeving stuurt terug naar inloggen
  await p.goto(s.basis + '/pro/app/?demo=1');
  await p.waitForURL('**/pro/inloggen/?demo=1');
  await ctx.close();
});

test('Pro zonder accounts: nette melding in plaats van fouten', async () => {
  const ctx = await s.browser.newContext();
  const p = await open(ctx, s.basis + '/pro/app/', fouten);
  await p.waitForSelector('[data-pro-scherm=niet-actief]:not([hidden])');
  await ctx.close();
});

test('formulieren: bericht gaat via de webapplicatie, zonder zichtbaar e-mailadres', async () => {
  const ctx = await s.browser.newContext();
  const p = await open(ctx, s.basis + '/contact/', fouten);
  const html = await p.content();
  assert.ok(!/mailto:|@gmail\.com/.test(html), 'geen e-mailadres in de pagina');
  let verzonden = null;
  await p.route('https://api.web3forms.com/submit', async (r) => {
    verzonden = JSON.parse(r.request().postData());
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"success":true}' });
  });
  const f = p.locator('form[data-formulier=contact]');
  // Zonder toegangscode: nette melding
  await f.locator('[name=naam]').fill('Jan');
  await f.locator('[name=email]').fill('jan@example.nl');
  await f.locator('[name=bericht]').fill('Hallo!');
  await f.locator('button[type=submit]').click();
  assert.match(await tekst(f.locator('.formulier-status')), /binnenkort geactiveerd/);
  // Met toegangscode: verstuurd via Web3Forms
  await p.evaluate(() => (window.TB_FORMULIEREN.accessKey = 'test-sleutel'));
  await f.locator('button[type=submit]').click();
  await p.waitForSelector('.formulier-status[data-soort=ok]');
  assert.equal(verzonden.access_key, 'test-sleutel');
  assert.equal(verzonden.bericht, 'Hallo!');
  assert.match(verzonden.subject, /ToeslagBuddy/);
  await ctx.close();
});

test('alle regelingen: filter en zoeken', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/alle-regelingen/', fouten);
  const totaal = Number(await tekst(p.locator('[data-filter-teller]')));
  assert.ok(totaal >= 30);
  await p.click('[data-filter=student]');
  const student = Number(await tekst(p.locator('[data-filter-teller]')));
  assert.ok(student > 0 && student < totaal);
  await p.fill('[data-filter-zoek]', 'studiefinanciering');
  assert.equal(await tekst(p.locator('[data-filter-teller]')), '1');
  await ctx.close();
});

test('realistische AI-video: clips met persoonlijke ondertitels en AI-label', async () => {
  const { readFile } = await import('node:fs/promises');
  const clip = await readFile(new URL('../fixtures/clip.webm', import.meta.url));
  const { SEGMENTEN } = await import('../../src/calc/videoplan.js');
  const manifest = { buddy: Object.fromEntries(Object.keys(SEGMENTEN).map((k) => [k, { src: `/video/buddy/${k}.webm` }])) };
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  await ctx.route('**/video/manifest.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) }));
  await ctx.route('**/video/buddy/*.webm', (r) => r.fulfill({ status: 200, contentType: 'video/webm', body: clip }));
  const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/', fouten);
  await p.locator('[name=inkomen]').fill('20000');
  await p.locator('button[type=submit]').click();
  await p.waitForSelector('.speler-video');
  assert.match(await tekst(p.locator('.speler-video .ai-label')), /AI-gegenereerde video/);
  await p.click('.speler-video [data-start]', { force: true });
  assert.equal(await tekst(p.locator('.speler-video .speler-teller')), '1/5');
  await p.click('.speler-video [data-volgende]');
  assert.match(await tekst(p.locator('.video-ondertitel')), /€ 129 per maand/);
  assert.match(await p.locator('.speler-video video').getAttribute('src'), /\/video\/buddy\/ja\.webm$/);
  await ctx.close();
});

test('geen JavaScript-fouten tijdens de tests', () => {
  assert.deepEqual(fouten, []);
});
