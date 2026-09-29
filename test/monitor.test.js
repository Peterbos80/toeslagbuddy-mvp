import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bedragenUit, vingerafdruk, verschil } from '../scripts/monitor-lib.js';

const html = `<html><script>var x = "€ 999";</script><main><h2>Zorgtoeslag</h2>
<p>U krijgt maximaal &euro;&nbsp;129 per maand.</p><table><tr><td>Inkomen</td><td>€ 40.857</td></tr></table>
<li>Afbouw 13,73%</li><p>Geen bedrag hier</p></main></html>`;

test('monitor: haalt alleen regels met bedragen en percentages', () => {
  const r = bedragenUit(html);
  assert.deepEqual(r, ['U krijgt maximaal € 129 per maand.', 'Inkomen € 40.857', 'Afbouw 13,73%']);
});

test('monitor: vingerafdruk en verschil', () => {
  const a = bedragenUit(html);
  const b = bedragenUit(html.replace('129', '140'));
  assert.notEqual(vingerafdruk(a), vingerafdruk(b));
  assert.deepEqual(verschil(a, b), { erbij: ['U krijgt maximaal € 140 per maand.'], weg: ['U krijgt maximaal € 129 per maand.'] });
});
