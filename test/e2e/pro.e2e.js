// Browsertests voor Pro (organisatie, controles, rapportage, team, account)
// en /beheer/, in demomodus (?demo=1): de demo-backend in pro-demo.js volgt
// dezelfde regels als de database. De database zelf is getest in test/db/.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { start, open, axeBron } from './helpers.js';

let s;
const fouten = [];
const tekst = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
before(async () => (s = await start()));
after(async () => s.stop());

// bypassCSP: axe wordt als inline script toegevoegd; de strikte CSP zou dat blokkeren
const nieuweContext = () => s.browser.newContext({ reducedMotion: 'reduce', acceptDownloads: true, bypassCSP: true });
const demoDb = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('toeslagbuddy-demo-db')));

async function code(p) {
  const f = p.locator('form[data-pro-code]');
  await f.waitFor();
  await f.locator('[name=code]').fill('123456');
  await f.locator('button[type=submit]').click();
}

async function aanmelden(ctx, { naam = 'Test Bewindvoerder', organisatie = 'Bewind BV', email = 'test@bewind.nl' } = {}) {
  const p = await open(ctx, s.basis + '/pro/aanmelden/?demo=1', fouten);
  const f = p.locator('form[data-pro-aanmelden]');
  await f.locator('[name=naam]').fill(naam);
  await f.locator('[name=organisatie]').fill(organisatie);
  await f.locator('[name=email]').fill(email);
  await f.locator('[name=akkoord]').check();
  await f.locator('button[type=submit]').click();
  await code(p);
  await p.waitForURL('**/pro/app/?demo=1');
  await p.waitForSelector('[data-pro-scherm=actief]:not([hidden])');
  return p;
}

async function inloggen(p, email, pad = '/pro/inloggen/?demo=1') {
  if (!p.url().includes('/pro/inloggen/')) await p.goto(s.basis + pad);
  const f = p.locator('form[data-pro-inloggen]');
  await f.locator('[name=email]').fill(email);
  await f.locator('button[type=submit]').click();
  await code(p);
  await p.waitForURL('**/pro/app/?demo=1');
}

