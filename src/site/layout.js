import config from '../../site.config.js';
import { JAAR, GECONTROLEERD_OP } from '../calc/params.js';
import { teksten } from '../i18n/i18n.js';

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
    if (config.adsense.client) {
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

function adsenseHead(page) {
  if (!config.adsense.client || afgeschermd(page)) return '';
  // Het meta-tag is de verificatie van je site in AdSense; het script laadt de advertenties
  // (ook 'automatische advertenties' als je die in AdSense aanzet).
  return `<meta name="google-adsense-account" content="${esc(config.adsense.client)}">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsense.client)}" crossorigin="anonymous"></script>\n`;
}

export function advertentie(slot, page = {}) {
  const id = config.adsense[slot];
  if (!config.adsense.client || !id || afgeschermd(page)) return '';
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
  const kruimel = thuis ? [] : [[T.home, S.home], [page.slug, page.kort || page.h1]];
  const wissel = page.wissel || teksten(S.wissel.naar).home;
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.naam,
      url: config.url + T.home,
      inLanguage: T.inLanguage,
      ...(config.instagram.account ? { sameAs: [`https://www.instagram.com/${config.instagram.account}/`] } : {}),
    },
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
  ];

  return `<!doctype html>
<html lang="${taal}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${esc(csp(page))}">
${afgeschermd(page) ? `<script src="/js/framebuster.js?v=${page.versie}"></script>\n` : ''}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">${alternatieven(page)}${page.noindex ? '\n<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#0d7a5f">
<meta property="og:type" content="website">
<meta property="og:locale" content="${T.ogLocale}">\n<meta property="og:locale:alternate" content="${teksten(S.wissel.naar).ogLocale}">
<meta property="og:site_name" content="${config.naam}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${config.url}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${S.rss}" href="/nieuws/feed.xml">
<link rel="preload" href="/fonts/nunito-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=${page.versie}">
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n')}
${analytics(page)}${adsenseHead(page)}</head>
<body>
<a class="skip" href="#main">${S.naarInhoud}</a>
<header class="site"><div class="wrap">
<a class="logo" href="${T.home}"><span aria-hidden="true">€</span>${config.naam}</a>
<button type="button" class="menu-knop" aria-expanded="false" aria-controls="hoofdmenu">${S.menu}</button>
<nav class="hoofd" id="hoofdmenu" aria-label="${S.hoofdmenu}">${S.nav.map(([u, n]) => `<a href="${u}"${u === page.slug ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
<a class="taalwissel" href="${wissel}" hreflang="${S.wissel.naar}" lang="${S.wissel.naar}"><span class="taal-lang">${S.wissel.tekst}</span><span class="taal-kort" aria-hidden="true">${S.wissel.naar.toUpperCase()}</span></a>
</div></header>
<main id="main">
<div class="wrap">
${!page.calc && (afgeschermd(page) || page.script) ? `<noscript><p class="geen-js">${S.geenJsAlgemeen}</p></noscript>\n` : ''}${kruimel.length ? `<nav class="kruimel" aria-label="${S.kruimelpad}">${kruimel.map(([u, n], i) => (i < kruimel.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n))).join('')}</nav>` : ''}
${body}
<aside class="hulp" aria-label="${S.hulpLabel}">
${S.hulp}
</aside>
</div>
</main>
<footer class="site"><div class="wrap">
<div class="kolommen">${S.footer.map(([kop, links]) => `<div><h2>${kop}</h2><ul>${links.map(voetLink).join('')}</ul></div>`).join('')}</div>
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
