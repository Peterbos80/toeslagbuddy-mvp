// Stockvideo's van Pexels: welke scènes, welke video en welk bestand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wensen, nogTeZoeken, kiesVideo, kiesBestand, credit, zoek, zoekHash, zoekPixabay, vanPixabay } from '../scripts/video/stock-beelden.js';
import { nogTeMaken } from '../scripts/video/ai-beelden.js';
import { bronVan } from '../scripts/video/uitleg.js';

const bestand = (width, height, extra = {}) => ({ file_type: 'video/mp4', width, height, fps: 25, link: `https://videos.example/${width}.mp4`, ...extra });
const video = (id, extra = {}) => ({ id, width: 1920, height: 1080, duration: 15, url: `https://www.pexels.com/video/${id}/`, user: { name: `Maker ${id}`, url: `https://www.pexels.com/@m${id}` }, video_files: [bestand(3840, 2160), bestand(1920, 1080), bestand(960, 540)], ...extra });

test('scènes: elke filmscène heeft zoektermen', () => {
  const w = wensen();
  assert.equal(w.length, 11);
  for (const x of w) assert.ok(x.termen.length >= 2 && x.termen.every((t) => /^[a-z ]+$/.test(t)), x.naam);
  assert.notEqual(zoekHash(['a']), zoekHash(['b']));
});

test('bestand: HD liggend, geen 4K, geen te klein', () => {
  assert.equal(kiesBestand(video(1)).width, 1920);
  assert.equal(kiesBestand({ video_files: [bestand(3840, 2160), bestand(1280, 720)] }).width, 1280);
  assert.equal(kiesBestand({ video_files: [bestand(960, 540), bestand(1080, 1920)] }), null);
});

test('video: relevantievolgorde, maar niet staand, te kort, afgekeurd of al gebruikt', () => {
  const lijst = [video(1, { width: 1080, height: 1920 }), video(2, { duration: 3 }), video(3), video(4), video(5)];
  assert.equal(kiesVideo(lijst).video.id, 3);
  assert.equal(kiesVideo(lijst, { afgekeurd: [3] }).video.id, 4);
  assert.equal(kiesVideo(lijst, { afgekeurd: [3], gebruikt: [4] }).video.id, 5);
  assert.equal(kiesVideo([video(6, { video_files: [bestand(640, 360)] })]), null);
  assert.deepEqual(credit(video(7)), { id: 7, url: 'https://www.pexels.com/video/7/', fotograaf: 'Maker 7', fotograafUrl: 'https://www.pexels.com/@m7' });
});

test('wat zoeken: ontbrekend of andere zoektermen; AI en handwerk blijven, en AI laat Pexels staan', () => {
  const lijst = [{ naam: 'a-1', hash: 'x' }, { naam: 'a-2', hash: 'y' }, { naam: 'a-3', hash: 'z' }, { naam: 'a-4', hash: 'w' }];
  const index = { 'a-1': { bron: 'pexels', hash: 'x' }, 'a-2': { bron: 'pexels', hash: 'oud' }, 'a-4': { model: 'veo', hash: 'q' } };
  const bestaat = (n) => n !== 'a-3';
  assert.deepEqual(nogTeZoeken(lijst, index, bestaat).map((w) => w.naam), ['a-2', 'a-3']);
  // De AI-route vervangt nooit een Pexels-clip
  assert.deepEqual(nogTeMaken([{ naam: 'a-1', hash: 'anders' }], index, () => true), []);
});

test('zoeken: sleutel in de Authorization-header, nooit in het adres', async () => {
  let gezien;
  const haal = async (url, opties) => {
    gezien = { url, opties };
    return { ok: true, json: async () => ({ videos: [video(9)] }) };
  };
  const v = await zoek('woman laptop happy', { sleutel: 'GEHEIM', haal });
  assert.equal(v[0].id, 9);
  assert.match(gezien.url, /query=woman%20laptop%20happy&orientation=landscape/);
  assert.equal(gezien.opties.headers.Authorization, 'GEHEIM');
  assert.doesNotMatch(gezien.url, /GEHEIM/);
  await assert.rejects(zoek('x', { sleutel: 's', haal: async () => ({ ok: false, status: 401, text: async () => 'nee' }) }), /Pexels 401/);
});

test('label in de video: maker en platform bij stock, anders "gemaakt met AI"', () => {
  const index = { 'f-1': { bron: 'pexels', fotograaf: 'An de Vries', fotograafUrl: 'u', url: 'v' }, 'f-3': { bron: 'pixabay', fotograaf: 'Bo', fotograafUrl: 'u', url: 'w' } };
  assert.equal(bronVan('f-1', index).label, 'Beelden: An de Vries / Pexels');
  assert.equal(bronVan('f-3', index).label, 'Beelden: Bo / Pixabay');
  assert.equal(bronVan('f-3', index).credit.platform, 'Pixabay');
  assert.equal(bronVan('f-2', index).label, 'Beelden gemaakt met AI');
});

const hit = { id: 42, pageURL: 'https://pixabay.com/videos/keuken-42/', duration: 18, user: 'maker', user_id: 7, videos: { large: { url: 'https://cdn.example/l.mp4', width: 3840, height: 2160 }, medium: { url: 'https://cdn.example/m.mp4', width: 1920, height: 1080 }, small: { url: 'https://cdn.example/s.mp4', width: 1280, height: 720 }, tiny: { url: 'https://cdn.example/t.mp4', width: 640, height: 360 } } };

test('Pixabay: zelfde vorm als Pexels, 4K overgeslagen, sleutel nooit in een foutmelding', async () => {
  const v = vanPixabay(hit);
  assert.equal(v.url, 'https://pixabay.com/videos/keuken-42/');
  assert.deepEqual(v.user, { name: 'maker', url: 'https://pixabay.com/users/maker-7/' });
  const k = kiesVideo([v]);
  assert.equal(k.bestand.link, 'https://cdn.example/m.mp4');
  let adres;
  const r = await zoekPixabay('woman laptop', { sleutel: 'GEHEIM', haal: async (u) => { adres = u; return { ok: true, json: async () => ({ hits: [hit] }) }; } });
  assert.equal(r[0].id, 42);
  assert.match(adres, /^https:\/\/pixabay\.com\/api\/videos\/\?key=GEHEIM&q=woman%20laptop&video_type=film&safesearch=true/);
  await assert.rejects(zoekPixabay('x', { sleutel: 'GEHEIM', haal: async () => ({ ok: false, status: 400, text: async () => '[ERROR 400] Invalid API key GEHEIM' }) }), (e) => /Pixabay 400/.test(e.message) && !e.message.includes('GEHEIM'));
});
