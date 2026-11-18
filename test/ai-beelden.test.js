// AI-beelden (Veo via de Gemini API): model kiezen, wat er gemaakt moet
// worden, het verzoek en de afhandeling, met een nagebootste API (geen kosten).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kiesModel, nogTeMaken, verzoek, videoUri, maakClient, wensen, promptHash } from '../scripts/video/ai-beelden.js';
import { NEGATIEF } from '../scripts/video/uitleg-scenes.js';

const m = (name, methods = ['predictLongRunning']) => ({ name: `models/${name}`, supportedGenerationMethods: methods });

test('model: stabiele Veo eerst, de snelle variant voorop; niets zonder predictLongRunning', () => {
  const lijst = [m('gemini-2.5-flash', ['generateContent']), m('veo-3.1-generate-preview'), m('veo-3.1-fast-generate-001'), m('veo-3.1-generate-001'), m('veo-2.0-generate-001')];
  assert.equal(kiesModel(lijst), 'veo-3.1-fast-generate-001');
  // Een nieuwere preview gaat nog steeds voor een veel ouder model (staat hij in de lijst, dan werkt hij)
  assert.equal(kiesModel([m('veo-3.1-generate-preview'), m('veo-2.0-generate-001')]), 'veo-3.1-generate-preview');
  assert.equal(kiesModel([m('veo-3.1-fast-generate-preview'), m('veo-3.1-generate-001')]), 'veo-3.1-generate-001');
  assert.equal(kiesModel([m('gemini-omni-1.1-flash')]), 'gemini-omni-1.1-flash');
  assert.equal(kiesModel([m('gemini-2.5-flash', ['generateContent'])]), null);
  assert.equal(kiesModel(lijst, 'veo-3.1-generate-001'), 'veo-3.1-generate-001');
  assert.equal(kiesModel(lijst, 'bestaat-niet'), null);
});

test('wat maken: ontbrekend of gewijzigde prompt; met de hand toegevoegde clips blijven staan', () => {
  const lijst = [{ naam: 'a-1', hash: 'x' }, { naam: 'a-2', hash: 'y' }, { naam: 'a-3', hash: 'z' }, { naam: 'a-4', hash: 'w' }];
  const index = { 'a-1': { hash: 'x' }, 'a-2': { hash: 'oud' } };
  const bestaat = (n) => n !== 'a-3';
  // a-1 klopt, a-2 prompt veranderd, a-3 ontbreekt, a-4 met de hand (geen indexregel) → laten staan
  assert.deepEqual(nogTeMaken(lijst, index, bestaat).map((w) => w.naam), ['a-2', 'a-3']);
});

test('scènes: 11 filmbeelden, elk met vaste stijl, en een andere prompt geeft een andere hash', () => {
  const w = wensen();
  assert.equal(w.length, 11);
  for (const x of w) {
    assert.match(x.prompt, /No on-screen text/);
    assert.doesNotMatch(x.prompt, /Belastingdienst|CAK|Rijksoverheid|logo of/i);
  }
  assert.notEqual(promptHash('a'), promptHash('b'));
  const v = verzoek('test');
  assert.deepEqual(v.instances, [{ prompt: 'test' }]);
  assert.equal(v.parameters.aspectRatio, '16:9');
  assert.equal(v.parameters.negativePrompt, NEGATIEF);
});

test('client: start, wacht tot klaar, downloadt met de sleutel in de header', async () => {
  const log = [];
  let poll = 0;
  const haal = async (url, opties = {}) => {
    log.push({ url, opties });
    if (url.endsWith(':predictLongRunning')) return { ok: true, status: 200, text: async () => JSON.stringify({ name: 'models/veo/operations/op1' }) };
    if (url.endsWith('/operations/op1')) {
      poll++;
      return { ok: true, status: 200, text: async () => JSON.stringify(poll < 2 ? { name: 'x', done: false } : { done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://files.example/v.mp4' } }] } } }) };
    }
    if (url === 'https://files.example/v.mp4') return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
    throw new Error('onbekend ' + url);
  };
  const c = maakClient({ sleutel: 'TESTSLEUTEL', haal, wacht: async () => {} });
  const buf = await c.maak('veo-3.1-fast-generate-001', 'een keukentafel');
  assert.deepEqual([...buf], [1, 2, 3]);
  assert.equal(poll, 2);
  assert.match(log[0].url, /\/v1beta\/models\/veo-3\.1-fast-generate-001:predictLongRunning$/);
  assert.equal(JSON.parse(log[0].opties.body).instances[0].prompt, 'een keukentafel');
  for (const l of log) assert.equal(l.opties.headers['x-goog-api-key'], 'TESTSLEUTEL');
  // De sleutel staat nooit in een adres
  for (const l of log) assert.doesNotMatch(l.url, /TESTSLEUTEL/);
});

test('client: geweigerd door het filter of een API-fout geeft een duidelijke melding', async () => {
  const geweigerd = async (url) => (url.endsWith(':predictLongRunning') ? { ok: true, status: 200, text: async () => JSON.stringify({ name: 'op', done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ['x'] } } }) } : null);
  await assert.rejects(maakClient({ sleutel: 's', haal: geweigerd }).maak('veo', 'p'), /geen video in het antwoord/);
  const fout = async () => ({ ok: false, status: 403, text: async () => JSON.stringify({ error: { message: 'Billing required' } }) });
  await assert.rejects(maakClient({ sleutel: 's', haal: fout }).maak('veo', 'p'), /API 403: Billing required/);
  assert.equal(videoUri({ response: { generatedVideos: [{ video: { uri: 'u' } }] } }), 'u');
  assert.equal(videoUri({}), null);
});
