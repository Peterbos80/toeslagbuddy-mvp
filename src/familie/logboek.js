// Verantwoordingslogboek: elke uitgave of ontvangst namens de ouder.
// Alleen toevoegen: een regel verbeter je met een nieuwe regel (corrigeertId).
// Elke regel bevat de hash van de vorige, zodat achteraf wijzigen opvalt.
export const CATEGORIEEN = {
  boodschappen: 'Boodschappen',
  zorg: 'Zorg en hulp',
  wonen: 'Wonen en onderhoud',
  vervoer: 'Vervoer',
  kleding: 'Kleding en verzorging',
  vasteLasten: 'Vaste lasten',
  cadeau: 'Cadeaus en uitjes',
  contant: 'Contante opname',
  vergoeding: 'Mantelzorgvergoeding (afgesproken)',
  inkomen: 'Ontvangen',
  nalatenschap: 'Nalatenschap',
  overig: 'Overig',
};

const canon = (r) => JSON.stringify([r.datum, r.bedragCent, r.richting, r.categorie, r.omschrijving, r.rekening || '', r.bonId || '', r.door || '', r.corrigeertId || '', r.vorigeHash || '']);

async function sha256(tekst) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Bedrag "12,50" of "1.250,00" of 12.5 → centen (geheel getal), of null
export function naarCent(invoer) {
  if (typeof invoer === 'number') return Number.isFinite(invoer) ? Math.round(invoer * 100) : null;
  const s = String(invoer || '').replace(/[€\s]/g, '');
  if (!/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$|^-?\d+([.,]\d{1,2})?$/.test(s)) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// Nieuwe regel achter de keten zetten. regels = bestaande regels op volgorde.
export async function voegToe(regels, invoer, { id, nu = new Date() } = {}) {
  const bedragCent = Math.abs(Number(invoer.bedragCent));
  if (!Number.isInteger(bedragCent) || bedragCent <= 0) throw new Error('Vul een bedrag in.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoer.datum || '')) throw new Error('Vul een datum in.');
  if (!String(invoer.omschrijving || '').trim()) throw new Error('Vul in waar het voor was.');
  const vorige = regels[regels.length - 1];
  const regel = {
    id: id || globalThis.crypto.randomUUID(),
    datum: invoer.datum,
    bedragCent,
    richting: invoer.richting === 'in' ? 'in' : 'uit',
    categorie: CATEGORIEEN[invoer.categorie] ? invoer.categorie : 'overig',
    omschrijving: String(invoer.omschrijving).trim().slice(0, 200),
    rekening: invoer.rekening || '',
    bonId: invoer.bonId || null,
    door: invoer.door || null,
    corrigeertId: invoer.corrigeertId || null,
    vastgelegd: nu.toISOString(),
    vorigeHash: vorige ? vorige.hash : '',
  };
  regel.hash = await sha256(canon(regel));
  return regel;
}

// Klopt de keten nog? Geeft het id van de eerste regel die niet klopt, of null.
export async function controleerKeten(regels) {
  let vorige = '';
  for (const r of regels) {
    if ((r.vorigeHash || '') !== vorige) return r.id;
    if ((await sha256(canon(r))) !== r.hash) return r.id;
    vorige = r.hash;
  }
  return null;
}

// Regels die nog gelden: een gecorrigeerde regel telt niet meer mee
export function geldend(regels) {
  const gecorrigeerd = new Set(regels.filter((r) => r.corrigeertId).map((r) => r.corrigeertId));
  return regels.filter((r) => !gecorrigeerd.has(r.id) && !(r.corrigeertId && r.bedragCent === 0));
}

// Overzicht van één maand ('2026-11')
export function maandoverzicht(regels, maand) {
  const lijst = geldend(regels).filter((r) => r.datum.startsWith(maand));
  const som = (f) => lijst.filter(f).reduce((s, r) => s + r.bedragCent, 0);
  const perCategorie = {};
  for (const r of lijst.filter((r) => r.richting === 'uit')) perCategorie[r.categorie] = (perCategorie[r.categorie] || 0) + r.bedragCent;
  const perPersoon = {};
  for (const r of lijst.filter((r) => r.richting === 'uit')) perPersoon[r.door || 'onbekend'] = (perPersoon[r.door || 'onbekend'] || 0) + r.bedragCent;
  const zonderBon = lijst.filter((r) => r.richting === 'uit' && !r.bonId && r.categorie !== 'vasteLasten');
  return {
    maand,
    aantal: lijst.length,
    inCent: som((r) => r.richting === 'in'),
    uitCent: som((r) => r.richting === 'uit'),
    perCategorie,
    perPersoon,
    zonderBon: zonderBon.length,
    contantCent: som((r) => r.richting === 'uit' && r.categorie === 'contant'),
    vergoedingCent: som((r) => r.richting === 'uit' && r.categorie === 'vergoeding'),
    regels: lijst,
  };
}

// Laatste n maanden met in/uit, voor de grafiek (oudste eerst)
export function reeks(regels, tot, n = 6) {
  const [j, m] = tot.split('-').map(Number);
  const uit = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(j, m - 1 - i, 1));
    const maand = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const o = maandoverzicht(regels, maand);
    uit.push({ maand, inCent: o.inCent, uitCent: o.uitCent });
  }
  return uit;
}

export const centTekst = (c) => `€ ${(c / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
