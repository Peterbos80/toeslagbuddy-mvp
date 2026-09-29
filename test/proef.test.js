import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proefStatus, proefEind } from '../src/calc/proef.js';

const nu = new Date('2026-10-01T12:00:00Z');

test('proef: 7 dagen, telt af, verloopt', () => {
  const eind = proefEind('2026-10-01T12:00:00Z', 7);
  assert.equal(eind, '2026-10-08T12:00:00.000Z');
  assert.deepEqual({ ...proefStatus({ proef_eind: eind }, nu), eind: undefined }, { toegang: true, soort: 'proef', dagenOver: 7, eind: undefined });
  assert.equal(proefStatus({ proef_eind: eind }, new Date('2026-10-07T13:00:00Z')).dagenOver, 1);
  const verlopen = proefStatus({ proef_eind: eind }, new Date('2026-10-08T12:00:01Z'));
  assert.equal(verlopen.toegang, false);
  assert.equal(verlopen.soort, 'verlopen');
});

test('proef: betaald abonnement heeft altijd toegang, geen profiel nooit', () => {
  assert.equal(proefStatus({ proef_eind: '2020-01-01', abonnement: 'actief' }, nu).toegang, true);
  assert.equal(proefStatus(null, nu).toegang, false);
  assert.equal(proefStatus({ proef_eind: 'onzin' }, nu).toegang, false);
});
