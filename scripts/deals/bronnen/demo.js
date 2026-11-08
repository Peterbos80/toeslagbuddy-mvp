// Demo-bron: verzonnen maar realistische gegevens, zodat de site werkt
// voordat er partneraccounts zijn. Alles heet 'demo': de winkels bestaan
// niet (adressen op .example), merken zijn verzonnen, EAN's beginnen met
// 200 (interne nummers, nooit een echt product). Vast per dag (zaadgetal),
// dus elke ronde op dezelfde dag geeft dezelfde prijzen.

const DAG = 864e5;

export function zaad(s) {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function kans(s) {
  let t = (zaad(s) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Geldige EAN-13 met voorvoegsel 200 (voor intern gebruik, dus nooit echt)
export function demoEan(n) {
  const kern = `200${String(n).padStart(9, '0')}`;
  const som = [...kern].reverse().reduce((t, c, i) => t + Number(c) * (i % 2 === 0 ? 3 : 1), 0);
  return kern + ((10 - (som % 10)) % 10);
}

export const WINKELS = {
  Geurwinkel: { verzendkosten: 3.95, gratisVerzendingVanaf: 30, factor: 1.0, affiliate: true, cats: ['parfum', 'beauty'] },
  ParfumPlaza: { verzendkosten: 4.95, gratisVerzendingVanaf: 50, factor: 0.97, affiliate: false, cats: ['parfum', 'beauty'] },
  Luxegeur: { verzendkosten: 0, gratisVerzendingVanaf: null, factor: 1.05, affiliate: true, cats: ['parfum'] },
  TechTotaal: { verzendkosten: 0, gratisVerzendingVanaf: null, factor: 1.02, affiliate: true, cats: ['elektronica'] },
  ElektroDirect: { verzendkosten: 5.95, gratisVerzendingVanaf: 100, factor: 0.96, affiliate: false, cats: ['elektronica', 'huis'] },
  HuisenZo: { verzendkosten: 4.95, gratisVerzendingVanaf: 40, factor: 1.0, affiliate: true, cats: ['huis'] },
  SpeelParadijs: { verzendkosten: 3.95, gratisVerzendingVanaf: 25, factor: 1.0, affiliate: true, cats: ['speelgoed'] },
  MegaMarkt: { verzendkosten: 2.99, gratisVerzendingVanaf: 20, factor: 1.03, affiliate: false, cats: ['parfum', 'beauty', 'elektronica', 'huis', 'speelgoed', 'sport'] },
  SnelBezorgd: { verzendkosten: 6.95, gratisVerzendingVanaf: null, factor: 0.93, affiliate: false, cats: ['elektronica', 'speelgoed', 'sport', 'huis'] },
  Sportief: { verzendkosten: 4.5, gratisVerzendingVanaf: 50, factor: 1.0, affiliate: true, cats: ['sport'] },
};

// [titel, merk, categorie, basisprijs, scenario]
// scenario: deal (komt en gaat), nep (opgeblazen 'van'-prijs), omnibus
// (eerst duurder gemaakt, dan 'korting'), dalend, nieuw (weinig historie), stabiel
export const PRODUCTEN = [
  ['Eau de Parfum Bloesem 50 ml', 'Maison Lumière', 'parfum', 64.95, 'deal'],
  ['Eau de Toilette Cedre Noir 100 ml', 'Atelier Nord', 'parfum', 79.0, 'nep'],
  ['Eau de Parfum Ambre Doux 30 ml', 'Maison Lumière', 'parfum', 42.5, 'dalend'],
  ['Eau de Parfum Zeebries 100 ml', 'Kustlijn', 'parfum', 54.95, 'omnibus'],
  ['Parfum Nuit Velours 75 ml', 'Velours & Co', 'parfum', 98.0, 'deal'],
  ['Eau de Cologne Citrus Fris 200 ml', 'Kustlijn', 'parfum', 24.95, 'stabiel'],
  ['Hydraterende dagcrème SPF 30 50 ml', 'Dermaya', 'beauty', 19.99, 'deal'],
  ['Vitamine C serum 30 ml', 'Dermaya', 'beauty', 29.95, 'nep'],
  ['Draadloze oordopjes met ruisonderdrukking', 'Sonora', 'elektronica', 129.0, 'deal'],
  ['Over-ear koptelefoon ANC Pro', 'Sonora', 'elektronica', 249.0, 'dalend'],
  ['Smartwatch Active 2 41 mm', 'Pulsa', 'elektronica', 179.0, 'omnibus'],
  ['4K-televisie 55 inch QLED', 'Visio', 'elektronica', 649.0, 'deal'],
  ['E-reader 7 inch waterdicht', 'Leeslicht', 'elektronica', 139.0, 'stabiel'],
  ['Bluetooth-speaker Outdoor 20 W', 'Sonora', 'elektronica', 59.95, 'nep'],
  ['Robotstofzuiger met dweilfunctie', 'Schoonhuis', 'huis', 299.0, 'deal'],
  ['Airfryer XL 5,5 liter', 'Keukenheld', 'huis', 89.99, 'dalend'],
  ['Volautomatische espressomachine', 'Barista Thuis', 'huis', 429.0, 'deal'],
  ['Dekbedovertrek katoen 240x220', 'Slaapwel', 'huis', 49.95, 'stabiel'],
  ['Staafmixer set 1000 W', 'Keukenheld', 'huis', 44.95, 'nieuw'],
  ['Bouwset ruimtestation 900 stukjes', 'Bouwblok', 'speelgoed', 89.99, 'deal'],
  ['Houten treinbaan starterset', 'Speelhout', 'speelgoed', 39.95, 'omnibus'],
  ['Bordspel Eilandhandel', 'Spelvreugd', 'speelgoed', 34.99, 'stabiel'],
  ['Knuffel Ijsbeer 60 cm', 'Zachtjes', 'speelgoed', 24.99, 'nep'],
  ['Puzzel 1000 stukjes Amsterdamse grachten', 'Spelvreugd', 'speelgoed', 16.99, 'deal'],
  ['Hardloopschoenen Road Runner heren', 'Loopsnel', 'sport', 119.95, 'deal'],
  ['Yogamat extra dik 8 mm', 'Zenfit', 'sport', 29.95, 'dalend'],
];

const rondPrijs = (p) => {
  if (p >= 100) return Math.round(p) - 0.01;
  const hele = Math.floor(p);
  return hele + (p - hele >= 0.5 ? 0.95 : 0.49);
};

const dagNr = (t) => Math.floor(t / DAG);

// Prijs van product i bij winkel w op dag d (dagnummer)
export function demoPrijs(p, winkel, d, vandaag = d, { eerste = true } = {}) {
  const [titel, , , basis, scenario] = p;
  const w = WINKELS[winkel];
  const s = zaad(titel);
  let f = w.factor * (1 + (kans(`${titel}|${winkel}`) - 0.5) * 0.06);
  // dagelijkse ruis en af en toe een kleine winkelactie
  f *= 1 + (kans(`${titel}|${winkel}|${d}`) - 0.5) * 0.03;
  if (kans(`${titel}|${winkel}|actie|${Math.floor(d / 9)}`) < 0.12 && d % 9 < 2) f *= 0.93;
  const periode = 22 + (s % 12);
  const fase = (d + (s % periode)) % periode;
  // Een echte actie bij een deel van de winkels, een paar dagen lang
  if (scenario === 'deal' && fase < 5 && kans(`${titel}|${winkel}|deal`) < 0.6) f *= 0.7 + (s % 7) * 0.02;
  if (titel.includes('Bloesem') && winkel === 'ParfumPlaza') {
    const r = (d - vandaag + 1000) % 60;
    if (r >= 20 && r < 30) f *= 1.22;
  }
  if (scenario === 'dalend') f *= 1 - Math.min(0.22, Math.max(0, (d - (vandaag - 45)) / 45) * 0.22);
  if (scenario === 'omnibus' && eerste) {
    const r = (d - vandaag + 400) % 40; // verhoging 14 dagen vóór de 'actie'
    if (r >= 26 && r < 36) f *= 1.25;
  }
  return rondPrijs(basis * f);
}

export function demoAanbod(nu, { terugvullen = () => 0 } = {}) {
  const t = typeof nu === 'number' ? nu : Date.parse(nu);
  const vandaag = dagNr(t);
  const uit = [];
  PRODUCTEN.forEach((p, i) => {
    const [titel, merk, categorie, basis, scenario] = p;
    const ean = demoEan(1000 + i);
    // Het eerste product (parfum) bij alle parfumwinkels: mooie grafiek met 4+ winkels
    const winkels = Object.keys(WINKELS).filter((w) => WINKELS[w].cats.includes(categorie)).filter((w, j) => i === 0 || j < 2 || kans(`${titel}|${w}|in`) < 0.6);
    const max = scenario === 'nieuw' ? 5 : 180;
    const terug = Math.min(max, terugvullen(ean));
    for (let d = vandaag - terug; d <= vandaag; d++) {
      for (const winkel of winkels) {
        const w = WINKELS[winkel];
        const prijs = demoPrijs(p, winkel, d, vandaag, { eerste: winkel === winkels[0] });
        const nep = scenario === 'nep';
        uit.push({
          ean,
          titel,
          merk,
          categorie,
          winkel,
          prijs,
          vanPrijs: nep ? rondPrijs(basis * 1.6) : scenario === 'omnibus' && prijs < basis * 1.1 && winkel === winkels[0] ? rondPrijs(basis * 1.25) : null,
          verzendkosten: w.verzendkosten,
          gratisVerzendingVanaf: w.gratisVerzendingVanaf,
          valuta: 'EUR',
          url: `https://${winkel.toLowerCase()}.example/p/${ean}`,
          bron: 'demo',
          affiliate: w.affiliate,
          demo: true,
          // vandaag: de tijd van de ronde; eerdere dagen: midden op de dag
          tijd: d === vandaag ? new Date(t).toISOString() : new Date(d * DAG + 12 * 36e5).toISOString(),
        });
      }
    }
  });
  return uit;
}

// ── Vluchten ──
export const DEMO_ROUTES = [
  ['AMS', 'BCN', 95], ['AMS', 'LIS', 120], ['AMS', 'NYC', 480], ['AMS', 'ROM', 105],
  ['AMS', 'LON', 70], ['AMS', 'IST', 160], ['EIN', 'ALC', 90], ['RTM', 'PMI', 110],
];
const MAATSCHAPPIJEN = ['Zonvlucht', 'Noordzee Air', 'Tulp Airways', 'Atlantica'];
const SEIZOEN = [0.85, 0.8, 0.9, 1.0, 1.05, 1.15, 1.4, 1.45, 1.1, 1.0, 0.85, 1.2];

export function demoVluchtPrijs(van, naar, basis, vertrekT, waarneemT) {
  const v = new Date(vertrekT);
  const dagen = Math.max(0, (vertrekT - waarneemT) / DAG);
  let f = SEIZOEN[v.getUTCMonth()];
  f *= [1.0, 0.92, 0.9, 0.95, 1.12, 1.05, 1.15][v.getUTCDay()];
  f *= dagen < 14 ? 1.35 : dagen < 30 ? 1.12 : dagen > 120 ? 1.05 : 1;
  f *= 0.85 + kans(`${van}${naar}|${dagNr(vertrekT)}|${Math.floor(dagNr(waarneemT) / 3)}`) * 0.35;
  // af en toe een flinke prijsval
  if (kans(`${van}${naar}|val|${dagNr(vertrekT)}`) < 0.06) f *= 0.62;
  return Math.round(basis * f);
}

export function demoVluchten(nu, { terugvullen = () => 0 } = {}) {
  const t = typeof nu === 'number' ? nu : Date.parse(nu);
  const vandaag = dagNr(t);
  const uit = [];
  for (const [van, naar, basis] of DEMO_ROUTES) {
    const terug = Math.min(120, terugvullen(`${van}-${naar}`));
    for (let w = vandaag - terug; w <= vandaag; w++) {
      const waarneem = w === vandaag ? t : w * DAG + 10 * 36e5;
      for (let d = w + 3; d <= w + 125; d++) {
        const vertrekT = d * DAG;
        uit.push({
          van,
          naar,
          vertrek: new Date(vertrekT).toISOString().slice(0, 10),
          prijs: demoVluchtPrijs(van, naar, basis, vertrekT, waarneem),
          maatschappij: MAATSCHAPPIJEN[zaad(`${van}${naar}${d}`) % MAATSCHAPPIJEN.length],
          stops: naar === 'NYC' ? zaad(`${d}s`) % 2 : 0,
          bagageInbegrepen: zaad(`${van}${d}b`) % 3 === 0,
          bron: 'demo',
          url: `https://vluchten.example/${van}-${naar}/${new Date(vertrekT).toISOString().slice(0, 10)}`,
          affiliate: false,
          demo: true,
          tijd: new Date(waarneem).toISOString(),
        });
      }
    }
  }
  return uit;
}

export const bron = {
  naam: 'demo',
  label: 'Demo-gegevens (verzonnen)',
  soort: 'demo',
  // Aan zolang er geen echte bron is, of met DEALS_DEMO=aan; uit met DEALS_DEMO=uit
  actief: (env, { echteBronnen = 0 } = {}) => (env.DEALS_DEMO === 'aan' ? true : env.DEALS_DEMO === 'uit' ? false : echteBronnen === 0),
  haal: (context) => [...demoAanbod(context.nu, context), ...demoVluchten(context.nu, context).map((v) => ({ ...v, soort: 'vlucht' }))],
};
