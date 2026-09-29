// Browsertests voor de Engelse pagina's (/en/): de complete check in het
// Engels, de taalschakelaar, hreflang, toegankelijkheid en de persona-uitleg.
//   npm run build && npm run test:e2e
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, open, axeBron, paginas } from './helpers.js';
import { pagesEn } from '../../src/site/pages-en.js';

let s;
const tekst = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
const fouten = [];
before(async () => (s = await start()));
after(async () => {
  await s.stop();
});

// Nederlandse interfaceteksten die op een Engelse uitkomst niet mogen staan
const NL_UI = ['per maand', 'per jaar', 'Jouw toeslagen', 'Volgende stap', 'Dit kun je misschien ook krijgen', 'Deel via WhatsApp', 'Kopieer link', 'Bekijk uitleg', 'Lees de uitleg', 'fictieve persona', 'Goed nieuws', 'Zorgtoeslag', 'Huurtoeslag', 'Kindgebonden budget', 'Kinderbijslag', 'Stap ', 'Vorige', 'Volgende'];

test('/en/: complete check in het Engels, met euro-bedragen en een Engelse persona', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/en/', fouten);
  assert.equal(await p.getAttribute('html', 'lang'), 'en');
  const f = p.locator('form[data-calc=alles]');
  assert.equal(await tekst(f.locator('.voortgang-tekst')), 'Step 1 of 4');
  await f.locator('[name=leeftijd]').fill('30');
  await f.locator('[data-volgende]').click();
  // Zonder inkomen: Engelse melding
  await f.locator('[data-volgende]').click();
  assert.match(await tekst(f.locator('.melding')), /Fill in this field to continue/);
  // Engelse schrijfwijze (komma als duizendtal) wordt goed gelezen
  await f.locator('[name=inkomen]').fill('22,000');
  await f.locator('[data-volgende]').click();
  assert.equal(await tekst(f.locator('.voortgang-tekst')), 'Step 3 of 4');
  await f.locator('[name=kaleHuur]').fill('650');
  await f.locator('[data-volgende]').click();
  await f.locator('[name=aantalKinderen]').fill('2');
  assert.match(await tekst(f.locator('[data-kids-lijst]')), /Age of child 1/);
  await f.locator('select[name=kind1]').selectOption('4');
  await f.locator('select[name=kind2]').selectOption('13');
  await f.locator('button[type=submit]').click();
  const uitkomst = p.locator('[data-result]');
  const uit = await tekst(uitkomst);
  // Dezelfde bedragen als de Nederlandse check (site.e2e.js), in Engelse notatie
  assert.match(uit, /Your allowances in 2026/);
  assert.match(uit, /Healthcare allowance €129 p\/m/);
  assert.match(uit, /Rent allowance €396 p\/m/);
  assert.match(uit, /Child budget €765 p\/m/);
  assert.match(uit, /Remission of municipal taxes/);
  assert.match(uit, /€[\d,]+ per month/);
  for (const nl of NL_UI) assert.ok(!uit.includes(nl), `Nederlandse tekst op de Engelse uitkomst: “${nl}”`);
  // Links in de uitkomst: toeslagen naar Engelse pagina's, tips naar Nederlandse (met hreflang)
  assert.equal(await uitkomst.locator('table.overzicht a').first().getAttribute('href'), '/en/healthcare-allowance/');
  assert.equal(await uitkomst.locator('.tips a').first().getAttribute('hreflang'), 'nl');
  // De getekende persona spreekt Engels
  const speler = p.locator('[data-uitleg] .speler');
  assert.equal(await speler.getAttribute('data-persona'), 'ilse');
  assert.match(await tekst(speler.locator('.speler-label')), /is a digital, fictional persona/);
  const script = (await speler.locator('.speler-tekstversie').textContent()).replace(/\s+/g, ' ');
  assert.match(script, /Good news: you can probably get €[\d,]+ per month/);
  assert.match(script, /Child budget: about €765 per month/);
  assert.match(script, /toeslagen\.nl/);
  await ctx.close();
});

test('/en/: invoerfout in het Engels', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/en/healthcare-allowance/', fouten);
  await p.locator('[name=inkomen]').fill('abc');
  await p.locator('button[type=submit]').click();
  const uit = await tekst(p.locator('[data-result]'));
  assert.match(uit, /Please check your answers/);
  assert.match(uit, /The income is not a number/);
  await p.locator('[name=inkomen]').fill('20000');
  await p.locator('button[type=submit]').click();
  assert.match(await tekst(p.locator('[data-result]')), /Healthcare allowance €129 per month/);
  assert.match((await p.locator('[data-uitleg] .speler-tekstversie').textContent()).replace(/\s+/g, ' '), /Good news: you will probably get about €129 per month in healthcare allowance/);
  await ctx.close();
});

test('Engelse pagina’s: altijd de getekende persona, ook als er Nederlandse AI-video’s klaarstaan', async () => {
  const { SEGMENTEN } = await import('../../src/calc/videoplan.js');
  const manifest = { buddy: Object.fromEntries(Object.keys(SEGMENTEN).map((k) => [k, { src: `/video/buddy/${k}.webm` }])) };
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  let gevraagd = false;
  await ctx.route('**/video/manifest.json', (r) => {
    gevraagd = true;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
  });
  const p = await open(ctx, s.basis + '/en/healthcare-allowance/', fouten);
  await p.locator('[name=inkomen]').fill('20000');
  await p.locator('button[type=submit]').click();
  await p.waitForSelector('[data-uitleg] .speler');
  assert.equal(await p.locator('.speler-video').count(), 0);
  assert.equal(gevraagd, false, 'het videomanifest wordt op Engelse pagina’s niet opgehaald');
  assert.match(await tekst(p.locator('[data-uitleg] [data-start]')), /Watch explanation/);
  await ctx.close();
});

