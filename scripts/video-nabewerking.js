// Nabewerking van een ruwe clip: 9:16, AI-label, (optioneel) telefooncamera-look,
// daarna de keuring. Schrijft de keuring als JSON naar stdout.
//
//   node scripts/video-nabewerking.js ruw.mp4 klaar.mp4 [--camera]
import { spawnSync } from 'node:child_process';
import { ffmpegArgs, keuring, standaardFont } from './video-lib.js';

const [bron, doel] = process.argv.slice(2);
if (!bron || !doel) {
  console.error('Gebruik: node scripts/video-nabewerking.js ruw.mp4 klaar.mp4 [--camera]');
  process.exit(2);
}
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const r = spawnSync(ffmpeg, ffmpegArgs(bron, doel, { font: standaardFont(ffmpeg), camera: process.argv.includes('--camera') }), { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status || 1);
const k = keuring(doel, ffmpeg);
console.log(JSON.stringify(k));
if (!k.ok) process.exitCode = 1;
