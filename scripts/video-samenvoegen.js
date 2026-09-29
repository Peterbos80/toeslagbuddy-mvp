// Voegt de uitvoer van de persona-jobs samen in public/video (clips, gezichten
// en manifest). Gebruikt door .github/workflows/videos-echt.yml.
//
//   node scripts/video-samenvoegen.js <map-met-artefacten>
import { readFileSync, writeFileSync, readdirSync, existsSync, cpSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { samenvoegen } from './video-lib.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function voegSamen(bron, doel = join(ROOT, 'public/video')) {
  const manifestPad = join(doel, 'manifest.json');
  const manifest = existsSync(manifestPad) ? JSON.parse(readFileSync(manifestPad, 'utf8')) : {};
  const delen = [];
  // Elk artefact is een map met dezelfde indeling als public/video + manifest.<persona>.json
  const mappen = readdirSync(bron).map((m) => join(bron, m)).filter((m) => statSync(m).isDirectory());
  for (const map of mappen) {
    for (const f of readdirSync(map)) {
      const pad = join(map, f);
      if (/^manifest\.\w+\.json$/.test(f)) delen.push(JSON.parse(readFileSync(pad, 'utf8')));
      // Alleen clips en gezichten; werkbestanden en contactbladen niet
      else if (statSync(pad).isDirectory() && !f.startsWith('_') && f !== 'contactblad') cpSync(pad, join(doel, f), { recursive: true });
    }
  }
  const nieuw = samenvoegen(manifest, delen);
  writeFileSync(manifestPad, JSON.stringify(nieuw, null, 2) + '\n');
  return nieuw;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const m = voegSamen(process.argv[2]);
  for (const [p, clips] of Object.entries(m)) console.log(`${p}: ${Object.keys(clips).length} clip(s)`);
}
