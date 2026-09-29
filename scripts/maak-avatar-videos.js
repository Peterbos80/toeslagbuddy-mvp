// Maakt realistische AI-presentatorvideo's per persona en segment via de
// HeyGen API en zet ze in public/video/ met een manifest.
// Alleen clips waarvan de tekst veranderd is, worden opnieuw gemaakt.
//
//   HEYGEN_API_KEY=... node scripts/maak-avatar-videos.js [--persona sanne] [--proef]
//
// Avatar- en stem-ID's per persona staan in site.config.js (video.avatars).
// Vind ze met: GET https://api.heygen.com/v2/avatars en /v2/voices
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { alleClips } from '../src/calc/videoplan.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = join(ROOT, 'public/video');
const MANIFEST = join(MAP, 'manifest.json');
const API = 'https://api.heygen.com';

export const hashVan = (clip, avatar) => createHash('sha256').update(`${clip.tekst}|${avatar.avatarId}|${avatar.voiceId}`).digest('hex').slice(0, 12);

export async function maakClip(clip, avatar, sleutel, f = fetch, wacht = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const res = await f(`${API}/v2/video/generate`, {
    method: 'POST',
    headers: { 'X-Api-Key': sleutel, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: 'avatar', avatar_id: avatar.avatarId, avatar_style: 'normal' },
          voice: { type: 'text', input_text: clip.tekst, voice_id: avatar.voiceId, speed: 0.95 },
          background: { type: 'color', value: avatar.achtergrond || '#e3f3ed' },
        },
      ],
      dimension: { width: 720, height: 1280 },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`HeyGen genereren mislukt: ${JSON.stringify(data.error || data)}`);
  const id = data.data.video_id;
  for (let i = 0; i < 120; i++) {
    const s = await (await f(`${API}/v1/video_status.get?video_id=${id}`, { headers: { 'X-Api-Key': sleutel } })).json();
    const st = s.data && s.data.status;
    if (st === 'completed') return s.data.video_url;
    if (st === 'failed') throw new Error(`HeyGen-video mislukt: ${JSON.stringify(s.data.error || s.data)}`);
    await wacht(10000);
  }
  throw new Error(`HeyGen-video ${id} niet op tijd klaar`);
}

// Kleiner maken en in het bestand markeren als AI-gegenereerd (AI Act art. 50)
function comprimeer(bron, doel) {
  const r = spawnSync(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-loglevel', 'error', '-i', bron,
    '-vf', 'scale=540:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-c:a', 'aac', '-b:a', '64k',
    '-movflags', '+faststart',
    '-metadata', 'comment=AI-gegenereerde video (synthetische, fictieve persoon) - ToeslagBuddy',
    '-metadata', 'description=AI-generated content',
    doel,
  ]);
  if (r.status !== 0) throw new Error(`ffmpeg mislukt voor ${doel}`);
}

async function hoofd() {
  const { default: config } = await import('../site.config.js');
  const sleutel = process.env.HEYGEN_API_KEY;
  const proef = !sleutel || process.argv.includes('--proef');
  const alleen = process.argv.includes('--persona') ? process.argv[process.argv.indexOf('--persona') + 1] : null;
  const avatars = (config.video && config.video.avatars) || {};
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

  const teMaken = alleClips()
    .filter((c) => !alleen || c.persona === alleen)
    .filter((c) => avatars[c.persona] && avatars[c.persona].avatarId && avatars[c.persona].voiceId)
    .filter((c) => (manifest[c.persona] || {})[c.segment]?.hash !== hashVan(c, avatars[c.persona]));

  const zonderAvatar = [...new Set(alleClips().map((c) => c.persona))].filter((p) => !(avatars[p] && avatars[p].avatarId));
  if (zonderAvatar.length) console.log(`ℹ Nog geen avatar ingesteld voor: ${zonderAvatar.join(', ')} (zie site.config.js → video.avatars)`);
  console.log(`${teMaken.length} clip(s) te maken${proef ? ' (proefmodus, er wordt niets gemaakt)' : ''}.`);
  if (proef) {
    teMaken.forEach((c) => console.log(`- ${c.persona}/${c.segment}: "${c.tekst.slice(0, 70)}…"`));
    return;
  }

  for (const c of teMaken) {
    const avatar = avatars[c.persona];
    console.log(`▶ ${c.persona}/${c.segment}`);
    const url = await maakClip(c, avatar, sleutel);
    const ruw = join(MAP, c.persona, `${c.segment}.ruw.mp4`);
    mkdirSync(dirname(ruw), { recursive: true });
    writeFileSync(ruw, Buffer.from(await (await fetch(url)).arrayBuffer()));
    const doel = join(MAP, c.persona, `${c.segment}.mp4`);
    comprimeer(ruw, doel);
    spawnSync('rm', ['-f', ruw]);
    manifest[c.persona] = manifest[c.persona] || {};
    manifest[c.persona][c.segment] = { src: `/video/${c.persona}/${c.segment}.mp4`, hash: hashVan(c, avatar), tekst: c.tekst };
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✓ ${c.persona}/${c.segment}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await hoofd();
