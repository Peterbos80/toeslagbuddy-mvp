import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snelcheck } from '../src/calc/snelcheck-motor.js';

const ids = (r) => r.map((x) => x.id);
const kans = (r, id) => r.find((x) => x.id === id)?.kans;

test('snelcheck: alleen zorgtoeslag zonder huur en kinderen', () => {
  assert.deepEqual(ids(snelcheck({ partner: false, klasse: 0, huurt: false, kinderen: false })), ['zorgtoeslag']);
});

test('snelcheck: laag inkomen geeft grote kans, rond de grens misschien, ver erboven klein', () => {
  assert.equal(kans(snelcheck({ partner: false, klasse: 0 }), 'zorgtoeslag'), 'groot');
  assert.equal(kans(snelcheck({ partner: false, klasse: 2 }), 'zorgtoeslag'), 'misschien');
  assert.equal(kans(snelcheck({ partner: false, klasse: 3 }), 'zorgtoeslag'), 'klein');
  // Met partner ligt de grens hoger
  assert.equal(kans(snelcheck({ partner: true, klasse: 2 }), 'zorgtoeslag'), 'groot');
});

test('snelcheck: huur, kinderen en opvang voegen de juiste regelingen toe', () => {
  const r = snelcheck({ partner: true, klasse: 1, huurt: true, kinderen: true, opvang: true });
  assert.deepEqual(ids(r), ['zorgtoeslag', 'huurtoeslag', 'kinderbijslag', 'kindgebondenBudget', 'kinderopvangtoeslag']);
  assert.equal(kans(r, 'kinderbijslag'), 'groot');
  // Opvang telt alleen met kinderen
  assert.ok(!ids(snelcheck({ partner: false, klasse: 1, opvang: true })).includes('kinderopvangtoeslag'));
});
