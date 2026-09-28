// Plaatst de post(s) van vandaag uit dist/social/kalender.json op Instagram
// via de officiële Instagram Graph API (Content Publishing).
//
// Nodig (als GitHub-secrets of omgevingsvariabelen):
//   IG_USER_ID       – ID van je Instagram-zakelijk account
//   IG_ACCESS_TOKEN  – langlevend toegangstoken met instagram_content_publish
// Zonder deze waarden draait het script als proef (dry run) en toont het alleen wat het zou doen.
//
//   node social/post.js                → post van vandaag (Europe/Amsterdam)
//   node social/post.js --datum 2026-10-05
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v21.0'}`;
const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
const proef = !IG_USER_ID || !IG_ACCESS_TOKEN || process.argv.includes('--proef');

const argDatum = process.argv.indexOf('--datum');
const vandaag =
  argDatum > -1
    ? process.argv[argDatum + 1]
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());

const posts = JSON.parse(readFileSync(join(ROOT, 'dist/social/kalender.json'), 'utf8')).filter((p) => p.datum === vandaag);
if (!posts.length) {
  console.log(`Geen post gepland voor ${vandaag}.`);
  process.exit(0);
}

async function api(pad, params) {
  const res = await fetch(`${API}/${pad}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`${pad}: ${JSON.stringify(data.error || data)}`);
  return data;
}

async function wachtTotKlaar(id) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${API}/${id}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`);
    const { status_code } = await res.json();
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR') throw new Error(`Container ${id} gaf een fout`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Container ${id} niet op tijd klaar`);
}

for (const post of posts) {
  console.log(`\n📅 ${post.datum} – ${post.id} (${post.afbeeldingen.length} afbeeldingen)`);
  if (proef) {
    console.log('Proefmodus: niets geplaatst. Afbeeldingen:', post.afbeeldingen.join(', '));
    console.log(post.caption);
    continue;
  }
  // Controleer eerst of de afbeeldingen online staan
  for (const url of post.afbeeldingen) {
    const r = await fetch(url, { method: 'HEAD' });
    if (!r.ok) throw new Error(`Afbeelding niet bereikbaar (${r.status}): ${url}. Is de site gedeployed?`);
  }
  let container;
  if (post.afbeeldingen.length === 1) {
    container = await api(`${IG_USER_ID}/media`, { image_url: post.afbeeldingen[0], caption: post.caption });
  } else {
    const kinderen = [];
    for (const url of post.afbeeldingen) {
      const c = await api(`${IG_USER_ID}/media`, { image_url: url, is_carousel_item: 'true' });
      kinderen.push(c.id);
    }
    for (const id of kinderen) await wachtTotKlaar(id);
    container = await api(`${IG_USER_ID}/media`, { media_type: 'CAROUSEL', children: kinderen.join(','), caption: post.caption });
  }
  await wachtTotKlaar(container.id);
  const gepubliceerd = await api(`${IG_USER_ID}/media_publish`, { creation_id: container.id });
  console.log(`✓ Geplaatst op Instagram (media-id ${gepubliceerd.id})`);
}
