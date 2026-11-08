// CSV-parser (RFC 4180) met automatische keuze van het scheidingsteken
// (; , tab of |). Geeft objecten met de kopregel als sleutels (kleine letters).

export function parseCsv(tekst, scheiding = null) {
  const s = String(tekst).replace(/^﻿/, '');
  const eerste = s.split(/\r?\n/, 1)[0] || '';
  const sep = scheiding || [';', ',', '\t', '|'].map((c) => [c, eerste.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rijen = [];
  let rij = [];
  let veld = '';
  let quote = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === '"' && s[i + 1] === '"') {
        veld += '"';
        i++;
      } else if (c === '"') quote = false;
      else veld += c;
    } else if (c === '"' && veld === '') quote = true;
    else if (c === sep) {
      rij.push(veld);
      veld = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      rij.push(veld);
      rijen.push(rij);
      rij = [];
      veld = '';
    } else veld += c;
  }
  if (veld !== '' || rij.length) {
    rij.push(veld);
    rijen.push(rij);
  }
  const [kop, ...rest] = rijen.filter((r) => r.some((v) => v.trim() !== ''));
  if (!kop) return [];
  const sleutels = kop.map((k) => k.trim().toLowerCase());
  return rest.map((r) => Object.fromEntries(sleutels.map((k, i) => [k, (r[i] ?? '').trim()])));
}
