// Lakken: gevoelige gegevens uit een tekst halen vóórdat die het apparaat
// verlaat (brieven uitleggen met AI). BSN, IBAN, geboortedatum, e-mail,
// telefoon. Gewone datums (termijnen!) blijven staan.

// Elfproef voor een BSN van 8 of 9 cijfers
export function isBsn(s) {
  const c = String(s).replace(/\D/g, '').padStart(9, '0');
  if (c.length !== 9 || /^0{9}$/.test(c)) return false;
  let som = 0;
  for (let i = 0; i < 8; i++) som += Number(c[i]) * (9 - i);
  som -= Number(c[8]);
  return som % 11 === 0;
}

// IBAN-controle (mod 97)
export function isIban(s) {
  const c = String(s).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(c)) return false;
  const om = (c.slice(4) + c.slice(0, 4)).replace(/[A-Z]/g, (l) => String(l.charCodeAt(0) - 55));
  let rest = 0;
  for (const cijfer of om) rest = (rest * 10 + Number(cijfer)) % 97;
  return rest === 1;
}

const MAANDEN = 'januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december';

export function lak(tekst) {
  const gevonden = { bsn: 0, iban: 0, geboortedatum: 0, email: 0, telefoon: 0 };
  let t = String(tekst || '');
  // IBAN's eerst (bevatten lange cijferreeksen)
  t = t.replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, (m) => {
    if (!isIban(m)) return m;
    gevonden.iban++;
    return '[IBAN]';
  });
  // Geboortedatum: een datum direct na "geboren", "geboortedatum" of "geb."
  t = t.replace(new RegExp(`((?:geboortedatum|geboren(?:\\s+op)?|geb\\.)\\s*:?\\s*)(\\d{1,2}[-/. ]\\d{1,2}[-/. ]\\d{2,4}|\\d{1,2}\\s+(?:${MAANDEN})\\s+\\d{4})`, 'gi'), (m, voor) => {
    gevonden.geboortedatum++;
    return `${voor}[GEBOORTEDATUM]`;
  });
  // BSN: 8 of 9 cijfers (ook met punten of spaties) die de elfproef doorstaan
  t = t.replace(/(?<![\d,.€])(?<!€\s)\b\d{3,4}[ .]?\d{2,3}[ .]?\d{2,3}\b(?!\d|,\d)/g, (m) => {
    const c = m.replace(/\D/g, '');
    if ((c.length !== 8 && c.length !== 9) || !isBsn(c)) return m;
    gevonden.bsn++;
    return '[BSN]';
  });
  t = t.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, () => {
    gevonden.email++;
    return '[E-MAIL]';
  });
  t = t.replace(/(?<![\d€,.-])(?:\+31|0031|\b0)(?:[ -]?\d){8,10}\b(?![-/.]\d)/g, (m) => {
    const cijfers = m.replace(/\D/g, '');
    const lang = m.startsWith('+') ? 11 : m.startsWith('0031') ? 13 : 10;
    if (cijfers.length !== lang) return m;
    gevonden.telefoon++;
    return '[TELEFOON]';
  });
  return { tekst: t, gevonden, aantal: Object.values(gevonden).reduce((a, b) => a + b, 0) };
}

// Vangnet aan de serverkant: staat er nog een geldig BSN in?
export function bevatBsn(tekst) {
  for (const m of String(tekst || '').matchAll(/(?<![\d,.€])(?<!€\s)\b\d{3,4}[ .]?\d{2,3}[ .]?\d{2,3}\b(?!\d|,\d)/g)) {
    const c = m[0].replace(/\D/g, '');
    if ((c.length === 8 || c.length === 9) && isBsn(c)) return true;
  }
  return false;
}
