// Aftrek specifieke zorgkosten: drempel en verhoging (zorgkosten-<jaar>.json,
// bron Belastingdienst).
import { waarde, afgerond } from './regels.js';

export function drempel(regel, { drempelinkomen = 0, partner = false }) {
  const d = Math.max(0, Number(drempelinkomen) || 0);
  const laag = waarde(regel, partner ? 'grensLaagPartner' : 'grensLaagAlleen');
  const hoog = waarde(regel, 'grensHoog');
  if (d <= laag) return waarde(regel, partner ? 'drempelMinPartner' : 'drempelMinAlleen');
  if (d <= hoog) return Math.floor(d * waarde(regel, 'midden'));
  return Math.floor(waarde(regel, 'drempelVastHoog') + (d - hoog) * waarde(regel, 'hoog'));
}

// invoer: { drempelinkomen, partner, aow, kostenMetVerhoging, kostenZonderVerhoging }
// kostenMetVerhoging: bijvoorbeeld hulpmiddelen, vervoer, dieet, extra gezinshulp
// kostenZonderVerhoging: genees- en heelkundige hulp en reiskosten ziekenbezoek
export function aftrek(regel, invoer) {
  const { drempelinkomen = 0, aow = false } = invoer;
  const met = Math.max(0, Number(invoer.kostenMetVerhoging) || 0);
  const zonder = Math.max(0, Number(invoer.kostenZonderVerhoging) || 0);
  const heeftVerhoging = Number(drempelinkomen) <= waarde(regel, 'verhogingGrens') && met > 0;
  const percentage = heeftVerhoging ? waarde(regel, aow ? 'verhogingAow' : 'verhogingJonger') : 0;
  const verhoging = afgerond(met * percentage);
  const totaal = met + zonder + verhoging;
  const dr = drempel(regel, invoer);
  return { kosten: met + zonder, verhoging, percentage, totaal: afgerond(totaal), drempel: dr, aftrek: Math.max(0, Math.round(totaal - dr)), haaltDrempel: totaal > dr };
}
