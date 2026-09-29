// Zet de video van vandaag als concept in je TikTok-inbox via de officiële
// Content Posting API (scope video.upload). Je opent daarna de TikTok-app,
// tikt op de melding en plaatst de video met de kant-en-klare tekst.
//
// Nodig (GitHub-secrets): TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN
// Zonder deze waarden draait het script als proef (dry run).
//   node social/tiktok.js [--datum JJJJ-MM-DD]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://open.tiktokapis.com/v2';

export async function vernieuwToken({ clientKey, clientSecret, refreshToken }, f = fetch) {
  const res = await f(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`TikTok-token vernieuwen mislukt: ${JSON.stringify(data)}`);
  return data.access_token;
}

export async function conceptUploaden(videoUrl, token, f = fetch) {
  // PULL_FROM_URL: TikTok haalt de video zelf op. Het domein moet in het
  // TikTok-ontwikkelaarsportaal geverifieerd zijn (URL-prefix www.toeslagbuddy.nl).
  const res = await f(`${API}/post/publish/inbox/video/init/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } }),
  });
  const data = await res.json();
  if (!res.ok || (data.error && data.error.code !== 'ok')) throw new Error(`TikTok-upload mislukt: ${JSON.stringify(data.error || data)}`);
  return data.data.publish_id;
}

// Alleen uitvoeren als script (niet bij importeren in tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const i = process.argv.indexOf('--datum');
  const datum = i > -1 ? process.argv[i + 1] : new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
  const posts = JSON.parse(readFileSync(join(ROOT, 'dist/social/kalender.json'), 'utf8')).filter((p) => p.datum === datum);
  const { TIKTOK_CLIENT_KEY: clientKey, TIKTOK_CLIENT_SECRET: clientSecret, TIKTOK_REFRESH_TOKEN: refreshToken } = process.env;
  if (!posts.length) {
    console.log(`Geen TikTok-video gepland voor ${datum}.`);
  } else if (!clientKey || !clientSecret || !refreshToken) {
    for (const p of posts) console.log(`Proefmodus – zou als concept uploaden: ${p.video || '(nog geen video)'}\n\n${p.caption}`);
  } else {
    const token = await vernieuwToken({ clientKey, clientSecret, refreshToken });
    for (const p of posts) {
      if (!p.video) throw new Error(`Geen video voor ${p.id}`);
      const id = await conceptUploaden(p.video, token);
      console.log(`✓ ${p.id} staat als concept in je TikTok-inbox (publish_id ${id}). Open de TikTok-app om te plaatsen.`);
    }
  }
}
