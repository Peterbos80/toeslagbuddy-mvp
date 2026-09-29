import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videoPlan, alleClips, planCompleet, SEGMENTEN } from '../src/calc/videoplan.js';
import { PERSONAS } from '../src/calc/uitleg.js';
import { allesCheck, zorgtoeslag } from '../src/calc/toeslagen.js';
import { maakClip, hashVan } from '../scripts/maak-avatar-videos.js';

test('videoplan: complete check met persoonlijke ondertitels, zonder bedragen in de clips', () => {
  const d = { leeftijd: 20, inkomen: 9000, huurt: true, kaleHuur: 520, kinderen: [] };
  const plan = videoPlan('alles', allesCheck(d), PERSONAS.sanne);
  assert.deepEqual(plan.map((s) => s.segment), ['intro', 'ja', 'zorgtoeslag', 'huurtoeslag', 'tip', 'aanvragen']);
  assert.match(plan[2].ondertitel.replace(/\s/g, ' '), /Zorgtoeslag: € 129 per maand/);
  // Gesproken teksten bevatten geen persoonlijke bedragen
  for (const [naam, tekst] of Object.entries(SEGMENTEN)) {
    if (naam === 'tip' || naam === 'intro') continue;
    assert.ok(!/€\s?\d/.test(tekst(PERSONAS.buddy)), naam);
  }
});

test('videoplan: geen recht, onbekende rekenhulp en volledigheid manifest', () => {
  const plan = videoPlan('zorgtoeslag', zorgtoeslag({ inkomen: 80000 }), PERSONAS.buddy);
  assert.equal(plan[1].segment, 'nee');
  assert.equal(videoPlan('toetsingsinkomen', {}, PERSONAS.buddy), null);
  const manifest = { buddy: Object.fromEntries(Object.keys(SEGMENTEN).map((k) => [k, { src: `/video/buddy/${k}.mp4` }])) };
  assert.equal(planCompleet(plan, manifest, 'buddy'), true);
  delete manifest.buddy.nee;
  assert.equal(planCompleet(plan, manifest, 'buddy'), false);
  assert.equal(alleClips().length, Object.keys(PERSONAS).length * Object.keys(SEGMENTEN).length);
});

test('videogenerator: HeyGen-aanvraag, wachten op klaar en hash', async () => {
  const verzoeken = [];
  let status = 0;
  const nep = async (url, opties = {}) => {
    verzoeken.push({ url, opties });
    if (url.endsWith('/v2/video/generate')) return { ok: true, json: async () => ({ data: { video_id: 'v1' } }) };
    status++;
    return { ok: true, json: async () => ({ data: status < 3 ? { status: 'processing' } : { status: 'completed', video_url: 'https://cdn/v1.mp4' } }) };
  };
  const clip = { persona: 'buddy', segment: 'ja', tekst: 'Goed nieuws!' };
  const avatar = { avatarId: 'a1', voiceId: 'v9' };
  const url = await maakClip(clip, avatar, 'sleutel', nep, async () => {});
  assert.equal(url, 'https://cdn/v1.mp4');
  const body = JSON.parse(verzoeken[0].opties.body);
  assert.equal(verzoeken[0].opties.headers['X-Api-Key'], 'sleutel');
  assert.equal(body.video_inputs[0].character.avatar_id, 'a1');
  assert.equal(body.video_inputs[0].voice.input_text, 'Goed nieuws!');
  assert.equal(body.video_inputs[0].voice.voice_id, 'v9');
  assert.notEqual(hashVan(clip, avatar), hashVan({ ...clip, tekst: 'Anders' }, avatar));
});
