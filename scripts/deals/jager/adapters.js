// Platform-adapters: openbare endpoints die winkels aan iedereen tonen.
// Shopify (/products.json, /products/<handle>.js), WooCommerce Store API
// (/wp-json/wc/store/v1/products), Lightspeed eCom (?format=json).
// Alleen feiten: titel, merk, EAN, prijs, van-prijs, url, afbeeldings-url.

export function herkenPlatform(html = '', headers = {}) {
  const h = (k) => (typeof headers.get === 'function' ? headers.get(k) : headers[k]) || '';
  const t = String(html).slice(0, 200000);
  if (h('x-shopid') || h('x-shopify-stage') || /cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(t)) return 'shopify';
  if (/wp-content\/plugins\/woocommerce|woocommerce-page|wc-block|\/wp-json\/wc\//i.test(t)) return 'woocommerce';
  if (/webshopapp\.com|lightspeed|seoshop/i.test(t) || /lightspeed/i.test(h('x-powered-by'))) return 'lightspeed';
  if (/Magento|mage\/cookies|data-mage-init/i.test(t)) return 'magento';
  return 'html';
}

const ALT = (v) => (v === null || v === undefined || v === '' ? null : v);

// Shopify /products.json: prijzen als tekst in euro's
export function shopifyProducten(json, origin, winkel) {
  const uit = [];
  for (const p of json?.products || []) {
    for (const v of p.variants || []) {
      if (v.available === false) continue;
      const naam = p.variants.length > 1 && v.title && v.title !== 'Default Title' ? `${p.title} ${v.title}` : p.title;
      uit.push({
        titel: naam,
        merk: ALT(p.vendor),
        ean: ALT(v.barcode),
        prijs: v.price,
        vanPrijs: ALT(v.compare_at_price),
        winkel,
        url: `${origin}/products/${p.handle}${p.variants.length > 1 ? `?variant=${v.id}` : ''}`,
        afbeelding: p.images?.[0]?.src || null,
        bron: 'jager',
        categorie: ALT(p.product_type),
      });
    }
  }
  return uit;
}

// Shopify /products/<handle>.js: prijzen in centen
export function shopifyProductJs(json, origin, winkel) {
  if (!json?.variants) return [];
  return json.variants
    .filter((v) => v.available !== false)
    .map((v) => ({
      titel: json.variants.length > 1 && v.title && v.title !== 'Default Title' ? `${json.title} ${v.title}` : json.title,
      merk: ALT(json.vendor),
      ean: ALT(v.barcode),
      prijs: v.price / 100,
      vanPrijs: v.compare_at_price ? v.compare_at_price / 100 : null,
      winkel,
      url: `${origin}/products/${json.handle}`,
      afbeelding: json.featured_image ? new URL(json.featured_image, origin).href : null,
      bron: 'jager',
    }));
}

// WooCommerce Store API: prijzen als hele getallen in de kleinste eenheid
export function wooProducten(lijst, winkel) {
  return (Array.isArray(lijst) ? lijst : [])
    .filter((p) => p.is_in_stock !== false && p.prices)
    .map((p) => {
      const deler = 10 ** (p.prices.currency_minor_unit ?? 2);
      const prijs = Number(p.prices.sale_price || p.prices.price) / deler;
      const regulier = Number(p.prices.regular_price) / deler;
      return {
        titel: String(p.name || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'),
        ean: ALT(p.sku && /^\d{8,14}$/.test(p.sku) ? p.sku : null),
        prijs,
        vanPrijs: regulier > prijs ? regulier : null,
        valuta: p.prices.currency_code || 'EUR',
        winkel,
        url: p.permalink,
        afbeelding: p.images?.[0]?.src || null,
        bron: 'jager',
      };
    });
}

// Lightspeed eCom: <productpagina>?format=json
export function lightspeedProduct(json, winkel, basis) {
  const p = json?.product;
  if (!p?.price) return [];
  const prijs = p.price.price_incl ?? p.price.price;
  return [{
    titel: p.fulltitle || p.title,
    merk: p.brand?.title || null,
    ean: ALT(p.ean),
    prijs,
    vanPrijs: p.price.price_old_incl || null,
    winkel,
    url: p.url ? new URL(p.url, basis).href : basis,
    afbeelding: typeof p.image === 'string' ? p.image : p.image?.src || null,
    bron: 'jager',
  }];
}
