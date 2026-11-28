import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from '../../site.config.js';
import { JAAR, GECONTROLEERD_OP } from '../calc/params.js';
import { teksten } from '../i18n/i18n.js';
import { verificatie } from './vindbaar.js';
import { ogAfbeelding, OG_MAAT } from './og.js';

// Deelafbeelding: de eigen afbeelding van de pagina (dist/og/, gemaakt door
// scripts/og-paginas.js) als die er al is, anders die van het onderdeel
// (public/og*.png, scripts/og.js). Draait het script pas na de build, dan zet
// het de verwijzing alsnog om; zonder script verwijst de pagina naar de
// afbeelding van het onderdeel en breekt er dus niets.
const DIST = fileURLToPath(new URL('../../dist', import.meta.url));
const inDist = (pad) => existsSync(DIST + pad);

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Menu, voettekst en vaste teksten staan per taal in src/i18n (site).
export const GEEN_JS = teksten('nl').site.geenJs;

// Pro- en beheerpagina's: daar kunnen cliënt- of accountgegevens in de pagina
// staan. Geen scripts van derden (statistieken, advertenties), een strikte CSP
// en een framebuster.
export function afgeschermd(page) {
  const slug = page.slug || '';
  return !!(page.pro || page.beheer || slug.startsWith('/pro/') || slug.startsWith('/en/pro/') || slug.startsWith('/beheer/'));
}

const origin = (u) => {
  try {
    return u ? new URL(u).origin : '';
  } catch {
    return '';
  }
};

// Content-Security-Policy als <meta> (GitHub Pages kan geen headers sturen).
// Let op: frame-ancestors werkt niet in een meta-tag; daarvoor is framebuster.js.
// style-src staat inline stijlen toe: de rekenhulpen zetten style="--w:…" en
// breedtes via innerHTML. Scripts blijven strikt: geen 'unsafe-inline'.
export function csp(page) {
  const strikt = afgeschermd(page);
  const a = config.analytics;
  const script = ["'self'"];
  const connect = ["'self'"];
  const img = ["'self'", 'data:', 'blob:'];
  const frame = [];
  const formAction = ["'self'"];
  const supabase = origin(config.pro && config.pro.supabaseUrl);
  if (supabase) connect.push(supabase, supabase.replace(/^https:/, 'wss:'));
  if (!strikt) {
    if (a.plausibleDomain) {
      script.push('https://plausible.io');
      connect.push('https://plausible.io');
    }
    if (a.goatcounterCode) {
      const gc = `https://${a.goatcounterCode}.goatcounter.com`;
      script.push('https://gc.zgo.at');
      connect.push(gc);
      img.push(gc);
    }
    if (config.adsense.client && !zonderAdvertenties(page)) {
      const google = ['https://pagead2.googlesyndication.com', 'https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com', 'https://*.gstatic.com', 'https://*.adtrafficquality.google', 'https://fundingchoicesmessages.google.com'];
      script.push(...google);
      connect.push(...google);
      frame.push(...google);
      img.push('https:');
    }
    if (config.nieuwsbrief.formAction && origin(config.nieuwsbrief.formAction)) formAction.push(origin(config.nieuwsbrief.formAction));
  }
  const regels = {
    'default-src': ["'self'"],
    'script-src': script,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': img,
    'font-src': ["'self'"],
    'connect-src': connect,
    'media-src': ["'self'"],
    'frame-src': frame.length ? frame : ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': formAction,
  };
  return Object.entries(regels)
    .map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`)
    .join('; ');
}

// Bedrijfsgegevens (art. 3:15d BW), uit site.config.js → bedrijf
export function bedrijfsgegevens(taal = 'nl') {
  const b = config.bedrijf || {};
  const w = teksten(taal).site.bedrijf;
  const naam = b.naam || b.handelsnaam || config.naam;
  const email = b.email || 'info@toeslagbuddy.nl';
  const delen = [
    `<strong>${esc(naam)}</strong>${b.handelsnaam && b.handelsnaam !== naam ? `, ${w.handelend} ${esc(b.handelsnaam)}` : ''}`,
    b.adres ? esc(b.adres) : b.vestigingsplaats ? `${w.gevestigd} ${esc(b.vestigingsplaats)}` : '',
    `${w.email}: <a href="mailto:${esc(email)}">${esc(email)}</a>`,
    b.kvk ? `${w.kvk} ${esc(b.kvk)}` : '',
    b.btwId ? `${w.btw} ${esc(b.btwId)}` : '',
  ].filter(Boolean);
  return `<p class="bedrijf">${delen.join(' · ')}</p>`;
}

function analytics(page) {
  if (afgeschermd(page)) return '';
  const a = config.analytics;
  let s = '';
  if (a.plausibleDomain) {
    s += `<script defer data-domain="${esc(a.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>\n`;
  }
  if (a.goatcounterCode) {
    s += `<script data-goatcounter="https://${esc(a.goatcounterCode)}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>\n`;
  }
  return s;
}

