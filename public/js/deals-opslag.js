// Opslag in de browser voor DealBuddy (volglijst, jagers). localStorage kan
// ontbreken of geblokkeerd zijn (privévenster, instellingen): dan bewaren we
// in het geheugen, zodat de pagina gewoon werkt (tot je hem sluit).
import { normaliseerRegel } from './alarm.js';

const geheugen = new Map();
export function lees(sleutel, standaard) {
  try {
    const r = localStorage.getItem(sleutel);
    if (r !== null) return JSON.parse(r);
  } catch {
    /* geen localStorage */
  }
  return geheugen.has(sleutel) ? structuredClone(geheugen.get(sleutel)) : standaard;
}
export function bewaar(sleutel, waarde) {
  geheugen.set(sleutel, structuredClone(waarde));
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde));
    return true;
  } catch {
    return false;
  }
}

const VOLG = 'dealbuddy-volglijst';
export const leesVolglijst = () => (Array.isArray(lees(VOLG, [])) ? lees(VOLG, []) : []).map((r) => ({ ...r, ...normaliseerRegel(r) })).filter((r) => r.type && r.waarde);
export const bewaarVolglijst = (lijst) => bewaar(VOLG, lijst);

export function volg(regel) {
  const r = normaliseerRegel(regel);
  if (!r) return false;
  const lijst = leesVolglijst().filter((x) => !(x.type === r.type && x.waarde === r.waarde));
  lijst.unshift({ ...r, toegevoegd: new Date().toISOString() });
  bewaarVolglijst(lijst);
  return true;
}
export function ontvolg(type, waarde) {
  bewaarVolglijst(leesVolglijst().filter((x) => !(x.type === type && x.waarde === waarde)));
}
export const isGevolgd = (type, waarde) => leesVolglijst().some((x) => x.type === type && x.waarde === waarde);

let dealsBelofte = null;
export function laadDeals() {
  dealsBelofte ||= fetch('/deals/data/deals.json')
    .then((r) => (r.ok ? r.json() : { deals: [] }))
    .catch(() => ({ deals: [] }));
  return dealsBelofte;
}
