# Groeiplan: naar 40.000 bezoekers en € 500 per maand

## Doel in cijfers

Voor € 500 per maand bij 40.000 bezoekers moet je ongeveer **€ 12,50 per 1.000 bezoekers** verdienen. Met alleen advertenties haal je dat niet: AdSense levert bij Nederlandse geldonderwerpen naar schatting € 3–8 per 1.000 bezoekers op. Het verschil moet uit partnerlinks komen: een geslaagde overstap van zorgverzekering of energie levert per stuk grofweg € 10–50 op.

| Bron | Aanname | Bij 40.000 bezoekers per maand |
|---|---|---|
| AdSense | € 5 per 1.000 bezoekers | € 200 |
| Zorgverzekering (partnerlink) | 0,3% van de bezoekers stapt over, à € 15 | € 180 (in november en december 3–5× zo veel) |
| Energie en internet | 0,1% sluit af, à € 30 | € 120 |
| **Totaal** | | **≈ € 500** |

Deze getallen zijn aannames. Meet na 3 maanden wat het echt oplevert en stuur bij.

## Seizoenen: dan komen de bezoekers

| Periode | Waarom | Actie |
|---|---|---|
| **Half september** (Prinsjesdag) | "toeslagen 2027" wordt veel gezocht | Pagina `/toeslagen-2027/` staat klaar |
| **12 november – 31 december** | Overstappen van zorgverzekering; nieuwe bedragen | Grootste piek. Zet de zorgverzekering-partnerlink aan en werk de bedragen bij zodra ze bekend zijn. |
| **Januari** | Nieuwe voorschotten, "zorgtoeslag 2027" | Alles bijgewerkt voor het nieuwe jaar |
| **Maart – mei** | Belastingaangifte, terugvorderingen | Pagina's over terugbetalen en toetsingsinkomen |

## Stap 1 – Techniek en vindbaarheid (week 1)

- [ ] Domein en SSL bij TransIP; site live (zie README)
- [ ] Google Search Console en Bing Webmaster Tools: sitemap indienen
- [ ] Statistieken zonder cookies aanzetten (Plausible of GoatCounter)
- [ ] Bedragen in `params.js` nog één keer controleren tegen belastingdienst.nl
- [ ] Controleren of pagina's snel genoeg laden (Core Web Vitals) met PageSpeed Insights; doel: 95+ op mobiel

## Stap 2 – Inhoud uitbreiden (maand 1–3)

Elke nieuwe pagina richt zich op één zoekvraag. Ideeën, ongeveer op volgorde van zoekvolume:

1. **Zorgtoeslag 2027 berekenen** en **huurtoeslag 2027 berekenen**. Zet ze klaar zodra de definitieve bedragen er zijn en laat de pagina's van 2026 dan naar die van 2027 doorverwijzen.
2. **Huurtoeslag bij een specifieke huur**, bijvoorbeeld "huurtoeslag bij huur van 800 euro". Dit kan automatisch worden aangemaakt uit de rekenmotor, maar alleen met echte tabellen en uitleg, geen dunne pagina's.
3. **Toeslagen bij specifieke situaties:** zzp'ers, scheiding, zwangerschap, samenwonen, bijstand, WW.
4. **Uitbetaaldata toeslagen 2027.** Wordt elk jaar veel gezocht.
5. **Zorgverzekering overstappen:** een checklist, gekoppeld aan de partnerlink.

## Stap 3 – Zorgen dat mensen de tool gebruiken en delen

Er is geen garantie dat "iedereen" de tool gaat gebruiken, maar dit is wat het meeste effect heeft:

- **Doorverwijzers.** Veel organisaties zoeken een eenvoudige rekenhulp om naar door te verwijzen. Mail ze een korte uitleg en de link:
  - schuldhulpverlening en maatschappelijk werk
  - sociale raadslieden en Informatiepunten Digitale Overheid in bibliotheken
  - huurdersverenigingen en woningcorporaties
  - studentenverenigingen
  - ouderenbonden (KBO, PCOB)

  Dit levert ook sterke verwijzende links op, die goed zijn voor je ranking.
- **Widget voor andere sites (volgende versie).** Een klein insluitbaar rekenblok dat andere sites kunnen gebruiken, met een link terug naar ToeslagBuddy.
- **Delen via WhatsApp.** Die knop staat al onder elke uitkomst. Meet via het event `Berekening` hoeveel mensen hem gebruiken.
- **Social media.** Maak korte video's (TikTok, Instagram Reels, YouTube Shorts): "Zoveel zorgtoeslag krijg jij in 2027", "Deze toeslag laten 1 op de 5 mensen liggen". Plaats ze vooral in november en januari.
- **Pers.** Stuur na Prinsjesdag en in november een persbericht met een eigen rekenvoorbeeld naar regionale media en geldsites. Journalisten nemen graag een rekenhulp op in hun artikel.
- **Nieuwsbrief.** Stuur één mail als de nieuwe bedragen bekend zijn en één in november over overstappen van zorgverzekering. Zo komen bezoekers terug.

## Stap 4 – Verdienmodel aanzetten (vanaf ongeveer 1.000 bezoekers per maand)

1. Meld je aan bij Daisycon, TradeTracker en/of Awin. Zoek campagnes van zorgvergelijkers, energievergelijkers, internetaanbieders en kinderopvang.
2. Plak de trackinglinks in `site.config.js`. Ze verschijnen alleen bij een passende uitkomst: na de zorgtoeslagberekening zie je bijvoorbeeld de zorgverzekering-vergelijker.
3. Vraag AdSense aan en zet de Europese toestemmingsmelding aan.
4. **Blijf betrouwbaar.** Zet nooit advertenties tussen de invulvelden. Houd partnerlinks altijd herkenbaar als partnerlink. Een betrouwbare tool wordt vaker gedeeld en verwezen, en dat is uiteindelijk meer waard.

## Wat je elke maand bijhoudt

| Meting | Doel na 6 maanden | Doel na 12–18 maanden |
|---|---|---|
| Bezoekers per maand | 5.000 | 40.000 (jaargemiddelde) |
| Berekeningen per bezoeker | 0,6 | 0,7 |
| Klikken op partnerlinks | 3% van de berekeningen | 5% |
| Inkomsten per 1.000 bezoekers | € 5 | € 12,50 |
| Verwijzende domeinen (backlinks) | 15 | 60 |
