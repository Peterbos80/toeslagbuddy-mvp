// Maakt van elke carrousel een korte verticale video (1080×1920, MP4/H.264)
// voor Instagram Reels en TikTok. Vereist ffmpeg (in GitHub Actions via apt).
//   node social/render.js && node social/video.js
import { readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UIT = join(ROOT, 'dist/social');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SECONDEN_PER_SLIDE = 3;

const kalenderBestand = join(UIT, 'kalender.json');
if (!existsSync(kalenderBestand)) {
  console.error('Eerst node social/render.js draaien.');
  process.exit(1);
}
const posts = JSON.parse(readFileSync(kalenderBestand, 'utf8'));

let gemaakt = 0;
for (const post of posts) {
  const map = join(UIT, post.id);
  const slides = post.slides.map((_, i) => join(map, `${i + 1}.jpg`)).filter(existsSync);
  if (!slides.length) continue;
  // Lijst voor de concat-demuxer: elke slide een paar seconden in beeld
  const lijst = join(map, 'slides.txt');
  writeFileSync(lijst, slides.map((s) => `file '${s}'\nduration ${SECONDEN_PER_SLIDE}`).join('\n') + `\nfile '${slides.at(-1)}'\n`);
  const uit = join(map, 'video.mp4');
  const r = spawnSync(
    FFMPEG,
    [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', lijst,
      // 4:5-slide centreren op een 9:16-achtergrond in de merkkleur
      '-vf', 'scale=1080:1350,pad=1080:1920:0:285:color=0x0d7a5f,fps=30,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart',
      uit,
    ],
    { stdio: 'inherit' },
  );
  rmSync(lijst, { force: true });
  if (r.status !== 0) {
    console.error(`✗ Video mislukt voor ${post.id}`);
    process.exit(1);
  }
  gemaakt++;
}
console.log(`✓ ${gemaakt} video's gemaakt (Reels/TikTok)`);