test('taalschakelaar werkt twee kanten op, ook zonder Engelse tegenhanger', async () => {
  const ctx = await s.browser.newContext();
  const p = await open(ctx, s.basis + '/zorgtoeslag-berekenen/', fouten);
  await p.click('.taalwissel');
  await p.waitForURL('**/en/healthcare-allowance/');
  assert.equal(await p.getAttribute('html', 'lang'), 'en');
  assert.match(await tekst(p.locator('h1')), /Healthcare allowance calculator/);
  await p.click('.taalwissel');
  await p.waitForURL('**/zorgtoeslag-berekenen/');
  assert.equal(await p.getAttribute('html', 'lang'), 'nl');
  // Nederlandse pagina zonder vertaling (R18): naar /en/ met uitleg
  await p.goto(s.basis + '/toeslagen-student/');
  await p.click('.taalwissel');
  await p.waitForURL('**/en/#in-dutch');
  assert.ok(await p.locator('#in-dutch').isVisible());
  assert.match(await tekst(p.locator('#in-dutch + p')), /Did you come here from a Dutch page\?/);
  const link = p.locator('#in-dutch ~ .samenvattingen a[href="/toeslagen-student/"]');
  assert.equal(await link.getAttribute('lang'), 'nl');
  assert.equal(await link.getAttribute('hreflang'), 'nl');
  // Op mobiel blijft de schakelaar zichtbaar (buiten het menu)
  const mobiel = await s.browser.newContext({ viewport: { width: 360, height: 740 } });
  const m = await open(mobiel, s.basis + '/', fouten);
  assert.ok(await m.locator('.taalwissel').isVisible());
  assert.equal(await m.locator('.taalwissel').getAttribute('href'), '/en/');
  await mobiel.close();
  await ctx.close();
});

test('hreflang: elke Engelse pagina en haar tegenhanger verwijzen naar elkaar', async () => {
  const ctx = await s.browser.newContext();
  const p = await ctx.newPage();
  const alternatieven = async (pad) => {
    await p.goto(s.basis + pad);
    return p.evaluate(() => Object.fromEntries([...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => [l.hreflang, new URL(l.href).pathname])));
  };
  for (const page of pagesEn) {
    const en = await alternatieven(page.slug);
    if (page.vertaling === false) {
      assert.deepEqual(en, {}, `${page.slug}: samenvatting, geen hreflang`);
      continue;
    }
    assert.deepEqual(en, { nl: page.nl, en: page.slug, 'x-default': page.nl }, page.slug);
    assert.deepEqual(await alternatieven(page.nl), en, `${page.nl} ↔ ${page.slug}`);
  }
  await ctx.close();
});

test('alle Engelse pagina’s staan in de sitemap (dus ook in de axe- en mobieltests) en zijn toegankelijk na een berekening', async () => {
  const lijst = await paginas();
  for (const page of pagesEn) assert.ok(lijst.includes(page.slug), page.slug);
  // Toegankelijkheid van de Engelse uitkomst met persona-speler
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce', bypassCSP: true });
  const p = await ctx.newPage();
  await p.goto(s.basis + '/en/rent-allowance/');
  await p.locator('[name=kaleHuur]').fill('710');
  await p.locator('[name=inkomen]').fill('29000');
  await p.locator('button[type=submit]').click();
  assert.match(await tekst(p.locator('[data-result]')), /Rent allowance €307 per month/);
  await p.addScriptTag({ content: axeBron });
  const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations);
  assert.deepEqual(r.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes[0]?.target}`), []);
  await ctx.close();
});

test('Engels zonder JavaScript: uitleg leesbaar, Engelse melding bij de rekenhulp', async () => {
  const ctx = await s.browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(s.basis + '/en/child-benefit/');
  assert.match(await tekst(p.locator('.rekenkaart .geen-js')), /This calculator only works with JavaScript/);
  assert.match(await tekst(p.locator('main')), /Child benefit amounts 2026/);
  await ctx.close();
});

test('geen JavaScript-fouten tijdens de Engelse tests', () => {
  assert.deepEqual(fouten, []);
});

test('/en/contact/: meldingen van het formulier in het Engels', async () => {
  const ctx = await s.browser.newContext({ reducedMotion: 'reduce' });
  const p = await open(ctx, s.basis + '/en/contact/', fouten);
  const f = p.locator('form[data-formulier]').first();
  await f.locator('button[type=submit]').click();
  assert.match(await tekst(f.locator('.formulier-status')), /Please fill in all required fields/);
  await f.locator('[name=naam]').fill('Jan');
  await f.locator('[name=email]').fill('jan@example.nl');
  await f.locator('[name=bericht]').fill('Hello!');
  await f.locator('button[type=submit]').click();
  // Zonder Supabase: Engelse melding met een link naar info@
  assert.match(await tekst(f.locator('.formulier-status')), /not working yet/);
  assert.equal(await f.locator('.formulier-status a').getAttribute('href'), 'mailto:info@toeslagbuddy.nl');
  await ctx.close();
});
