// Documenten versleutelen op het eigen apparaat (WebCrypto, AES-GCM 256).
// De sleutel van een dossier verlaat het apparaat alleen ingepakt met een
// herstelzin die de familie zelf bewaart. Zonder die zin kan niemand (ook
// wij niet) de documenten lezen.
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const b64 = (buf) => {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
};
const vanB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function nieuweSleutel() {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

// bytes (ArrayBuffer/Uint8Array) → { iv, data } als base64
export async function versleutel(sleutel, bytes) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle.encrypt({ name: 'AES-GCM', iv }, sleutel, bytes);
  return { iv: b64(iv), data: b64(data) };
}

export async function ontsleutel(sleutel, pakket) {
  return subtle.decrypt({ name: 'AES-GCM', iv: vanB64(pakket.iv) }, sleutel, vanB64(pakket.data));
}

// Sleutel afleiden uit een herstelzin (PBKDF2, 310.000 rondes)
async function sleutelUitZin(zin, zout) {
  const basis = await subtle.importKey('raw', enc.encode(zin.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt: zout, iterations: 310000, hash: 'SHA-256' }, basis, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

// Dossiersleutel inpakken met een herstelzin → { zout, iv, data }
export async function pakIn(sleutel, zin) {
  const zout = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const kek = await sleutelUitZin(zin, zout);
  const ruw = await subtle.exportKey('raw', sleutel);
  return { zout: b64(zout), ...(await versleutel(kek, ruw)) };
}

export async function pakUit(pakket, zin) {
  const kek = await sleutelUitZin(zin, vanB64(pakket.zout));
  let ruw;
  try {
    ruw = await ontsleutel(kek, pakket);
  } catch {
    throw new Error('De herstelzin klopt niet.');
  }
  return subtle.importKey('raw', ruw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

// Herstelzin van 6 woorden uit een vaste lijst (makkelijk over te schrijven)
const WOORDEN = 'appel bakker cirkel dakpan egel fiets gieter haven ijsje jas kaars lepel molen nest oever pad rivier schaap tuin uil vlieger wolk zand zomer anker boek druif emmer fluit glas hek iep jurk klok lamp maan noot olie peer raam steen tafel ui veer wiel zeil akker beuk dijk erwt fornuis gras heuvel inkt kade linde mos net oogst pruim riet sloot toren vink weide zwaan'.split(' ');
export function nieuweHerstelzin(aantal = 6) {
  const r = globalThis.crypto.getRandomValues(new Uint32Array(aantal));
  return [...r].map((n) => WOORDEN[n % WOORDEN.length]).join(' ');
}