async function axe(p, naam) {
  await p.addScriptTag({ content: axeBron });
  const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations);
  const ernstig = r.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${naam}: ${v.id} – ${v.help} ${v.nodes[0]?.target}`);
  assert.deepEqual(ernstig, []);
}

test('Pro: aanmelden met een code, organisatie met proef van 7 dagen', async () => {
  const ctx = await nieuweContext();
  const p = await open(ctx, s.basis + '/pro/aanmelden/?demo=1', fouten);
  const f = p.locator('form[data-pro-aanmelden]');
  await f.locator('[name=naam]').fill('Test Bewindvoerder');
  await f.locator('[name=organisatie]').fill('Bewind BV');
  await f.locator('[name=email]').fill('test@bewind.nl');
  await f.locator('[name=akkoord]').check();
  await f.locator('button[type=submit]').click();
  const c = p.locator('form[data-pro-code]');
  await c.waitFor();
  assert.match(await tekst(c.locator('[data-pro-code-uitleg]')), /test@bewind\.nl.*code van 6 cijfers/);
  await c.locator('[name=code]').fill('000000');
  await c.locator('button[type=submit]').click();
  assert.match(await tekst(c.locator('.formulier-status')), /klopt niet/);
  await code(p);
  await p.waitForURL('**/pro/app/?demo=1');
  assert.match(await tekst(p.locator('[data-pro-status]')), /^Proef: nog 7 dagen$/);
  assert.equal(await tekst(p.locator('[data-pro-organisatie]')), 'Bewind BV');
  const db = await demoDb(p);
  assert.equal(db.organisaties.length, 1);
  assert.equal(db.leden[0].rol, 'eigenaar');
  await axe(p, 'pro-app');
  await ctx.close();
});

test('Pro: controle gaat als aggregaat naar de server; rapportage met trend', async () => {
  const ctx = await nieuweContext();
  const p = await aanmelden(ctx);
  await p.click('#pro-voorbeeld');
  await p.waitForFunction(() => /opgeslagen/.test(document.querySelector('[data-pro-outbox]').textContent));
  const db = await demoDb(p);
  assert.equal(db.controles.length, 1);
  const c = db.controles[0];
  assert.equal(c.clienten_band, '1-9');
  assert.equal(c.gemist_jaar, null, 'geen bedragen bij minder dan 10 cliënten');
  assert.ok(!JSON.stringify(c).includes('C-00'), 'geen cliëntnummers op de server');
  assert.ok(Object.values(c.signalen).every((n) => n === -1 || n >= 5), 'geen exacte kleine aantallen');
  // Tweede controle; daarna een oudere controle met andere rekenregels nabootsen
  await p.click('#pro-voorbeeld');
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('toeslagbuddy-demo-db')).controles.length === 2);
  await p.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('toeslagbuddy-pro-historie-'));
    const h = JSON.parse(localStorage.getItem(k));
    h[1].rekenversie = '2025.20250101';
    localStorage.setItem(k, JSON.stringify(h));
  });
  await p.click('[data-pro-tab=rapportage]');
  const historie = p.locator('[data-pro-historie] tbody tr');
  assert.equal(await historie.count(), 2);
  assert.match(await tekst(historie.first()), /6 .*niet vergelijkbaar/);
  await p.waitForSelector('[data-pro-trend] tbody tr');
  assert.equal(await p.locator('[data-pro-trend] tbody tr').count(), 2);
  assert.match(await tekst(p.locator('[data-pro-trend] tbody tr').first()), /1-9/);
  await axe(p, 'pro-rapportage');
  // Uitloggen wist de exacte cijfers in deze browser
  await p.locator('[data-pro-scherm=actief] [data-pro-uitloggen]').click();
  await p.waitForURL('**/pro/inloggen/?demo=1');
  const over = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('toeslagbuddy-pro-')));
  assert.deepEqual(over, []);
  await ctx.close();
});

test('R16: server onbereikbaar: controle wacht in de outbox en gaat later alsnog', async () => {
  const ctx = await nieuweContext();
  const p = await aanmelden(ctx);
  await p.goto(s.basis + '/pro/app/?demo=1&onbereikbaar=1');
  await p.waitForSelector('[data-pro-scherm=actief]:not([hidden])');
  assert.match(await tekst(p.locator('[data-pro-bericht]')), /tijdelijk niet bereikbaar/);
  await p.click('#pro-voorbeeld');
  await p.waitForSelector('[data-pro-outbox][data-wachtrij="1"]');
  assert.match(await tekst(p.locator('[data-pro-outbox]')), /1 controle wacht/);
  assert.equal((await demoDb(p)).controles.length, 0);
  await p.goto(s.basis + '/pro/app/?demo=1');
  await p.waitForSelector('[data-pro-outbox][data-wachtrij="0"]');
  assert.equal((await demoDb(p)).controles.length, 1);
  // Opnieuw versturen van dezelfde controle maakt geen dubbele (idempotent)
  const id = (await demoDb(p)).controles[0].id;
  await p.evaluate((id) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('toeslagbuddy-pro-outbox-'));
    const agg = { id, rekenversie: '2026.20260928', clienten: '1-9', met_actie: -1, gemist_jaar: null, risico_jaar: null, signalen: { gemist: -1, 'te-laag': -1, terugbetaling: -1, vermogen: -1, leeftijd: -1, gemeente: -1, info: -1 } };
    localStorage.setItem(k, JSON.stringify([agg]));
  }, id);
  await p.reload();
  await p.waitForSelector('[data-pro-outbox][data-wachtrij="0"]');
  assert.equal((await demoDb(p)).controles.length, 1);
  await ctx.close();
});

test('Team: uitnodigingslink maken, accepteren, eenmalig en lid verwijderen', async () => {
  const ctx = await nieuweContext();
  const p = await aanmelden(ctx, { email: 'baas@bewind.nl' });
  p.on('dialog', (d) => d.accept());
  await p.click('[data-pro-tab=team]');
  assert.match(await tekst(p.locator('[data-pro-leden] tbody')), /baas@bewind\.nl Eigenaar/);
  const form = p.locator('form[data-pro-uitnodigen]');
  await form.locator('[name=email]').fill('Collega@Bewind.nl');
  await form.locator('button[type=submit]').click();
  await p.waitForSelector('[data-pro-link]:not([hidden])');
  const link = await p.locator('[data-pro-link-veld]').inputValue();
  assert.match(link, /\/pro\/app\/\?demo=1&uitnodiging=[0-9a-f]{64}$/);
  assert.match(await tekst(p.locator('[data-pro-open-uitnodigingen]')), /collega@bewind\.nl/);
  // Het token staat niet in de database, alleen de hash
  assert.ok(!JSON.stringify(await demoDb(p)).includes(link.split('=').pop()));
  await axe(p, 'pro-team');

  // Collega opent de link, logt in (account wordt aangemaakt) en is lid
  await p.locator('[data-pro-scherm=actief] [data-pro-uitloggen]').click();
  await p.waitForURL('**/pro/inloggen/?demo=1');
  await p.goto(link);
  await p.waitForURL('**/pro/inloggen/?reden=uitnodiging&demo=1');
  assert.match(await tekst(p.locator('[data-pro-reden]')), /uitgenodigd/);
  await inloggen(p, 'collega@bewind.nl');
  await p.waitForSelector('[data-pro-scherm=actief]:not([hidden])');
  assert.match(await tekst(p.locator('[data-pro-bericht]')), /Welkom! Je hoort nu bij het team van Bewind BV/);
  assert.equal(await tekst(p.locator('[data-pro-organisatie]')), 'Bewind BV');
  await p.click('[data-pro-tab=team]');
  assert.equal(await p.locator('[data-pro-leden] tbody tr').count(), 2);
  assert.equal(await p.locator('[data-pro-team-lid]').isVisible(), true);
  assert.equal(await p.locator('[data-pro-team-eigenaar]').isVisible(), false);

  // Dezelfde link nog een keer: al gebruikt → geen organisatie, zelf een proef starten kan
  await p.locator('[data-pro-scherm=actief] [data-pro-uitloggen]').click();
  await p.waitForURL('**/pro/inloggen/?demo=1');
  await p.goto(link);
  await p.waitForURL('**/pro/inloggen/?reden=uitnodiging&demo=1');
  await inloggen(p, 'derde@bewind.nl');
  await p.waitForSelector('[data-pro-scherm=geen-organisatie]:not([hidden])');
  assert.match(await tekst(p.locator('[data-pro-bericht]')), /al gebruikt/);
  await p.click('[data-pro-org-starten]');
  await p.waitForSelector('[data-pro-scherm=actief]:not([hidden])');

  // De eigenaar verwijdert het lid
  await p.locator('[data-pro-scherm=actief] [data-pro-uitloggen]').click();
  await p.waitForURL('**/pro/inloggen/?demo=1');
  await inloggen(p, 'baas@bewind.nl');
  await p.click('[data-pro-tab=team]');
  await p.click('[data-pro-lid-verwijderen]');
  await p.waitForFunction(() => document.querySelectorAll('[data-pro-leden] tbody tr').length === 1);
  assert.match(await tekst(p.locator('[data-pro-team-status]')), /collega@bewind\.nl is verwijderd/);
  const acties = (await demoDb(p)).audit.map((a) => a.actie);
  for (const a of ['uitnodiging_gemaakt', 'uitnodiging_geaccepteerd', 'lid_verwijderd']) assert.ok(acties.includes(a), a);
  await ctx.close();
});

test('Account: gegevens wijzigen, downloaden (JSON) en account verwijderen', async () => {
  const ctx = await nieuweContext();
  const p = await aanmelden(ctx, { email: 'weg@bewind.nl' });
  p.on('dialog', (d) => d.accept());
  await p.click('#pro-voorbeeld');
  await p.click('[data-pro-tab=account]');
  const f = p.locator('form[data-pro-profiel]');
  await f.locator('[name=kvk]').fill('abc');
  await f.locator('button[type=submit]').click();
  assert.match(await tekst(f.locator('.formulier-status')), /8 cijfers/);
  await f.locator('[name=kvk]').fill('1234 5678');
  await f.locator('[name=organisatie]').fill('Bewind & Co <b>');
  await f.locator('button[type=submit]').click();
  await p.waitForSelector('form[data-pro-profiel] .formulier-status[data-soort=ok]');
  assert.equal(await tekst(p.locator('[data-pro-organisatie]')), 'Bewind & Co <b>');
  await axe(p, 'pro-account');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-pro-paneel=account] [data-pro-export]')]);
  assert.equal(dl.suggestedFilename(), 'mijn-gegevens-toeslagbuddy.json');
  const data = JSON.parse(await readFile(await dl.path(), 'utf8'));
  assert.equal(data.account.email, 'weg@bewind.nl');
  assert.equal(data.organisatie.kvk, '12345678');
  assert.equal(data.controles_door_mij.length, 1);
  assert.ok(data.auditregels.some((a) => a.actie === 'organisatie_aangemaakt'));
  assert.equal(data.historie_in_deze_browser.length, 1);
  await p.click('[data-pro-paneel=account] [data-pro-verwijderen]');
  await p.waitForURL('**/pro/inloggen/?reden=verwijderd&demo=1');
  assert.match(await tekst(p.locator('[data-pro-reden]')), /account is verwijderd/);
  const db = await demoDb(p);
  assert.ok(!db.users.some((u) => u.email === 'weg@bewind.nl'));
  assert.equal(db.organisaties.length, 0);
  assert.equal(db.controles.length, 0);
  await ctx.close();
});

test('R11: verlopen proef geeft een vergrendeld scherm', async () => {
  const ctx = await nieuweContext();
  const p = await aanmelden(ctx);
  await p.goto(s.basis + '/pro/app/?demo=1&verlopen=1');
  await p.waitForSelector('[data-pro-scherm=verlopen]:not([hidden])');
  assert.equal(await p.locator('[data-pro-scherm=actief]').isHidden(), true);
  assert.equal(await p.locator('#pro-voorbeeld').isVisible(), false);
  // Gegevens downloaden kan ook na afloop
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-pro-scherm=verlopen] [data-pro-export]')]);
  assert.equal(dl.suggestedFilename(), 'mijn-gegevens-toeslagbuddy.json');
  // De server-emulatie weigert ook opslaan
  const fout = await p.evaluate(async () => {
    const v = document.querySelector('script[src*="pro-account.js"]').src.split('?')[1];
    const { demoAdapter } = await import('/js/pro-demo.js?' + v);
    return demoAdapter()
      .rpc('controle_opslaan', { gegevens: {} })
      .then(() => 'gelukt', (e) => e.code);
  });
  assert.equal(fout, 'geen_toegang');
  await axe(p, 'pro-verlopen');
  await ctx.close();
});

test('R10: ongeldige inloglink en geen sessie sturen terug naar inloggen met uitleg', async () => {
  const ctx = await nieuweContext();
  const p = await open(ctx, s.basis + '/pro/app/?demo=1#error=access_denied&error_code=otp_expired', fouten);
  await p.waitForURL('**/pro/inloggen/?reden=link&demo=1');
  assert.match(await tekst(p.locator('[data-pro-reden]')), /werkt niet \(meer\)/);
  await p.goto(s.basis + '/pro/app/?demo=1');
  await p.waitForURL('**/pro/inloggen/?demo=1');
  assert.equal(await p.locator('[data-pro-reden]').isHidden(), true);
  // Inloggen met een onbekend adres: nette melding
  const f = p.locator('form[data-pro-inloggen]');
  await f.locator('[name=email]').fill('onbekend@bewind.nl');
  await f.locator('button[type=submit]').click();
  assert.match(await tekst(f.locator('.formulier-status')), /kennen dit e-mailadres niet/);
  await ctx.close();
});

test('Beheer (demo): MFA, XSS wordt als tekst getoond, acties werken', async () => {
  const ctx = await nieuweContext();
  const p = await open(ctx, s.basis + '/beheer/?demo=1', fouten);
  await p.waitForSelector('[data-beheer-scherm=inloggen]:not([hidden])');
  await axe(p, 'beheer-inloggen');
  await p.fill('#bh-mail', 'ik@toeslagbuddy.nl');
  await p.click('form[data-beheer-email] button[type=submit]');
  await p.fill('#bh-code', '123456');
  await p.click('form[data-beheer-code] button[type=submit]');
  // Eerste keer: authenticator-app koppelen
  await p.waitForSelector('[data-beheer-scherm=mfa-inschrijven]:not([hidden])');
  assert.equal(await tekst(p.locator('[data-beheer-geheim]')), 'DEMO DEMO DEMO DEMO');
  await p.fill('#bh-mfa1', '000000');
  await p.click('form[data-beheer-mfa-inschrijven] button[type=submit]');
  assert.match(await tekst(p.locator('[data-beheer-status]')), /klopt niet/);
  await p.fill('#bh-mfa1', '123456');
  await p.click('form[data-beheer-mfa-inschrijven] button[type=submit]');
  await p.waitForSelector('[data-beheer-scherm=dashboard]:not([hidden])');

  // XSS-payload uit de database is tekst, geen HTML
  assert.equal(await p.evaluate(() => window.__xss), undefined);
  assert.equal(await p.locator('[data-beheer-organisaties] img, [data-beheer-berichten] img, [data-beheer-berichten] script').count(), 0);
  assert.match(await tekst(p.locator('[data-beheer-organisaties]')), /<img src=x onerror="window\.__xss=1">/);
  assert.match(await tekst(p.locator('[data-beheer-berichten]')), /<script>window\.__xss=2<\/script>/);
  // Niet doorgestuurde berichten zijn gemarkeerd
  assert.match(await tekst(p.locator('[data-bericht][data-doorgestuurd=false]')), /Niet doorgestuurd \(3 pogingen\)/);
  assert.equal(await tekst(p.locator('[data-beheer-tegel=actief] strong')), '1');
  assert.equal(await tekst(p.locator('[data-beheer-tegel=mrr] strong')), '€ 99');
  assert.equal(await tekst(p.locator('[data-beheer-tegel=niet-doorgestuurd] strong')), '1');
  await axe(p, 'beheer-dashboard');

  // Acties
  const rij = (naam) => p.locator('[data-beheer-organisaties] tbody tr', { hasText: naam });
  await rij('Bewindvoering De Brug').locator('[data-beheer-actie=actief]').click();
  assert.match(await tekst(p.locator('[data-beheer-status]')), /KvK-nummer verplicht/);
  await rij('Bewindvoering De Brug').locator('[data-beheer-actie=pilot]').click();
  await p.waitForSelector('[data-beheer-organisaties] tr[data-status=pilot]');
  assert.equal(await tekst(p.locator('[data-beheer-tegel=pilots] strong')), '1');
  await rij('Budgetcoach Noord').locator('[data-beheer-actie=actief]').click();
  await p.waitForFunction(() => document.querySelector('[data-beheer-tegel=actief] strong').textContent === '2');
  assert.equal(await tekst(p.locator('[data-beheer-tegel=mrr] strong')), '€ 198');
  await rij('Schuldhulp Oost').locator('[data-beheer-actie=opgezegd]').click();
  await p.waitForSelector('[data-beheer-organisaties] tr[data-status=opgezegd]');
  const acties = (await demoDb(p)).audit.map((a) => a.actie);
  assert.deepEqual(acties.filter((a) => a !== 'organisatie_aangemaakt'), ['pilot_verlengd', 'abonnement_gezet', 'abonnement_gezet']);
  assert.equal(await p.evaluate(() => window.__xss), undefined);

  // Herladen: sessie met MFA blijft; uitloggen vraagt opnieuw om stap 1
  await p.reload();
  await p.waitForSelector('[data-beheer-scherm=dashboard]:not([hidden])');
  await p.locator('[data-beheer-scherm=dashboard] [data-beheer-uitloggen]').click();
  await p.waitForSelector('[data-beheer-scherm=inloggen]:not([hidden])');
  // Opnieuw inloggen: nu alleen de code uit de app (factor bestaat al)
  await p.fill('#bh-mail', 'ik@toeslagbuddy.nl');
  await p.click('form[data-beheer-email] button[type=submit]');
  await p.fill('#bh-code', '123456');
  await p.click('form[data-beheer-code] button[type=submit]');
  await p.waitForSelector('[data-beheer-scherm=mfa]:not([hidden])');
  await p.fill('#bh-mfa2', '123456');
  await p.click('form[data-beheer-mfa] button[type=submit]');
  await p.waitForSelector('[data-beheer-scherm=dashboard]:not([hidden])');
  await ctx.close();
});

test('Beheer zonder Supabase: nette melding', async () => {
  const ctx = await nieuweContext();
  const p = await open(ctx, s.basis + '/beheer/', fouten);
  await p.waitForSelector('[data-beheer-scherm=niet-actief]:not([hidden])');
  const html = await p.content();
  assert.match(html, /<meta name="robots" content="noindex">/);
  await ctx.close();
});

test('geen JavaScript-fouten tijdens de Pro-tests', () => {
  assert.deepEqual(fouten, []);
});
