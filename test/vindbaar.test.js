// Vindbaarheid: robots.txt, llms.txt, vingerafdrukken en de IndexNow-melding.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { robotsTxt, llmsTxt, vingerafdruk, verificatie, sleutelGeldig, AI_ROBOTS } from '../src/site/vindbaar.js';
import { verschil, bericht, meld } from '../scripts/indexnow.js';

const cfg = { naam: 'ToeslagBuddy', url: 'https://www.voorbeeld.example', vindbaar: { indexnowSleutel: 'a1b2c3d4e5f60718', google: '', bing: '' } };

test('robots.txt: alles open behalve de apps, AI-zoekrobots welkom, sitemap erbij', () => {
  const r = robotsTxt(cfg);
  assert.match(r, /User-agent: \*\nAllow: \/\nDisallow: \/familie\/app\//);
  assert.match(r, /Disallow: \/beheer\//);
  for (const robot of AI_ROBOTS) assert.ok(r.includes(`User-agent: ${robot}`), robot);
  assert.match(r, /Sitemap: https:\/\/www\.voorbeeld\.example\/sitemap\.xml/);
  assert.doesNotMatch(r, /Disallow: \/\n/);
});

test('llms.txt: groepen met alleen Nederlandse, indexeerbare pagina’s', () => {
  const paginas = [
    { slug: '/', h1: 'Toeslagen berekenen', description: 'Bereken  je\ntoeslagen.', taal: 'nl' },
    { slug: '/familie/', h1: 'Familie', description: 'Samen regelen.', taal: 'nl' },
    { slug: '/familie/gids/erfenis/', h1: 'Erfenis', description: 'Gids.', taal: 'nl' },
    { slug: '/familie/app/', h1: 'App', description: 'x', taal: 'nl', noindex: true },
    { slug: '/deals/', h1: 'Deals', description: 'Prijzen.', taal: 'nl' },
    { slug: '/deals/p/iets/', h1: 'Product', description: 'x', taal: 'nl' },
    { slug: '/en/', h1: 'Benefits', description: 'x', taal: 'en' },
  ];
  const t = llmsTxt(cfg, paginas, { gecontroleerd: '2026-11-16' });
  assert.match(t, /^# ToeslagBuddy\n\n> /);
  assert.match(t, /- \[Toeslagen berekenen\]\(https:\/\/www\.voorbeeld\.example\/\): Bereken je toeslagen\./);
  assert.match(t, /## Familie: gidsen\n\n- \[Erfenis\]/);
  assert.match(t, /## Besparen: prijzen met bewijs\n\n- \[Deals\]/);
  assert.doesNotMatch(t, /familie\/app|\/deals\/p\/|\/en\//);
  assert.match(t, /laatst gecontroleerd: 2026-11-16/);
  assert.doesNotMatch(t, /\n\n\n/);
});

test('vingerafdruk: een nieuw versienummer is geen wijziging, andere tekst wel', () => {
  const a = vingerafdruk('<link href="/css/site.css?v=abc123"><p>Hallo</p>');
  assert.equal(a, vingerafdruk('<link href="/css/site.css?v=def456"><p>Hallo</p>'));
  assert.notEqual(a, vingerafdruk('<link href="/css/site.css?v=abc123"><p>Hallo!</p>'));
});

test('verificatie: alleen een nette code komt in de pagina', () => {
  assert.equal(verificatie(cfg), '');
  assert.equal(verificatie({ vindbaar: { google: 'abc_DEF-1234567890' } }), '\n<meta name="google-site-verification" content="abc_DEF-1234567890">');
  assert.equal(verificatie({ vindbaar: { google: '"><script>alert(1)</script>', bing: 'kort' } }), '');
  assert.equal(sleutelGeldig('32a0a0b283390f0207c2e4ff52850c18'), true);
  assert.equal(sleutelGeldig('../geheim'), false);
});

test('IndexNow: alleen gewijzigde pagina’s, met sleutel en host; niets doen zonder wijziging', async () => {
  assert.deepEqual(verschil(null, { '/': 'a', '/x/': 'b' }), ['/', '/x/']);
  assert.deepEqual(verschil({ '/': 'a', '/x/': 'b', '/weg/': 'c' }, { '/': 'a', '/x/': 'B', '/nieuw/': 'd' }), ['/x/', '/nieuw/']);
  assert.deepEqual(bericht(cfg, ['/x/']), { host: 'www.voorbeeld.example', key: 'a1b2c3d4e5f60718', keyLocation: 'https://www.voorbeeld.example/a1b2c3d4e5f60718.txt', urlList: ['https://www.voorbeeld.example/x/'] });
  const log = [];
  const haalOp = async (url, opties = {}) => {
    log.push({ url, opties });
    if (url.endsWith('/inhoud.json')) return { ok: true, status: 200, json: async () => ({ paginas: { '/': 'a', '/x/': 'B' } }) };
    return { ok: true, status: 202 };
  };
  assert.deepEqual(await meld({ cfg, oud: { '/': 'a', '/x/': 'b' }, haalOp }), { gemeld: 1, status: 202, reden: 'ok' });
  assert.equal(log[1].url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(log[1].opties.body).urlList, ['https://www.voorbeeld.example/x/']);
  log.length = 0;
  assert.deepEqual(await meld({ cfg, oud: { '/': 'a', '/x/': 'B' }, haalOp }), { gemeld: 0, reden: 'niets gewijzigd' });
  assert.equal(log.length, 1);
  assert.deepEqual(await meld({ cfg: { ...cfg, vindbaar: {} }, haalOp }), { gemeld: 0, reden: 'geen sleutel' });
  assert.equal((await meld({ cfg, haalOp: async () => ({ ok: false, status: 404 }) })).reden, 'inhoud.json niet bereikbaar');
});

test('advertenties: nooit op Familie of in de apps', async () => {
  const { zonderAdvertenties } = await import('../src/site/layout.js');
  assert.equal(zonderAdvertenties({ slug: '/familie/' }), true);
  assert.equal(zonderAdvertenties({ slug: '/familie/rekenhulp/verpleeghuis/' }), true);
  assert.equal(zonderAdvertenties({ slug: '/zorgtoeslag-berekenen/' }), false);
});
