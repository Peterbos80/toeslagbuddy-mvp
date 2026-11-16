// Checklist na een overlijden. Elke stap verwijst naar de officiële bron
// (bron-id's uit data/familie/bronnen.json). De volgorde volgt de tijd.
export const FASES = [
  {
    id: 'eerste-dagen',
    titel: 'De eerste dagen',
    stappen: [
      { id: 'arts', titel: 'Een arts stelt het overlijden vast', tekst: 'De arts geeft een verklaring van overlijden. Die heeft de uitvaartondernemer nodig.' },
      { id: 'uitvaart', titel: 'Bel een uitvaartondernemer', tekst: 'Die doet meestal ook de aangifte van overlijden bij de gemeente en vraagt uittreksels van de overlijdensakte aan. Vraag er meerdere: je hebt ze vaak nodig.', bron: 'ro-checklist-overlijden' },
      { id: 'wensen', titel: 'Zoek op of er wensen zijn vastgelegd', tekst: 'Een codicil, een uitvaartverzekering, een testament of een donorregistratie.' },
      { id: 'niet-aanvaarden', titel: 'Neem nog niets mee en betaal nog geen rekeningen', tekst: 'Wie spullen meeneemt, verkoopt of rekeningen betaalt, heeft de erfenis volgens de wet zuiver aanvaard, inclusief schulden. De uitvaart betalen uit de erfenis mag wel.', bron: 'ro-aanvaarden', belangrijk: true },
    ],
  },
  {
    id: 'eerste-weken',
    titel: 'De eerste weken',
    stappen: [
      { id: 'testament', titel: 'Vraag na of er een testament is', tekst: 'Dat kan gratis bij het Centraal Testamentenregister. Je hebt een uittreksel van de overlijdensakte nodig.', bron: 'ro-testament-opvragen' },
      { id: 'bank', titel: 'Meld het overlijden bij de bank', tekst: 'De bank vertelt wat er met de rekeningen gebeurt en of je een verklaring van erfrecht nodig hebt.', bron: 'ro-verklaring-erfrecht' },
      { id: 'verklaring', titel: 'Verklaring van erfrecht bij de notaris (als de bank die vraagt)', tekst: 'Daarin staat wie de erfgenamen zijn. Bij veel erfgenamen kan dit weken duren.', bron: 'ro-verklaring-erfrecht' },
      { id: 'contactpersoon', titel: 'Geef een contactpersoon door aan de Belastingdienst', tekst: 'Bij de condoleancebrief zit een formulier. Zo komt de post op het goede adres.', bron: 'bd-toeslagen-partner' },
      { id: 'opzeggen', titel: 'Zeg contracten en abonnementen op, of zet ze over', tekst: 'Energie, telefoon, verzekeringen, abonnementen, loterijen. In de regelkamer maken we de brieven voor je.' },
      { id: 'machtiging', titel: 'Vraag een nabestaandenmachtiging aan', tekst: 'Daarmee regel je online de belasting- en toeslagzaken van de overledene, met je eigen DigiD.', bron: 'bd-nabestaandenmachtiging' },
    ],
  },
  {
    id: 'eerste-maanden',
    titel: 'De eerste maanden',
    stappen: [
      { id: 'aanvaarden', titel: 'Beslis of je de erfenis aanvaardt', tekst: 'Zuiver aanvaarden, beneficiair aanvaarden (je bent dan niet aansprakelijk voor schulden) of verwerpen. Er is geen wettelijke termijn, maar schuldeisers mogen na 3 maanden om betaling vragen. Voor beneficiair aanvaarden of verwerpen leg je een verklaring af bij de rechtbank.', bron: 'ro-aanvaarden', belangrijk: true },
      { id: 'toeslagen', titel: 'Controleer de toeslagen van de achterblijvende partner', tekst: 'Binnen 5 tot 8 weken komt er een nieuwe berekening. Controleer het inkomen. Was het inkomen eerst minstens 10% lager? Vraag dan de 10%-regeling aan, zodat je minder hoeft terug te betalen.', bron: 'bd-10-procent' },
      { id: 'pensioen', titel: 'Vraag na of er nabestaandenpensioen of een Anw-uitkering is', tekst: 'Bij het pensioenfonds van de overledene en bij de SVB.', bron: 'ro-nabestaandenpensioen' },
      { id: 'verdeling', titel: 'Bekijk wie wat erft', tekst: 'Zonder testament erven partner en kinderen elk een gelijk deel. De partner krijgt alles in handen; de kinderen houden hun deel tegoed.', bron: 'bd-wettelijke-verdeling' },
    ],
  },
  {
    id: 'belasting',
    titel: 'Belasting',
    stappen: [
      { id: 'ib', titel: 'Aangifte inkomstenbelasting voor de overledene', tekst: 'Wacht op de brief van de Belastingdienst. Aangifte doen kan vanaf 1 maart na het jaar van overlijden. Geen brief na 5 maanden? Dan kun je zelf aangifte doen.', bron: 'bd-ib-overledene' },
      { id: 'erfbelasting', titel: 'Aangifte erfbelasting', tekst: 'Bij een overlijden vanaf 2026 moet de aangifte binnen 20 maanden binnen zijn (bij een overlijden in 2025 of eerder: 8 maanden). Uitvaartkosten mag je voor een deel aftrekken.', bron: 'bd-erf-termijn', belangrijk: true },
      { id: 'definitief', titel: 'Controleer de definitieve berekening van de toeslagen', tekst: 'Die komt na het jaar van overlijden. Klopt het inkomen of het vermogen niet? Dan kun je dat nog doorgeven.', bron: 'bd-toeslagen-definitief' },
    ],
  },
];

export const alleStappen = () => FASES.flatMap((f) => f.stappen.map((s) => ({ ...s, fase: f.id })));
export function voortgang(gedaan = {}) {
  const alle = alleStappen();
  const klaar = alle.filter((s) => gedaan[s.id]).length;
  return { klaar, totaal: alle.length, deel: alle.length ? klaar / alle.length : 0 };
}