// Geen advertenties op Familie (het vertrouwen is het product) en niet op de
// afgeschermde apps.
export const zonderAdvertenties = (page) => afgeschermd(page) || sectieVan(page) === 'familie';

function adsenseHead(page) {
  if (!config.adsense.client || zonderAdvertenties(page)) return '';
  // Het meta-tag is de verificatie van je site in AdSense; het script laadt de advertenties
  // (ook 'automatische advertenties' als je die in AdSense aanzet).
  return `<meta name="google-adsense-account" content="${esc(config.adsense.client)}">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsense.client)}" crossorigin="anonymous"></script>\n`;
}

export function advertentie(slot, page = {}) {
  const id = config.adsense[slot];
  if (!config.adsense.client || !id || zonderAdvertenties(page)) return '';
  return `<div class="advertentie"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsense.client)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}

export function nieuwsbrief(page = {}) {
  const n = config.nieuwsbrief;
  if (!n.formAction || afgeschermd(page)) return '';
  return `<section class="nieuwsbrief"><h2>Krijg een seintje als de bedragen van ${JAAR + 1} bekend zijn</h2>
<p>Eén mail als er iets verandert aan de toeslagen. Geen spam, altijd afmelden.</p>
<form action="${esc(n.formAction)}" method="post" target="_blank"><label class="skip" for="nb-email">E-mailadres</label>
<input id="nb-email" type="email" name="${esc(n.emailVeld)}" placeholder="jouw@email.nl" required autocomplete="email"><button type="submit">Aanmelden</button></form></section>`;
}

// Formulier dat via de database (Supabase, functie bericht_plaatsen) naar de
// beheerder gaat; zie public/js/formulier.js. velden: [naam, label, type, verplicht, autocomplete]
export function formulier(soort, onderwerp, velden, knop) {
  return `<form class="aanvraag" data-formulier="${esc(soort)}" data-onderwerp="${esc(onderwerp)}" novalidate>
${velden
  .map(([naam, label, type = 'text', verplicht = false, auto = 'off']) => {
    const id = `f-${soort}-${naam}`;
    const veld = type === 'textarea'
      ? `<textarea id="${id}" name="${naam}"${verplicht ? ' required' : ''} rows="5"></textarea>`
      : `<input id="${id}" name="${naam}" type="${type}" autocomplete="${auto}"${verplicht ? ' required' : ''}>`;
    return `<div class="veld"><label for="${id}">${esc(label)}${verplicht ? '' : ' <small>(optioneel)</small>'}</label>${veld}</div>`;
  })
  .join('\n')}
<input type="checkbox" name="botcheck" class="skip" tabindex="-1" autocomplete="off" aria-hidden="true">
<button class="knop" type="submit">${esc(knop)}</button>
<p class="formulier-status" role="status" aria-live="polite"></p>
</form>`;
}

// Uitlegvideo (motion graphics, scripts/video/uitleg.js). Alleen als de video
// er is; met poster, ingebrande ondertitels en de volledige tekst eronder.
let uitlegManifest = null;
export function uitlegVideo(id, { kop = '' } = {}) {
  if (uitlegManifest === null) {
    try {
      uitlegManifest = JSON.parse(readFileSync(new URL('../../public/video/uitleg/manifest.json', import.meta.url), 'utf8'));
    } catch {
      uitlegManifest = {};
    }
  }
  const v = uitlegManifest[id];
  if (!v) return '';
  const duur = `${Math.floor(v.duur / 60)}:${String(Math.round(v.duur % 60)).padStart(2, '0')}`;
  return `<figure class="uitlegvideo">${kop}<div class="uv-beeld"><video controls preload="none" playsinline poster="${esc(v.poster)}" aria-label="${esc(v.titel)} (video, ${duur})"><source src="${esc(v.src)}" type="video/mp4">${v.vtt ? `<track kind="captions" srclang="nl" label="Nederlands" src="${esc(v.vtt)}">` : ''}</video></div>
<figcaption><span>${esc(v.titel)} · ${duur}${v.stem ? '' : ' · met ondertitels, zonder geluid'}${v.ai ? ' · beelden gemaakt met AI' : ''}${v.credits?.length ? ` · beelden: ${v.credits.map((c) => `<a href="${esc(c.url)}" rel="noopener">${esc(c.fotograaf)}</a> (${esc(c.platform || 'Pexels')})`).join(', ')}` : ''}</span><details><summary>Lees de tekst</summary><p>${esc(v.transcript)}</p></details></figcaption></figure>`;
}

// Partnerblok in de pagina zelf (niet alleen na een berekening)
export function partnerBlok(sleutel) {
  const p = config.partners[sleutel];
  if (!p || !p.url) return '';
  return `<aside class="partner"><p class="partner-label">Partnerlink</p><h4>${esc(p.titel)}</h4><p>${esc(p.tekst)}</p>
<a class="knop-licht" href="${esc(p.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(p.knop)} →</a></aside>`;
}

