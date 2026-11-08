// Deal-tips uit openbare RSS/Atom-feeds (bijv. Pepper). Een tip is geen
// deal: de jager controleert prijs en verzending eerst op de winkel zelf.
import { parseXml, zoekAlle, tekstVan, kind } from '../xml.js';
import { bedrag } from '../../../src/deals/aanbod.js';

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function leesTips(xml, { feedHost = '' } = {}) {
  const doc = parseXml(xml);
  const items = [...zoekAlle(doc, 'item'), ...zoekAlle(doc, 'entry')];
  return items
    .map((it) => {
      const titel = tekstVan(it, 'title');
      const linkKnoop = kind(it, 'link');
      const link = linkKnoop?.attr.href || linkKnoop?.tekst || '';
      const beschrijving = tekstVan(it, 'description') || tekstVan(it, 'summary') || tekstVan(it, 'encoded') || '';
      const prijsM = `${titel} ${tekstVan(it, 'price')}`.match(/€\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:euro|€)/i);
      // Een directe winkellink (niet de feed-site zelf) als die erin staat
      const winkelUrl = [tekstVan(it, 'deal_link'), tekstVan(it, 'merchant_url'), ...[...beschrijving.matchAll(/href=["']?(https?:\/\/[^"'\s>]+)/gi)].map((m) => m[1])].find((u) => u && host(u) && host(u) !== feedHost && !host(u).endsWith(feedHost || '#'));
      return {
        titel,
        link,
        prijs: prijsM ? bedrag(prijsM[1] ?? prijsM[2]) : null,
        winkel: tekstVan(it, 'merchant') || (winkelUrl ? host(winkelUrl) : null),
        winkelUrl: winkelUrl || null,
        datum: tekstVan(it, 'pubDate') || tekstVan(it, 'updated') || null,
      };
    })
    .filter((t) => t.titel);
}
