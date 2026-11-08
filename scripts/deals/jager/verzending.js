// Verzendkosten en de grens voor gratis verzending uit het verzendbeleid van
// een winkel (bijv. Shopify /policies/shipping-policy of een servicepagina).
import { bedrag } from '../../../src/deals/aanbod.js';

const BEDRAG = String.raw`€\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:euro|eur)\b`;

export function verzendBeleid(html) {
  const t = String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/\s+/g, ' ');
  const pak = (m) => (m ? bedrag(m[1] ?? m[2] ?? m[3]) : null);
  const gratis = pak(t.match(new RegExp(String.raw`gratis\s+(?:verzend(?:ing|en)|bezorg(?:ing|d)|thuisbezorgd)[^.€\d]{0,40}?(?:vanaf|boven|bij|vanaf een (?:bestel)?bedrag van)\s*(?:${BEDRAG})`, 'i')) || t.match(new RegExp(String.raw`(?:vanaf|boven)\s*(?:${BEDRAG})[^.]{0,30}gratis\s+(?:verzend|bezorg)`, 'i')));
  const kosten = pak(t.match(new RegExp(String.raw`(?:verzendkosten|bezorgkosten|verzending kost)[^.€\d]{0,30}?(?:${BEDRAG})`, 'i')));
  const altijdGratis = !gratis && /altijd gratis (?:verzonden|verzending|bezorgd)|gratis verzending op alle bestellingen/i.test(t);
  return { gratisVerzendingVanaf: altijdGratis ? 0 : gratis, verzendkosten: altijdGratis ? 0 : kosten };
}
