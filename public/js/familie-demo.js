// Voorbeelddossier met een verzonnen familie (De Vries), om de regelkamer te
// bekijken zonder zelf iets in te vullen. Alle namen, bedragen en brieven
// zijn verzonnen.
import { nieuwDossier, uid } from './dossier.js';
import { voegToe } from './logboek.js';
import { basisUitleg } from './briefuitleg.js';
import { legeData } from './familie-opslag.js';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const over = (dagen, basis = new Date()) => iso(new Date(basis.getFullYear(), basis.getMonth(), basis.getDate() + dagen));
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const lang = (isoDatum) => {
  const [j, m, d] = isoDatum.split('-').map(Number);
  return `${d} ${MAANDEN[m - 1]} ${j}`;
};

export async function maakDemo(nu = new Date()) {
  const dossier = { ...nieuwDossier({ naam: 'Pa (Henk)', geboortejaar: nu.getFullYear() - 84 }), demo: true };
  dossier.profiel = { woonsituatie: 'alleen', partner: false, huurKoop: 'koop', inkomens: ['aow', 'pensioen'], aow: true, toeslagen: true, zorg: 'wmo', volmacht: 'nee', testament: 'ja', zonnepanelen: true, banken: ['Voorbeeldbank'], dringend: 'overzicht' };
  dossier.toestemming = { soort: 'ouder-app', datum: over(-60, nu), door: 'Marieke' };
  const data = legeData();
  const [marieke, ruud, petra, henk] = [
    { id: uid(), naam: 'Marieke de Vries', rol: 'regelaar', ik: true },
    { id: uid(), naam: 'Ruud de Vries', rol: 'meekijker' },
    { id: uid(), naam: 'Petra de Vries', rol: 'meekijker' },
    { id: uid(), naam: 'Henk de Vries', rol: 'ouder' },
  ];
  data.leden = [marieke, ruud, petra, henk];
  data.contracten = [
    { id: uid(), naam: 'Energiecontract', soort: 'energie', perMaandCent: 14500, einddatum: over(95, nu), opzegtermijnDagen: 30, wie: marieke.id, klantnummer: '' },
    { id: uid(), naam: 'Zorgverzekering', soort: 'zorgverzekering', perMaandCent: 15895, wie: marieke.id },
    { id: uid(), naam: 'Internet en televisie', soort: 'telecom', perMaandCent: 5250, wie: ruud.id },
    { id: uid(), naam: 'Uitvaartverzekering', soort: 'verzekering', perMaandCent: 1840 },
    { id: uid(), naam: 'Krant', soort: 'abonnement', perMaandCent: 3995 },
    { id: uid(), naam: 'Loterij', soort: 'loterij', perMaandCent: 1500 },
    { id: uid(), naam: 'Gemeentelijke belastingen', soort: 'gemeente', perMaandCent: 4100 },
  ];
  data.contacten = [
    { id: uid(), rol: 'Huisarts', naam: 'Huisartsenpraktijk Voorbeeld', telefoon: '', notitie: 'Assistente weet dat Marieke belt' },
    { id: uid(), rol: 'Hulp via de gemeente', naam: 'Wmo-consulent', telefoon: '', notitie: 'Huishoudelijke hulp op dinsdag' },
    { id: uid(), rol: 'Notaris', naam: 'Notariskantoor Voorbeeld', telefoon: '', notitie: 'Testament ligt hier' },
  ];
  data.documenten = [
    { id: uid(), soort: 'identiteit', titel: 'Paspoort', verlooptOp: over(21, nu), notitie: 'Ligt in de la van het bureau' },
    { id: uid(), soort: 'testament', titel: 'Testament', notitie: 'Bij Notariskantoor Voorbeeld' },
    { id: uid(), soort: 'polis', titel: 'Polis uitvaartverzekering', notitie: 'Map in de kast, tabblad verzekeringen' },
  ];
  const termijn = over(6, nu);
  const briefTekst = `CAK\nDatum: ${lang(over(-9, nu))}\nBetreft: beschikking eigen bijdrage\n\nGeachte heer De Vries,\n\nWij hebben uw eigen bijdrage voor volgend jaar vastgesteld. U betaalt € 21,80 per maand voor hulp en ondersteuning vanuit de Wmo.\n\nBent u het niet eens met dit besluit? Dan kunt u bezwaar maken. Uw bezwaar moet uiterlijk ${lang(termijn)} bij ons binnen zijn.\n\nMet vriendelijke groet,\nCAK`;
  data.brieven = [
    { id: uid(), titel: 'CAK: eigen bijdrage', tekst: briefTekst, ontvangen: over(-8, nu), uitleg: basisUitleg(briefTekst, { nu }), bevestigd: true, door: marieke.id },
  ];
  data.taken = [
    { id: uid(), titel: 'Zorgverzekering voor volgend jaar kiezen', toelichting: 'Vergelijk de polis met wat pa echt gebruikt.', wie: marieke.id, deadline: over(30, nu), klaar: false, bron: 'handmatig' },
    { id: uid(), titel: 'Paspoort verlengen', toelichting: 'Afspraak maken bij de gemeente; pasfoto nodig.', wie: ruud.id, deadline: over(14, nu), klaar: false, bron: 'handmatig' },
    { id: uid(), titel: 'Volmacht bespreken met de notaris', toelichting: 'Vraag ook naar een afspraak over verantwoording.', wie: null, deadline: null, klaar: false, bron: 'intake' },
    { id: uid(), titel: 'Vaste lasten op een rij gezet', toelichting: '', wie: marieke.id, deadline: null, klaar: true, klaarOp: over(-20, nu), bron: 'intake' },
  ];
  data.afspraken = [{ id: uid(), tekst: 'Ruud betaalt de tuinman en zet de bon in het logboek. Petra belt elke zondag.', door: marieke.id, datum: over(-40, nu) }];
  // Zes maanden logboek
  const regels = [];
  const leg = async (dagenTerug, cent, richting, categorie, omschrijving, door, bon = false) => regels.push(await voegToe(regels, { datum: over(-dagenTerug, nu), bedragCent: cent, richting, categorie, omschrijving, door, bonId: bon ? 'demo-bon' : null }, { nu: new Date(nu.getTime() - dagenTerug * 864e5) }));
  for (let m = 5; m >= 0; m--) {
    const b = m * 30;
    await leg(b + 2, 148000 + m * 300, 'in', 'inkomen', 'AOW en pensioen', marieke.id);
    await leg(b + 21, 6240 + m * 410, 'uit', 'boodschappen', 'Boodschappen', marieke.id, true);
    await leg(b + 14, 4500, 'uit', 'wonen', 'Tuinman', ruud.id, m % 2 === 0);
    await leg(b + 9, 3180 + m * 150, 'uit', 'boodschappen', 'Boodschappen en apotheek', petra.id, true);
    if (m % 2 === 1) await leg(b + 6, 5000, 'uit', 'contant', 'Contante opname voor de kapper en klein geld', ruud.id);
    if (m === 0) await leg(3, 7990, 'uit', 'kleding', 'Nieuwe winterjas', marieke.id, true);
  }
  data.logboek = regels;
  return { dossier, data };
}
