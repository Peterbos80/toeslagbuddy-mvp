// Zonnepanelen na het einde van de salderingsregeling (1 januari 2027).
// Alleen de regel uit salderen.json is "van ons" (minimaal 50% van het kale
// leveringstarief tot 2030). Alle andere getallen vult de gebruiker in vanuit
// het eigen contract en de jaarafrekening; wij verzinnen geen stroomprijzen.
import { waarde, afgerond } from './regels.js';

// invoer (per jaar): { opwek, verbruik, zelfverbruik (kWh direct zelf gebruikt),
//   tariefAllIn (€/kWh incl. belasting), tariefKaal (€/kWh zonder belasting),
//   vergoeding (€/kWh voor teruglevering; leeg = wettelijk minimum),
//   vergoedingOverschotNu (€/kWh voor overschot onder salderen), terugleverkosten (€/jaar) }
export function vergelijk(regel, invoer) {
  const n = (x) => Math.max(0, Number(x) || 0);
  const opwek = n(invoer.opwek);
  const verbruik = n(invoer.verbruik);
  const zelf = Math.min(n(invoer.zelfverbruik), opwek, verbruik);
  const terug = opwek - zelf; // naar het net
  const vanNet = verbruik - zelf; // van het net
  const allIn = n(invoer.tariefAllIn);
  const kaal = n(invoer.tariefKaal);
  const minimum = afgerond(kaal * waarde(regel, 'minimumVergoeding') * 1000) / 1000;
  const vergoeding = invoer.vergoeding === '' || invoer.vergoeding == null ? minimum : n(invoer.vergoeding);
  const kosten = n(invoer.terugleverkosten);

  // Met salderen: teruglevering wegstrepen tegen afname; overschot krijgt een vergoeding
  const gesaldeerd = Math.min(terug, vanNet);
  const overschot = terug - gesaldeerd;
  const metSalderen = (vanNet - gesaldeerd) * allIn - overschot * n(invoer.vergoedingOverschotNu ?? vergoeding) + kosten;
  // Zonder salderen: alles van het net betalen, alle teruglevering krijgt de vergoeding
  const zonderSalderen = vanNet * allIn - terug * vergoeding + kosten;
  return {
    zelfverbruik: zelf,
    teruglevering: terug,
    vanNet,
    minimumVergoeding: minimum,
    vergoeding,
    onderMinimum: vergoeding + 1e-9 < minimum,
    metSalderen: afgerond(metSalderen),
    zonderSalderen: afgerond(zonderSalderen),
    verschil: afgerond(zonderSalderen - metSalderen),
    // Elke kWh die je extra zelf gebruikt in plaats van teruglevert, scheelt dit bedrag
    winstPerKwhZelf: afgerond((allIn - vergoeding) * 100) / 100,
  };
}
