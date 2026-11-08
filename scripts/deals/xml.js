// Kleine XML-parser zonder afhankelijkheden, genoeg voor productfeeds,
// sitemaps en RSS/Atom. Geen DTD's of externe entiteiten (dus ook geen XXE).
// Knoop: { naam, attr: {}, kinderen: [], tekst }

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€' };
export const ontsnap = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });

export function parseXml(xml) {
  const wortel = { naam: '#wortel', attr: {}, kinderen: [], tekst: '' };
  const stapel = [wortel];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/\s*([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(String(xml)))) {
    const top = stapel.at(-1);
    if (m[1] !== undefined) top.tekst += m[1];
    else if (m[2]) {
      const naam = lokaal(m[2]);
      // Sluit tot en met de bijbehorende open tag (tolerant voor fouten)
      const i = stapel.map((k) => k.naam).lastIndexOf(naam);
      if (i > 0) stapel.length = i;
    } else if (m[3]) {
      const k = { naam: lokaal(m[3]), attr: attributen(m[4] || ''), kinderen: [], tekst: '' };
      top.kinderen.push(k);
      if (!m[5]) stapel.push(k);
    } else if (m[6] !== undefined) top.tekst += ontsnap(m[6]);
  }
  for (const k of alle(wortel)) k.tekst = k.tekst.trim();
  return wortel;
}

// 'g:price' → 'price' (namespaces negeren, maar 'content:encoded' blijft 'encoded')
const lokaal = (n) => n.split(':').pop().toLowerCase();

function attributen(s) {
  const a = {};
  for (const [, k, v1, v2] of s.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[k.toLowerCase()] = ontsnap(v1 ?? v2);
  return a;
}

export function* alle(k) {
  yield k;
  for (const c of k.kinderen) yield* alle(c);
}
// Alle afstammelingen met deze naam
export const zoekAlle = (k, naam) => [...alle(k)].filter((x) => x !== k && x.naam === naam);
// Eerste kind (of pad 'a/b') met deze naam
export function kind(k, pad) {
  let h = k;
  for (const deel of pad.split('/')) {
    h = h?.kinderen.find((c) => c.naam === deel);
    if (!h) return null;
  }
  return h;
}
export const tekstVan = (k, pad) => (pad ? kind(k, pad) : k)?.tekst ?? '';