// Instellingen voor de browser als JSON (geen inline script: werkt met een strikte CSP).
// Lees ze in de browser met: import { CONFIG } from './config.js'
export function configJson(page) {
  // Supabase-adres en anon key op elke pagina: de formulieren gebruiken ze ook
  const c = { supabaseUrl: config.pro.supabaseUrl, supabaseAnonKey: config.pro.supabaseAnonKey };
  if (page.calc) c.partners = JSON.parse(partnersJson());
  if (page.pro) c.pro = { proefDagen: config.pro.proefDagen, prijsPerMaand: config.pro.prijsPerMaand };
  return JSON.stringify(c).replace(/</g, '\\u003c');
}

export function partnersJson() {
  const actief = {};
  for (const [k, p] of Object.entries(config.partners)) if (p.url) actief[k] = p;
  return JSON.stringify(actief).replace(/</g, '\\u003c');
}

// Bij welk onderdeel van de site hoort een pagina? Bepaalt het actieve
// menu-item, het sectiemenu en de accentkleur (body.sectie-…).
export function sectieVan(page) {
  if (page.sectie) return page.sectie;
  const s = page.slug || '';
  if (s.startsWith('/familie/')) return 'familie';
  if (s.startsWith('/deals/')) return 'deals';
  if (s.startsWith('/pro/') || s.startsWith('/en/pro/') || s.startsWith('/beheer/') || s === '/en/terms/') return 'pro';
  if (s.startsWith('/zzp')) return 'zzp';
  if (s.startsWith('/nieuws/')) return 'nieuws';
  return 'toeslagen';
}

// Icoon uit de sprite /img/iconen.svg (lijniconen, 24 px raster)
export const icoon = (naam, klasse = '') => `<svg class="ico${klasse ? ` ${klasse}` : ''}" aria-hidden="true" focusable="false"><use href="/img/iconen.svg#${naam}"/></svg>`;

// Link in de voettekst; een derde element is de taal van het doel (hreflang)
const voetLink = ([u, n, taal]) => `<li><a href="${u}"${taal ? ` hreflang="${taal}"` : ''}>${n}</a></li>`;

// hreflang-alternatieven (alleen bij echte vertalingen) met x-default = Nederlands
function alternatieven(page) {
  const h = page.hreflang;
  if (!h) return '';
  return [...Object.entries(h), ['x-default', h.nl]].map(([taal, slug]) => `\n<link rel="alternate" hreflang="${taal}" href="${config.url}${slug}">`).join('');
}

