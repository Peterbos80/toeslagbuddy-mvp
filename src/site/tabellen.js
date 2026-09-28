// Tabellen die rechtstreeks uit de rekenmotor worden gegenereerd, zodat
// uitleg en rekenhulp nooit uit elkaar lopen.
import { zorgtoeslag, huurtoeslag, kindgebondenBudget, euro } from '../calc/toeslagen.js';

function tabel(kop, rijen) {
  return `<div class="tabel-scroll"><table><thead><tr>${kop.map((k) => `<th scope="col">${k}</th>`).join('')}</tr></thead>
<tbody>${rijen.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Hoogste inkomen waarbij nog recht bestaat (op hele euro's).
export function maxInkomen(fn, invoer) {
  let lo = 0;
  let hi = 400000;
  if (!fn({ ...invoer, inkomen: lo }).recht) return 0;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fn({ ...invoer, inkomen: mid }).recht) lo = mid;
    else hi = mid;
  }
  return lo;
}

const m = (r) => (r.recht ? euro(r.perMaand) : '€ 0');

export function zorgtoeslagTabel() {
  const inkomens = [15000, 20000, 25000, 28000, 30000, 32000, 34000, 36000, 38000, 40000, 42000, 44000, 46000, 48000, 50000];
  return tabel(
    ['Toetsingsinkomen per jaar', 'Alleenstaand', 'Met toeslagpartner'],
    inkomens.map((i) => [euro(i), m(zorgtoeslag({ inkomen: i })), m(zorgtoeslag({ inkomen: i, partner: true }))]),
  );
}

export function huurtoeslagTabel(personen = 1) {
  const huren = [450, 550, 650, 750, 850, 932.93];
  const inkomens = [15000, 20000, 25000, 30000, 35000, 40000];
  return tabel(
    ['Inkomen \\ kale huur', ...huren.map((h) => euro(h))],
    inkomens.map((i) => [euro(i), ...huren.map((h) => m(huurtoeslag({ kaleHuur: h, inkomen: i, personen, volwassenen: Math.min(personen, 2) })))]),
  );
}

export function huurtoeslagGrensTabel() {
  const huren = [500, 600, 700, 800, 932.93];
  return tabel(
    ['Kale huur per maand', 'Alleenstaand', '2 personen', '3 of meer personen'],
    huren.map((h) => [
      euro(h, h % 1 ? 2 : 0),
      euro(maxInkomen(huurtoeslag, { kaleHuur: h, personen: 1 })),
      euro(maxInkomen(huurtoeslag, { kaleHuur: h, personen: 2, volwassenen: 2 })),
      euro(maxInkomen(huurtoeslag, { kaleHuur: h, personen: 3, volwassenen: 2 })),
    ]),
  );
}

export function kgbTabel() {
  const inkomens = [20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000];
  return tabel(
    ['Inkomen per jaar', '1 kind (partners)', '2 kinderen (partners)', '1 kind (alleenstaand)', '2 kinderen (alleenstaand)'],
    inkomens.map((i) => [
      euro(i),
      m(kindgebondenBudget({ inkomen: i, partner: true, kinderen: [5] })),
      m(kindgebondenBudget({ inkomen: i, partner: true, kinderen: [5, 8] })),
      m(kindgebondenBudget({ inkomen: i, kinderen: [5] })),
      m(kindgebondenBudget({ inkomen: i, kinderen: [5, 8] })),
    ]),
  );
}

export function kgbGrensTabel() {
  const rijen = [1, 2, 3, 4].map((n) => {
    const kinderen = Array(n).fill(5);
    return [
      `${n} kind${n > 1 ? 'eren' : ''} (jonger dan 12)`,
      euro(maxInkomen(kindgebondenBudget, { kinderen, partner: true })),
      euro(maxInkomen(kindgebondenBudget, { kinderen })),
    ];
  });
  return tabel(['Aantal kinderen', 'Met toeslagpartner', 'Alleenstaande ouder'], rijen);
}

export { tabel };
