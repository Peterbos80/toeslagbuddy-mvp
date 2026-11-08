// Van historie naar de publieke deal-index (deals.json): één compacte
// samenvatting per product en per vluchtroute+maand. Gebruikt door de build
// (pagina's), meld.js (alarmen) en de browser (volglijst, live zoeken).
import { productOverzicht, venster } from './historie.js';
import { routeOverzicht, plaats } from './vluchten.js';
import { slug } from './aanbod.js';

// Vaste, unieke paginanaam per product (/deals/p/<naam>/): slug van de titel
export function paginaSlugs(records) {
  const gebruikt = new Set();
  const uit = new Map();
  for (const r of [...records].sort((a, b) => a.id.localeCompare(b.id))) {
    let s = slug(r.titel) || slug(r.id);
    if (gebruikt.has(s)) s = `${s}-${slug(r.id).slice(-6)}`;
    gebruikt.add(s);
    uit.set(r.id, s);
  }
  return uit;
}

export function productDeal(ov, pagina, nu) {
  const b = ov.beste;
  const spark = venster(ov.reeks, nu, 90).map((p) => p.totaal);
  if (ov.huidig !== null) spark.push(ov.huidig);
  return {
    soort: 'product',
    id: ov.id,
    pagina,
    titel: ov.titel,
    categorie: ov.categorie,
    merk: ov.merk || null,
    winkel: b?.winkel ?? null,
    totaal: ov.huidig,
    prijs: b?.prijs ?? null,
    verzendkosten: b ? (b.verzendBekend ? (b.totaal - b.prijs > 0 ? Math.round((b.totaal - b.prijs) * 100) / 100 : 0) : null) : null,
    verzendBekend: b?.verzendBekend ?? false,
    gratisVerzendingVanaf: b?.gratisVerzendingVanaf ?? null,
    url: b?.url ?? null,
    affiliate: !!b?.affiliate,
    bron: b?.bron ?? null,
    vanPrijs: b?.vanPrijs ?? null,
    gangbaar: ov.gangbaar,
    modus: ov.modus ? [ov.modus.van, ov.modus.tot] : null,
    laagste30: ov.laagste30,
    echteKorting: ov.echteKorting,
    nep: ov.nep.nep,
    nepRedenen: ov.nep.redenen,
    geclaimd: ov.nep.geclaimd,
    verdacht: ov.verdacht,
    onderLaagste30: ov.onderLaagste30,
    score: ov.score,
    demo: ov.demo,
    dagen: ov.dagen,
    winkelsGezien: ov.winkelsGezien,
    winkelsNu: ov.aanbod.length,
    winkels: ov.aanbod.slice(0, 4).map((o) => ({ winkel: o.winkel, totaal: o.totaal, prijs: o.prijs, verzendkosten: o.verzendBekend ? Math.round((o.totaal - o.prijs) * 100) / 100 : null, url: o.url, bron: o.bron, affiliate: !!o.affiliate })),
    bronnen: ov.bronnen.length,
    spark,
    bijgewerkt: ov.bijgewerkt,
  };
}

// Per route en vertrekmaand één deal: de goedkoopste vertrekdag
export function vluchtDeals(rov) {
  return rov.maanden
    .filter((m) => m.goedkoopste[0])
    .map((m) => {
      const v = m.goedkoopste[0];
      return {
        soort: 'vlucht',
        id: `${rov.id}-${m.maand}`,
        route: rov.route,
        maand: m.maand,
        pagina: `/deals/vluchten/?route=${rov.route}&maand=${m.maand}`,
        titel: `${plaats(rov.van)} → ${plaats(rov.naar)}`,
        naarNaam: plaats(rov.naar),
        categorie: 'vliegtickets',
        merk: null,
        winkel: v.maatschappij,
        totaal: v.prijs,
        prijs: v.prijs,
        verzendkosten: 0,
        verzendBekend: true,
        url: v.url,
        affiliate: !!v.affiliate,
        bron: v.bron,
        vertrek: v.datum,
        terug: v.terug || null,
        stops: v.stops,
        bagageInbegrepen: v.bagageInbegrepen,
        gangbaar: m.gangbaar,
        laagste30: m.laagste30,
        echteKorting: m.echteKorting,
        nep: false,
        verdacht: m.echteKorting !== null && m.echteKorting > 0.7,
        onderLaagste30: m.laagste30 !== null && v.prijs < m.laagste30,
        score: m.echteKorting === null ? 0 : Math.max(0, Math.min(100, Math.round(85 * Math.min(1, Math.max(0, m.echteKorting) / 0.5) + 15 * 0.7))),
        demo: rov.demo,
        dagen: rov.dagen,
        winkelsGezien: rov.bronnen.length,
        bronnen: rov.bronnen.length,
        spark: m.kalender.dagen.filter((d) => d.prijs !== null).map((d) => d.prijs),
        bijgewerkt: v.tijd,
      };
    });
}

// Hele index: producten (met paginapad) en vluchten, beste deals eerst
export function bouwIndex(records, vluchtRecords, nu, { pagina = (r) => `/deals/p/${r.id}/`, betrouwbaarheid = {} } = {}) {
  const producten = records
    .map((r) => ({ r, ov: productOverzicht(r, nu, { betrouwbaarheid }) }))
    .filter(({ ov }) => ov.huidig !== null)
    .map(({ r, ov }) => ({ deal: productDeal(ov, pagina(r), nu), ov }));
  const routes = vluchtRecords.map((r) => routeOverzicht(r, nu));
  const vluchten = routes.flatMap(vluchtDeals);
  const deals = [...producten.map((p) => p.deal), ...vluchten].sort((a, b) => b.score - a.score || (b.echteKorting ?? -1) - (a.echteKorting ?? -1) || a.id.localeCompare(b.id));
  return { deals, producten, routes };
}
