// De termijnkalender: zet het dossier (profiel, contracten, documenten,
// brieven, overlijden) plus de regels om in termijnen met een datum, een
// uitleg en een bron. Een termijn uit een regel die niet (meer) bevestigd is,
// krijgt status 'controleer' en geen datum van ons.
import { regelStatus } from './regels.js';

const DAG = 864e5;
const isoVan = (d) => new Date(d).toISOString().slice(0, 10);
const plusDagen = (iso, n) => isoVan(Date.parse(`${iso}T12:00:00Z`) + n * DAG);
export function plusMaanden(iso, n) {
  const [j, m, d] = iso.split('-').map(Number);
  const doel = new Date(Date.UTC(j, m - 1 + n, 1));
  const laatste = new Date(Date.UTC(doel.getUTCFullYear(), doel.getUTCMonth() + 1, 0)).getUTCDate();
  return isoVan(Date.UTC(doel.getUTCFullYear(), doel.getUTCMonth(), Math.min(d, laatste)));
}
export const dagenTot = (iso, vandaag = new Date()) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${isoVan(vandaag)}T12:00:00Z`)) / DAG);

const BRON = (bronnen, id) => (bronnen && bronnen[id] ? { id, naam: bronnen[id].naam, url: bronnen[id].url } : { id, naam: id, url: null });

// invoer: { dossier, contracten, documenten, brieven, regels, bronnen, vandaag }
export function termijnen({ dossier, contracten = [], documenten = [], brieven = [], regels = {}, bronnen = {}, vandaag = new Date() }) {
  const uit = [];
  const vd = isoVan(vandaag);
  const voeg = (t) => uit.push({ status: 'bevestigd', wie: null, ...t });
  const p = dossier.profiel || {};

  // Contracten: opzeggen vóór het einde
  for (const c of contracten) {
    if (!c.einddatum) continue;
    const opzeg = c.opzegtermijnDagen ? plusDagen(c.einddatum, -Number(c.opzegtermijnDagen)) : null;
    if (opzeg) voeg({ id: `contract-opzeg-${c.id}`, soort: 'contract', datum: opzeg, titel: `${c.naam}: uiterste dag om op te zeggen of over te stappen`, waarom: `Het contract loopt tot ${c.einddatum.split('-').reverse().join('-')} en heeft een opzegtermijn van ${c.opzegtermijnDagen} dagen.`, bron: { naam: 'Eigen invoer (contract)', url: null }, koppeling: { soort: 'contracten', id: c.id } });
    voeg({ id: `contract-eind-${c.id}`, soort: 'contract', datum: c.einddatum, titel: `${c.naam}: contract loopt af`, waarom: 'Daarna gaat vaak een ander (duurder) tarief gelden. Vergelijk op tijd.', bron: { naam: 'Eigen invoer (contract)', url: null }, koppeling: { soort: 'contracten', id: c.id } });
  }

  // Documenten die verlopen (paspoort, rijbewijs, indicatie)
  for (const d of documenten) {
    if (!d.verlooptOp) continue;
    voeg({ id: `document-${d.id}`, soort: 'document', datum: d.verlooptOp, titel: `${d.titel} verloopt`, waarom: 'Vraag op tijd een nieuwe aan; reken op enkele weken.', bron: { naam: 'Eigen invoer (document)', url: null }, koppeling: { soort: 'documenten', id: d.id } });
  }

  // Brieven met een bevestigde termijn
  for (const b of brieven) {
    if (!b.bevestigd || !b.uitleg?.termijn?.datum || b.afgehandeld) continue;
    voeg({ id: `brief-${b.id}`, soort: 'post', datum: b.uitleg.termijn.datum, titel: `${b.uitleg.afzender?.naam || 'Brief'}: ${b.uitleg.soort?.naam?.toLowerCase() || 'termijn'}`, waarom: `In de brief staat: “${b.uitleg.termijn.citaat}”`, bron: { naam: 'De brief zelf', url: null }, koppeling: { soort: 'brieven', id: b.id } });
  }

  // Wetswijziging: einde salderen (alleen als er zonnepanelen zijn)
  const sal = regels.salderen;
  if (p.zonnepanelen && sal) {
    const ok = regelStatus(sal, vandaag) === 'bevestigd';
    voeg({ id: 'salderen-einde', soort: 'wetswijziging', datum: ok ? sal.datums.einde : null, status: ok ? 'bevestigd' : 'controleer', titel: 'Zonnepanelen: salderen stopt', waarom: 'Vanaf deze dag mag teruggeleverde stroom niet meer worden weggestreept tegen verbruik. Bekijk vooraf het energiecontract: de terugleververgoeding en de terugleverkosten.', bron: BRON(bronnen, 'ro-salderen'), regel: 'salderen', actie: { tekst: 'Reken het door', url: '/familie/rekenhulp/zonnepanelen-2027/' } });
  }

  // Na een overlijden
  const ov = regels.overlijden;
  if (dossier.status === 'overlijden' && dossier.overlijdensdatum && ov) {
    const ok = regelStatus(ov, vandaag) === 'bevestigd';
    const od = dossier.overlijdensdatum;
    const jaar = Number(od.slice(0, 4));
    const T = ov.termijnen;
    const maanden = jaar >= T.erfbelastingMaanden.vanafOverlijdensjaar ? T.erfbelastingMaanden.waarde : T.erfbelastingMaandenOud.waarde;
    const zet = (t) => voeg({ soort: 'overlijden', regel: 'overlijden', status: ok ? 'bevestigd' : 'controleer', ...t, datum: ok ? t.datum : null });
    zet({ id: 'ov-schuldeisers', datum: plusMaanden(od, T.schuldeisersMaanden.waarde), titel: 'Tot deze dag mogen schuldeisers niet om betaling vragen', waarom: 'De eerste 3 maanden hebben erfgenamen rust om uit te zoeken of ze de erfenis aanvaarden. Voor aanvaarden of verwerpen zelf is er geen wettelijke termijn. Let op: wie spullen meeneemt of rekeningen betaalt, heeft de erfenis zuiver aanvaard (de uitvaart betalen mag wel).', bron: BRON(bronnen, 'ro-aanvaarden') });
    if (p.toeslagen) zet({ id: 'ov-toeslagen', datum: plusDagen(od, T.toeslagUitbetalingWeken.waarde * 7), titel: 'Toeslagen: nieuwe berekening controleren', waarom: 'Binnen 5 tot 8 weken past Dienst Toeslagen de toeslag aan. Controleer het inkomen en geef veranderingen door. Was het inkomen van de achterblijvende partner eerst minstens 10% lager? Vraag dan naar de 10%-regeling.', bron: BRON(bronnen, 'bd-toeslagen-partner') });
    zet({ id: 'ov-ib-brief', datum: plusMaanden(od, T.ibGeenBriefMaanden.waarde), titel: 'Nog geen brief over de aangifte inkomstenbelasting? Dan zelf aangifte doen', waarom: 'De Belastingdienst stuurt een brief als er aangifte moet worden gedaan voor de overledene. Komt die niet binnen 5 maanden, maar verwacht je teruggave of betaling? Doe dan zelf aangifte.', bron: BRON(bronnen, 'bd-ib-overledene') });
    zet({ id: 'ov-ib-vanaf', datum: `${jaar + 1}-03-01`, titel: 'Aangifte inkomstenbelasting voor de overledene kan vanaf vandaag', waarom: 'Met een nabestaandenmachtiging staat de vooringevulde aangifte klaar. Inloggen met de DigiD van de overledene mag niet.', bron: BRON(bronnen, 'bd-ib-overledene') });
    zet({ id: 'ov-erfbelasting', datum: plusMaanden(od, maanden), titel: 'Aangifte erfbelasting moet binnen zijn', waarom: `De inleverdatum ligt ${maanden} maanden na het overlijden en staat ook in de aangiftebrief. Daarna betaal je belastingrente.`, bron: BRON(bronnen, 'bd-erf-termijn'), actie: { tekst: 'Bereken de erfbelasting', url: '/familie/rekenhulp/erfbelasting/' } });
  }

  // Sorteren: eerst met datum (oplopend), dan zonder datum
  return uit
    .map((t) => ({ ...t, dagen: t.datum ? dagenTot(t.datum, vandaag) : null, verlopen: t.datum ? t.datum < vd : false }))
    .sort((a, b) => (a.datum || '9999').localeCompare(b.datum || '9999'));
}

// Wat speelt er de komende n dagen (en wat is net verlopen)
export function binnenkort(lijst, { dagen = 30, terug = 14 } = {}) {
  return lijst.filter((t) => t.dagen !== null && t.dagen <= dagen && t.dagen >= -terug);
}

// Wanneer herinneren: 30, 7 en 1 dag(en) vooraf
export const HERINNER_DAGEN = [30, 7, 1];
export function herinneringenVoor(lijst, vandaag = new Date()) {
  return lijst.filter((t) => t.dagen !== null && HERINNER_DAGEN.includes(dagenTot(t.datum, vandaag)));
}
