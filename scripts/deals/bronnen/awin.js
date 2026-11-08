// Awin-productfeeds (CSV uit Create-a-Feed): aw_deep_link, product_name,
// merchant_name, search_price, rrp_price, delivery_cost, currency, ean,
// product_gtin, brand_name, category_name, aw_image_url, in_stock.
// Geheim: AWIN_FEED_URLS.
import { parseCsv } from '../csv.js';
import { feedLijst, haalFeeds, winkelExtra, waar } from './feed-hulp.js';

export function parseAwin(tekst, opties = {}) {
  return parseCsv(tekst)
    .map((v) => {
      if (v.in_stock !== undefined && v.in_stock !== '' && !waar(v.in_stock)) return null;
      const winkel = opties.winkel || v.merchant_name;
      const url = v.aw_deep_link || v.merchant_deep_link;
      const extra = winkelExtra(opties, winkel, v.merchant_deep_link || url);
      return {
        product: v.ean || v.product_gtin || undefined,
        ean: v.ean || v.product_gtin,
        titel: v.product_name,
        merk: v.brand_name,
        categorie: v.category_name || v.merchant_category,
        winkel,
        prijs: v.search_price || v.store_price,
        vanPrijs: v.rrp_price || v.product_price_old,
        verzendkosten: v.delivery_cost !== undefined && v.delivery_cost !== '' ? v.delivery_cost : extra.standaardVerzending,
        gratisVerzendingVanaf: extra.gratisVerzendingVanaf,
        valuta: v.currency || 'EUR',
        url,
        afbeelding: v.merchant_image_url || v.aw_image_url,
        bron: 'awin',
        affiliate: true,
        tijd: opties.nu,
      };
    })
    .filter(Boolean);
}

export const bron = {
  naam: 'awin',
  label: 'Awin-productfeeds',
  soort: 'feed',
  actief: (env) => feedLijst(env.AWIN_FEED_URLS).length > 0,
  haal: (context) => haalFeeds(feedLijst(context.env.AWIN_FEED_URLS), { ...context, bron: 'awin' }, parseAwin),
};
