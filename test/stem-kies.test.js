// Keuze tussen de natuurlijke stem (Chatterbox) en Piper per fragment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opdracht, beter } from '../scripts/video/stem_kies.js';

test('opdracht: elk fragment met dezelfde referentie en een eigen uitvoer', () => {
  assert.deepEqual(opdracht({ 'familie-1': 'Hallo.' }, '/tmp/stem', '/tmp/nat'), [{ tekst: 'Hallo.', referentie: '/tmp/stem/referentie.wav', uit: '/tmp/nat/familie-1.wav' }]);
});

test('beter: natuurlijk als hij minstens zo menselijk klinkt; zonder meting vertrouwen we hem', () => {
  assert.equal(beter({ mos: 3.9, mos_referentie: 2.8 }), true);
  assert.equal(beter({ mos: 2.78, mos_referentie: 2.8 }), true);
  assert.equal(beter({ mos: 2.4, mos_referentie: 2.8 }), false);
  assert.equal(beter({ mos: null, mos_referentie: null }), true);
  assert.equal(beter(null), false);
});
