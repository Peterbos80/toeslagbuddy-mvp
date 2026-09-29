import config from '../../site.config.js';
import { JAAR, GECONTROLEERD_OP } from '../calc/params.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const NAV = [
  ['/', 'Alle toeslagen'],
  ['/zorgtoeslag-berekenen/', 'Zorgtoeslag'],
  ['/huurtoeslag-berekenen/', 'Huurtoeslag'],
  ['/kindgebonden-budget-berekenen/', 'Kindgebonden budget'],
  ['/alle-regelingen/', 'Alle regelingen'],
  ['/zzp-toeslagen/', 'Zzp'],
  ['/pro/', 'Voor professionals'],
];

const FOOTER = [
  ['Rekenhulpen', [
    ['/', 'Alle toeslagen berekenen'],
    ['/zorgtoeslag-berekenen/', 'Zorgtoeslag berekenen'],
    ['/huurtoeslag-berekenen/', 'Huurtoeslag berekenen'],
    ['/kindgebonden-budget-berekenen/', 'Kindgebonden budget berekenen'],
    ['/kinderopvangtoeslag-berekenen/', 'Kinderopvangtoeslag berekenen'],
    ['/kinderbijslag-berekenen/', 'Kinderbijslag berekenen'],
    ['/toetsingsinkomen/', 'Toetsingsinkomen berekenen'],
  ]],
  ['Voor wie', [
    ['/toeslagen-student/', 'Studenten'],
    ['/toeslagen-alleenstaande-ouder/', 'Alleenstaande ouders'],
    ['/toeslagen-aow/', 'AOW’ers en gepensioneerden'],
    ['/zzp-toeslagen/', 'Zzp’ers: toeslagbewaker'],
    ['/regelingen-laag-inkomen/', 'Regelingen bij een laag inkomen'],
    ['/pro/', 'Bewindvoerders en budgetcoaches'],
  ]],
  ['Uitleg', [
    ['/inkomensgrenzen-toeslagen/', `Inkomensgrenzen ${JAAR}`],
    ['/vermogensgrens-toeslagen/', `Vermogensgrenzen ${JAAR}`],
    ['/toeslagpartner/', 'Wat is een toeslagpartner?'],
    ['/toeslagen-aanvragen/', 'Toeslagen aanvragen'],
    ['/toeslag-terugbetalen/', 'Terugbetalen voorkomen'],
    ['/toeslagen-2027/', 'Toeslagen 2027'],
    ['/alle-regelingen/', 'Alle regelingen op een rij'],
    ['/nieuws/', 'Nieuws over toeslagen'],
    ['/zorgverzekering-overstappen/', `Zorgverzekering ${JAAR + 1} overstappen`],
  ]],
  ['ToeslagBuddy', [
    ['/over/', 'Over ons'],
    ['/bronnen/', 'Bronnen en rekenregels'],
    ['/contact/', 'Contact'],
    ['/privacy/', 'Privacy en cookies'],
    ['/disclaimer/', 'Disclaimer'],
    ['/colofon/', 'Colofon en bedrijfsgegevens'],
    ['/toegankelijkheid/', 'Toegankelijkheid'],
    ['/pro/beveiliging/', 'Beveiliging (voor kantoren)'],
  ]],
];

export const GEEN_JS = 'Deze rekenhulp werkt alleen met JavaScript. Zet JavaScript aan in je browser, of gebruik een andere browser. De uitleg op deze pagina kun je wel gewoon lezen.';

