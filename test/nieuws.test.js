import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leesFeed, filter, samenvoegen } from '../scripts/rss.js';

const xml = readFileSync(new URL('./fixtures/feed.rss', import.meta.url), 'utf8');

test('nieuws: RSS wordt gelezen, HTML en entiteiten verwijderd', () => {
  const items = leesFeed(xml, 'Rijksoverheid');
  assert.equal(items.length, 2);
  assert.equal(items[0].titel, 'Huurtoeslag & zorgtoeslag 2027 bekend');
  assert.equal(items[0].samenvatting, 'De bedragen voor 2027 zijn bekend.');
  assert.equal(items[0].datum, '2026-11-20T09:00:00.000Z');
});

test('nieuws: filter op trefwoorden en samenvoegen zonder dubbelen', () => {
  const items = filter(leesFeed(xml, 'Rijksoverheid'));
  assert.deepEqual(items.map((i) => i.titel), ['Huurtoeslag & zorgtoeslag 2027 bekend']);
  const oud = [{ titel: 'oud', link: 'https://x/oud', datum: '2025-01-01T00:00:00.000Z' }, items[0]];
  const samen = samenvoegen(items, oud);
  assert.equal(samen.length, 2);
  assert.equal(samen[0].link, items[0].link);
});
