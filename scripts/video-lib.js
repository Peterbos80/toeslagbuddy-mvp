// Gedeelde hulpfuncties voor de echte AI-video's (open-source pijplijn):
// welke clips opnieuw moeten, ffmpeg-instellingen, keuring en het manifest.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const BREEDTE = 432; // 9:16, past bij .video-scherm
export const HOOGTE = 768;
export const LABEL = 'AI-video · fictief persoon';
export const VERSIE = 'oss1'; // verhogen = alle clips opnieuw

const FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'];

export const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);

/** De 'avatar' voor de hash: gezicht + stem. Andere foto of stem → nieuwe clips. */
export function echteAvatar(gezichtHash, stem) {
  return { avatarId: `${VERSIE}:${gezichtHash}`, voiceId: `${stem.sleutel}#${stem.spreker ?? 0}` };
}

/** Clips waarvan de tekst, het gezicht of de stem is veranderd */
export function teMaken(clips, manifest, avatar, hashVan) {
  return clips.filter((c) => (manifest[c.persona] || {})[c.segment]?.hash !== hashVan(c, avatar));
}

const filters = new Map();
/** Heeft deze ffmpeg-build een filter? (drawtext ontbreekt in sommige builds) */
export function heeftFilter(naam, ffmpeg = process.env.FFMPEG || 'ffmpeg') {
  if (!filters.has(ffmpeg)) filters.set(ffmpeg, spawnSync(ffmpeg, ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '');
  return new RegExp(`\\s${naam}\\s`).test(filters.get(ffmpeg));
}

export const standaardFont = (ffmpeg) => (heeftFilter('drawtext', ffmpeg) ? FONTS.find((f) => existsSync(f)) || null : null);

/** ffmpeg: vullen tot 9:16, AI-label in beeld (ook bij doorplaatsen), klein en snel startend */
export function ffmpegArgs(bron, doel, { font = standaardFont() } = {}) {
  const vf = [`scale=${BREEDTE}:${HOOGTE}:force_original_aspect_ratio=increase`, `crop=${BREEDTE}:${HOOGTE}`, 'setsar=1'];
  if (font) {
    vf.push(`drawtext=fontfile=${font}:text='${LABEL}':x=w-tw-12:y=12:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6`);
  }
  return [
    '-y', '-loglevel', 'error', '-i', bron,
    '-vf', vf.join(','),
    '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '30', '-r', '25',
    '-c:a', 'aac', '-b:a', '64k', '-ac', '1',
    '-movflags', '+faststart',
    '-metadata', 'comment=AI-gegenereerde video (synthetische, fictieve persoon) - ToeslagBuddy',
    '-metadata', 'description=AI-generated content',
    doel,
  ];
}

/**
 * Keuring vóór publicatie: echte video met geluid, niet bevroren, niet stil,
 * beeld en geluid even lang. Zo komt er nooit een kapotte clip op de site.
 */
export function keuring(pad, ffmpeg = process.env.FFMPEG || 'ffmpeg') {
  const r = spawnSync(ffmpeg, [
    '-hide_banner', '-nostats', '-i', pad,
    '-vf', 'freezedetect=n=0.002:d=1.2',
    '-af', 'silencedetect=n=-40dB:d=0.8',
    '-f', 'null', '-',
  ], { encoding: 'utf8' });
  const log = `${r.stdout || ''}${r.stderr || ''}`;
  const redenen = [];
  if (r.status !== 0) return { ok: false, redenen: ['ffmpeg kan het bestand niet lezen'], duur: 0 };
  const duur = (() => {
    const m = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  })();
  if (!/Stream #\S+.*Video: h264/.test(log)) redenen.push('geen H.264-video');
  if (!/Stream #\S+.*Audio: aac/.test(log)) redenen.push('geen AAC-geluid');
  if (duur < 1.5 || duur > 40) redenen.push(`duur ${duur.toFixed(1)} s`);
  // Een bevriezing die tot het einde duurt, meldt ffmpeg alleen met een starttijd
  const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const eindes = [...log.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const bevroren = starts.reduce((t, s, i) => t + ((eindes[i] ?? duur) - s), 0);
  if (duur && bevroren / duur > 0.5) redenen.push(`beeld staat ${Math.round((bevroren / duur) * 100)}% stil`);
  const stilStarts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const stilEindes = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const stil = stilStarts.reduce((t, s, i) => t + ((stilEindes[i] ?? duur) - s), 0);
  if (duur && stil / duur > 0.6) redenen.push(`geluid ${Math.round((stil / duur) * 100)}% stil`);
  return { ok: redenen.length === 0, redenen, duur: Math.round(duur * 10) / 10 };
}

/** Manifest-delen van losse persona-jobs samenvoegen (elke job levert één persona) */
export function samenvoegen(manifest, delen) {
  const uit = { ...manifest };
  for (const deel of delen) {
    for (const [persona, clips] of Object.entries(deel)) uit[persona] = { ...(uit[persona] || {}), ...clips };
  }
  return uit;
}