// Pro- en beheerpagina's: daar kunnen cliënt- of accountgegevens in de pagina
// staan. Geen scripts van derden (statistieken, advertenties), een strikte CSP
// en een framebuster.
export function afgeschermd(page) {
  const slug = page.slug || '';
  return !!(page.pro || page.beheer || slug.startsWith('/pro/') || slug.startsWith('/beheer/'));
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
  // Terugval zolang formulieren nog via Web3Forms gaan. Op Pro en beheer alleen
  // als er echt een sleutel is ingesteld; anders blijft daar alleen Supabase over.
  const f = config.formulieren || {};
  if (origin(f.endpoint) && (f.accessKey || !strikt)) connect.push(origin(f.endpoint));
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
export function bedrijfsgegevens() {
  const b = config.bedrijf || {};
  const naam = b.naam || b.handelsnaam || config.naam;
  const email = b.email || 'info@toeslagbuddy.nl';
  const delen = [
    `<strong>${esc(naam)}</strong>${b.handelsnaam && b.handelsnaam !== naam ? `, handelend onder de naam ${esc(b.handelsnaam)}` : ''}`,
    b.adres ? esc(b.adres) : b.vestigingsplaats ? `gevestigd in ${esc(b.vestigingsplaats)}` : '',
    `e-mail: <a href="mailto:${esc(email)}">${esc(email)}</a>`,
    b.kvk ? `KvK ${esc(b.kvk)}` : '',
    b.btwId ? `btw-id ${esc(b.btwId)}` : '',
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

// Formulier dat via de webapplicatie (Web3Forms) naar je privé-e-mail gaat.
// velden: [naam, label, type, verplicht, autocomplete]
export function formulier(soort, onderwerp, velden, knop) {
  const f = config.formulieren;
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

export function formulierConfigJson() {
  return JSON.stringify({ endpoint: config.formulieren.endpoint, accessKey: config.formulieren.accessKey }).replace(/</g, '\\u003c');
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
  const c = { formulieren: { endpoint: config.formulieren.endpoint, accessKey: config.formulieren.accessKey } };
  if (page.calc) c.partners = JSON.parse(partnersJson());
  if (page.pro) c.pro = { supabaseUrl: config.pro.supabaseUrl, supabaseAnonKey: config.pro.supabaseAnonKey, proefDagen: config.pro.proefDagen };
  return JSON.stringify(c).replace(/</g, '\\u003c');
}

export function partnersJson() {
  const actief = {};
  for (const [k, p] of Object.entries(config.partners)) if (p.url) actief[k] = p;
  return JSON.stringify(actief).replace(/</g, '\\u003c');
}

export function layout(page, body) {
  const url = config.url + page.slug;
  const titel = page.slug === '/' ? page.title : `${page.title} | ${config.naam}`;
  const kruimel = page.slug === '/' ? [] : [['/', 'Home'], [page.slug, page.kort || page.h1]];
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.naam,
      url: config.url + '/',
      inLanguage: 'nl-NL',
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
          operatingSystem: 'Alle',
          inLanguage: 'nl-NL',
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
<html lang="nl">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${esc(csp(page))}">
${afgeschermd(page) ? `<script src="/js/framebuster.js?v=${page.versie}"></script>\n` : ''}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">${page.noindex ? '\n<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#0d7a5f">
<meta property="og:type" content="website">
<meta property="og:locale" content="nl_NL">
<meta property="og:site_name" content="${config.naam}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${config.url}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="Nieuws over toeslagen" href="/nieuws/feed.xml">
<link rel="preload" href="/fonts/nunito-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css?v=${page.versie}">
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n')}
${analytics(page)}${adsenseHead(page)}</head>
<body>
<a class="skip" href="#main">Naar de inhoud</a>
<header class="site"><div class="wrap">
<a class="logo" href="/"><span aria-hidden="true">€</span>${config.naam}</a>
<button type="button" class="menu-knop" aria-expanded="false" aria-controls="hoofdmenu">Menu</button>
<nav class="hoofd" id="hoofdmenu" aria-label="Hoofdmenu">${NAV.map(([u, n]) => `<a href="${u}"${u === page.slug ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
</div></header>
<main id="main">
<div class="wrap">
${!page.calc && (afgeschermd(page) || page.script) ? '<noscript><p class="geen-js">Dit onderdeel werkt alleen met JavaScript. Zet JavaScript aan in je browser om verder te gaan.</p></noscript>\n' : ''}${kruimel.length ? `<nav class="kruimel" aria-label="Kruimelpad">${kruimel.map(([u, n], i) => (i < kruimel.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n))).join('')}</nav>` : ''}
${body}
<aside class="hulp" aria-label="Hulp">
<h2>Hulp nodig?</h2>
<ul>
<li><strong>Vragen over je eigen toeslag?</strong> Bel gratis de BelastingTelefoon: <a href="tel:08000543">0800 0543</a>.</li>
<li><strong>Hulp bij het aanvragen?</strong> Ga naar het Informatiepunt Digitale Overheid in de bibliotheek. Daar helpen ze je gratis.</li>
<li><strong>Geldzorgen?</strong> Je gemeente helpt gratis met schuldhulp. Zie <a href="/regelingen-laag-inkomen/">regelingen bij een laag inkomen</a>.</li>
</ul>
</aside>
</div>
</main>
<footer class="site"><div class="wrap">
<div class="kolommen">${FOOTER.map(([kop, links]) => `<div><h2>${kop}</h2><ul>${links.map(([u, n]) => `<li><a href="${u}">${n}</a></li>`).join('')}</ul></div>`).join('')}</div>
${config.instagram.account ? `<p>Volg ons op <a href="https://www.instagram.com/${esc(config.instagram.account)}/" rel="noopener">Instagram @${esc(config.instagram.account)}</a> voor toeslag-tips.</p>` : ''}
${bedrijfsgegevens()}
<p class="disclaimer">${config.naam} is een onafhankelijke rekenhulp en hoort <strong>niet</strong> bij de Belastingdienst, Dienst Toeslagen of de SVB. De uitkomsten zijn een indicatie, gebaseerd op de officiële rekenregels voor ${JAAR}. Aan de berekening kun je geen rechten ontlenen. Vraag toeslagen altijd aan via <a href="https://www.toeslagen.nl" rel="noopener">toeslagen.nl</a>. Bedragen gecontroleerd op ${new Date(GECONTROLEERD_OP).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
</div></footer>
<script type="application/json" id="tb-config">${configJson(page)}</script>
<script type="module" src="/js/site.js?v=${page.versie}"></script>
${page.calc ? `<script type="module" src="/js/app.js?v=${page.versie}"></script>` : ''}${page.pro && config.pro.supabaseUrl ? `\n<script src="/js/vendor/supabase.js"></script>` : ''}${[].concat(page.script || []).map((sc) => `\n<script type="module" src="/js/${sc}?v=${page.versie}"></script>`).join('')}
</body>
</html>
`;
}
