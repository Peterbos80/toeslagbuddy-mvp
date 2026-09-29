import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vernieuwToken, conceptUploaden } from '../social/tiktok.js';
import { kalender } from '../social/content.js';

test('social: kalender heeft 3 unieke posts per week met geldige teksten', () => {
  const posts = kalender('2026-10-05', 6);
  assert.equal(posts.length, 18);
  assert.equal(new Set(posts.map((p) => p.id)).size, 18);
  for (const p of posts) {
    assert.ok(p.caption.length < 2200, 'Instagram-limiet 2.200 tekens');
    assert.ok((p.caption.match(/#/g) || []).length <= 30, 'max. 30 hashtags');
    assert.ok(p.slides.length >= 2 && p.slides.length <= 10, 'carrousel 2–10 slides');
  }
  // Rekenvoorbeelden zijn altijd als fictief gemarkeerd
  for (const p of posts.filter((p) => p.type === 'rekenvoorbeeld')) {
    assert.ok(p.slides.some((s) => s.label === 'Rekenvoorbeeld · fictief'));
  }
});

test('social: TikTok-concept wordt correct aangevraagd', async () => {
  const verzoeken = [];
  const nep = async (url, opties) => {
    verzoeken.push({ url, opties });
    if (url.endsWith('/oauth/token/')) return { ok: true, json: async () => ({ access_token: 'abc' }) };
    return { ok: true, json: async () => ({ data: { publish_id: 'p1' }, error: { code: 'ok' } }) };
  };
  const token = await vernieuwToken({ clientKey: 'k', clientSecret: 's', refreshToken: 'r' }, nep);
  const id = await conceptUploaden('https://www.toeslagbuddy.nl/social/x/video.mp4', token, nep);
  assert.equal(id, 'p1');
  assert.match(verzoeken[1].url, /\/post\/publish\/inbox\/video\/init\/$/);
  assert.equal(verzoeken[1].opties.headers.Authorization, 'Bearer abc');
  assert.deepEqual(JSON.parse(verzoeken[1].opties.body), { source_info: { source: 'PULL_FROM_URL', video_url: 'https://www.toeslagbuddy.nl/social/x/video.mp4' } });
});

test('social: TikTok-fout wordt doorgegeven', async () => {
  const nep = async () => ({ ok: false, json: async () => ({ error: { code: 'access_token_invalid' } }) });
  await assert.rejects(conceptUploaden('https://x/v.mp4', 't', nep), /access_token_invalid/);
});
