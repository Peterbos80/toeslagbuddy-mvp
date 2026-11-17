// Browsertests voor ToeslagBuddy Familie (/familie/): de landingspagina, de
// rekenhulpen met de voorbeeldbedragen van het CAK, de checklist, en de
// regelkamer van begin tot eind (intake → taak → brief → logboek → afwikkeling).
// Alle namen en gegevens zijn verzonnen.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, open, axeBron } from './helpers.js';

let s;
const fouten = [];
const tekst = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ');
before(async () => (s = await start()));
after(async () => {
  await s.stop();
  assert.deepEqual(fouten, [], 'geen JavaScript-fouten');
});

const PAGINAS = ['/familie/', '/familie/rekenhulp/verpleeghuis/', '/familie/rekenhulp/erfbelasting/', '/familie/rekenhulp/zorgkosten/', '/familie/rekenhulp/zonnepanelen-2027/', '/familie/rekenhulp/wmo/', '/familie/checklist/na-overlijden/', '/familie/gids/', '/familie/prijzen/', '/familie/partner/', '/familie/privacy/', '/familie/voorwaarden/', '/familie/bronnen/', '/familie/app/'];

async function axe(p, waar) {
  await p.addScriptTag({ content: axeBron });
  const r = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }));
  assert.deepEqual(r.violations.map((v) => `${waar}: ${v.id} (${v.nodes.length}× ${v.nodes[0].target})`), []);
}

// Doorloopt de intake en maakt een dossier; geeft het dossier-id terug
async function nieuwDossier(p, { naam = 'Ma', ik = 'Sanne', antwoorden = {} } = {}) {
  await p.goto(s.basis + '/familie/app/#/nieuw');
  await p.waitForSelector('[data-form=intake]');
  for (let i = 0; i < 12; i++) {
    const vraag = await p.locator('#i-vraag').innerText();
    if (i === 0) await p.fill('#i-antwoord', naam);
    for (const [deel, waarde] of Object.entries(antwoorden)) {
      if (!vraag.includes(deel)) continue;
      if (await p.locator('#i-antwoord').count()) await p.fill('#i-antwoord', waarde);
      else await p.click(`[data-form=intake] label[for$="-${waarde}"]`);
    }
    await p.click('[data-form=intake] button[type=submit]');
    await p.waitForFunction((v) => document.querySelector('#i-vraag')?.innerText !== v || document.querySelector('[data-form=intake-toestemming]'), vraag);
  }
  await p.fill('#i-ik', ik);
  await p.click('[data-form=intake-toestemming] button[type=submit]');
  await p.waitForFunction(() => /^#\/d\//.test(location.hash));
  return (await p.evaluate(() => location.hash)).split('/')[2];
}

const dialoog = (p) => p.locator('dialog.fa-dialoog');

test('familie: landingspagina legt uit wat het is, met prijzen en een eerlijke status', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/familie/', fouten);
  assert.match(await tekst(p.locator('h1')), /ouders/i);
  assert.equal(await p.locator('header.site a[aria-current]').first().innerText(), 'Familie');
  assert.ok((await p.locator('a[href="/familie/app/"]').count()) >= 1);
  // Geen logo's of huisstijl van de overheid, wel een duidelijke melding
  assert.match(await tekst(p.locator('footer.site')), /geen overheid|niet van de overheid|onafhankelijk/i);
  const prijzen = await open(ctx, s.basis + '/familie/prijzen/', fouten);
  const t = await tekst(prijzen.locator('main'));
  assert.match(t, /€ 0/);
  assert.match(t, /7,99/);
  // Betalen staat nog uit: dat zeggen we eerlijk en er is geen betaalknop
  assert.match(t, /nog niet|binnenkort|proef/i);
  assert.equal(await prijzen.locator('[data-betaal]').count(), 0);
  await ctx.close();
});

