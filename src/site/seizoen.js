// Seizoensbalk: wijst op het moment van het jaar dat er voor geld toe doet.
// De site wordt elke ochtend opnieuw gebouwd, dus de balk wisselt vanzelf.
// Alleen Nederlands, niet in Familie/Pro/Besparen en niet op de pagina zelf.
export function seizoen(datum = new Date()) {
  const j = datum.getFullYear();
  const md = (datum.getMonth() + 1) * 100 + datum.getDate();
  if (md >= 1112 && md <= 1231)
    return { url: '/zorgverzekering-overstappen/', tekst: `<strong>Zorgverzekering ${j + 1}:</strong> overstappen kan nog tot en met 31 december. De premies stijgen: vergelijken loont.`, knop: 'Zo bespaar je' };
  if (md >= 101 && md <= 131)
    return { url: '/zorgtoeslag-berekenen/', tekst: `<strong>Nieuw jaar, nieuwe bedragen.</strong> Klopt je voorschot voor ${j} nog? Check het in een minuut en voorkom terugbetalen.`, knop: 'Check je voorschot' };
  if (md >= 301 && md <= 501)
    return { url: '/toeslag-terugbetalen/', tekst: `<strong>Aangifte gedaan?</strong> Klopt je inkomen in Mijn toeslagen niet meer, pas het dan nu aan. Zo voorkom je terugbetalen.`, knop: 'Zo voorkom je het' };
  if (md >= 701 && md <= 831)
    return { url: '/#check', tekst: `<strong>Nog tot 1 september:</strong> toeslag over ${j - 1} aanvragen, ook met terugwerkende kracht. Veel mensen laten dit geld liggen.`, knop: 'Check in 2 minuten' };
  return null;
}
