// Beveiliging en compliance van de gebouwde site (na `npm run build`):
// CSP als eerste element, geen inline scripts of event-handlers, geen scripts
// van derden op Pro/beheer, alleen toegestane e-mailadressen, security.txt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import config from '../site.config.js';
import { layout, csp, afgeschermd, advertentie, nieuwsbrief, bedrijfsgegevens } from '../src/site/layout.js';

const DIST = join(import.meta.dirname, '../dist');
const bestanden = [];
function zoek(map) {
  for (const f of readdirSync(map)) {
    const p = join(map, f);
    if (statSync(p).isDirectory()) zoek(p);
    else bestanden.push(p);
  }
}
if (existsSync(DIST)) zoek(DIST);
const html = bestanden.filter((f) => f.endsWith('.html'));
const skip = !html.length && 'eerst npm run build';
const pad = (f) => f.replace(DIST, '').replace(/index\.html$/, '');
const lees = (f) => readFileSync(f, 'utf8');

test('elke pagina: CSP-meta direct na charset, als eerste in <head>', { skip }, () => {
  for (const f of html) {
    const head = lees(f).match(/<head>\s*([\s\S]*?)<\/head>/)[1];
    const tags = head.match(/<[a-z][^>]*>/gi);
    assert.match(tags[0], /^<meta charset="utf-8">$/, pad(f));
    assert.match(tags[1], /^<meta http-equiv="Content-Security-Policy" content="[^"]*default-src 'self'/, pad(f));
    assert.ok(!/script-src[^;]*'unsafe-inline'/.test(tags[1]), `${pad(f)}: geen unsafe-inline voor scripts`);
    assert.ok(!/unsafe-eval/.test(tags[1]), pad(f));
  }
});

test('geen inline scripts, event-handlers of javascript:-links', { skip }, () => {
  for (const f of html) {
    const inhoud = lees(f);
    for (const [tag] of inhoud.matchAll(/<script\b[^>]*>/gi)) {
      assert.ok(/\ssrc="/.test(tag) || /type="application\/(ld\+)?json"/.test(tag), `${pad(f)}: inline script ${tag}`);
    }
    // Alleen tags bekijken, niet de inhoud van JSON-blokken
    const zonderData = inhoud.replace(/<script type="application\/(ld\+)?json"[^>]*>[\s\S]*?<\/script>/g, '');
    for (const [tag] of zonderData.matchAll(/<[a-z][^>]*>/gi)) {
      assert.ok(!/\son[a-z]+\s*=/i.test(tag), `${pad(f)}: event-handler in ${tag}`);
      assert.ok(!/javascript:/i.test(tag), `${pad(f)}: javascript: in ${tag}`);
    }
  }
});

test('Pro en beheer: strikte CSP, framebuster en geen scripts van derden', { skip }, () => {
  const pro = html.filter((f) => /[/\\](pro|beheer)[/\\]/.test(f));
  assert.ok(pro.length >= 5, 'Pro-pagina’s gevonden');
  for (const f of pro) {
    const inhoud = lees(f);
    const beleid = inhoud.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
    assert.match(beleid, /script-src 'self';/, pad(f));
    assert.match(beleid, /object-src 'none'/, pad(f));
    assert.match(beleid, /base-uri 'self'/, pad(f));
    assert.match(beleid, /form-action 'self'/, pad(f));
    assert.match(inhoud, /<script src="\/js\/framebuster\.js\?v=\w+"><\/script>/, pad(f));
    for (const [, src] of inhoud.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) assert.ok(src.startsWith('/'), `${pad(f)}: extern script ${src}`);
    assert.ok(!/plausible|goatcounter|adsbygoogle|googlesyndication/.test(inhoud), pad(f));
  }
});

test('alleen info@, privacy@ en security@toeslagbuddy.nl staan in de site', { skip }, () => {
  const toegestaan = new Set(['info@toeslagbuddy.nl', 'privacy@toeslagbuddy.nl', 'security@toeslagbuddy.nl']);
  const tekst = bestanden.filter((f) => ['.html', '.js', '.css', '.txt', '.xml', '.json', '.webmanifest', '.htaccess', ''].includes(extname(f)));
  const gevonden = [];
  for (const f of tekst) {
    for (const [adres] of lees(f).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
      if (!toegestaan.has(adres.toLowerCase())) gevonden.push(`${pad(f)}: ${adres}`);
    }
  }
  assert.deepEqual(gevonden, []);
  // En de footer toont info@ op elke pagina
  for (const f of html) assert.match(lees(f), /<p class="bedrijf">[\s\S]*mailto:info@toeslagbuddy\.nl/, pad(f));
});

test('geen geheime Supabase-sleutel (service_role) in de site', { skip }, () => {
  for (const f of bestanden.filter((f) => /\.(html|js|json)$/.test(f))) {
    const inhoud = lees(f);
    assert.ok(!/service_role/.test(inhoud), `${pad(f)}: service_role`);
    for (const [jwt] of inhoud.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)) {
      const payload = Buffer.from(jwt.split('.')[1], 'base64url').toString();
      assert.ok(!/service_role/.test(payload), `${pad(f)}: JWT met service_role`);
    }
  }
});

