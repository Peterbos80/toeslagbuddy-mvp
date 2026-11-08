// De jager: bezoekt winkels uit data/deals/winkels.json zelf, binnen wat mag.
//   node scripts/deals/jager/jager.js [--shard 1/8] [--budget 300] [--uit uit-jager/shard-1.json]
// Per winkel: robots.txt → platform herkennen → openbare endpoints
// (Shopify/WooCommerce/Lightspeed) of sitemap → productpagina's → prijsfeiten.
// Eerst gevolgde/alarm-producten en tips, dan de rest. Per host één verzoek
// tegelijk met ≥ 5 s ertussen; hosts parallel. 403/429 = stoppen voor die host.
import { join } from 'node:path';
import { maakOphaler, Geweigerd } from '../http.js';
import { magOphalen } from '../robots.js';
import { prijsFeiten } from './html.js';
import { herkenPlatform, shopifyProducten, wooProducten, lightspeedProduct } from './adapters.js';
import { verzendBeleid } from './verzending.js';
import { ontdek } from './ontdek.js';
import { Wachtrij, prioriteit, shardVan } from './wachtrij.js';
import { leesTips } from './tips.js';
import { koppel, kenmerken } from './koppelen.js';
import { feitenNaarAanbod } from '../bronnen/jsonld.js';
import { DATA, leesJson, schrijfJson, leesHistorie, optoutLijst } from '../opslag.js';

const TREFWOORDEN = { parfum: ['parfum', 'eau-de', 'geur', 'fragrance'], beauty: ['beauty', 'verzorging', 'make-up'], elektronica: ['audio', 'koptelefoon', 'tv', 'laptop', 'telefoon'], huis: ['keuken', 'wonen', 'huishoud'], speelgoed: ['speelgoed', 'lego', 'spel'], sport: ['sport', 'fiets', 'hardloop'] };

// Eén winkel afwerken binnen het budget voor die winkel
export async function jaagWinkel(w, { ophaler, wachtrij = null, maxPaginas = 40, headless = null, log = () => {}, nu = Date.now() }) {
  const origin = `https://${w.domein.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  const host = new URL(origin).host;
  const uit = [];
  const status = { status: 'ok', platform: w.platform || 'auto', paginas: 0, prijzen: 0, tijd: new Date(nu).toISOString() };
  const voeg = (lijst) => {
    for (const a of lijst) uit.push({ ...a, winkel: w.naam, verzendkosten: a.verzendkosten ?? w.verzendkosten ?? null, gratisVerzendingVanaf: a.gratisVerzendingVanaf ?? w.gratisVerzendingVanaf ?? null, tijd: new Date(nu).toISOString(), categorie: a.categorie || w.categorie });
  };
  try {
    const robots = await ophaler.robots(origin);
    if (!magOphalen(robots, `${origin}/`) && !magOphalen(robots, `${origin}/products.json`)) {
      return { aanbod: [], status: { ...status, status: 'robots', reden: 'robots.txt staat bots niet toe' } };
    }
    let platform = w.platform && w.platform !== 'auto' ? w.platform : null;
    if (!platform) {
      const home = await ophaler.haal(`${origin}/`, { voorwaardelijk: false });
      status.paginas++;
      platform = home.ok ? herkenPlatform(home.tekst, home.headers) : 'html';
    }
    status.platform = platform;
    // Verzendbeleid (Shopify heeft een vaste plek)
    if (platform === 'shopify' && w.verzendkosten === undefined) {
      try {
        const b = await ophaler.haal(`${origin}/policies/shipping-policy`);
        status.paginas++;
        if (b.ok && b.tekst) Object.assign(w, Object.fromEntries(Object.entries(verzendBeleid(b.tekst)).filter(([, v]) => v !== null)));
      } catch {
        /* geen beleid: standaard uit config */
      }
    }
    if (platform === 'shopify') {
      for (let pagina = 1; pagina <= 4 && status.paginas < maxPaginas; pagina++) {
        const r = await ophaler.haal(`${origin}/products.json?limit=250&page=${pagina}`, { soort: 'json' });
        status.paginas++;
        if (r.ongewijzigd || !r.ok) break;
        const lijst = shopifyProducten(r.json, origin, w.naam);
        voeg(lijst);
        if (lijst.length < 250) break;
      }
    } else if (platform === 'woocommerce') {
      for (let pagina = 1; pagina <= 4 && status.paginas < maxPaginas; pagina++) {
        const r = await ophaler.haal(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${pagina}`, { soort: 'json' });
        status.paginas++;
        if (r.ongewijzigd || !r.ok) break;
        const lijst = wooProducten(r.json, w.naam);
        voeg(lijst);
        if (lijst.length < 100) break;
      }
    } else {
      // Productpagina's: eerst wat in de wachtrij staat (gevolgd, tips), dan de sitemap
      const rij = wachtrij || new Wachtrij();
      const trefwoorden = TREFWOORDEN[w.categorie] || [];
      if (rij.grootte < maxPaginas) {
        for (const url of await ontdek(ophaler, origin, { trefwoorden, maxUrls: maxPaginas * 2, nu })) rij.voegToe({ url }, prioriteit({ score: 0, nu }));
      }
      let item;
      while (status.paginas < maxPaginas && (item = rij.pak())) {
        try {
          const r = await ophaler.haal(platform === 'lightspeed' ? `${item.url}${item.url.includes('?') ? '&' : '?'}format=json` : item.url, { soort: platform === 'lightspeed' ? 'json' : 'tekst' });
          status.paginas++;
          if (r.ongewijzigd || !r.ok) continue;
          if (platform === 'lightspeed') voeg(lightspeedProduct(r.json, w.naam, item.url));
          else {
            let feiten = prijsFeiten(r.tekst, item.url);
            if (!feiten.length && headless) {
              const html = await headless(item.url, { ophaler });
              if (html) feiten = prijsFeiten(html, item.url);
            }
            voeg(feitenNaarAanbod(feiten, w.naam, { bron: 'jager', nu }));
          }
        } catch (e) {
          if (e instanceof Geweigerd && e.reden !== 'robots') throw e;
        }
      }
    }
  } catch (e) {
    const st = ophaler.status()[host];
    status.status = e instanceof Geweigerd ? (e.reden === 'budget' ? 'ok' : st?.status || e.reden) : 'fout';
    status.reden = st?.reden || (e instanceof Geweigerd ? e.reden : 'fout');
    log(`${w.naam}: ${status.status} (${status.reden})`);
  }
  status.prijzen = uit.length;
  return { aanbod: uit, status };
}

