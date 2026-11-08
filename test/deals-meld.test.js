// Bewijsmail (meld.js + mail.js) en de logica van de Edge Function deals-zoek.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verwerk } from '../scripts/deals/verzamel.js';
import { schrijfHistorie, schrijfJson } from '../scripts/deals/opslag.js';
import { meld } from '../scripts/deals/meld.js';
import { maakMeldingMail, schoonOnderwerp } from '../scripts/deals/mail.js';
import { grafiekPng } from '../scripts/deals/png.js';
import { grafiekData } from '../src/deals/grafiek.js';
import { sseLezer } from '../src/deals/samenvoegen.js';

const NU = Date.parse('2026-11-08T12:00:00Z');
const DAG = 864e5;

// Historie: twee echte winkels, 60 dagen € 100 en vandaag € 69 bij A
function maakMap({ titel = 'Parfum <script>x</script> Bloesem 50 ml', winkels = ['Winkel A', 'Winkel B'], dagen = 60, nu = 69, demo = false } = {}) {
  const map = mkdtempSync(join(tmpdir(), 'meld-'));
  const historie = { producten: new Map(), vluchten: new Map() };
  const ruw = [];
  for (let n = dagen; n >= 0; n--) {
    for (const w of winkels) ruw.push({ ean: '4006381333931', titel, merk: 'Maison', categorie: 'parfum', winkel: w, prijs: n === 0 && w === winkels[0] ? nu : 100, verzendkosten: 0, url: `https://${w.replace(/\W/g, '').toLowerCase()}.example/p`, bron: w === winkels[0] ? 'daisycon' : 'jager', affiliate: w === winkels[0], demo, tijd: new Date(NU - n * DAG).toISOString() });
  }
  verwerk(ruw, historie, { nu: NU });
  schrijfHistorie(historie, map);
  schrijfJson(join(map, 'status.json'), { bijgewerkt: new Date(NU).toISOString() });
  schrijfJson(join(map, 'alarmen.json'), { regels: [{ id: 'parfum', type: 'categorie', waarde: 'parfum', minKorting: 25 }] });
  return map;
}

function brevoNep() {
  const verzoeken = [];
  const f = async (url, opties) => {
    verzoeken.push({ url, opties, body: JSON.parse(opties.body) });
    return new Response('{"messageId":"x"}', { status: 201 });
  };
  return { f, verzoeken };
}