test('rekenhulp verpleeghuis: voorbeeld van het CAK (lage en hoge bijdrage) en invoerfout', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/familie/rekenhulp/verpleeghuis/', fouten);
  const blok = p.locator('[data-rekenhulp]');
  // Leeg versturen: melding in gewone taal bij het veld
  await blok.locator('button[type=submit]').click();
  assert.match(await tekst(blok.locator('.veld-fout')), /verzamelinkomen/i);
  assert.equal(await blok.locator('[name=verzamelinkomen]').getAttribute('aria-invalid'), 'true');
  // Laag inkomen zonder vermogen: het minimum van de lage bijdrage
  await blok.locator('[name=verzamelinkomen]').fill('18.000');
  await blok.locator('button[type=submit]').click();
  const uit = blok.locator('[data-uitkomst]');
  await uit.locator('.f-groot').first().waitFor();
  assert.match(await tekst(uit), /212,60/);
  assert.match(await tekst(uit), /hoge eigen bijdrage/i);
  assert.match(await tekst(uit), /CAK stelt de bijdrage vast/);
  // De berekening is in te zien en de bron staat erbij
  await uit.locator('details.f-rekenstappen summary').first().click();
  assert.ok((await uit.locator('details.f-rekenstappen tr').count()) > 2);
  assert.ok((await p.locator('.f-bronnen a[href*="hetcak.nl"]').count()) >= 1);
  // Hoog inkomen: het maximum van de lage bijdrage
  await blok.locator('[name=verzamelinkomen]').fill('250000');
  await blok.locator('button[type=submit]').click();
  await p.waitForFunction(() => document.querySelector('[data-uitkomst]').innerText.includes('1.115,80'));
  await ctx.close();
});

test('rekenhulpen: erfbelasting, zorgkosten, zonnepanelen en Wmo rekenen met de officiële bedragen', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  // Erfbelasting: kind erft € 126.230 → € 100.000 belast → 10% = € 10.000
  let p = await open(ctx, s.basis + '/familie/rekenhulp/erfbelasting/', fouten);
  await p.click('label[for="r-wijze-los"]');
  await p.selectOption('#r-relatie', 'kind');
  await p.locator('[name=bedrag]:visible').fill('126230');
  await p.click('[data-rekenhulp] button[type=submit]');
  await p.waitForFunction(() => /10\.000/.test(document.querySelector('[data-uitkomst]').innerText));
  assert.match(await tekst(p.locator('[data-uitkomst]')), /26\.230/);
  // Wmo: het vaste bedrag per maand, en eerlijk over de uitgestelde wijziging
  p = await open(ctx, s.basis + '/familie/rekenhulp/wmo/', fouten);
  const wmo = await tekst(p.locator('main'));
  assert.match(wmo, /21,80/);
  assert.match(wmo, /uitgesteld|nog niet|voorstel/i);
  assert.doesNotMatch(wmo, /gaat in op 1 januari 2027/);
  // Zorgkosten en zonnepanelen laden zonder fouten en hebben een formulier
  for (const pad of ['/familie/rekenhulp/zorgkosten/', '/familie/rekenhulp/zonnepanelen-2027/']) {
    p = await open(ctx, s.basis + pad, fouten);
    assert.equal(await p.locator('[data-rekenhulp] form').count(), 1, pad);
  }
  await ctx.close();
});

test('checklist na een overlijden: afvinken blijft bewaard op het apparaat', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/familie/checklist/na-overlijden/', fouten);
  const blok = p.locator('[data-checklist]');
  const totaal = await blok.locator('input[data-stap]').count();
  assert.ok(totaal >= 12);
  assert.equal(await blok.locator('[data-check-tekst]').innerText(), `0 van ${totaal} gedaan`);
  await blok.locator('label[for]:has-text("")').first().waitFor();
  await blok.locator('input[data-stap=uitvaart]').check({ force: true });
  assert.equal(await blok.locator('[data-check-tekst]').innerText(), `1 van ${totaal} gedaan`);
  await p.reload();
  assert.equal(await p.locator('input[data-stap=uitvaart]').isChecked(), true);
  // De termijnen komen uit officiële bronnen: 20 maanden voor de aangifte erfbelasting
  assert.match(await tekst(p.locator('main')), /20 maanden/);
  await ctx.close();
});