export function layout(page, body) {
  const taal = page.taal || 'nl';
  const T = teksten(taal);
  const S = T.site;
  const url = config.url + page.slug;
  const thuis = page.slug === T.home;
  const titel = thuis ? page.title : `${page.title} | ${config.naam}`;
  const kruimel = page.kruimel || (thuis ? [] : [[T.home, S.home], [page.slug, page.kort || page.h1]]);
  const wissel = page.wissel || teksten(S.wissel.naar).home;
  const sectie = sectieVan(page);
  const sub = (S.sub[sectie] || []).filter(([u]) => !page.zonderSub);
  const actie = S.kopActie[sectie];
  const logo = `<a class="logo" href="${T.home}"><span aria-hidden="true">€</span>${config.naam}</a>`;
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.naam,
      url: config.url + T.home,
      inLanguage: T.inLanguage,
      ...(config.instagram.account ? { sameAs: [`https://www.instagram.com/${config.instagram.account}/`] } : {}),
    },
    ...(thuis
      ? [{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: config.naam,
          url: config.url + '/',
          logo: config.url + '/og.png',
          email: config.contactEmail,
          description: T.site.merkregel || undefined,
          areaServed: 'NL',
        }]
      : []),
    ...(kruimel.length
      ? [{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: kruimel.map(([u, n], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: config.url + u })),
        }]
      : []),
    ...(page.calc
      ? [{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: page.h1,
          url,
          applicationCategory: 'FinanceApplication',
          operatingSystem: S.besturingssysteem,
          inLanguage: T.inLanguage,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          dateModified: GECONTROLEERD_OP,
        }]
      : []),
    ...(page.faq && page.faq.length
      ? [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: page.faq.map(([q, a]) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') },
          })),
        }]
      : []),
    ...(page.schemas || []),
  ];

  return `<!doctype html>
<html lang="${taal}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${esc(csp(page))}">
${afgeschermd(page) ? `<script src="/js/framebuster.js?v=${page.versie}"></script>\n` : ''}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">${alternatieven(page)}${page.noindex ? '\n<meta name="robots" content="noindex">' : ''}${thuis ? verificatie(config) : ''}
<meta name="theme-color" content="#faf7f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111917" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:locale" content="${T.ogLocale}">\n<meta property="og:locale:alternate" content="${teksten(S.wissel.naar).ogLocale}">
<meta property="og:site_name" content="${config.naam}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${config.url}${ogAfbeelding(page, sectie, inDist)}">
<meta property="og:image:width" content="${OG_MAAT.breedte}">
<meta property="og:image:height" content="${OG_MAAT.hoogte}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${S.rss}" href="/nieuws/feed.xml">
<link rel="preload" href="/fonts/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/fraunces-latin-soft-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=${page.versie}">${[].concat(page.css || []).map((c) => `\n<link rel="stylesheet" href="/css/${c}.css?v=${page.versie}">`).join('')}
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n')}
${analytics(page)}${adsenseHead(page)}</head>
<body class="sectie-${sectie}${page.bodyKlasse ? ` ${esc(page.bodyKlasse)}` : ''}">
<a class="skip" href="#main">${S.naarInhoud}</a>
<header class="site"><div class="wrap">
${logo}
<button type="button" class="menu-knop" aria-expanded="false" aria-controls="hoofdmenu">${S.menu}</button>
<nav class="hoofd" id="hoofdmenu" aria-label="${S.hoofdmenu}">${S.secties.map(([k, u, n]) => `<a href="${u}"${u === page.slug ? ' aria-current="page"' : k === sectie ? ' aria-current="true"' : ''}>${n}</a>`).join('')}${sub.length ? `<div class="menu-sub"><p>${S.menuSub || 'Veel gebruikt'}</p>${sub.map(([u, n]) => `<a href="${u}"${u === page.slug ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</div>` : ''}</nav>
<a class="taalwissel" href="${wissel}" hreflang="${S.wissel.naar}" lang="${S.wissel.naar}"><span class="taal-lang">${S.wissel.tekst}</span><span class="taal-kort" aria-hidden="true">${S.wissel.naar.toUpperCase()}</span></a>
${actie && !page.zonderKopActie ? `<a class="kop-actie" href="${actie[0]}">${actie[1]}</a>` : ''}
</div>${sub.length ? `
<nav class="sub" aria-label="${S.sectiemenu}"><div class="wrap">${sub.map(([u, n]) => `<a href="${u}"${u === page.slug ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</div></nav>` : ''}
</header>
<main id="main">
<div class="wrap">
${!page.calc && (afgeschermd(page) || page.script) ? `<noscript><p class="geen-js">${S.geenJsAlgemeen}</p></noscript>\n` : ''}${kruimel.length ? `<nav class="kruimel" aria-label="${S.kruimelpad}">${kruimel.map(([u, n], i) => (i < kruimel.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n))).join('')}</nav>` : ''}
${body}
${page.zonderHulp ? '' : `<aside class="hulp" aria-label="${S.hulpLabel}">
${S.hulp}
</aside>`}
</div>
</main>
<footer class="site"><div class="wrap">
<div class="voet-top">
<div class="voet-merk">${logo}<p>${S.merkregel}</p>${S.hulplijnen ? `<p class="hulplijnen">${S.hulplijnen}</p>` : ''}</div>
<div class="kolommen">${S.footer.map(([kop, links]) => `<div><h2>${kop}</h2><ul>${links.map(voetLink).join('')}</ul></div>`).join('')}</div>
</div>
${config.instagram.account ? `<p>${S.instagram(`https://www.instagram.com/${esc(config.instagram.account)}/`, esc(config.instagram.account))}</p>` : ''}
${bedrijfsgegevens(taal)}
<p class="disclaimer">${S.disclaimer(config.naam, JAAR, new Date(GECONTROLEERD_OP).toLocaleDateString(T.locale, { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
</div></footer>
<script type="application/json" id="tb-config">${configJson(page)}</script>
<script type="module" src="/js/site.js?v=${page.versie}"></script>
${page.calc ? `<script type="module" src="/js/app.js?v=${page.versie}"></script>` : ''}${page.pro && config.pro.supabaseUrl ? `\n<script src="/js/vendor/supabase.js"></script>` : ''}${[].concat(page.script || []).map((sc) => `\n<script type="module" src="/js/${sc}?v=${page.versie}"></script>`).join('')}
</body>
</html>
`;
}
