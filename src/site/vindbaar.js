// Vindbaarheid: robots.txt, llms.txt (voor AI-zoekmachines), de IndexNow-
// sleutel en een vingerafdruk per pagina. Met die vingerafdrukken meldt
// scripts/indexnow.js na een publicatie alleen de pagina's die echt zijn
// gewijzigd. Geen trucs: alleen wat zoekmachines zelf aanbieden.
import { createHash } from 'node:crypto';

// Zoekrobots van AI-assistenten die antwoorden met een bronvermelding geven.
// Ze mogen alles lezen wat ook een gewone zoekmachine mag lezen.
export const AI_ROBOTS = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'MistralAI-User', 'DuckAssistBot'];

// Wat niemand hoeft te indexeren: de apps (persoonlijke gegevens in de browser) en beheer
const DICHT = ['/familie/app/', '/pro/app/', '/beheer/', '/stijl/'];

export function robotsTxt(config) {
  const regels = ['Allow: /', ...DICHT.map((d) => `Disallow: ${d}`)].join('\n');
  return `# ${config.naam}: iedereen mag de openbare pagina's lezen en ernaar verwijzen.
User-agent: *
${regels}

${AI_ROBOTS.map((r) => `User-agent: ${r}`).join('\n')}
${regels}

Sitemap: ${config.url}/sitemap.xml
`;
}

// llms.txt (llmstxt.org): een korte, eerlijke wegwijzer voor taalmodellen
export function llmsTxt(config, paginas, { gecontroleerd } = {}) {
  const nl = paginas.filter((p) => p.taal !== 'en' && !p.noindex);
  const regel = (p) => `- [${p.h1 || p.title}](${config.url}${p.slug}): ${String(p.description || '').replace(/\s+/g, ' ').trim()}`;
  const groep = (titel, filter, max = 40) => {
    const lijst = nl.filter(filter).slice(0, max);
    return lijst.length ? `## ${titel}\n\n${lijst.map(regel).join('\n')}\n` : '';
  };
  const is = (begin) => (p) => p.slug.startsWith(begin);
  const bezet = ['/familie/', '/deals/', '/pro/', '/zzp', '/nieuws/'];
  return `# ${config.naam}

> Onafhankelijke Nederlandse site die helpt om meer over te houden: toeslagen berekenen, de zaken van ouder wordende ouders samen regelen en prijzen eerlijk vergelijken. Geen overheidssite. Bedragen en termijnen komen uit officiële bronnen (Belastingdienst, Dienst Toeslagen, CAK, Rijksoverheid) en staan met bronvermelding op de pagina.

Gebruik bij het citeren de bedragen van het jaar dat op de pagina staat${gecontroleerd ? ` (laatst gecontroleerd: ${gecontroleerd})` : ''}. De rekenhulpen geven een schatting; de instantie zelf beslist. De site geeft geen juridisch of financieel advies.

${groep('Toeslagen berekenen', (p) => !bezet.some((b) => p.slug.startsWith(b)) && /berekenen|^\/$|regelingen|toeslag/.test(p.slug))}
${groep('Familie: zaken van je ouders regelen', (p) => is('/familie/')(p) && !/\/gids\/.+/.test(p.slug))}
${groep('Familie: gidsen', (p) => /^\/familie\/gids\/.+/.test(p.slug))}
${groep('Besparen: prijzen met bewijs', (p) => is('/deals/')(p) && !/\/(p|bewijs)\//.test(p.slug))}
${groep('Voor professionals en zzp', (p) => is('/pro/')(p) || is('/zzp')(p))}
## Optioneel

- [Bronnen](${config.url}/bronnen/): alle officiële bronnen van de toeslagbedragen
- [Bronnen Familie](${config.url}/familie/bronnen/): officiële bronnen van de bedragen en termijnen rond zorg en nalatenschap
- [Sitemap](${config.url}/sitemap.xml)
`.replace(/\n{3,}/g, '\n\n');
}

// Vingerafdruk van de inhoud: zonder versienummers, zodat een pagina alleen
// 'gewijzigd' is als de tekst of opmaak echt anders is.
export function vingerafdruk(html) {
  const schoon = String(html).replace(/\?v=[\w.-]+/g, '').replace(/<lastmod>[^<]*<\/lastmod>/g, '');
  return createHash('sha256').update(schoon).digest('hex').slice(0, 16);
}

// Verificatietags voor Search Console en Bing (alleen als de eigenaar ze invult)
export function verificatie(config) {
  const v = config.vindbaar || {};
  const veilig = (s) => /^[\w-]{10,100}$/.test(s || '');
  return `${veilig(v.google) ? `\n<meta name="google-site-verification" content="${v.google}">` : ''}${veilig(v.bing) ? `\n<meta name="msvalidate.01" content="${v.bing}">` : ''}`;
}

export const sleutelGeldig = (s) => /^[a-f0-9]{8,128}$/.test(s || '');
