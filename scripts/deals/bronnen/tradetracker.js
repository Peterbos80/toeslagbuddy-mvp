// TradeTracker-productfeeds (XML): <product ID> met name, price currency=,
// URL, images/image, categories/category, properties/property name= value.
// Geheim: TRADETRACKER_FEED_URLS.
import { parseXml, zoekAlle, tekstVan, kind } from '../xml.js';
import { feedLijst, haalFeeds, hostNaam, winkelExtra, waar } from './feed-hulp.js';

export function parseTradeTracker(tekst, opties = {}) {
  const doc = parseXml(tekst);
  return zoekAlle(doc, 'product')
    .map((p) => {
      const props = {};
      for (const pr of zoekAlle(p, 'property')) props[(pr.attr.name || '').toLowerCase()] = tekstVan(pr, 'value') || pr.tekst;
      const prijsKnoop = kind(p, 'price');
      const url = tekstVan(p, 'url');
      if (props.stock !== undefined && !waar(props.stock)) return null;
      const winkel = opties.winkel || props.shop || hostNaam(url);
      const extra = winkelExtra(opties, winkel, url);
      const cat = kind(p, 'categories/category');
      return {
        product: props.ean || props.gtin || undefined,
        ean: props.ean || props.gtin,
        titel: tekstVan(p, 'name'),
        merk: props.brand,
        categorie: cat?.attr.path || cat?.tekst,
        winkel,
        prijs: prijsKnoop?.tekst,
        valuta: prijsKnoop?.attr.currency || 'EUR',
        vanPrijs: props.fromprice || props.oldprice,
        verzendkosten: props.deliverycosts ?? props.shippingcosts ?? extra.standaardVerzending,
        gratisVerzendingVanaf: extra.gratisVerzendingVanaf,
        url,
        afbeelding: tekstVan(p, 'images/image'),
        bron: 'tradetracker',
        affiliate: true,
        tijd: opties.nu,
      };
    })
    .filter(Boolean);
}

export const bron = {
  naam: 'tradetracker',
  label: 'TradeTracker-productfeeds',
  soort: 'feed',
  actief: (env) => feedLijst(env.TRADETRACKER_FEED_URLS).length > 0,
  haal: (context) => haalFeeds(feedLijst(context.env.TRADETRACKER_FEED_URLS), { ...context, bron: 'tradetracker' }, parseTradeTracker),
};
