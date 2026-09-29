// Demo-backend (?demo=1): bootst Supabase-auth en de databasefuncties na in
// localStorage, met dezelfde regels als supabase/migrations/20260930_suite.sql.
// Voor verkoopdemo's en browsertests; er gaat niets naar een server.
//   ?verlopen=1      de proef van je organisatie is voorbij
//   ?onbereikbaar=1  de server lijkt onbereikbaar (R16)
const SLEUTEL = 'toeslagbuddy-demo-db';
export const DEMO_CODE = '123456';
const DAG = 864e5;
const params = new URLSearchParams(location.search);

class ServerFout extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const fout = (code) => {
  throw new ServerFout(code);
};
const netwerkFout = () => Object.assign(new Error('TypeError: Failed to fetch'), { netwerk: true });

const leeg = () => ({ users: [], wachtend: {}, organisaties: [], leden: [], uitnodigingen: [], controles: [], audit: [], berichten: [], beheerders: [], factoren: [], sessie: null });

function laad() {
  try {
    return { ...leeg(), ...JSON.parse(localStorage.getItem(SLEUTEL) || '{}') };
  } catch {
    return leeg();
  }
}
function bewaar(db) {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(db));
  } catch {
    /* privémodus: demo werkt dan alleen binnen deze pagina */
  }
}

const id = () => crypto.randomUUID();
const nu = () => new Date().toISOString();
const emailOk = (e) => typeof e === 'string' && e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
async function sha256(t) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function status(o) {
  if (['actief', 'opgezegd'].includes(o.abonnement)) return o.abonnement;
  return new Date(o.proef_eind) <= new Date() ? 'verlopen' : o.abonnement;
}
const toegang = (o) => Boolean(o) && ['proef', 'pilot', 'actief'].includes(status(o));

function log(db, wie, actie, org, doel, details = {}) {
  db.audit.push({ id: db.audit.length + 1, wie, organisatie_id: org, actie, doel, details, wanneer: nu() });
}

// ── Databasefuncties ─────────────────────────────────────────────────
function gebruiker(db) {
  const s = db.sessie;
  const u = s && db.users.find((x) => x.id === s.user_id);
  if (!u) fout('niet_ingelogd');
  return u;
}
const lidVan = (db, uid) => db.leden.find((l) => l.user_id === uid);
const orgVan = (db, uid) => db.organisaties.find((o) => o.id === lidVan(db, uid)?.organisatie_id);

function omgeving(db, u) {
  const lid = lidVan(db, u.id);
  const o = orgVan(db, u.id);
  const st = o && status(o);
  return {
    nu: nu(),
    gebruiker: { id: u.id, email: u.email },
    profiel: { naam: u.naam, organisatie: u.organisatie, clienten: u.clienten },
    beheerder: db.beheerders.includes(u.id),
    rol: lid?.rol ?? null,
    organisatie: o
      ? { id: o.id, naam: o.naam, kvk: o.kvk, abonnement: o.abonnement, proef_eind: o.proef_eind, aangemaakt: o.aangemaakt, status: st, toegang: toegang(o), dagen_over: ['proef', 'pilot'].includes(st) ? Math.ceil((new Date(o.proef_eind) - Date.now()) / DAG) : null }
      : null,
    leden: o
      ? db.leden
          .filter((l) => l.organisatie_id === o.id)
          .map((l) => {
            const x = db.users.find((y) => y.id === l.user_id);
            return { user_id: l.user_id, email: x?.email, naam: x?.naam ?? null, rol: l.rol, toegevoegd: l.toegevoegd };
          })
      : [],
    uitnodigingen:
      lid?.rol === 'eigenaar'
        ? db.uitnodigingen.filter((i) => i.organisatie_id === o.id && !i.gebruikt_op && new Date(i.verloopt) > new Date()).map((i) => ({ id: i.id, email: i.email, verloopt: i.verloopt }))
        : [],
  };
}

