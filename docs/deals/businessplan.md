# Businessplan DealBuddy (werknaam)

**Stand: 8 november 2026.** Gebaseerd op [marktonderzoek.md](marktonderzoek.md), [databronnen.md](databronnen.md) en [github-features.md](github-features.md). Cijfers met **[aanname]** zijn schattingen. Controleer ze in de eerste 3 maanden met echte data.

## 1. In één zin

**DealBuddy mailt je alleen als een aanbieding écht goedkoop is, en stuurt het bewijs mee:** de prijs bij meerdere winkels, 30 dagen of meer historie, de gangbare prijs inclusief verzending en de laagste prijs van de laatste 30 dagen. Van parfum tot vliegtickets.

## 2. Positionering en USP

**Probleem.** 58% van de Nederlanders gebruikt prijsvergelijkers, maar weinig mensen doen het vaak ([Emerce](https://www.emerce.nl/nieuws/drie-vijf-nederlanders-gebruikt-prijsvergelijkingsite)). Ondertussen toonde 30% van de Europese webshops tijdens Black Friday 2025 kortingen fout ([CCPC/EC](https://www.ccpc.ie/news-and-media/news/article/2026/03/26/investigation-by-ec--ccpc-and-european-consumer-authorities-finds-1-in-3-traders-incorrectly-display-discounts-online-during-black-friday-sales)). Mensen weten dus niet of "−50%" klopt, en ze hebben geen tijd om dat te checken.

### Top 5 onderscheidende punten

| # | Wat | Waarom niemand dit al doet |
|---|---|---|
| 1 | **Bewijs-alert**: link + bewijs in de mail (≥ 2 winkels, ≥ 30 dagen, mediaan incl. verzending, laagste prijs van 30 dagen, tijdstip van de live check) | Pepper = stemmen (mening). Keepa = alleen Amazon. Tweakers = alleen tech, alert op een vaste prijs. Google Flights = "laag/normaal/hoog" zonder uitleg en zonder eigen drempel |
| 2 | **Jouw eigen kortingsdrempel ten opzichte van de gangbare prijs** ("mail bij ≥ 25% onder normaal") | Alle alerts werken met een vaste doelprijs. Die moet je zelf bedenken en wordt snel oud |
| 3 | **Nepkorting-meter**: is de "van"-prijs eerlijk? | Geen open tool gevonden in NL. Sluit aan op de 30-dagenregel |
| 4 | **Eén watchlist van parfum tot vluchten**, altijd met de totaalprijs | Concurrenten zijn per categorie (Tweakers tech, Keepa Amazon, Google Flights vluchten) |
| 5 | **Snel én geverifieerd**: eerst een antwoord uit de index, daarna live gecontroleerde prijzen. Alerts binnen 5 minuten, nooit verlopen bij het versturen | Snelle bronnen (Pepper) hebben ruis. Brede bronnen (Google) hebben geen bewijs |

Extra: **NL-focus en privacy.** Geen browserextensie (zie Honey), alleen EU-verwerkers, geen profielen, en we rangschikken nooit op commissie.

### Waarom het bewijs ons onderscheidt

| | Pepper | Keepa | Tweakers prijsalert | Google Flights | **DealBuddy** |
|---|---|---|---|---|---|
| Wie bepaalt "goede deal"? | Stemmen van leden | Jij (vaste prijs) | Jij (vaste prijs) | Google (niet uitgelegd) | **Cijfers + jouw %-drempel** |
| Meerdere winkels in het bewijs | Soms in de reacties | Nee (alleen Amazon) | Ja, niet in de alert | Ja (aggregator) | **Ja, in de mail** |
| Historie in de alert | Nee | Grafiek op de site | Op de site | 60 dagen op de site | **Grafiek + tabel in de mail** |
| Verzending meegeteld | Soms | Nee | Ja, op de site | n.v.t. | **Altijd, of "onbekend" en dan geen bewijs** |
| Live gecontroleerd vóór de mail | Nee | n.v.t. | Onbekend | Onbekend | **Ja, ≤ 10 min** |
| Nepkorting-check | Reacties | Indirect | Nee | Nee | **Ja** |

### Snelheid + bewijs als USP

- **Live zoeken:** antwoord uit de eigen index binnen 0,3 s. Daarna een stream met live-gecontroleerde prijzen binnen 4 s. Elke regel krijgt een vinkje "nu gecontroleerd 14:02" (zie [databronnen §4](databronnen.md#4-live-zoeken-snel-én-met-bewijs)).
- **Eerlijk over "de snelste":** in breedte en live vluchtprijzen winnen we niet van Google of Skyscanner. We zijn wél de snelste met een **geverifieerde** alert op **jouw** drempel. Dat meten we als KPI: "tijd tot alert" (doel: onder 5 minuten).
- **Marketingclaim** die we kunnen waarmaken: "Snel. Gecontroleerd. Met bewijs." **Niet**: "altijd de laagste prijs van Nederland".

## 3. Doelgroepen en persona's

| Persona | Wie | Wil | Categorie | Betalen? |
|---|---|---|---|---|
| **Sanne (34), slimme spaarder** | Werkt parttime, gezin, let op elke euro. Gebruikt al ToeslagBuddy | Geen gedoe, één mail als iets écht goedkoop is | Parfum, verzorging, kinderspullen, huishouden | Nee, gratis |
| **Mark (41), tech-koper** | Koopt 2–3× per jaar elektronica, kijkt op Tweakers | Bewijs dat Black Friday-korting echt is | Elektronica, gereedschap | Misschien premium |
| **Yasmin (27), weekendreiziger** | Vliegt 3–4× per jaar vanaf Eindhoven of Schiphol | Melding bij een echte lage prijs voor haar routes | Vluchten | Premium voor snelle error fares |
| **Peter (eigenaar)** | Wil zelf alerts met bewijs voordat het publiek wordt | Testen, bijsturen, vertrouwen opbouwen | Alles | — |

**Let op het merk.** ToeslagBuddy draait om vertrouwen bij mensen met een laag inkomen. Deals met affiliate-links kunnen dat vertrouwen raken. **Advies:** begin onder `/deals/` met een eigen kleur en logo. Overweeg na 6 maanden een eigen domein (bijvoorbeeld dealbuddy.nl, als dat vrij is **[controleren]**). Doe nooit sponsored deals binnen de toeslagpagina's.

## 4. Verdienmodel

| Bron | Hoe | Tarief (NL) | Wanneer |
|---|---|---|---|
| **Affiliate CPS** (percentage van de verkoop) | Klik via onze link → aankoop | ICI Paris XL 5% ([Awin](https://ui.awin.com/merchant-profile/84311)); Parfumdreams tot 12% (idem); bol per categorie, vermoedelijk 2–8% **[aanname]**; elektronica 1–3% **[aanname]** | Vanaf fase 1 |
| **Affiliate vluchten** | Travelpayouts/Aviasales | Ongeveer 1,1–1,6% van de ticketprijs **[aanname]** | Vanaf fase 1 |
| **Premium** | € 2,49 per maand of € 19 per jaar **[aanname]**: meer alerts, check elke 15 min, categorie-watch, error fares, Telegram | — | v2 |
| **B2B (later)** | Nepkorting-rapporten voor journalisten en consumentenorganisaties; anonieme prijsindex | Per rapport of licentie | Na 12 maanden, alleen met eigen (feed)data |
| **Niet doen** | Betaalde plaatsing, sponsored deals, gegevens verkopen | — | Nooit, want dat breekt het bewijsmodel |

## 5. Unit economics (met aannames)

**Per 10.000 bezoeken (SEO-productpagina's) [aanname]:**
20% klikt door naar een winkel → 2.000 kliks × 4% koopt → 80 aankopen × gemiddeld € 3,50 commissie (€ 60 bestelling × ~6%) = **€ 280** (≈ € 0,14 per klik).

**Per actieve alert-gebruiker per maand [aanname]:**
3 alerts × 30% klikt × 8% koopt × € 3,50 = **€ 0,25**. Bewijs-alerts converteren waarschijnlijk beter dan gewone banners, omdat de koopintentie hoog is.

| Scenario na 12 maanden | Bezoeken per maand | Actieve alert-gebruikers | Premium | Omzet per maand |
|---|---|---|---|---|
| Voorzichtig | 5.000 | 300 | 0 | ≈ € 215 |
| Basis | 30.000 | 2.000 | 40 | ≈ € 1.440 |
| Optimistisch | 100.000 | 8.000 | 200 | ≈ € 5.300 |

**Kosten per maand:**

| Post | Fase 0–1 | Fase 2 |
|---|---|---|
| Server voor agents + database (kleine VPS in de EU) | € 5–10 **[aanname]** | € 20–40 |
| Website (GitHub Pages, zoals nu) | € 0 | € 0 |
| Brevo | € 0 (300 per dag) | € 9–25 |
| Keepa | — | € 49 |
| SerpApi (alleen controle) | — | $ 25–75 |
| Domein, back-ups, monitoring | € 5 | € 10 |
| **Totaal** | **€ 10–15** | **€ 115–200** |

**Break-even:** fase 1 vanaf ±5 aankopen per maand. Fase 2 vanaf ±50 aankopen per maand (≈ 2.000 bezoeken per maand op productpagina's).

**Let op:** de huidige site draait statisch op GitHub Pages ([hosting.md](../hosting.md)). Agents die continu zoeken, hebben **een eigen server** nodig. GitHub Actions is daar niet voor bedoeld: de gebruiksvoorwaarden beperken het gebruik tot het softwareproject zelf, en de kortste planning is elke 5 minuten **[aanname: voorwaarden nalezen]**.

## 6. Bewijs-alert: zo werkt de mail

**Onderwerp:** `Dior Sauvage EdP 100 ml: € 79,95 (−27% t.o.v. gangbaar)`

1. **De deal:** winkel, totaalprijs incl. verzending, knop "Naar de winkel" (affiliate-link, duidelijk gemeld).
2. **Bewijs:** grafiek van 90 dagen met band, mediaan en 30-dagen-laagste (zie [github-features §3](github-features.md)).
3. **Tabel:** prijs nu bij 4–6 winkels, met verzending en het tijdstip van de meting.
4. **Feiten:** "Gangbare prijs € 109,50 (mediaan, 6 winkels, 45 dagen). Laagste 30 dagen: € 92,40. Live gecontroleerd om 14:02."
5. **Bewijsniveau:** hoog (≥ 3 winkels, ≥ 30 dagen), middel (2 winkels of één aggregator), laag → **geen** mail.
6. **Voetregel:** "We krijgen een vergoeding als je via deze link koopt. Dat verandert niet welke deals we sturen. Waarom krijg ik dit? Afmelden met één klik."

### Juridisch en ethisch

- **Feiten, geen beloftes.** "Volgens onze metingen …", met datum en tijd. Nooit "laagste prijs van Nederland".
- **Altijd de vergelijkingsbasis noemen** (mediaan, aantal winkels, periode, incl. verzending), en daarnaast de laagste prijs van 30 dagen. Zo sluiten we aan op de Omnibus-regel en het verbod op misleidende prijsvergelijkingen (art. 6:193c BW).
- **Geen nepurgentie.** Geen afteltimers. "Kan snel op" alleen als de voorraad echt laag is (Digital Fairness Act komt eraan).
- **Nepkorting is een signaal, geen beschuldiging.** Een winkel kan een correctie vragen. We reageren binnen 2 werkdagen.
- **Methodepagina** `/deals/hoe-wij-meten/`: bronnen, regels, beperkingen en hoe we verdienen.

### E-mail via Brevo (kort)

EU-aanbieder, gratis tot 300 mails per dag. Een eigen subdomein `alerts.toeslagbuddy.nl`. SPF samenvoegen met het bestaande record, DKIM toevoegen, DMARC eerst op `p=none` en daarna `quarantine`. One-click afmelden, dubbele opt-in en een klachtenpercentage onder 0,1%. Open- en kliktracking uit. Details: [databronnen §7](databronnen.md#7-e-mail-brevo).

## 7. Go-to-market en groei

| Kanaal | Aanpak | Waarom |
|---|---|---|
| **SEO: pagina per product** | `/deals/parfum/dior-sauvage-edp-100ml/` met de gangbare prijs, grafiek en "Is dit nu goedkoop?" | Zoekverkeer met koopintentie. Beslist haalt 74% van zijn verkeer uit Google |
| **SEO: pagina per route** | `/deals/vluchten/eindhoven-barcelona/` met de gangbare prijs per maand | Veel zoekverkeer op "goedkoop vliegen naar …" **[aanname]** |
| **Nepkorting-rapport** | Elk jaar rond Black Friday: "Zoveel % van de kortingen was nep" | Gratis pers (NOS, Kassa, Tweakers berichten hier elk jaar over) |
| **Bestaand ToeslagBuddy-verkeer** | Rustige, aparte tip: "Bespaar ook op aankopen" | Gratis start. Voorzichtig met het merk (zie §3) |
| **Social** | Wekelijks één "bewezen deal" met grafiek op Instagram (zie [instagram.md](../instagram.md)), altijd met #ad | Visueel sterk, deelbaar |
| **Community (later)** | Gebruikers melden **feiten** ("verlopen", "verkeerd product"), geen stemmen | De sterke kant van Pepper, zonder de ruis |

## 8. Roadmap

| Fase | Periode | Wat | Klaar als |
|---|---|---|---|
| **MVP** | Week 0–4 | Alleen de **eigenaar** krijgt alerts. 30 producten (parfum, 10 tech) + 5 routes. Bronnen fase 0 + bol + Travelpayouts. Bewijsmail via Brevo. Watchlist met %-drempel | 10 bewijs-alerts, waarvan ≥ 80% nog klopt bij het klikken |
| **v1** | Maand 2–4 | Publiek aanmelden (dubbele opt-in). SEO-pagina's. Nepkorting-meter. Live zoeken met stream. Awin en Daisycon (parfum) | 500 alert-gebruikers, eerste commissie |
| **v1.5** | Black Friday 2027 | Nepkorting-rapport, persbericht | Vermelding in ≥ 2 media |
| **v2** | Maand 5–12 | Premium, categorie-watch, error fares, Telegram, Keepa, partnerverzoeken aan winkels | 2.000 gebruikers, 40 premium, ≥ € 1.000 per maand |

## 9. KPI's

| KPI | Doel MVP | Doel v2 |
|---|---|---|
| Tijd tot alert (gezien → mail) | < 15 min | < 5 min |
| Precisie: deal klopt nog bij het klikken | ≥ 80% | ≥ 95% |
| Producten met bekende verzendkosten | ≥ 70% | ≥ 90% |
| Klikratio per alert | ≥ 20% | ≥ 30% |
| Verdiensten per klik | — | ≥ € 0,12 |
| Klachtenpercentage mail / afmeldingen per mail | < 0,1% / < 1% | idem |
| Actieve alert-gebruikers | 1 (eigenaar) | 2.000 |

## 10. Risico's en maatregelen

| Risico | Kans | Maatregel |
|---|---|---|
| Geen goedkeuring bij affiliate-netwerken (site te nieuw, geen KvK) | Middel | Eerst site + methodepagina af. Aanmelden op naam van het bedrijf. Begin met bol en Travelpayouts |
| Juridische klacht van een winkel of concurrent (databankrecht, voorwaarden) | Middel | Feeds eerst, opt-out binnen 24 uur, nette bot, geen omzeiling. Juridische check vóór de hunter-fase ([databronnen §5](databronnen.md)) |
| Verkeerd product gekoppeld (50 vs. 100 ml, tester) | Hoog | EAN + inhoud + variant. Twijfel → geen alert. "Verkeerd product"-knop |
| Prijsfout die de winkel annuleert | Middel | In de mail: "Mogelijk een prijsfout". Geen garantie geven |
| Weinig verkeer, SEO duurt lang | Hoog | Start met de eigenaar zelf. Niches (parfum, NL-routes). Pers via het nepkorting-rapport |
| Kosten van live-API's lopen uit de hand | Middel | Index eerst, live alleen top-3. Cache 10–15 min. Harde maandlimiet per API |
| Afleverbaarheid van mail | Middel | SPF/DKIM/DMARC, subdomein, dubbele opt-in, max. 1 bundel per dag |
| Merkschade ToeslagBuddy | Middel | Aparte sectie en stijl, nooit sponsored, later een eigen domein |
| Afhankelijk van één netwerk of bron | Middel | Minimaal 3 bronnen per categorie |
| Amadeus/Kiwi-achtige sluitingen van API's | Middel | Geen afhankelijkheid van één vlucht-API. Travelpayouts plus later Skyscanner |

## 11. Wat kan wel / wat kan niet

| Kan wel | Kan (nog) niet |
|---|---|
| Alerts met bewijs voor parfum, verzorging, bol-producten en NL-vluchtroutes | "Alle producten van Nederland". Dat kan zelfs Google niet volledig |
| Totaalprijs incl. verzending voor de meeste winkels (feed + eigen regels) | Altijd 100% juiste verzendkosten. Soms staat er "onbekend" |
| Vluchtprijzen uit de cache (2–7 dagen oud) als basis voor de "gangbare prijs" | Echte live vluchtprijzen van alle airlines (Amadeus is gestopt, Kiwi alleen op uitnodiging, Skyscanner vraagt veel verkeer) |
| Live controle van de top-3 vlak voor een alert | Elke zoekopdracht live langs honderden winkels (te duur en juridisch riskant) |
| Nette, snelle crawler op openbare pagina's en endpoints | CAPTCHA's omzeilen, IP's roteren, inloggen, Tweakers/Google/Pepper scrapen |
| Nepkorting-signaal met eigen metingen | Een winkel publiek beschuldigen. Dat doet alleen de ACM |
| Gratis starten (€ 10–15 per maand) | Snel € 5.000 per maand verdienen. Reëel is € 200–1.500 per maand na 12 maanden |

## 12. Eerlijke inschatting

- **Technisch haalbaar:** ja. Feeds, JSON-LD, Travelpayouts en Brevo zijn genoeg voor een goede MVP met bewijs-alerts.
- **Commercieel:** affiliate is een volumespel. Zonder flink SEO-verkeer blijft de omzet klein. **Kans op ≥ € 1.000 per maand na 12 maanden: ongeveer 20–25% [aanname].** De kans is groter als het nepkorting-rapport pers oplevert.
- **Grootste waarde op korte termijn:** de eigenaar bespaart zelf, en het bewijsmodel is een sterk, uniek verhaal voor pers en vertrouwen.

## 13. Wat de eigenaar moet doen

| # | Actie | Tijd | Kosten |
|---|---|---|---|
| 1 | Brevo-account aanmaken. SPF, DKIM en DMARC bij TransIP instellen (subdomein `alerts.`) | 1 uur | € 0 |
| 2 | bol.com partnerprogramma + productfeed (FTP-gegevens) | 30 min | € 0 |
| 3 | Travelpayouts-account + Aviasales-programma, API-token | 30 min | € 0 |
| 4 | Awin, Daisycon en TradeTracker: aanmelden met KvK, daarna per parfumwinkel aanmelden | 2 uur + wachten | € 0 (Awin mogelijk een kleine borg **[aanname]**) |
| 5 | Kleine EU-server (VPS) voor de agents en de database | 1 uur | € 5–10 per maand |
| 6 | Alle sleutels als geheimen opslaan, nooit in de repository | — | — |
| 7 | Watchlist en kortingsdrempels kiezen (bijv. parfum 25%, tech 15%, vluchten 30%) | 30 min | — |
| 8 | 1 uur advies van een IT-jurist over de crawler en de nepkorting-labels | 1 uur | € 150–300 **[aanname]** |
| 9 | Na 4 weken: beslissen over publiek maken en budget voor fase 2 (± € 150 per maand) | — | — |
