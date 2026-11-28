import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seizoen } from '../src/site/seizoen.js';

const d = (s) => new Date(`${s}T08:00:00`);
test('seizoensbalk wisselt vanzelf met de datum', () => {
  assert.equal(seizoen(d('2026-11-28')).url, '/zorgverzekering-overstappen/');
  assert.match(seizoen(d('2026-12-31')).tekst, /Zorgverzekering 2027/);
  assert.equal(seizoen(d('2027-01-15')).url, '/zorgtoeslag-berekenen/');
  assert.equal(seizoen(d('2027-04-10')).url, '/toeslag-terugbetalen/');
  assert.match(seizoen(d('2027-08-31')).tekst, /over 2026/);
  assert.equal(seizoen(d('2027-09-01')), null);
  assert.equal(seizoen(d('2027-06-15')), null);
});