test('regelkamer: voorbeeld bekijken, alle schermen werken en het voorbeeld is te verwijderen', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/familie/app/', fouten);
  await p.click('[data-actie=demo]');
  await p.waitForSelector('.fa-tegels');
  const id = (await p.evaluate(() => location.hash)).split('/')[2];
  assert.match(await tekst(p.locator('#familie-app')), /voorbeeld/i);
  for (const scherm of ['kalender', 'taken', 'post', 'logboek', 'dossier', 'familie', 'afwikkelen', 'instellingen']) {
    await p.click(`.fa-zij a[href="#/d/${id}/${scherm}"]`);
    await p.waitForFunction((sch) => location.hash.endsWith('/' + sch), scherm);
    assert.ok((await p.locator('.fa-hoofd h1').innerText()).length > 2, scherm);
  }
  // Het logboek van het voorbeeld heeft een kloppende keten
  await p.click(`.fa-zij a[href="#/d/${id}/logboek"]`);
  await p.waitForTimeout(300);
  assert.doesNotMatch(await tekst(p.locator('.fa-hoofd')), /keten klopt niet|is aangepast buiten/i);
  await axe(p, 'regelkamer logboek');
  await p.click(`.fa-zij a[href="#/d/${id}/overzicht"]`);
  await axe(p, 'regelkamer overzicht');
  await ctx.close();
});

test('regelkamer: intake → dossier → taak → brief met termijn in de kalender → logboek', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/familie/app/', fouten);
  const id = await nieuwDossier(p, { naam: 'Ma', ik: 'Sanne', antwoorden: { geboren: '1941', zonnepanelen: 'ja' } });
  assert.match(await tekst(p.locator('.fa-zij')), /Ma/);
  // De intake zet starttaken klaar
  await p.goto(`${s.basis}/familie/app/#/d/${id}/taken`);
  await p.waitForSelector('[data-actie=taak-nieuw]');
  const vooraf = await p.locator('[data-actie=taak-vink]').count();
  assert.ok(vooraf >= 1, 'de intake maakt starttaken');
  await p.click('[data-actie=taak-nieuw]');
  await dialoog(p).locator('[name=titel]').fill('Paspoort verlengen');
  await dialoog(p).locator('button[type=submit]').click();
  await p.waitForFunction((n) => document.querySelectorAll('[data-actie=taak-vink]').length === n + 1, vooraf);
  assert.match(await tekst(p.locator('.fa-hoofd')), /Paspoort verlengen/);
  // Leeg bewaren: melding in de dialoog
  await p.click('[data-actie=taak-nieuw]');
  await dialoog(p).locator('button[type=submit]').click();
  assert.match(await dialoog(p).locator('[data-fout]').innerText(), /Vul in/);
  await dialoog(p).locator('[data-sluit]').first().click();

  // Brief plakken: BSN wordt weggelakt, bedrag en termijn worden gevonden met citaat
  await p.goto(`${s.basis}/familie/app/#/d/${id}/post`);
  await p.click('[data-actie=brief-nieuw]');
  await dialoog(p).locator('[name=tekst]').fill('CAK\nDatum: 3 november 2026\nBetreft: eigen bijdrage Wlz\n\nGeachte mevrouw De Vries,\n\nUw burgerservicenummer: 111222333.\nU betaalt een eigen bijdrage van € 212,60 per maand.\nBent u het niet eens met dit besluit? Dan kunt u binnen 6 weken na de datum van deze brief bezwaar maken.\n');
  await dialoog(p).locator('button[type=submit]').click();
  await p.waitForFunction(() => /#\/d\/[^/]+\/post\/.+/.test(location.hash));
  await p.waitForSelector('[data-actie=brief-klopt]');
  const brief = await tekst(p.locator('.fa-hoofd'));
  assert.match(brief, /CAK/);
  assert.match(brief, /212,60/);
  assert.match(brief, /6 weken|15 december 2026/);
  assert.doesNotMatch(brief, /111222333/);
  await p.click('[data-actie=brief-klopt]');
  await p.waitForSelector('.f-pil.goed');
  await p.goto(`${s.basis}/familie/app/#/d/${id}/kalender`);
  await p.waitForSelector('.fa-hoofd h1');
  assert.match(await tekst(p.locator('.fa-hoofd')), /bezwaar|CAK/i);
  // Bewaard op het apparaat, zonder BSN
  const opslag = await p.evaluate(() => localStorage.getItem('tb-familie-v1'));
  assert.doesNotMatch(opslag, /111222333/);

  // Logboek: een uitgave vastleggen en verbeteren; de oude regel blijft zichtbaar
  await p.goto(`${s.basis}/familie/app/#/d/${id}/logboek`);
  await p.click('[data-actie=uitgave-nieuw]');
  await dialoog(p).locator('[name=bedrag]').fill('42,50');
  await dialoog(p).locator('[name=omschrijving]').fill('Boodschappen');
  await dialoog(p).locator('button[type=submit]').click();
  await p.waitForFunction(() => document.querySelector('.fa-hoofd').innerText.includes('42,50'));
  await p.reload();
  await p.waitForSelector('[data-actie=uitgave-nieuw]');
  assert.match(await tekst(p.locator('.fa-hoofd')), /Boodschappen/);
  assert.doesNotMatch(await tekst(p.locator('.fa-hoofd')), /keten klopt niet/i);
  await ctx.close();
});