function eigenOrg(db, u) {
  const lid = lidVan(db, u.id);
  if (!lid || lid.rol !== 'eigenaar') fout('geen_eigenaar');
  return db.organisaties.find((o) => o.id === lid.organisatie_id);
}

function isBeheerder(db) {
  const s = db.sessie;
  return Boolean(s && s.aal === 'aal2' && db.beheerders.includes(s.user_id) && db.factoren.some((f) => f.user_id === s.user_id && f.status === 'verified'));
}
function beheerder(db) {
  const u = gebruiker(db);
  if (!isBeheerder(db)) fout('geen_beheerder');
  return u;
}
function beheerOrganisaties(db) {
  return [...db.organisaties]
    .sort((a, b) => b.aangemaakt.localeCompare(a.aangemaakt))
    .map((o) => {
      const cs = db.controles.filter((c) => c.organisatie_id === o.id);
      const eig = db.leden.find((l) => l.organisatie_id === o.id && l.rol === 'eigenaar');
      return {
        id: o.id, naam: o.naam, kvk: o.kvk, abonnement: o.abonnement, status: status(o), proef_eind: o.proef_eind, aangemaakt: o.aangemaakt,
        leden: db.leden.filter((l) => l.organisatie_id === o.id).length,
        controles: cs.length,
        laatste_controle: cs.map((c) => c.aangemaakt).sort().pop() ?? null,
        eigenaar: db.users.find((x) => x.id === eig?.user_id)?.email ?? null,
      };
    });
}

const SOORTEN = ['gemist', 'te-laag', 'terugbetaling', 'vermogen', 'leeftijd', 'gemeente', 'info'];
const VELDEN = ['id', 'rekenversie', 'clienten', 'met_actie', 'gemist_jaar', 'risico_jaar', 'signalen'];
const BANDMAX = { '1-9': 9, '10-49': 49, '50-199': 199, '200+': 10000 };
const telOk = (v, max) => Number.isInteger(v) && (v === -1 || (v >= 5 && v <= max));
const bedragOk = (v) => Number.isInteger(v) && v >= 0 && v <= 9999999 && v % 500 === 0;

