// Kleine robots.txt-parser volgens RFC 9309: groepen per User-agent, de
// langste passende regel wint, bij gelijke lengte wint Allow. '*' en '$'
// worden ondersteund. Ook Sitemap- en Crawl-delay-regels.
// robots.txt is ook het machineleesbare TDM-voorbehoud (EU DSM-richtlijn art. 4).

export const UA_TOKEN = 'dealbuddybot';
export const USER_AGENT = 'DealBuddyBot/1.0 (+https://www.toeslagbuddy.nl/deals/over/)';

export function parseRobots(tekst) {
  const groepen = [];
  const sitemaps = [];
  let huidig = null;
  let laatsteWasAgent = false;
  for (const ruw of String(tekst || '').split(/\r?\n/)) {
    const regel = ruw.replace(/#.*$/, '').trim();
    const m = regel.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const veld = m[1].toLowerCase();
    const waarde = m[2].trim();
    if (veld === 'user-agent') {
      if (!laatsteWasAgent) {
        huidig = { agents: [], regels: [], crawlDelay: null };
        groepen.push(huidig);
      }
      huidig.agents.push(waarde.toLowerCase());
      laatsteWasAgent = true;
      continue;
    }
    laatsteWasAgent = false;
    if (veld === 'sitemap') sitemaps.push(waarde);
    else if (!huidig) continue;
    else if (veld === 'allow' || veld === 'disallow') huidig.regels.push({ allow: veld === 'allow', pad: waarde });
    else if (veld === 'crawl-delay' && Number.isFinite(Number(waarde))) huidig.crawlDelay = Number(waarde);
  }
  return { groepen, sitemaps };
}

// De groep voor onze bot; anders '*'. Meerdere groepen voor dezelfde agent
// worden samengevoegd (RFC 9309, 2.2.1).
export function groepVoor(robots, token = UA_TOKEN) {
  const eigen = robots.groepen.filter((g) => g.agents.some((a) => a !== '*' && token.toLowerCase().includes(a)));
  const lijst = eigen.length ? eigen : robots.groepen.filter((g) => g.agents.includes('*'));
  return {
    regels: lijst.flatMap((g) => g.regels),
    crawlDelay: lijst.map((g) => g.crawlDelay).find((c) => c !== null) ?? null,
  };
}

const patroon = (pad) => {
  const eind = pad.endsWith('$');
  const kern = (eind ? pad.slice(0, -1) : pad).replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + kern + (eind ? '$' : ''));
};

export function magOphalen(robots, url, token = UA_TOKEN) {
  const u = new URL(url);
  const pad = decodeURIComponentVeilig(u.pathname) + u.search;
  if (pad === '/robots.txt') return true;
  let beste = null;
  for (const r of groepVoor(robots, token).regels) {
    if (r.pad === '') continue; // lege Disallow = alles mag
    if (!patroon(decodeURIComponentVeilig(r.pad)).test(pad)) continue;
    const lengte = r.pad.replace(/\*/g, '').length;
    if (!beste || lengte > beste.lengte || (lengte === beste.lengte && r.allow && !beste.allow)) beste = { lengte, allow: r.allow };
  }
  return beste ? beste.allow : true;
}

function decodeURIComponentVeilig(s) {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}
