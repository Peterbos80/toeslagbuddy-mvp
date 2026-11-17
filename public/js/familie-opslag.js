// Opslag van de regelkamer op het eigen apparaat.
// - het dossier (tekst en getallen) staat in localStorage;
// - documenten en bonnen staan versleuteld in IndexedDB, met een sleutel die
//   op dit apparaat blijft;
// - delen met de familie kan als versleuteld bestand (export met herstelzin).
// Er gaat niets naar een server.
import { nieuweSleutel, versleutel, ontsleutel, pakIn, pakUit } from './versleutel.js';
import { SOORTEN } from './dossier.js';

const SLEUTEL = 'tb-familie-v1';
const DB = 'tb-familie';
const LEEG = () => ({ versie: 1, dossiers: [], data: {} });

export function laad() {
  try {
    const s = JSON.parse(localStorage.getItem(SLEUTEL) || 'null');
    if (s && s.versie === 1 && Array.isArray(s.dossiers)) return s;
  } catch {
    /* beschadigd of geen toegang: begin leeg */
  }
  return LEEG();
}

export function bewaar(state) {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export const legeData = () => Object.fromEntries([...SOORTEN, 'checklist'].map((s) => [s, s === 'checklist' ? {} : []]));

// ── IndexedDB: sleutel en versleutelde bestanden ──
function open() {
  return new Promise((ok, fout) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('sleutels');
      r.result.createObjectStore('bestanden');
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fout(r.error);
  });
}
async function winkel(naam, modus, taak) {
  const db = await open();
  return new Promise((ok, fout) => {
    const tx = db.transaction(naam, modus);
    const r = taak(tx.objectStore(naam));
    tx.oncomplete = () => ok(r?.result);
    tx.onerror = () => fout(tx.error);
  });
}

let apparaatSleutel = null;
async function sleutel() {
  if (apparaatSleutel) return apparaatSleutel;
  apparaatSleutel = await winkel('sleutels', 'readonly', (s) => s.get('apparaat'));
  if (!apparaatSleutel) {
    apparaatSleutel = await nieuweSleutel();
    await winkel('sleutels', 'readwrite', (s) => s.put(apparaatSleutel, 'apparaat'));
  }
  return apparaatSleutel;
}

// Bestand (foto van een bon, document) versleuteld bewaren
export async function bewaarBestand(id, blob) {
  const pakket = await versleutel(await sleutel(), await blob.arrayBuffer());
  await winkel('bestanden', 'readwrite', (s) => s.put({ ...pakket, type: blob.type, naam: blob.name || '' }, id));
}
export async function leesBestand(id) {
  const p = await winkel('bestanden', 'readonly', (s) => s.get(id));
  if (!p) return null;
  return new Blob([await ontsleutel(await sleutel(), p)], { type: p.type || 'application/octet-stream' });
}
export const wisBestand = (id) => winkel('bestanden', 'readwrite', (s) => s.delete(id));

// ── Delen: het hele dossier als versleuteld bestand ──
const b64 = (buf) => {
  let s = '';
  const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
};
const vanB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function exporteer(state, dossierId, zin) {
  const dossier = state.dossiers.find((d) => d.id === dossierId);
  const data = state.data[dossierId] || legeData();
  const bestanden = {};
  for (const id of [...data.documenten.map((d) => d.bestandId), ...data.logboek.map((r) => r.bonId)].filter(Boolean)) {
    const blob = await leesBestand(id);
    if (blob) bestanden[id] = { type: blob.type, data: b64(await blob.arrayBuffer()) };
  }
  const sl = await nieuweSleutel();
  const inhoud = await versleutel(sl, new TextEncoder().encode(JSON.stringify({ dossier, data, bestanden })));
  return JSON.stringify({ soort: 'toeslagbuddy-familie-dossier', versie: 1, gemaakt: new Date().toISOString(), sleutel: await pakIn(sl, zin), inhoud });
}

export async function importeer(state, tekst, zin) {
  let pak;
  try {
    pak = JSON.parse(tekst);
  } catch {
    throw new Error('Dit is geen dossierbestand.');
  }
  if (pak?.soort !== 'toeslagbuddy-familie-dossier') throw new Error('Dit is geen dossierbestand.');
  const sl = await pakUit(pak.sleutel, zin);
  const { dossier, data, bestanden } = JSON.parse(new TextDecoder().decode(await ontsleutel(sl, pak.inhoud)));
  for (const [id, b] of Object.entries(bestanden || {})) await bewaarBestand(id, new Blob([vanB64(b.data)], { type: b.type }));
  const i = state.dossiers.findIndex((d) => d.id === dossier.id);
  if (i >= 0) state.dossiers[i] = dossier;
  else state.dossiers.push(dossier);
  state.data[dossier.id] = { ...legeData(), ...data };
  return dossier;
}

export async function verwijderDossier(state, dossierId) {
  const data = state.data[dossierId];
  if (data) for (const id of [...data.documenten.map((d) => d.bestandId), ...data.logboek.map((r) => r.bonId)].filter(Boolean)) await wisBestand(id).catch(() => {});
  state.dossiers = state.dossiers.filter((d) => d.id !== dossierId);
  delete state.data[dossierId];
}
