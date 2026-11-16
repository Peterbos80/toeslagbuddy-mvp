// Het dossiermodel: één dossier per ouder of ouderpaar, met leden en rollen.
// Dezelfde vormen gelden lokaal (in de browser) en in de database.
export const SOORTEN = ['contracten', 'contacten', 'documenten', 'brieven', 'taken', 'logboek', 'afspraken', 'leden'];

export const ROLLEN = {
  regelaar: { naam: 'Regelaar', uitleg: 'Mag alles: toevoegen, wijzigen, leden uitnodigen.' },
  meekijker: { naam: 'Meekijker', uitleg: 'Ziet alles, pakt taken op en legt uitgaven vast. Verwijdert niets.' },
  ouder: { naam: 'Ouder', uitleg: 'Ziet alles en vult eigen wensen in.' },
  executeur: { naam: 'Executeur', uitleg: 'Wikkelt de nalatenschap af (alleen na een overlijden).' },
};

const RECHTEN = {
  regelaar: ['lezen', 'schrijven', 'verwijderen', 'leden', 'logboek', 'taken', 'overlijden', 'instellingen'],
  executeur: ['lezen', 'schrijven', 'verwijderen', 'leden', 'logboek', 'taken', 'instellingen'],
  meekijker: ['lezen', 'logboek', 'taken'],
  ouder: ['lezen', 'wensen'],
};
export const mag = (rol, actie) => (RECHTEN[rol] || []).includes(actie);

export const MAX_LEDEN = 8;

export function uid() {
  return globalThis.crypto.randomUUID();
}

export function nieuwDossier({ naam, geboortejaar = null, door }) {
  const nu = new Date().toISOString();
  return {
    id: uid(),
    naam: String(naam || '').trim().slice(0, 60),
    geboortejaar: geboortejaar ? Number(geboortejaar) : null,
    status: 'actief', // 'actief' | 'overlijden' | 'archief'
    overlijdensdatum: null,
    profiel: {},
    toestemming: null, // { soort: 'ouder-app' | 'schriftelijk' | 'volmacht' | 'bewind', datum, door }
    aangemaakt: nu,
    gewijzigd: nu,
    door: door || null,
  };
}

// Vaste, zachte avatarkleur per persoon (afgeleid van de naam of het id)
export const AVATARKLEUREN = ['#2f6b5e', '#b4532b', '#2f5d8a', '#6f3a73', '#8a6a1f', '#3d7a4f', '#a8456a', '#4a5d73'];
export function avatarKleur(sleutel) {
  let h = 0;
  for (const c of String(sleutel || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARKLEUREN[h % AVATARKLEUREN.length];
}
export function initialen(naam) {
  const delen = String(naam || '?').trim().split(/\s+/).filter(Boolean);
  return ((delen[0]?.[0] || '?') + (delen.length > 1 ? delen[delen.length - 1][0] : '')).toUpperCase();
}

// Leeftijd in een jaar, uit het geboortejaar (we bewaren geen geboortedatum)
export const leeftijdIn = (geboortejaar, jaar = new Date().getFullYear()) => (geboortejaar ? jaar - geboortejaar : null);

export const SOORT_CONTRACT = {
  energie: 'Energie',
  zorgverzekering: 'Zorgverzekering',
  verzekering: 'Verzekering',
  telecom: 'Telefoon, internet en tv',
  wonen: 'Huur of hypotheek',
  water: 'Water',
  gemeente: 'Gemeente en waterschap',
  abonnement: 'Abonnement',
  loterij: 'Loterij',
  goeddoel: 'Goed doel',
  bank: 'Bank',
  zorg: 'Zorg en hulp',
  overig: 'Overig',
};

export const SOORT_DOCUMENT = {
  identiteit: 'Paspoort of identiteitskaart',
  rijbewijs: 'Rijbewijs',
  polis: 'Polis',
  beschikking: 'Beschikking of besluit',
  volmacht: 'Volmacht of levenstestament',
  testament: 'Testament (waar het ligt)',
  bon: 'Bon',
  brief: 'Brief',
  overig: 'Overig',
};
