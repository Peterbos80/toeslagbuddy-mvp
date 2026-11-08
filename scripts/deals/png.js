// Kleine PNG-maker zonder afhankelijkheden, voor de mini-grafiek in de
// bewijsmail (mailprogramma's tonen geen SVG). Lijnen per winkel, stippellijn
// op de gangbare prijs, stip op de prijs van nu.
import { deflateSync } from 'node:zlib';

const KLEUREN = [[109, 40, 217], [190, 24, 93], [14, 116, 144], [180, 83, 9], [4, 120, 87], [67, 56, 202], [159, 18, 57], [55, 65, 81]];

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function blok(type, data) {
  const lengte = Buffer.alloc(4);
  lengte.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([lengte, td, crc]);
}

export function maakPng(breedte, hoogte, teken) {
  const px = Buffer.alloc(breedte * hoogte * 3, 255);
  const zet = (x, y, [r, g, b]) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= breedte || y >= hoogte) return;
    const i = (y * breedte + x) * 3;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  };
  const lijn = (x0, y0, x1, y1, kleur, dik = 2, stippel = 0) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      if (stippel && Math.floor(i / stippel) % 2) continue;
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      for (let d = 0; d < dik; d++) zet(x, y + d, kleur), zet(x + d, y, kleur);
    }
  };
  const stip = (x, y, r, kleur) => {
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (dx * dx + dy * dy <= r * r) zet(x + dx, y + dy, kleur);
  };
  teken({ lijn, stip, zet });
  const rijen = Buffer.alloc((breedte * 3 + 1) * hoogte);
  for (let y = 0; y < hoogte; y++) {
    rijen[y * (breedte * 3 + 1)] = 0;
    px.copy(rijen, y * (breedte * 3 + 1) + 1, y * breedte * 3, (y + 1) * breedte * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breedte, 0);
  ihdr.writeUInt32BE(hoogte, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blok('IHDR', ihdr), blok('IDAT', deflateSync(rijen)), blok('IEND', Buffer.alloc(0))]);
}

// Mini-grafiek uit grafiekData() (src/deals/grafiek.js)
export function grafiekPng(data, { breedte = 600, hoogte = 200, dagen = 90 } = {}) {
  const eind = Date.parse(data.vandaag + 'T00:00:00Z');
  const begin = eind - dagen * 864e5;
  const alle = data.winkels.flatMap((w) => w.punten.filter((p) => Date.parse(p.datum) >= begin).map((p) => p.totaal));
  if (data.gangbaar) alle.push(data.gangbaar);
  const min = Math.min(...alle) * 0.95;
  const max = Math.max(...alle) * 1.05;
  const x = (d) => 10 + ((Date.parse(d + 'T00:00:00Z') - begin) / (eind - begin)) * (breedte - 20);
  const y = (v) => 10 + (1 - (v - min) / (max - min || 1)) * (hoogte - 20);
  return maakPng(breedte, hoogte, ({ lijn, stip }) => {
    for (let i = 0; i <= 4; i++) lijn(10, 10 + ((hoogte - 20) * i) / 4, breedte - 10, 10 + ((hoogte - 20) * i) / 4, [229, 231, 235], 1);
    if (data.gangbaar) lijn(10, y(data.gangbaar), breedte - 10, y(data.gangbaar), [107, 114, 128], 2, 6);
    data.winkels.forEach((w) => {
      const p = w.punten.filter((q) => Date.parse(q.datum) >= begin);
      for (let i = 1; i < p.length; i++) {
        lijn(x(p[i - 1].datum), y(p[i - 1].totaal), x(p[i].datum), y(p[i - 1].totaal), KLEUREN[w.kleur % 8]);
        lijn(x(p[i].datum), y(p[i - 1].totaal), x(p[i].datum), y(p[i].totaal), KLEUREN[w.kleur % 8]);
      }
    });
    if (data.beste) stip(breedte - 12, y(data.beste.totaal), 5, [190, 24, 93]);
  });
}
