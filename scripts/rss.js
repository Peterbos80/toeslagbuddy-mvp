// Eenvoudige, afhankelijkheidsvrije RSS/Atom-lezer voor de nieuwsverzamelaar.

const ENTITEITEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function ontsnap(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
      return ENTITEITEN[e.toLowerCase()] ?? m;
    });
}

const zonderHtml = (s) => ontsnap(ontsnap(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function veld(blok, naam) {
  const m = blok.match(new RegExp(`<${naam}(?:\\s[^>]*)?>([\\s\\S]*?)</${naam}>`, 'i'));
  return m ? m[1] : '';
}

export function leesFeed(xml, bron) {
  const items = [];
  const blokken = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blokken) {
    let link = zonderHtml(veld(b, 'link'));
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i);
      link = m ? m[1] : '';
    }
    const titel = zonderHtml(veld(b, 'title'));
    const datumTekst = zonderHtml(veld(b, 'pubDate') || veld(b, 'updated') || veld(b, 'published') || veld(b, 'dc:date'));
    const datum = new Date(datumTekst);
    const samenvatting = zonderHtml(veld(b, 'description') || veld(b, 'summary'));
    if (!titel || !/^https?:\/\//.test(link)) continue;
    // Google Nieuws noemt de echte uitgever in <source>; die tonen we als bron
    const uitgever = zonderHtml(veld(b, 'source'));
    items.push({
      titel: uitgever && titel.endsWith(` - ${uitgever}`) ? titel.slice(0, -(uitgever.length + 3)) : titel,
      link,
      datum: isNaN(datum) ? null : datum.toISOString(),
      bron: uitgever || bron,
      samenvatting: samenvatting.length > 220 ? samenvatting.slice(0, 217).replace(/\s+\S*$/, '') + '…' : samenvatting,
    });
  }
  return items;
}

export const TREFWOORDEN = /toeslag|kindgebonden|kinderbijslag|kinderopvang|minimumloon|bijstand|koopkracht|prinsjesdag|miljoenennota|belastingplan|box 3|zorgpremie|zorgverzekering|eigen risico|huur|armoede|schuld|inkomensondersteuning|aow|energie(rekening|toeslag)/i;

// Strenger filter voor algemene nieuwsfeeds (NOS, NU.nl): alleen echt toeslagennieuws
export const STRENG = /toeslag|kindgebonden|kinderbijslag|kinderopvang|minimumloon|zorgpremie|prinsjesdag|miljoenennota|koopkracht|bijstand|belastingplan|eigen risico/i;

export function filter(items, trefwoorden = TREFWOORDEN) {
  return items.filter((i) => trefwoorden.test(`${i.titel} ${i.samenvatting}`));
}

export function samenvoegen(nieuw, oud, max = 60) {
  const gezien = new Set();
  return [...nieuw, ...oud]
    .filter((i) => (gezien.has(i.link) ? false : gezien.add(i.link)))
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
    .slice(0, max);
}
