// Erfbelasting: vrijstelling en tarief per relatie (regels: erfbelasting-<jaar>.json,
// bron Belastingdienst). Standaardsituaties; bij een testament met bijzondere
// bepalingen, een onderneming of buitenland verwijzen we naar de notaris.
import { waarde, afgerond } from './regels.js';

export const RELATIES = {
  partner: { naam: 'Partner (getrouwd, geregistreerd of samenwonend)', vrij: 'vrijPartner', tarief: 'partnerKind' },
  kind: { naam: 'Kind, stiefkind of pleegkind', vrij: 'vrijKind', tarief: 'partnerKind' },
  kindBeperking: { naam: 'Kind met een beperking (voorwaarden)', vrij: 'vrijKindBeperking', tarief: 'partnerKind' },
  kleinkind: { naam: 'Kleinkind', vrij: 'vrijKleinkind', tarief: 'kleinkind' },
  ouder: { naam: 'Ouder', vrij: 'vrijOuder', tarief: 'overig' },
  overig: { naam: 'Iemand anders (bijvoorbeeld broer, zus of vriend)', vrij: 'vrijOverig', tarief: 'overig' },
};

// invoer: { waarde: wat deze erfgenaam krijgt, relatie }
export function erfbelasting(regel, { waarde: erfdeel = 0, relatie = 'kind' }) {
  const r = RELATIES[relatie];
  if (!r) throw new Error(`Onbekende relatie: ${relatie}`);
  const krijgt = Math.max(0, Number(erfdeel) || 0);
  const vrijstelling = waarde(regel, r.vrij);
  const belast = Math.max(0, krijgt - vrijstelling);
  const grens = waarde(regel, 'schijfgrens');
  const t = regel.tarieven[r.tarief];
  const laag = Math.min(belast, grens);
  const hoog = Math.max(0, belast - grens);
  const belasting = Math.floor(laag * t.laag + hoog * t.hoog); // de Belastingdienst rondt af op hele euro's naar beneden
  return {
    relatie,
    krijgt,
    vrijstelling,
    belast,
    schijven: [
      { tot: grens, percentage: t.laag, over: laag, belasting: afgerond(laag * t.laag) },
      ...(hoog ? [{ vanaf: grens, percentage: t.hoog, over: hoog, belasting: afgerond(hoog * t.hoog) }] : []),
    ],
    belasting,
    netto: krijgt - belasting,
    effectief: krijgt ? belasting / krijgt : 0,
  };
}

// Wettelijke verdeling zonder testament: partner en kinderen erven elk een
// gelijk deel. De partner krijgt alle bezittingen; de kinderen krijgen hun
// deel als vordering op de partner (opeisbaar bij diens overlijden).
// Zonder partner: de kinderen delen gelijk.
export function wettelijkeErfdelen({ nalatenschap = 0, partner = false, kinderen = 0 }) {
  const n = Math.max(0, Math.floor(Number(kinderen) || 0));
  const delen = n + (partner ? 1 : 0);
  if (!delen) return { delen: 0, perDeel: 0, erfgenamen: [], anders: true };
  const perDeel = afgerond((Math.max(0, Number(nalatenschap) || 0)) / delen);
  const erfgenamen = [];
  if (partner) erfgenamen.push({ wie: 'partner', relatie: 'partner', deel: perDeel, krijgtInHanden: Math.max(0, Number(nalatenschap) || 0), toelichting: n ? 'Krijgt alle bezittingen en schulden. De kinderen houden hun deel tegoed.' : 'Enige erfgenaam.' });
  for (let i = 1; i <= n; i++) erfgenamen.push({ wie: `kind ${i}`, relatie: 'kind', deel: perDeel, krijgtInHanden: partner ? 0 : perDeel, toelichting: partner ? 'Krijgt een vordering in geld op de partner. Die is meestal pas opeisbaar als de partner overlijdt.' : 'Krijgt dit deel direct.' });
  return { delen, perDeel, erfgenamen, anders: false };
}

// Overzicht voor alle erfgenamen bij gelijke delen (indicatie)
export function overzicht(regel, { nalatenschap, partner, kinderen }) {
  const v = wettelijkeErfdelen({ nalatenschap, partner, kinderen });
  const regels = v.erfgenamen.map((e) => ({ ...e, ...erfbelasting(regel, { waarde: e.deel, relatie: e.relatie }) }));
  return { ...v, erfgenamen: regels, totaalBelasting: regels.reduce((s, r) => s + r.belasting, 0) };
}
