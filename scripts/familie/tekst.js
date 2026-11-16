// HTML van een bronpagina → leesbare platte tekst, en de links op de pagina.
// Geen afhankelijkheden: de bronnen zijn gewone overheidspagina's.
const ENTITEITEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', eacute: 'é', egrave: 'è', euml: 'ë', iuml: 'ï', ouml: 'ö', uuml: 'ü', ecirc: 'ê', agrave: 'à', ccedil: 'ç', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', shy: '', middot: '·', bull: '•', deg: '°', frac12: '½', times: '×' };

export function ontcijfer(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => (n in ENTITEITEN ? ENTITEITEN[n] : m));
}

// Het hoofddeel van de pagina: <main>, anders <article>, anders <body>
function hoofddeel(html) {
  for (const tag of ['main', 'article', 'body']) {
    const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)</${tag}>`, 'i'));
    if (m) return m[1];
  }
  return html;
}

export function htmlNaarTekst(html) {
  let s = hoofddeel(String(html || ''));
  s = s
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer|form|iframe|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|hr)\b[^>]*>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n\n${'#'.repeat(Number(n))} `)
    .replace(/<\/(p|div|section|article|li|ul|ol|table|tr|h[1-6]|dt|dd|details|summary|caption|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return ontcijfer(s)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\| ?\n/g, '\n')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function titelVan(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? ontcijfer(m[1]).replace(/\s+/g, ' ').trim() : '';
}

// Links op de pagina: [{ url, tekst }], absoluut gemaakt, zonder #fragment
export function linksVan(html, basis) {
  const uit = new Map();
  for (const m of String(html || '').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url;
    try {
      url = new URL(ontcijfer(m[1]), basis);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    url.hash = '';
    const tekst = ontcijfer(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!uit.has(url.href)) uit.set(url.href, { url: url.href, tekst });
  }
  return [...uit.values()];
}

// Bedragen in een tekst: "€ 1.115,80" → { tekst, waarde: 1115.8, positie }
export function bedragenIn(tekst) {
  const uit = [];
  for (const m of String(tekst || '').matchAll(/€\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/g)) {
    uit.push({ tekst: m[0], waarde: Number(`${m[1].replace(/\./g, '')}.${(m[2] || '0').padEnd(2, '0')}`), positie: m.index });
  }
  return uit;
}

// Staat dit bedrag (als getal) letterlijk in de tekst van de bron?
export function bedragStaatIn(tekst, waarde) {
  return bedragenIn(tekst).some((b) => Math.abs(b.waarde - waarde) < 0.005);
}
