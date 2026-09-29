// Status van een Pro-account: proefperiode of betaald abonnement.
const DAG = 24 * 60 * 60 * 1000;

/**
 * @param {{proef_eind?: string, abonnement?: string}} profiel
 * @param {Date} nu
 */
export function proefStatus(profiel, nu = new Date()) {
  if (!profiel) return { toegang: false, soort: 'geen', dagenOver: 0 };
  if (profiel.abonnement === 'actief') return { toegang: true, soort: 'abonnement', dagenOver: null };
  const eind = new Date(profiel.proef_eind);
  const over = eind - nu;
  if (isNaN(eind) || over <= 0) return { toegang: false, soort: 'verlopen', dagenOver: 0, eind };
  return { toegang: true, soort: 'proef', dagenOver: Math.ceil(over / DAG), eind };
}

export function proefEind(start, dagen = 7) {
  return new Date(new Date(start).getTime() + dagen * DAG).toISOString();
}