test('regelkamer: na een overlijden staan het stappenplan en een opzegbrief klaar', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await open(ctx, s.basis + '/familie/app/', fouten);
  await p.click('[data-actie=demo]');
  await p.waitForSelector('.fa-tegels');
  const id = (await p.evaluate(() => location.hash)).split('/')[2];
  await p.goto(`${s.basis}/familie/app/#/d/${id}/afwikkelen`);
  await p.click('[data-actie=overlijden-start]');
  assert.match(await dialoog(p).locator('h2').innerText(), /Gecondoleerd/);
  await dialoog(p).locator('button[type=submit]').click();
  await p.waitForSelector('[data-actie=check-vink]');
  assert.equal(await p.locator('#familie-app').evaluate((e) => e.classList.contains('rouw')), true);
  // Stappenplan afvinken
  const stap = p.locator('[data-actie=check-vink]').first();
  await stap.click();
  // Opzegbrief: de naam van de overledene wordt niet in het dossier bewaard
  await p.locator('[data-actie=opzegbrief]').first().click();
  await dialoog(p).locator('[name=overledene]').fill('H. de Vries-Voorbeeld');
  await dialoog(p).locator('[name=email]').fill('sanne@example.nl');
  await dialoog(p).locator('button[type=submit]').click();
  const tekstBrief = await dialoog(p).locator('[data-brief]').inputValue();
  assert.match(tekstBrief, /H\. de Vries-Voorbeeld/);
  assert.match(tekstBrief, /overleden/);
  assert.match(tekstBrief, /sanne@example\.nl/);
  assert.doesNotMatch(await p.evaluate(() => localStorage.getItem('tb-familie-v1')), /Vries-Voorbeeld/);
  await ctx.close();
});

test('familie: mobiel (360 px) zonder horizontaal scrollen, donkere modus en toegankelijkheid', async () => {
  const ctx = await s.browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce', bypassCSP: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => fouten.push(e.message));
  for (const pad of PAGINAS) {
    await p.goto(s.basis + pad);
    const breedte = await p.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(breedte <= 360, `${pad} is ${breedte}px breed`);
    await axe(p, pad);
  }
  // De regelkamer zelf, met inhoud, op een telefoon
  await p.goto(s.basis + '/familie/app/');
  await p.click('[data-actie=demo]');
  await p.waitForSelector('.fa-tegels');
  assert.ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 360);
  assert.equal(await p.locator('.fa-onder').isVisible(), true);
  await ctx.close();
  const donker = await s.browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce', bypassCSP: true });
  const d = await donker.newPage();
  for (const pad of ['/familie/', '/familie/rekenhulp/verpleeghuis/', '/familie/prijzen/', '/deals/', '/']) {
    await d.goto(s.basis + pad);
    await axe(d, `${pad} (donker)`);
  }
  await donker.close();
});
