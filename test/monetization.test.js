// Controleert dat advertenties en partnerlinks correct in de pagina komen
// zodra ze in site.config.js zijn ingevuld (en onzichtbaar blijven zolang niet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import config from '../site.config.js';
import { layout, advertentie, partnerBlok, partnersJson } from '../src/site/layout.js';

const pagina = { slug: '/test/', title: 'Test', description: 'd', h1: 'Test', versie: 'x', calc: 'zorgtoeslag' };

test('zonder instellingen: geen advertenties of partnerlinks', () => {
  const html = layout(pagina, '');
  assert.ok(!html.includes('adsbygoogle'));
  assert.equal(advertentie('slotInhoud'), '');
  assert.equal(partnerBlok('zorgverzekering'), '');
});

test('met AdSense-ID: verificatie, script en advertentieblok', () => {
  const oud = structuredClone(config.adsense);
  Object.assign(config.adsense, { client: 'ca-pub-1234567890123456', slotInhoud: '111', slotOnder: '222' });
  try {
    const html = layout(pagina, '');
    assert.match(html, /<meta name="google-adsense-account" content="ca-pub-1234567890123456">/);
    assert.match(html, /adsbygoogle\.js\?client=ca-pub-1234567890123456/);
    const blok = advertentie('slotInhoud');
    assert.match(blok, /data-ad-client="ca-pub-1234567890123456"/);
    assert.match(blok, /data-ad-slot="111"/);
  } finally {
    Object.assign(config.adsense, oud);
  }
});

test('met partnerlink: herkenbaar, rel=sponsored en in de rekenhulp beschikbaar', () => {
  const oud = config.partners.zorgverzekering.url;
  config.partners.zorgverzekering.url = 'https://partner.example/?id=1';
  try {
    const blok = partnerBlok('zorgverzekering');
    assert.match(blok, /Partnerlink/);
    assert.match(blok, /rel="sponsored nofollow noopener"/);
    assert.equal(JSON.parse(partnersJson()).zorgverzekering.url, 'https://partner.example/?id=1');
  } finally {
    config.partners.zorgverzekering.url = oud;
  }
});