// Tips (RSS) ophalen en koppelen aan bekende producten → hun winkel-URL's krijgen voorrang
export async function tipsOphalen(ophaler, feeds, kandidaten) {
  const urls = [];
  for (const f of feeds) {
    try {
      const r = await ophaler.haal(f.url);
      if (!r.ok || !r.tekst) continue;
      for (const tip of leesTips(r.tekst, { feedHost: new URL(f.url).hostname.replace(/^www\./, '') })) {
        if (tip.winkelUrl) urls.push(tip.winkelUrl);
        const m = koppel({ titel: tip.titel }, kandidaten, { drempel: 0.6 });
        if (m) urls.push(...(kandidaten.find((k) => k.id === m.id)?.urls || []));
      }
    } catch {
      /* feed niet bereikbaar of verboden */
    }
  }
  return [...new Set(urls)];
}

export async function jaag({ winkels, shard = '1/1', budget = 400, maxPerWinkel = 40, ophaler = maakOphaler({ budget }), gevolgdeUrls = [], tipUrls = [], optout = () => false, headless = null, nu = Date.now(), log = () => {} } = {}) {
  const [nr, aantal] = shard.split('/').map(Number);
  const mijn = winkels.filter((w) => !w.uitgesloten && !optout(`https://${w.domein}/`) && shardVan(w.domein, aantal) === nr);
  const resultaten = await Promise.all(
    mijn.map(async (w) => {
      const rij = new Wachtrij();
      const opHost = (u) => {
        try {
          const h = new URL(u).hostname.replace(/^www\./, '');
          return h === w.domein || h.endsWith('.' + w.domein);
        } catch {
          return false;
        }
      };
      for (const u of gevolgdeUrls.filter(opHost)) rij.voegToe({ url: u }, prioriteit({ gevolgd: true, nu }));
      for (const u of tipUrls.filter(opHost)) rij.voegToe({ url: u }, prioriteit({ tip: true, nu }));
      const r = await jaagWinkel({ ...w }, { ophaler, wachtrij: rij, maxPaginas: maxPerWinkel, headless, log, nu });
      return [w.domein, r];
    }),
  );
  const aanbod = resultaten.flatMap(([, r]) => r.aanbod);
  const status = Object.fromEntries(resultaten.map(([d, r]) => [d, r.status]));
  return { aanbod, status, verzoeken: ophaler.verbruikt };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (n, s) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : s;
  };
  const shard = arg('--shard', '1/1');
  const uit = arg('--uit', join('uit-jager', `shard-${shard.replace('/', 'v')}.json`));
  const cachePad = join(DATA, 'http-cache.json');
  const cache = leesJson(cachePad, {});
  const ophaler = maakOphaler({ budget: Number(arg('--budget', 300)), cache, log: console.log });
  const { winkels } = leesJson(join(DATA, 'winkels.json'), { winkels: [] });
  const { producten } = leesHistorie(DATA);
  // Gevolgde producten: alles wat matcht met de alarmen van de eigenaar
  const kandidaten = [...producten.values()].filter((r) => !r.demo).map((r) => ({ id: r.id, kenmerken: kenmerken({ titel: r.titel, merk: r.merk, ean: /^\d{13}$/.test(r.id) ? r.id : null }), urls: Object.values(r.winkels).map((o) => o.url).filter(Boolean) }));
  const gevolgdeUrls = kandidaten.flatMap((k) => k.urls);
  const tipUrls = await tipsOphalen(ophaler, leesJson(join(DATA, 'tipbronnen.json'), { feeds: [] }).feeds, kandidaten);
  let headless = null;
  if (process.env.DEALS_HEADLESS === 'aan') headless = (await import('./headless.js')).gerenderdeHtml;
  const r = await jaag({ winkels, shard, ophaler, gevolgdeUrls, tipUrls, optout: optoutLijst(DATA), headless, log: console.log });
  if (headless) await (await import('./headless.js')).sluitBrowser();
  schrijfJson(uit, r);
  schrijfJson(cachePad, cache);
  console.log(`✓ jager ${shard}: ${r.aanbod.length} prijzen bij ${Object.keys(r.status).length} winkels, ${r.verzoeken} verzoeken → ${uit}`);
}
