// Taallaag: kies de teksten voor een taal. Werkt in Node (build, tests) en in
// de browser (build.js zet dit bestand plat in /js/, net als nl.js en en.js).
import nl from './nl.js';
import en from './en.js';

export const TALEN = { nl, en };
export const STANDAARD = 'nl';

/** Teksten voor een taal; onbekend of leeg geeft Nederlands. */
export function teksten(taal = STANDAARD) {
  return TALEN[taal] || nl;
}

/** Taal van de huidige pagina uit <html lang>; buiten de browser 'nl'. */
export function paginaTaal() {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang || '' : '';
  const code = lang.toLowerCase().split('-')[0];
  return TALEN[code] ? code : STANDAARD;
}
