// Deelafbeeldingen (Open Graph, 1200 × 630): de vaste afbeelding per onderdeel
// (scripts/og.js, in public/) en de afbeelding per pagina
// (scripts/og-paginas.js, in dist/og/). Hier staan de gedeelde regels: welke
// bestandsnaam, welke afbeelding een pagina krijgt, de kleuren en de opmaak.
// Geen afhankelijkheden van de browser of het bestandssysteem: goed te testen.

// Vaste afbeelding per onderdeel (in public/, gaat mee in git)
export const OG_SECTIE = { familie: 'og-familie.png', deals: 'og-besparen.png', pro: 'og-pro.png', zzp: 'og-pro.png' };
export const OG_STANDAARD = 'og.png';
export const OG_MAAT = { breedte: 1200, hoogte: 630 };

// Afbeeldingen per pagina: PNG, zonder kwaliteitsverlies. Gemeten (55
// pagina's): PNG gemiddeld ~150 kB, JPEG (kwaliteit 90) ~70 kB. Dat is maar
// de helft, dus geen reden om de letters met JPEG-ruis te leveren. Wil je
// toch JPEG: zet OG_EXTENSIE op 'jpg' (OG_KWALITEIT geldt dan).
export const OG_MAP = 'og';
export const OG_EXTENSIE = 'png';
export const OG_KWALITEIT = 90;

// Kleur en label per onderdeel (zelfde accenten als de site)
export const OG_KLEUR = { toeslagen: '#d9a441', nieuws: '#d9a441', familie: '#c2643a', deals: '#b98abd', pro: '#8fb8e0', zzp: '#8fb8e0' };
export const OG_LABEL = { toeslagen: 'Toeslagen', nieuws: 'Nieuws', familie: 'Familie', deals: 'Besparen', pro: 'Professionals', zzp: 'Zzp' };