const FUNCTIES = {
  mijn_omgeving(db) {
    const u = gebruiker(db);
    // ?verlopen=1: de proef van de eigen organisatie is voorbij (zoals de server het zou zien)
    const o = orgVan(db, u.id);
    if (o && params.has('verlopen') && ['proef', 'pilot'].includes(o.abonnement)) o.proef_eind = new Date(Date.now() - 1000).toISOString();
    return omgeving(db, u);
  },
  organisatie_aanmaken(db, { naam }) {
    const u = gebruiker(db);
    const n = String(naam || '').trim();
    if (!n || n.length > 200) fout('ongeldige_naam');
    if (db.beheerders.includes(u.id)) fout('beheerder_geen_organisatie');
    if (lidVan(db, u.id)) fout('al_lid');
    const o = { id: id(), naam: n, kvk: null, abonnement: 'proef', proef_eind: new Date(Date.now() + 7 * DAG).toISOString(), opgezegd_op: null, aangemaakt: nu() };
    db.organisaties.push(o);
    db.leden.push({ organisatie_id: o.id, user_id: u.id, rol: 'eigenaar', toegevoegd: nu() });
    log(db, u.id, 'organisatie_aangemaakt', o.id, o.id);
    return omgeving(db, u);
  },
  organisatie_bijwerken(db, { naam, kvk }) {
    const u = gebruiker(db);
    const o = eigenOrg(db, u);
    const n = String(naam || '').trim();
    const k = String(kvk || '').replace(/\s/g, '') || null;
    if (!n || n.length > 200) fout('ongeldige_naam');
    if (k && !/^\d{8}$/.test(k)) fout('ongeldig_kvk');
    Object.assign(o, { naam: n, kvk: k });
    log(db, u.id, 'organisatie_bijgewerkt', o.id, o.id, { kvk_ingevuld: Boolean(k) });
    return omgeving(db, u);
  },
  profiel_bijwerken(db, { naam }) {
    const u = gebruiker(db);
    const n = String(naam || '').trim();
    if (!n || n.length > 200) fout('ongeldige_naam');
    u.naam = n;
    log(db, u.id, 'profiel_bijgewerkt', lidVan(db, u.id)?.organisatie_id ?? null, u.id);
    return omgeving(db, u);
  },
  controle_opslaan(db, { gegevens: g }) {
    const u = gebruiker(db);
    const o = orgVan(db, u.id);
    if (!o) fout('geen_lid');
    if (!toegang(o)) fout('geen_toegang');
    const max = BANDMAX[g?.clienten];
    const geldig =
      g && typeof g === 'object' && !Array.isArray(g) &&
      Object.keys(g).every((k) => VELDEN.includes(k)) && VELDEN.every((k) => k in g) &&
      /^[0-9a-f-]{36}$/.test(g.id) && /^\d{4}\.\d{8}$/.test(g.rekenversie) && max && telOk(g.met_actie, max) &&
      (g.clienten === '1-9' ? g.gemist_jaar === null && g.risico_jaar === null : bedragOk(g.gemist_jaar) && bedragOk(g.risico_jaar)) &&
      g.signalen && Object.keys(g.signalen).every((k) => SOORTEN.includes(k)) && SOORTEN.every((s) => telOk(g.signalen[s], max));
    if (!geldig) fout('ongeldig');
    const bestaand = db.controles.find((c) => c.id === g.id);
    if (bestaand) {
      if (bestaand.organisatie_id === o.id) return { id: g.id, nieuw: false };
      fout('ongeldig');
    }
    if (db.controles.filter((c) => c.organisatie_id === o.id && Date.now() - new Date(c.aangemaakt) < DAG).length >= 50) fout('limiet');
    db.controles.push({ id: g.id, organisatie_id: o.id, door: u.id, clienten_band: g.clienten, met_actie: g.met_actie, gemist_jaar: g.gemist_jaar, risico_jaar: g.risico_jaar, signalen: g.signalen, rekenversie: g.rekenversie, aangemaakt: nu() });
    log(db, u.id, 'controle_opgeslagen', o.id, g.id);
    return { id: g.id, nieuw: true };
  },
  async uitnodiging_maken(db, { email }) {
    const u = gebruiker(db);
    const o = eigenOrg(db, u);
    const e = String(email || '').trim().toLowerCase();
    if (!toegang(o)) fout('geen_toegang');
    if (!emailOk(e)) fout('ongeldig_email');
    const leden = db.leden.filter((l) => l.organisatie_id === o.id);
    if (leden.some((l) => db.users.find((x) => x.id === l.user_id)?.email === e)) fout('al_lid');
    const open = db.uitnodigingen.filter((i) => i.organisatie_id === o.id && !i.gebruikt_op && new Date(i.verloopt) > new Date());
    if (db.uitnodigingen.filter((i) => i.organisatie_id === o.id && Date.now() - new Date(i.aangemaakt) < DAG).length >= 10) fout('limiet');
    if (o.abonnement === 'proef' && leden.length + open.filter((i) => i.email !== e).length >= 5) fout('max_leden');
    open.filter((i) => i.email === e).forEach((i) => (i.verloopt = nu()));
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const inv = { id: id(), organisatie_id: o.id, email: e, token_hash: await sha256(token), door: u.id, verloopt: new Date(Date.now() + 7 * DAG).toISOString(), gebruikt_op: null, aangemaakt: nu() };
    db.uitnodigingen.push(inv);
    log(db, u.id, 'uitnodiging_gemaakt', o.id, inv.id);
    return token;
  },
  async uitnodiging_accepteren(db, { token }) {
    const u = gebruiker(db);
    const t = String(token || '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(t)) fout('uitnodiging_ongeldig');
    const h = await sha256(t);
    const inv = db.uitnodigingen.find((i) => i.token_hash === h);
    if (!inv) fout('uitnodiging_ongeldig');
    if (inv.gebruikt_op) fout('uitnodiging_gebruikt');
    if (new Date(inv.verloopt) <= new Date()) fout('uitnodiging_verlopen');
    if (inv.email !== u.email.toLowerCase()) fout('uitnodiging_ander_email');
    if (db.beheerders.includes(u.id)) fout('beheerder_geen_organisatie');
    if (lidVan(db, u.id)) fout('al_lid');
    const o = db.organisaties.find((x) => x.id === inv.organisatie_id);
    if (!o) fout('uitnodiging_ongeldig');
    if (o.abonnement === 'proef' && db.leden.filter((l) => l.organisatie_id === o.id).length >= 5) fout('max_leden');
    db.leden.push({ organisatie_id: o.id, user_id: u.id, rol: 'lid', toegevoegd: nu() });
    Object.assign(inv, { gebruikt_op: nu(), gebruikt_door: u.id });
    log(db, u.id, 'uitnodiging_geaccepteerd', o.id, inv.id);
    return omgeving(db, u);
  },
  lid_verwijderen(db, { lid }) {
    const u = gebruiker(db);
    const doel = lidVan(db, lid);
    const mijn = lidVan(db, u.id);
    if (!doel || (doel.user_id !== u.id && !(mijn?.rol === 'eigenaar' && mijn.organisatie_id === doel.organisatie_id))) fout('geen_toegang');
    if (doel.rol === 'eigenaar') fout('eerst_eigendom_overdragen');
    db.leden = db.leden.filter((l) => l.user_id !== doel.user_id);
    log(db, u.id, doel.user_id === u.id ? 'lid_vertrokken' : 'lid_verwijderd', doel.organisatie_id, doel.user_id);
    return omgeving(db, u);
  },
  eigendom_overdragen(db, { lid }) {
    const u = gebruiker(db);
    const o = eigenOrg(db, u);
    const doel = lidVan(db, lid);
    if (!doel || lid === u.id || doel.organisatie_id !== o.id) fout('geen_toegang');
    lidVan(db, u.id).rol = 'lid';
    doel.rol = 'eigenaar';
    log(db, u.id, 'eigendom_overgedragen', o.id, lid);
    return omgeving(db, u);
  },
  mijn_gegevens(db) {
    const u = gebruiker(db);
    const lid = lidVan(db, u.id);
    const o = orgVan(db, u.id);
    return {
      gemaakt_op: nu(),
      account: { id: u.id, email: u.email, aangemaakt: u.aangemaakt },
      profiel: { id: u.id, email: u.email, naam: u.naam, organisatie: u.organisatie, clienten: u.clienten },
      lidmaatschap: lid ? { organisatie_id: lid.organisatie_id, rol: lid.rol, toegevoegd: lid.toegevoegd } : null,
      organisatie: o ? { id: o.id, naam: o.naam, kvk: o.kvk, abonnement: o.abonnement, proef_eind: o.proef_eind, aangemaakt: o.aangemaakt } : null,
      controles_door_mij: db.controles.filter((c) => c.door === u.id).map(({ door, ...c }) => c),
      uitnodigingen_door_mij: db.uitnodigingen.filter((i) => i.door === u.id).map((i) => ({ email: i.email, aangemaakt: i.aangemaakt, verloopt: i.verloopt, gebruikt_op: i.gebruikt_op })),
      auditregels: db.audit.filter((a) => a.wie === u.id).map((a) => ({ actie: a.actie, doel: a.doel, details: a.details, wanneer: a.wanneer })),
      berichten: db.berichten.filter((b) => b.email === u.email).map((b) => ({ soort: b.soort, onderwerp: b.onderwerp, naam: b.naam, tekst: b.tekst, aangemaakt: b.aangemaakt })),
    };
  },
  account_verwijderen(db) {
    const u = gebruiker(db);
    const lid = lidVan(db, u.id);
    if (lid?.rol === 'eigenaar') {
      if (db.leden.some((l) => l.organisatie_id === lid.organisatie_id && l.user_id !== u.id)) fout('eerst_eigendom_overdragen');
      verwijderOrg(db, u.id, lid.organisatie_id);
    }
    db.berichten = db.berichten.filter((b) => b.email !== u.email);
    log(db, u.id, 'account_verwijderd', null, u.id);
    db.users = db.users.filter((x) => x.id !== u.id);
    db.leden = db.leden.filter((l) => l.user_id !== u.id);
    db.beheerders = db.beheerders.filter((x) => x !== u.id);
    db.factoren = db.factoren.filter((f) => f.user_id !== u.id);
    db.controles.forEach((c) => c.door === u.id && (c.door = null));
    db.audit.forEach((a) => a.wie === u.id && (a.wie = null));
    db.sessie = null;
    return { verwijderd: true };
  },
  organisatie_verwijderen(db) {
    const u = gebruiker(db);
    const o = eigenOrg(db, u);
    verwijderOrg(db, u.id, o.id);
    return omgeving(db, u);
  },
  beheer_statistieken(db) {
    beheerder(db);
    const orgs = db.organisaties.map((o) => ({ status: status(o), proef_eind: o.proef_eind, geactiveerd: db.controles.some((c) => c.organisatie_id === o.id) }));
    const tel = (f) => orgs.filter(f).length;
    const weken = {};
    for (const c of db.controles.filter((c) => Date.now() - new Date(c.aangemaakt) < 56 * DAG)) {
      const d = new Date(c.aangemaakt);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const w = d.toISOString().slice(0, 10);
      weken[w] = (weken[w] || 0) + 1;
    }
    return {
      nu: nu(),
      organisaties: orgs.length,
      proeven: tel((o) => o.status === 'proef'),
      pilots: tel((o) => o.status === 'pilot'),
      verlopen: tel((o) => o.status === 'verlopen'),
      actief: tel((o) => o.status === 'actief'),
      opgezegd: tel((o) => o.status === 'opgezegd'),
      geactiveerd: tel((o) => o.geactiveerd),
      verloopt_binnenkort: tel((o) => ['proef', 'pilot'].includes(o.status) && new Date(o.proef_eind) - Date.now() < 3 * DAG),
      controles_per_week: Object.entries(weken).sort().map(([week, aantal]) => ({ week, aantal })),
      berichten_nieuw: db.berichten.filter((b) => Date.now() - new Date(b.aangemaakt) < 7 * DAG).length,
      berichten_niet_doorgestuurd: db.berichten.filter((b) => !b.doorgestuurd).length,
    };
  },
  beheer_organisaties(db) {
    beheerder(db);
    return beheerOrganisaties(db);
  },
  beheer_berichten(db) {
    beheerder(db);
    return [...db.berichten].sort((a, b) => b.aangemaakt.localeCompare(a.aangemaakt));
  },
  beheer_verlengen_pilot(db, { org }) {
    const u = beheerder(db);
    const o = db.organisaties.find((x) => x.id === org);
    if (!o) fout('niet_gevonden');
    if (o.abonnement === 'actief') fout('al_actief');
    const van = o.abonnement;
    Object.assign(o, { abonnement: 'pilot', proef_eind: new Date(Date.now() + 30 * DAG).toISOString(), opgezegd_op: null });
    log(db, u.id, 'pilot_verlengd', o.id, o.id, { van });
    return beheerOrganisaties(db);
  },
  beheer_abonnement_zetten(db, { org, status: nieuw }) {
    const u = beheerder(db);
    if (!['actief', 'opgezegd'].includes(nieuw)) fout('ongeldig');
    const o = db.organisaties.find((x) => x.id === org);
    if (!o) fout('niet_gevonden');
    if (nieuw === 'actief' && !o.kvk) fout('kvk_verplicht');
    const van = o.abonnement;
    Object.assign(o, { abonnement: nieuw, opgezegd_op: nieuw === 'opgezegd' ? nu() : null });
    log(db, u.id, 'abonnement_gezet', o.id, o.id, { van, naar: nieuw });
    return beheerOrganisaties(db);
  },
};

function verwijderOrg(db, uid, orgId) {
  log(db, uid, 'organisatie_verwijderd', orgId, orgId);
  db.organisaties = db.organisaties.filter((o) => o.id !== orgId);
  db.leden = db.leden.filter((l) => l.organisatie_id !== orgId);
  db.uitnodigingen = db.uitnodigingen.filter((i) => i.organisatie_id !== orgId);
  db.controles = db.controles.filter((c) => c.organisatie_id !== orgId);
  db.audit.forEach((a) => a.organisatie_id === orgId && (a.organisatie_id = null));
}

// ── Voorbeeldgegevens voor /beheer/?demo=1 ───────────────────────────
function zaai(db) {
  if (db.gezaaid) return;
  db.gezaaid = true;
  const dag = (n) => new Date(Date.now() + n * DAG).toISOString();
  const org = (naam, abonnement, eind, kvk = null, dagenGeleden = 3) => {
    const o = { id: id(), naam, kvk, abonnement, proef_eind: dag(eind), opgezegd_op: abonnement === 'opgezegd' ? dag(-2) : null, aangemaakt: dag(-dagenGeleden) };
    const eig = { id: id(), email: `eigenaar-${db.organisaties.length + 1}@voorbeeld.nl`, naam: null, aangemaakt: dag(-dagenGeleden) };
    db.users.push(eig);
    db.organisaties.push(o);
    db.leden.push({ organisatie_id: o.id, user_id: eig.id, rol: 'eigenaar', toegevoegd: o.aangemaakt });
    return o;
  };
  const a = org('Bewindvoering De Brug', 'proef', 5, null, 2);
  org('<img src=x onerror="window.__xss=1">', 'proef', 1, null, 6);
  org('Budgetcoach Noord', 'proef', -3, '87654321', 10);
  const d = org('Schuldhulp Oost', 'actief', -20, '12345678', 40);
  for (const [o, n] of [[a, 2], [d, 5]]) {
    for (let i = 0; i < n; i++) {
      db.controles.push({ id: id(), organisatie_id: o.id, door: null, clienten_band: '10-49', met_actie: 7, gemist_jaar: 12000, risico_jaar: 3500, signalen: Object.fromEntries(SOORTEN.map((s) => [s, -1])), rekenversie: '2026.20260928', aangemaakt: dag(-i * 3) });
    }
  }
  db.berichten.push(
    { id: id(), soort: 'pro-pilot', onderwerp: 'Pilot ToeslagBuddy Pro', email: 'kantoor@voorbeeld.nl', naam: 'Karin', tekst: 'Kantoor of organisatie: Bewind Zuid\nAantal cliënten: 60', taal: 'nl', aangemaakt: dag(-1), doorgestuurd: true, pogingen: 1 },
    { id: id(), soort: 'contact', onderwerp: 'Vraag <b>vet</b>', email: 'bezoeker@voorbeeld.nl', naam: '<script>window.__xss=2</script>', tekst: '<img src=x onerror="window.__xss=3">', taal: 'nl', aangemaakt: dag(-0.2), doorgestuurd: false, pogingen: 3 },
  );
}

// ── Adapter (zelfde vorm als de Supabase-adapter) ────────────────────
export function demoAdapter({ beheer = false } = {}) {
  const metDb = async (f) => {
    const db = laad();
    // Zoals een databasetransactie: bij een fout wordt niets bewaard
    const r = await f(db);
    bewaar(db);
    return r;
  };
  return {
    soort: 'demo',
    async codeSturen(email, { nieuw = false, gegevens = null, toestaanNieuw = false } = {}) {
      return metDb((db) => {
        const e = String(email).trim().toLowerCase();
        const bestaat = db.users.some((u) => u.email === e);
        if (!nieuw && !bestaat && !toestaanNieuw && !beheer) fout('geen_account');
        if (gegevens) db.wachtend[e] = gegevens;
        return { demoCode: DEMO_CODE };
      });
    },
    async codeControleren(email, code) {
      return metDb((db) => {
        if (String(code).trim() !== DEMO_CODE) fout('code_onjuist');
        const e = String(email).trim().toLowerCase();
        let u = db.users.find((x) => x.email === e);
        if (!u) {
          const g = db.wachtend[e] || {};
          const cl = String(g.clienten || '').replace(/[\s.]/g, '');
          u = { id: id(), email: e, naam: g.naam || null, organisatie: g.organisatie || null, clienten: /^\d{1,6}$/.test(cl) && +cl <= 100000 ? +cl : null, aangemaakt: nu() };
          db.users.push(u);
          delete db.wachtend[e];
        }
        // In de beheerdemo is wie inlogt beheerder (zonder organisatie)
        if (beheer && !db.beheerders.includes(u.id) && !lidVan(db, u.id)) db.beheerders.push(u.id);
        db.sessie = { user_id: u.id, aal: 'aal1' };
        return { id: u.id, email: u.email };
      });
    },
    async sessie() {
      const db = laad();
      const u = db.sessie && db.users.find((x) => x.id === db.sessie.user_id);
      return u ? { id: u.id, email: u.email } : null;
    },
    async uitloggen() {
      await metDb((db) => (db.sessie = null));
    },
    async rpc(naam, args = {}) {
      if (params.has('onbereikbaar')) throw netwerkFout();
      if (!FUNCTIES[naam]) fout('onbekende_functie');
      return metDb((db) => {
        if (beheer) zaai(db);
        return FUNCTIES[naam](db, args);
      });
    },
    async controles() {
      if (params.has('onbereikbaar')) throw netwerkFout();
      const db = laad();
      const u = gebruiker(db);
      const o = orgVan(db, u.id);
      return o ? db.controles.filter((c) => c.organisatie_id === o.id).sort((a, b) => b.aangemaakt.localeCompare(a.aangemaakt)).slice(0, 50) : [];
    },
    uitnodigingsLink: (token) => `${location.origin}/pro/app/?demo=1&uitnodiging=${token}`,
    // MFA (TOTP), zoals supabase.auth.mfa
    async aal() {
      const db = laad();
      const s = db.sessie;
      const heeft = s && db.factoren.some((f) => f.user_id === s.user_id && f.status === 'verified');
      return { huidig: s?.aal ?? null, volgend: heeft ? 'aal2' : s?.aal ?? null };
    },
    async inschrijven() {
      return metDb((db) => {
        const u = gebruiker(db);
        db.factoren = db.factoren.filter((f) => !(f.user_id === u.id && f.status !== 'verified'));
        const f = { id: id(), user_id: u.id, status: 'unverified' };
        db.factoren.push(f);
        return { factorId: f.id, qr: null, geheim: 'DEMO DEMO DEMO DEMO' };
      });
    },
    async factorId() {
      const db = laad();
      return db.factoren.find((f) => f.user_id === db.sessie?.user_id && f.status === 'verified')?.id ?? null;
    },
    async verifieren(factorId, code) {
      return metDb((db) => {
        if (String(code).trim() !== DEMO_CODE) fout('code_onjuist');
        const f = db.factoren.find((x) => x.id === factorId && x.user_id === db.sessie?.user_id);
        if (!f) fout('code_onjuist');
        f.status = 'verified';
        db.sessie.aal = 'aal2';
      });
    },
  };
}
