// Voorlezen alleen met lokale stemmen (R9)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kiesLokaleStem, lokaleStem } from '../public/js/stem.js';

const stem = (name, lang, localService) => ({ name, lang, localService });

test('kiest een lokale Nederlandse stem, nooit een netwerkstem', () => {
  const google = stem('Google Nederlands', 'nl-NL', false);
  const xander = stem('Xander', 'nl-NL', true);
  const ellen = stem('Ellen', 'nl-BE', true);
  const engels = stem('Daniel', 'en-GB', true);
  assert.equal(kiesLokaleStem([google, engels, ellen, xander], 'nl-NL'), xander);
  assert.equal(kiesLokaleStem([google, engels, ellen], 'nl-NL'), ellen); // zelfde taal, andere regio
  assert.equal(kiesLokaleStem([google, engels], 'nl-NL'), null);
  assert.equal(kiesLokaleStem([google, engels, xander], 'en-GB'), engels);
  // underscore-notatie en alleen de taalcode
  assert.equal(kiesLokaleStem([stem('X', 'nl_NL', true)], 'nl-NL')?.name, 'X');
  assert.equal(kiesLokaleStem([xander], 'nl')?.name, 'Xander');
});

test('geen of rare stemmenlijst geeft null', () => {
  assert.equal(kiesLokaleStem([], 'nl-NL'), null);
  assert.equal(kiesLokaleStem(undefined, 'nl-NL'), null);
  assert.equal(kiesLokaleStem([null, {}, stem('Zonder taal', undefined, true), stem('Onbekend', 'nl-NL', undefined)], 'nl-NL'), null);
});

test('buiten de browser: geen stem', () => {
  assert.equal(lokaleStem('nl-NL'), null);
});
