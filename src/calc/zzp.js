// Toeslagbewaker voor zzp'ers: schat het toetsingsinkomen op basis van de
// winst tot nu toe en vergelijkt dat met het inkomen dat bij Dienst
// Toeslagen is opgegeven. Zo zie je op tijd of je gaat terugbetalen.
import { allesCheck } from './toeslagen.js';
import { ZZP } from './params.js';

/**
 * @param {{
 *   winstTotNu: number, maand: number, verwachteJaarwinst?: number,
 *   urencriterium?: boolean, ander: number, partnerInkomen?: number,
 *   opgegevenInkomen: number, partner?: boolean, huurt?: boolean, kaleHuur?: number,
 *   personen?: number, volwassenen?: number, kinderen?: number[], vermogen?: number, leeftijd?: number
 * }} i
 */
export function zzpCheck(i) {
  const maand = Math.min(12, Math.max(1, Math.round(i.maand || 1)));
  const jaarwinst = i.verwachteJaarwinst > 0 ? i.verwachteJaarwinst : ((i.winstTotNu || 0) / maand) * 12;
  const naAftrek = Math.max(0, jaarwinst - (i.urencriterium ? ZZP.zelfstandigenaftrek : 0));
  const belastbareWinst = naAftrek * (1 - ZZP.mkbWinstvrijstelling);
  const verwachtInkomen = Math.round(belastbareWinst + (i.ander || 0) + (i.partner ? i.partnerInkomen || 0 : 0));

  const basis = {
    partner: !!i.partner,
    huurt: !!i.huurt,
    kaleHuur: i.kaleHuur,
    personen: i.personen,
    medebewoners: Math.max(0, (i.volwassenen || 1) - 1 - (i.partner ? 1 : 0)),
    kinderen: i.kinderen || [],
    vermogen: i.vermogen,
    leeftijd: i.leeftijd,
  };
  const opgegeven = allesCheck({ ...basis, inkomen: i.opgegevenInkomen || 0 });
  const verwacht = allesCheck({ ...basis, inkomen: verwachtInkomen });

  const regelingen = ['zorgtoeslag', 'huurtoeslag', 'kindgebondenBudget']
    .filter((k) => opgegeven[k] || verwacht[k])
    .map((k) => {
      const nu = opgegeven[k] && opgegeven[k].recht ? opgegeven[k].perJaar : 0;
      const straks = verwacht[k] && verwacht[k].recht ? verwacht[k].perJaar : 0;
      return { regeling: k, voorschotJaar: Math.round(nu), verwachtJaar: Math.round(straks), verschilJaar: Math.round(straks - nu) };
    });

  const verschil = regelingen.reduce((t, r) => t + r.verschilJaar, 0);
  // Advies: veiligheidsmarge van 5% bovenop de schatting, afgerond op € 500
  const advies = Math.ceil((verwachtInkomen * 1.05) / 500) * 500;
  return {
    jaarwinst: Math.round(jaarwinst),
    belastbareWinst: Math.round(belastbareWinst),
    verwachtInkomen,
    regelingen,
    verschilJaar: verschil,
    status: verschil < -50 ? 'terugbetalen' : verschil > 50 ? 'bijkrijgen' : 'goed',
    adviesInkomen: advies,
  };
}

// Agenda-bestand (.ics) met een maandelijkse herinnering om de check te doen.
export function herinneringIcs(url, start = new Date()) {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 8, 0));
  const fmt = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ToeslagBuddy//Toeslagbewaker//NL',
    'BEGIN:VEVENT',
    `UID:toeslagbewaker-${fmt(d)}@toeslagbuddy.nl`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(d)}`,
    'DURATION:PT10M',
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=1',
    'SUMMARY:Toeslagcheck zzp (5 minuten)',
    `DESCRIPTION:Vul je winst tot nu toe in en check of je toeslagvoorschot nog klopt: ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Toeslagcheck zzp',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