// '/familie/gids/wat-kost-een-verpleeghuis/' → 'familie-gids-wat-kost-een-verpleeghuis.jpg'
// '/' → 'start.jpg'. Alleen kleine letters, cijfers en streepjes.
export function ogBestandsnaam(slug, extensie = OG_EXTENSIE) {
  const naam = String(slug || '/')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.html?$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${naam || 'start'}.${extensie}`;
}

// Krijgt deze pagina een eigen afbeelding? Alleen indexeerbare Nederlandse
// pagina's; de Engelse en afgeschermde pagina's houden die van het onderdeel.
export function heeftEigenOg(page) {
  const slug = page.slug || '';
  return (page.taal || 'nl') === 'nl' && !page.noindex && slug.startsWith('/') && !slug.startsWith('/en/') && !slug.endsWith('.html');
}

export const sectieAfbeelding = (sectie) => `/${OG_SECTIE[sectie] || OG_STANDAARD}`;

// Pad (vanaf de root van de site) van de deelafbeelding van een pagina.
// bestaat(pad) zegt of dist/<pad> er is; zo niet, dan de afbeelding van het
// onderdeel. Zo verwijst een pagina nooit naar een afbeelding die er niet is.
export function ogAfbeelding(page, sectie, bestaat = () => false) {
  if (heeftEigenOg(page)) {
    const pad = `/${OG_MAP}/${ogBestandsnaam(page.slug)}`;
    if (bestaat(pad)) return pad;
  }
  return sectieAfbeelding(sectie);
}

const ontsnap = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ENTITEITEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—', hellip: '…' };
export const ontEntiteit = (s) =>
  String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITEITEN[e.toLowerCase()] ?? m;
  });
const tekstVan = (html) => ontEntiteit(String(html).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

// Korte beschrijving: hele zinnen tot ongeveer `max` tekens, anders afgekapt
// op een woordgrens met een beletselteken.
export function kortTekst(tekst, max = 170) {
  const t = String(tekst).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let zin = '';
  for (const z of t.split(/(?<=[.!?])\s+/)) {
    if ((zin ? zin.length + 1 : 0) + z.length > max) break;
    zin = zin ? `${zin} ${z}` : z;
  }
  if (zin.length >= max * 0.5) return zin;
  const stuk = t.slice(0, max - 1);
  return `${stuk.slice(0, stuk.lastIndexOf(' ') > 0 ? stuk.lastIndexOf(' ') : stuk.length).replace(/[,;:–-]\s*$/, '')}…`;
}

// Haal de inhoud van een gebouwde pagina op: kop (h1, met het accentwoord
// als <em>), beschrijving, onderdeel en of er een rekenhulp op staat.
export function uitHtml(html) {
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
  const accent = (h1.match(/<span class="accent">([\s\S]*?)<\/span>/) || [])[1];
  const kop = tekstVan(h1);
  const beschrijving = ontEntiteit((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const sectie = (html.match(/<body class="sectie-([\w-]+)/) || [])[1] || 'toeslagen';
  const titel = ontEntiteit((html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '');
  return { kop: kop || titel, accent: accent ? tekstVan(accent) : null, beschrijving, sectie, rekenhulp: /class="rekenkaart"/.test(html) };
}

// Gegevens voor één kaart. adres is bijvoorbeeld 'toeslagbuddy.nl/familie/gids/'.
export function paginaKaart({ kop, accent, beschrijving, sectie, rekenhulp }, adres) {
  const k = ontsnap(kop);
  const a = accent ? ontsnap(accent) : null;
  return {
    label: OG_LABEL[sectie] || OG_LABEL.toeslagen,
    kleur: OG_KLEUR[sectie] || OG_KLEUR.toeslagen,
    kop: a && k.includes(a) ? k.replace(a, `<em>${a}</em>`) : k,
    tekst: ontsnap(kortTekst(beschrijving)),
    punten: rekenhulp ? ['Gratis rekenhulp'] : [],
    adres: ontsnap(adres),
  };
}

// Begingrootte van de kop naar lengte; in de browser wordt daarna nog
// verkleind tot alles past (zie OG_PASSEN).
export const kopGrootte = (kop) => {
  const n = tekstVan(kop).length;
  return n <= 34 ? 78 : n <= 52 ? 68 : n <= 72 ? 60 : 52;
};

// Opmaak van de kaart; dezelfde stijl voor de vaste en de pagina-afbeeldingen.
// fonts = { fraunces, figtree }: woff2 als base64.
export function ogStijl(fonts) {
  return `@font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${fonts.fraunces}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Figtree; src: url(data:font/woff2;base64,${fonts.figtree}) format('woff2'); font-weight: 300 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: #14211e; color: #f4efe6; font-family: Figtree, sans-serif; position: relative; overflow: hidden; }
.gloed { position: absolute; width: 760px; height: 760px; border-radius: 50%; right: -260px; top: -300px; background: var(--k); opacity: .28; filter: blur(60px); }
.gloed.twee { right: auto; left: -340px; top: auto; bottom: -460px; background: #1f6b5a; opacity: .7; }
.in { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; }
.merk { display: flex; align-items: center; gap: 14px; font-family: Fraunces, serif; font-size: 34px; font-weight: 600; }
.merk span { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 15px; background: #1f6b5a; font-family: Figtree, sans-serif; font-weight: 800; font-size: 30px; }
.label { margin-left: auto; font-size: 20px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #14211e; background: var(--k); padding: 9px 20px; border-radius: 99px; }
h1 { font-family: Fraunces, serif; font-variation-settings: 'SOFT' 100; font-weight: 560; font-size: var(--kop, 78px); line-height: 1.04; letter-spacing: -.025em; margin-top: auto; max-width: 980px; text-wrap: balance; }
h1 em { font-style: italic; font-weight: 480; color: var(--k); }
p { font-size: 30px; line-height: 1.35; color: #cfd8d3; margin-top: 22px; max-width: 900px; }
p.lang { font-size: 26px; max-width: 980px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
ul { list-style: none; padding: 0; display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap; align-items: center; }
li { font-size: 21px; font-weight: 600; padding: 10px 20px; border-radius: 99px; border: 1.5px solid rgb(255 255 255 / 22%); background: rgb(255 255 255 / 6%); }
li.adres { border: 0; background: none; padding: 10px 0; color: #9fb1aa; font-weight: 600; margin-right: auto; }`;
}

export function ogInhoud(k) {
  const lang = k.adres !== undefined;
  const punten = [...(k.adres ? [`<li class="adres">${k.adres}</li>`] : []), ...k.punten.map((x) => `<li>${x}</li>`)];
  return `<div class="gloed"></div><div class="gloed twee"></div><div class="in">
<div class="merk"><span>€</span>ToeslagBuddy<b class="label">${k.label}</b></div>
<h1${lang ? ` style="--kop:${kopGrootte(k.kop)}px"` : ''}>${k.kop}</h1>${k.tekst ? `<p${lang ? ' class="lang"' : ''}>${k.tekst}</p>` : ''}${punten.length ? `<ul>${punten.join('')}</ul>` : ''}
</div>`;
}

export const ogHtml = (k, fonts) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>${ogStijl(fonts)}</style></head><body style="--k:${k.kleur}">${ogInhoud(k)}</body></html>`;

// Draait in de browser: maak de kop kleiner tot de kaart past (hooguit drie
// regels en niets buiten de rand). Geeft de uiteindelijke grootte terug.
export const OG_PASSEN = `(() => {
  const h1 = document.querySelector('h1');
  const doos = document.querySelector('.in');
  let g = parseFloat(getComputedStyle(h1).fontSize);
  const regels = () => h1.getBoundingClientRect().height / (g * 1.04);
  while (g > 40 && (doos.scrollHeight > doos.clientHeight + 1 || regels() > 3.2)) {
    g -= 2;
    h1.style.setProperty('--kop', g + 'px');
  }
  return g;
})()`;
