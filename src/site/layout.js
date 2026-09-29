import config from '../../site.config.js';
import { JAAR, GECONTROLEERD_OP } from '../calc/params.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const NAV = [
  ['/', 'Alle toeslagen'],
  ['/zorgtoeslag-berekenen/', 'Zorgtoeslag'],
  ['/huurtoeslag-berekenen/', 'Huurtoeslag'],
  ['/kindgebonden-budget-berekenen/', 'Kindgebonden budget'],
  ['/kinderopvangtoeslag-berekenen/', 'Kinderopvang'],
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
    ['/nieuws/', 'Nieuws over toeslagen'],
    ['/zorgverzekering-overstappen/', `Zorgverzekering ${JAAR + 1} overstappen`],
  ]],
  ['ToeslagBuddy', [
    ['/over/', 'Over ons'],
    ['/bronnen/', 'Bronnen en rekenregels'],
    ['/privacy/', 'Privacy en cookies'],
    ['/disclaimer/', 'Disclaimer'],
  ]],
];

function analytics() {
  const a = config.analytics;
  let s = '';
  if (a.plausibleDomain) {
    s += `<script defer data-domain="${esc(a.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>\n<script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>\n`;
  }
  if (a.goatcounterCode) {
    s += `<script data-goatcounter="https://${esc(a.goatcounterCode)}.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>\n`;
  }
  return s;
}

function adsenseHead() {
  if (!config.adsense.client) return '';
  // Het meta-tag is de verificatie van je site in AdSense; het script laadt de advertenties
  // (ook 'automatische advertenties' als je die in AdSense aanzet).
  return `<meta name="google-adsense-account" content="${esc(config.adsense.client)}">\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsense.client)}" crossorigin="anonymous"></script>\n`;
}

export function advertentie(slot) {
  const id = config.adsense[slot];
  if (!config.adsense.client || !id) return '';
  return `<div class="advertentie"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsense.client)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

export function nieuwsbrief() {
  const n = config.nieuwsbrief;
  if (!n.formAction) return '';
  return `<section class="nieuwsbrief"><h2>Krijg een seintje als de bedragen van ${JAAR + 1} bekend zijn</h2>
<p>Eén mail als er iets verandert aan de toeslagen. Geen spam, altijd afmelden.</p>
<form action="${esc(n.formAction)}" method="post" target="_blank"><label class="skip" for="nb-email">E-mailadres</label>
<input id="nb-email" type="email" name="${esc(n.emailVeld)}" placeholder="jouw@email.nl" required autocomplete="email"><button type="submit">Aanmelden</button></form></section>`;
}

// Partnerblok in de pagina zelf (niet alleen na een berekening)
export function partnerBlok(sleutel) {
  const p = config.partners[sleutel];
  if (!p || !p.url) return '';
  return `<aside class="partner"><p class="partner-label">Partnerlink</p><h4>${esc(p.titel)}</h4><p>${esc(p.tekst)}</p>
<a class="knop-licht" href="${esc(p.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(p.knop)} →</a></aside>`;
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
<meta name="viewport" content="width=device-width, initial-scale=1">
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
${analytics()}${adsenseHead()}</head>
<body>
<a class="skip" href="#main">Naar de inhoud</a>
<header class="site"><div class="wrap">
<a class="logo" href="/"><span aria-hidden="true">€</span>${config.naam}</a>
<button type="button" class="menu-knop" aria-expanded="false" aria-controls="hoofdmenu">Menu</button>
<nav class="hoofd" id="hoofdmenu" aria-label="Hoofdmenu">${NAV.map(([u, n]) => `<a href="${u}"${u === page.slug ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
</div></header>
<main id="main">
<div class="wrap">
${kruimel.length ? `<nav class="kruimel" aria-label="Kruimelpad">${kruimel.map(([u, n], i) => (i < kruimel.length - 1 ? `<a href="${u}">${esc(n)}</a> › ` : esc(n))).join('')}</nav>` : ''}
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
<p class="disclaimer">${config.naam} is een onafhankelijke rekenhulp en hoort <strong>niet</strong> bij de Belastingdienst, Dienst Toeslagen of de SVB. De uitkomsten zijn een indicatie op basis van de officiële rekenregels voor ${JAAR}. Aan de berekening kun je geen rechten ontlenen. Vraag toeslagen altijd aan via <a href="https://www.toeslagen.nl" rel="noopener">toeslagen.nl</a>. Bedragen gecontroleerd op ${new Date(GECONTROLEERD_OP).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
</div></footer>
<script type="module" src="/js/site.js?v=${page.versie}"></script>
${page.calc ? `<script>window.TB_PARTNERS=${partnersJson()}</script>\n<script type="module" src="/js/app.js?v=${page.versie}"></script>` : ''}${page.script ? `\n<script type="module" src="/js/${page.script}?v=${page.versie}"></script>` : ''}
</body>
</html>
`;
}
