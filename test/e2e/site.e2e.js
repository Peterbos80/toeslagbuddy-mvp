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
  const ctx = await s.browser.newContext();
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
  const ctx = await s.browser.newContext();
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

test('geen JavaScript-fouten tijdens de tests', () => {
  assert.deepEqual(fouten, []);
});