test('security.txt volgens RFC 9116', { skip }, () => {
  const txt = lees(join(DIST, '.well-known/security.txt'));
  assert.match(txt, /^Contact: mailto:security@toeslagbuddy\.nl$/m);
  assert.match(txt, /^Preferred-Languages: nl, en$/m);
  assert.match(txt, /^Canonical: https:\/\/www\.toeslagbuddy\.nl\/\.well-known\/security\.txt$/m);
  const verloopt = new Date(txt.match(/^Expires: (\S+)$/m)[1]);
  assert.ok(verloopt > new Date(), 'Expires ligt in de toekomst');
  assert.ok(verloopt - new Date() < 366 * 864e5, 'Expires maximaal een jaar vooruit');
});

test('rekenhulpen tonen een melding zonder JavaScript', { skip }, () => {
  assert.match(lees(join(DIST, 'index.html')), /<noscript><p class="geen-js">Deze rekenhulp werkt alleen met JavaScript/);
  assert.match(lees(join(DIST, 'pro/app/index.html')), /<noscript><p class="geen-js">/);
  assert.ok(!lees(join(DIST, 'privacy/index.html')).includes('<noscript>'));
});

// ── Zonder build: layout met ingevulde statistieken en advertenties ──
test('met statistieken en AdSense: wel op gewone pagina’s, niet op Pro en beheer', () => {
  const oud = { a: structuredClone(config.analytics), ad: structuredClone(config.adsense), nb: structuredClone(config.nieuwsbrief) };
  Object.assign(config.analytics, { plausibleDomain: 'toeslagbuddy.nl', goatcounterCode: 'tb' });
  Object.assign(config.adsense, { client: 'ca-pub-1234567890123456', slotInhoud: '111', slotOnder: '222' });
  Object.assign(config.nieuwsbrief, { formAction: 'https://nieuwsbrief.example/abonneer' });
  try {
    const gewoon = { slug: '/zorgtoeslag-berekenen/', title: 'T', description: 'd', h1: 'T', versie: 'x', calc: 'zorgtoeslag' };
    const g = layout(gewoon, '');
    assert.match(g, /plausible\.io\/js\/script\.js/);
    assert.match(g, /adsbygoogle\.js/);
    const beleid = csp(gewoon);
    assert.match(beleid, /script-src 'self' https:\/\/plausible\.io https:\/\/gc\.zgo\.at https:\/\/pagead2\.googlesyndication\.com/);
    assert.match(beleid, /connect-src [^;]*https:\/\/tb\.goatcounter\.com/);
    assert.match(beleid, /form-action 'self' https:\/\/nieuwsbrief\.example/);
    assert.notEqual(advertentie('slotInhoud', gewoon), '');
    for (const page of [
      { slug: '/pro/app/', pro: true },
      { slug: '/pro/check/' },
      { slug: '/pro/', title: 'Pro' },
      { slug: '/beheer/', pro: true, beheer: true },
    ]) {
      const p = { title: 'T', description: 'd', h1: 'T', versie: 'x', ...page };
      assert.ok(afgeschermd(p), p.slug);
      const h = layout(p, '');
      assert.ok(!/plausible|goatcounter|adsbygoogle|googlesyndication|nieuwsbrief\.example/.test(h), `${p.slug}: geen derden`);
      assert.equal(csp(p), "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
      assert.equal(advertentie('slotInhoud', p), '');
      assert.equal(nieuwsbrief(p), '');
      assert.match(h, /framebuster\.js/);
    }
    assert.ok(!layout(gewoon, '').includes('framebuster.js'));
  } finally {
    Object.assign(config.analytics, oud.a);
    Object.assign(config.adsense, oud.ad);
    Object.assign(config.nieuwsbrief, oud.nb);
  }
});

test('met Supabase: alleen dat domein erbij in connect-src', () => {
  const oud = config.pro.supabaseUrl;
  config.pro.supabaseUrl = 'https://abcdefgh.supabase.co';
  try {
    assert.match(csp({ slug: '/pro/app/', pro: true }), /connect-src 'self' https:\/\/abcdefgh\.supabase\.co wss:\/\/abcdefgh\.supabase\.co;/);
  } finally {
    config.pro.supabaseUrl = oud;
  }
});

test('bedrijfsgegevens in de footer (art. 3:15d BW)', () => {
  const oud = structuredClone(config.bedrijf);
  Object.assign(config.bedrijf, { naam: 'J. Jansen', handelsnaam: 'ToeslagBuddy', vestigingsplaats: 'Utrecht', kvk: '12345678', btwId: 'NL001234567B01' });
  try {
    const b = bedrijfsgegevens();
    for (const deel of ['J. Jansen', 'handelend onder de naam ToeslagBuddy', 'gevestigd in Utrecht', 'mailto:info@toeslagbuddy.nl', 'KvK 12345678', 'btw-id NL001234567B01']) assert.ok(b.includes(deel), deel);
  } finally {
    Object.assign(config.bedrijf, oud);
  }
  // Leeg: in elk geval de naam en info@
  assert.match(bedrijfsgegevens(), /<strong>ToeslagBuddy<\/strong>.*mailto:info@toeslagbuddy\.nl/);
});
