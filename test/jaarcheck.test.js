// Jaarcheck en het automatisch omschakelen van regels op 1 januari.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, alsTabel } from '../scripts/jaarcheck.js';
import { actueel } from '../src/familie/regels.js';

const regel = (id, jaar, extra = {}) => ({ id, jaar, titel: id, status: 'bevestigd', geldigVanaf: `${jaar}-01-01`, geldigTot: `${jaar}-12-31`, ...extra });

test('jaarcheck: per onderdeel klaar of niet, met tabel', () => {
  const regels = [regel('wlz-2026', 2026), regel('wlz-2027', 2027), regel('erfbelasting-2026', 2026), regel('zorgkosten-2027', 2027, { status: 'te-controleren' }), regel('wmo-2026', 2026), { id: 'salderen', titel: 'Salderen', geldigTot: '2029-12-31' }];
  const r = check({ jaar: 2027, toeslagenJaar: 2026, regels });
  const klaar = Object.fromEntries(r.map((x) => [x.wat, x.klaar]));
  assert.equal(klaar['Bedragen en grenzen toeslagen (src/calc/params.js)'], false);
  assert.equal(klaar['Eigen bijdrage verpleeghuis (CAK)'], true);
  assert.equal(klaar['Erfbelasting'], false);
  assert.equal(klaar['Aftrek zorgkosten'], false, 'nog niet bevestigd telt niet');
  assert.equal(klaar['Salderen'], true);
  assert.match(alsTabel(r, 2027), /\| Familie \| Erfbelasting \| 2026 \| \*\*nee\*\* \|/);
  assert.ok(check({ jaar: 2027, toeslagenJaar: 2027, regels })[0].klaar);
});

test('actueel: op 1 januari vanzelf de nieuwe regel; zonder nieuwe de nieuwste', () => {
  const regels = { 'wlz-2026': regel('wlz-2026', 2026), 'wlz-2027': regel('wlz-2027', 2027), 'erfbelasting-2026': regel('erfbelasting-2026', 2026) };
  assert.equal(actueel(regels, 'wlz', new Date('2026-12-31T12:00:00')).id, 'wlz-2026');
  assert.equal(actueel(regels, 'wlz', new Date('2027-01-01T08:00:00')).id, 'wlz-2027');
  assert.equal(actueel(regels, 'erfbelasting', new Date('2027-03-01')).id, 'erfbelasting-2026');
  assert.equal(actueel(regels, 'bestaat-niet'), null);
});
