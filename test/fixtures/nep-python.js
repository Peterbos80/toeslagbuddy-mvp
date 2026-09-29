#!/usr/bin/env node
// Nep-"python" voor de tests van de videopijplijn: doet wat gezichten.py,
// stemmen.py en render.py doen, maar met ffmpeg-testbeelden in plaats van AI.
// NEP_MODUS=stil geeft een bevroren beeld (moet door de keuring worden afgekeurd).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';

const [script, ...args] = process.argv.slice(2);
const arg = (n) => args[args.indexOf(n) + 1];
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const ff = (a) => {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
};

switch (basename(script)) {
  case 'gezichten.py': {
    const uit = arg('--uit');
    mkdirSync(uit, { recursive: true });
    ff(['-f', 'lavfi', '-i', 'testsrc2=s=512x768', '-frames:v', '1', join(uit, `${arg('--persona')}.jpg`)]);
    writeFileSync(join(uit, `${arg('--persona')}.json`), JSON.stringify({ persona: arg('--persona'), model: 'nep', fictief: true }));
    break;
  }
  case 'stemmen.py': {
    const ids = ['buddy', 'sanne', 'dani', 'mo', 'ilse', 'karin', 'henk'];
    writeFileSync(arg('--uit'), JSON.stringify(Object.fromEntries(ids.map((p, i) => [p, { sleutel: 'nl_NL-nep-medium', model: '/nep.onnx', spreker: i, f0: 100 + i * 20 }]))));
    break;
  }
  case 'render.py': {
    const o = JSON.parse(readFileSync(arg('--opdracht'), 'utf8'));
    mkdirSync(o.uit, { recursive: true });
    const beeld = process.env.NEP_MODUS === 'stil' ? ['-loop', '1', '-i', o.gezicht] : ['-f', 'lavfi', '-i', 'testsrc2=s=512x768:r=25'];
    for (const c of o.clips) {
      ff([...beeld, '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=22050', '-t', '2.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', join(o.uit, `${c.segment}.ruw.mp4`)]);
    }
    break;
  }
  default:
    console.error(`onbekend script ${script}`);
    process.exit(2);
}
