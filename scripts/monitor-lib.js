// Hulpfuncties voor de wijzigingsmonitor (getest in test/monitor.test.js)
import { createHash } from 'node:crypto';

// Haal alle regels met bedragen of percentages uit een HTML-pagina
export function bedragenUit(html) {
  const tekst = String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&');
  const regels = tekst
    .split('\n')
    .map((r) => r.replace(/\s+/g, ' ').trim())
    .filter((r) => /€\s?\d|\d+(,\d+)?\s?%/.test(r) && r.length < 300);
  return [...new Set(regels)];
}

export const vingerafdruk = (regels) => createHash('sha256').update(regels.join('\n')).digest('hex').slice(0, 16);

export function verschil(oud = [], nieuw = []) {
  const o = new Set(oud);
  const n = new Set(nieuw);
  return { erbij: nieuw.filter((r) => !o.has(r)), weg: oud.filter((r) => !n.has(r)) };
}
