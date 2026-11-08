// Prijsfeiten uit een productpagina halen, in volgorde van betrouwbaarheid:
// 1. schema.org JSON-LD (Product/ProductGroup + Offer/AggregateOffer, ook @graph)
// 2. microdata (itemprop="price" enz.)
// 3. OpenGraph (product:price:amount) en <meta itemprop=price>
// Alleen feiten: titel, merk, EAN, prijs, verzending, url, afbeeldings-url.
// Geen beschrijvingen of foto's kopiëren.
import { ontsnap } from '../xml.js';

const lijst = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const typeIs = (n, t) => lijst(n?.['@type']).some((x) => String(x).toLowerCase() === t);
const naamVan = (v) => (typeof v === 'string' ? v : v?.name ?? null);
const beeld = (v) => {
  const x = lijst(v)[0];
  return typeof x === 'string' ? x : x?.url || x?.contentUrl || null;
};

// Tags met hun attributen: [{ tag, attr }]
export function tags(html, naam = '[a-z][a-z0-9]*') {
  const uit = [];
  for (const m of String(html).matchAll(new RegExp(`<(${naam})\\b([^>]*)>`, 'gi'))) {
    const attr = {};
    for (const [, k, v1, v2, v3] of m[2].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attr[k.toLowerCase()] = ontsnap(v1 ?? v2 ?? v3 ?? '');
    uit.push({ tag: m[1].toLowerCase(), attr, index: m.index, lengte: m[0].length });
  }
  return uit;
}

export function jsonLdBlokken(html) {
  const uit = [];
  for (const m of String(html).matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    const tekst = m[1].trim().replace(/^<!--|-->$/g, '');
    try {
      uit.push(JSON.parse(tekst));
    } catch {
      try {
        uit.push(JSON.parse(tekst.replace(/,\s*([}\]])/g, '$1'))); // komma aan het eind
      } catch {
        /* onleesbaar blok overslaan */
      }
    }
  }
  return uit;
}

function* knopen(v) {
  for (const x of lijst(v)) {
    if (!x || typeof x !== 'object') continue;
    yield x;
    if (x['@graph']) yield* knopen(x['@graph']);
    if (x.hasVariant) yield* knopen(x.hasVariant);
    if (x.mainEntity) yield* knopen(x.mainEntity);
  }
}

function verzendingUit(offer) {
  for (const s of lijst(offer.shippingDetails)) {
    const rate = lijst(s.shippingRate)[0];
    const v = rate?.value ?? rate?.price;
    if (v !== undefined && v !== null && v !== '') return Number(String(v).replace(',', '.'));
  }
  return null;
}

function drempelUit(offer) {
  for (const s of lijst(offer.shippingDetails)) {
    const d = s.freeShippingThreshold ?? s.shippingRate?.freeShippingThreshold;
    const v = typeof d === 'object' ? d?.price ?? d?.value ?? d?.minPrice : d;
    if (v !== undefined && v !== null && v !== '') return Number(String(v).replace(',', '.'));
  }
  return null;
}

export function uitJsonLd(html, basis) {
  const uit = [];
  for (const blok of jsonLdBlokken(html)) {
    for (const n of knopen(blok)) {
      if (!typeIs(n, 'product')) continue;
      for (const o of lijst(n.offers).length ? lijst(n.offers) : [{}]) {
        const aggr = typeIs(o, 'aggregateoffer');
        const spec = lijst(o.priceSpecification)[0];
        const prijs = aggr ? o.lowPrice ?? o.price : o.price ?? spec?.price;
        if (prijs === undefined || prijs === null || prijs === '') continue;
        uit.push({
          titel: n.name || null,
          merk: naamVan(n.brand),
          ean: n.gtin13 || n.gtin || n.gtin14 || n.gtin12 || n.gtin8 || n.ean || null,
          sku: n.sku || null,
          prijs,
          valuta: o.priceCurrency || spec?.priceCurrency || 'EUR',
          verzendkosten: verzendingUit(o),
          gratisVerzendingVanaf: drempelUit(o),
          beschikbaar: !/OutOfStock|SoldOut|Discontinued/i.test(String(o.availability || '')),
          url: absoluut(o.url || n.url, basis),
          afbeelding: absoluut(beeld(n.image), basis),
          methode: 'jsonld',
        });
      }
    }
  }
  return uit;
}

export function uitMicrodata(html, basis) {
  const t = tags(html);
  const prop = (naam) => {
    const tag = t.find((x) => (x.attr.itemprop || '').split(/\s+/).includes(naam));
    if (!tag) return null;
    if (tag.attr.content !== undefined) return tag.attr.content;
    if (tag.attr.href) return tag.attr.href;
    if (tag.attr.src) return tag.attr.src;
    const rest = String(html).slice(tag.index + tag.lengte, tag.index + tag.lengte + 300);
    return ontsnap(rest.split('<')[0]).trim() || null;
  };
  const prijs = prop('price') ?? prop('lowPrice');
  if (!prijs || !t.some((x) => /schema\.org\/(Product|Offer)/i.test(x.attr.itemtype || ''))) return [];
  return [{
    titel: prop('name'),
    merk: prop('brand'),
    ean: prop('gtin13') || prop('gtin') || prop('gtin8'),
    prijs,
    valuta: prop('priceCurrency') || 'EUR',
    verzendkosten: null,
    gratisVerzendingVanaf: null,
    beschikbaar: !/OutOfStock|SoldOut/i.test(prop('availability') || ''),
    url: absoluut(prop('url'), basis),
    afbeelding: absoluut(prop('image'), basis),
    methode: 'microdata',
  }];
}

export function uitMeta(html, basis) {
  const meta = {};
  for (const { attr } of tags(html, 'meta')) {
    const k = (attr.property || attr.name || attr.itemprop || '').toLowerCase();
    if (k && attr.content !== undefined && !(k in meta)) meta[k] = attr.content;
  }
  const prijs = meta['product:price:amount'] ?? meta['og:price:amount'] ?? meta.price;
  if (!prijs) return [];
  return [{
    titel: meta['og:title'] || (String(html).match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').trim() || null,
    merk: meta['product:brand'] || null,
    ean: meta['product:ean'] || meta['product:retailer_item_id'] || null,
    prijs,
    valuta: meta['product:price:currency'] || meta['og:price:currency'] || meta.pricecurrency || 'EUR',
    verzendkosten: meta['product:shipping_cost:amount'] ?? null,
    gratisVerzendingVanaf: null,
    beschikbaar: !/out ?of ?stock|oos/i.test(meta['product:availability'] || meta['og:availability'] || ''),
    url: absoluut(meta['og:url'], basis),
    afbeelding: absoluut(meta['og:image'], basis),
    methode: 'og',
  }];
}

// Beste beschikbare bron: JSON-LD, dan microdata, dan meta-tags
export function prijsFeiten(html, basis) {
  for (const f of [uitJsonLd, uitMicrodata, uitMeta]) {
    const r = f(html, basis);
    if (r.length) return r.map((x) => ({ ...x, url: x.url || basis }));
  }
  return [];
}

export function absoluut(u, basis) {
  if (!u) return null;
  try {
    return new URL(u, basis).href;
  } catch {
    return null;
  }
}