test('meld zonder geheimen: proefdraai naar concept-meldingen, niets versturen of markeren', async () => {
  const map = maakMap();
  try {
    let gebeld = false;
    const r = await meld({ env: {}, map, nu: NU, log: () => {}, fetch: async () => ((gebeld = true), new Response('')) });
    assert.equal(r.proef, true);
    assert.equal(r.nieuw, 1);
    assert.equal(gebeld, false);
    const bestanden = readdirSync(join(map, 'concept-meldingen'));
    assert.equal(bestanden.length, 2);
    assert.ok(!existsSync(join(map, 'verzonden.json')), 'proefdraai markeert niets');
    const html = readFileSync(join(map, 'concept-meldingen', bestanden.find((b) => b.endsWith('.html'))), 'utf8');
    assert.match(html, /Bewijs/);
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});

test('meld met Brevo: ontvanger uit env, afzender deals@, ge-escaped, tekstversie, bewijs', async () => {
  const map = maakMap();
  try {
    const { f, verzoeken } = brevoNep();
    const logs = [];
    const r = await meld({ env: { BREVO_API_KEY: 'sleutel', DEALS_EMAIL: 'eigenaar@voorbeeld.nl' }, map, nu: NU, log: (x) => logs.push(x), fetch: f });
    assert.equal(r.verstuurd, 1);
    assert.equal(verzoeken.length, 1);
    const { url, opties, body } = verzoeken[0];
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(opties.headers['api-key'], 'sleutel');
    assert.deepEqual(body.to, [{ email: 'eigenaar@voorbeeld.nl' }]);
    assert.deepEqual(body.sender, { name: 'DealBuddy', email: 'deals@toeslagbuddy.nl' });
    assert.ok(!/[\r\n]/.test(body.subject));
    assert.match(body.subject, /31% onder de gangbare prijs/);
    assert.ok(!body.htmlContent.includes('<script>x'), 'titel ge-escaped');
    assert.match(body.htmlContent, /&lt;script&gt;/);
    assert.match(body.htmlContent, /€ 69,00/);
    assert.match(body.htmlContent, /Gangbare prijs: <b>€ 100,00<\/b>/);
    assert.match(body.htmlContent, /Laagste prijs in de 30 dagen hiervoor: <b>€ 100,00<\/b>/);
    assert.match(body.htmlContent, /partnerlink/);
    assert.match(body.htmlContent, /Gemeten op <b>61<\/b> dagen, bij <b>2<\/b> winkel/);
    assert.match(body.htmlContent, /Winkel A[\s\S]*Winkel B/);
    assert.match(body.htmlContent, /2026-W4\d/);
    assert.match(body.htmlContent, /\/deals\/bewijs\/parfum-script-x-script-bloesem-50-ml\//);
    assert.match(body.htmlContent, /grafiek\.png/);
    assert.match(body.textContent, /Per week \(laagste \/ mediaan\)/);
    // Geen adres in logs of opgeslagen bestanden
    assert.ok(!logs.join('\n').includes('eigenaar@'));
    const verzonden = readFileSync(join(map, 'verzonden.json'), 'utf8');
    assert.ok(!verzonden.includes('eigenaar@'));
    assert.equal(JSON.parse(verzonden)['4006381333931'].prijs, 69);
    // Tweede ronde: dezelfde prijs → niets
    assert.equal((await meld({ env: { BREVO_API_KEY: 'sleutel', DEALS_EMAIL: 'eigenaar@voorbeeld.nl' }, map, nu: NU, log: () => {}, fetch: f })).nieuw, 0);
    assert.equal(verzoeken.length, 1);
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});

test('meld: opnieuw bij ≥ 5% extra daling; niet bij een kleine daling', async () => {
  const map = maakMap();
  try {
    const { f, verzoeken } = brevoNep();
    const env = { BREVO_API_KEY: 'k', DEALS_EMAIL: 'x@voorbeeld.nl' };
    await meld({ env, map, nu: NU, log: () => {}, fetch: f });
    const v = JSON.parse(readFileSync(join(map, 'verzonden.json'), 'utf8'));
    writeFileSync(join(map, 'verzonden.json'), JSON.stringify({ ...v, '4006381333931': { prijs: 71, tijd: 'x' } }));
    assert.equal((await meld({ env, map, nu: NU, log: () => {}, fetch: f })).nieuw, 0, '69 is minder dan 5% onder 71');
    writeFileSync(join(map, 'verzonden.json'), JSON.stringify({ ...v, '4006381333931': { prijs: 80, tijd: 'x' } }));
    assert.equal((await meld({ env, map, nu: NU, log: () => {}, fetch: f })).verstuurd, 1);
    assert.equal(verzoeken.length, 2);
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});

test('meld: te weinig bewijs → geen mail (1 winkel, te kort, demo)', async () => {
  for (const [opties, env] of [
    [{ winkels: ['Alleen'] }, {}],
    [{ dagen: 20 }, {}],
    [{ demo: true }, {}],
    [{ dagen: 20 }, { DEALS_MIN_DAGEN: '10' }],
  ]) {
    const map = maakMap(opties);
    try {
      const { f, verzoeken } = brevoNep();
      await meld({ env: { BREVO_API_KEY: 'k', DEALS_EMAIL: 'x@voorbeeld.nl', ...env }, map, nu: NU, log: () => {}, fetch: f });
      assert.equal(verzoeken.length, env.DEALS_MIN_DAGEN ? 1 : 0, JSON.stringify(opties));
    } finally {
      rmSync(map, { recursive: true, force: true });
    }
  }
});

test('meld: Brevo weigert → niet gemarkeerd; dagquotum → volgende dag', async () => {
  const map = maakMap();
  try {
    const env = { BREVO_API_KEY: 'k', DEALS_EMAIL: 'x@voorbeeld.nl' };
    const r = await meld({ env, map, nu: NU, log: () => {}, fetch: async () => new Response('', { status: 402 }) });
    assert.equal(r.fout, 402);
    assert.ok(!existsSync(join(map, 'verzonden.json')));
    writeFileSync(join(map, 'verzonden.json'), JSON.stringify({ _teller: { datum: '2026-11-08', aantal: 250 } }));
    assert.equal((await meld({ env, map, nu: NU, log: () => {}, fetch: brevoNep().f })).quotum, true);
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});

test('mail: onderwerp zonder CR/LF, digest van meerdere deals, PNG-grafiek', () => {
  assert.equal(schoonOnderwerp('a\r\nBcc: x@y.nl'), 'a Bcc: x@y.nl');
  const deal = { soort: 'product', id: '1', titel: 'A', winkel: 'W', totaal: 1, gangbaar: 2, laagste30: 2, echteKorting: 0.5, pagina: '/deals/p/a/', winkelsGezien: 2 };
  const bewijs = { winkels: [], weken: [], dagen: 40, bronnen: ['x'] };
  const m = maakMeldingMail([{ deal, bewijs, regels: [{ type: 'categorie', waarde: 'parfum' }] }, { deal: { ...deal, id: '2', titel: 'B' }, bewijs, regels: [{ type: 'zoekterm', waarde: 'b' }] }], { naar: 'x@voorbeeld.nl' });
  assert.equal(m.subject, 'DealBuddy: 2 deals met bewijs');
  const png = grafiekPng({ vandaag: '2026-11-08', gangbaar: 10, laagste30: 9, beste: { totaal: 8 }, winkels: [{ kleur: 0, punten: [{ datum: '2026-10-01', totaal: 10 }, { datum: '2026-11-08', totaal: 8 }] }] });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.length > 500);
  assert.equal(typeof grafiekData, 'function');
});

// ── Edge Function deals-zoek (logica.ts, via type stripping in Node 22.18+) ──
let L = null;
try {
  L = await import('../supabase/functions/deals-zoek/logica.ts');
} catch {
  L = null;
}
const tl = L ? test : test.skip;

tl('live: vraag controleren, SSE heen en terug', () => {
  assert.equal(L.parseVraag({}), null);
  assert.deepEqual(L.parseVraag({ q: '  koptelefoon\u0000 ', categorie: 'Elek tronica' }), { q: 'koptelefoon' });
  assert.deepEqual(L.parseVraag({ q: '', vlucht: { van: 'AMS', naar: 'LIS', maand: '2027-05' } }), { q: '', vlucht: { van: 'AMS', naar: 'LIS', maand: '2027-05' } });
  assert.equal(L.parseVraag({ q: '', vlucht: { van: 'Amsterdam', naar: 'LIS' } }), null);
  assert.equal(L.parseVraag({ q: 'x'.repeat(200) }).q.length, 80);
  const uit = [];
  const lezer = sseLezer((b) => uit.push(b));
  lezer.voeg(L.sseEvent('bron', { bron: 'bol', status: 'ok', aanbiedingen: [{ titel: 'a\nb' }] }) + L.sseEvent('klaar', {}));
  assert.deepEqual(uit.map((b) => b.event), ['bron', 'klaar']);
  assert.equal(uit[0].data.aanbiedingen[0].titel, 'a\nb');
});

tl('live: snelheidslimiet per minuut en cache van 10 minuten', () => {
  const s = new L.Snelheid(2);
  assert.ok(s.mag('ip', 0) && s.mag('ip', 1));
  assert.equal(s.mag('ip', 2), false);
  assert.ok(s.mag('ander', 2));
  assert.ok(s.mag('ip', 60001), 'nieuwe minuut');
  const c = new L.Cache(600000, 2);
  c.zet('a', 1, 0);
  assert.equal(c.pak('a', 599999), 1);
  assert.equal(c.pak('a', 600001), undefined);
  c.zet('x', 1, 0);
  c.zet('y', 2, 0);
  c.zet('z', 3, 0);
  assert.equal(c.pak('x', 1), undefined, 'oudste eruit bij vol');
});

tl('live: time-out en fouten per bron worden een status', async () => {
  const traag = await L.metTimeout('traag', 30, () => new Promise((r) => setTimeout(() => r([]), 200)));
  assert.equal(traag.status, 'timeout');
  const fout = await L.metTimeout('stuk', 100, async () => {
    throw new Error('x');
  });
  assert.equal(fout.status, 'fout');
  const ok = await L.metTimeout('ok', 100, async () => [{ titel: 'a', winkel: 'b', totaal: 1 }]);
  assert.equal(ok.status, 'ok');
  assert.equal(ok.aanbiedingen.length, 1);
});

tl('live: bol.com, Travelpayouts, robots.txt en JSON-LD-verificatie', () => {
  const b = L.parseBol({ results: [{ product: { ean: '4006381333931', title: 'Koptelefoon', url: 'https://www.bol.com/p/1' }, offer: { price: 99.99, deliveryCosts: 0 } }, { product: { title: 'Goedkoop' }, offer: { price: '9,99' } }, { product: {} }] });
  assert.equal(b.length, 2);
  assert.equal(b[0].totaal, 99.99);
  assert.equal(b[1].verzendkosten, null, 'onder € 25 zonder info: onbekend');
  assert.equal(L.parseTravelpayouts({ data: [{ origin: 'AMS', destination: 'LIS', price: 59, airline: 'TP', departure_at: '2027-01-14T06:25:00+01:00', link: '/s' }] })[0].totaal, 59);
  const robots = 'User-agent: *\nDisallow: /\n\nUser-agent: DealBuddyBot\nDisallow: /privé\nAllow: /';
  assert.equal(L.robotsToegestaan(robots, '/p/1'), true);
  assert.equal(L.robotsToegestaan(robots, '/privé/x'), false);
  assert.equal(L.robotsToegestaan('User-agent: *\nDisallow: /', '/p/1'), false);
  assert.equal(L.robotsToegestaan('', '/p/1'), true);
  const html = readFileSync(join(import.meta.dirname, 'fixtures/deals/product-jsonld.html'), 'utf8');
  assert.deepEqual(L.jsonLdPrijs(html), { prijs: 47.5, verzendkosten: 3.95 }, 'Product in @graph');
  assert.equal(L.jsonLdPrijs('<p>geen</p>'), null);
});
