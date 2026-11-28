# Concurrentie en behoeften: wat mensen nodig hebben (november 2026)

*Onderzocht op 28 november 2026. Opdracht van de eigenaar: "de mooiste en meest functionele website in dit vakgebied van Nederland; onderzoek en bekijk de verschillen; begrijp exact wat mensen nodig hebben".*

## Samenvatting: de 10 belangrijkste aanbevelingen, in volgorde

1. **Bij elke uitkomst één duidelijke volgende stap**, met de gratis route ("aanvragen is gratis op toeslagen.nl, wij vragen nooit je DigiD of BSN"). Zo'n 50.000 mensen per jaar betalen nu € 50–60 aan bemiddelaars die hoog in Google staan (IBTD). *Impact hoog, moeite S.*
2. **Bedragen voor 2027 naast 2026** in alle rekenhulpen, vóór de drukte van december. De motor rekent nu alleen met 2026 (`src/calc/params.js`). *Hoog, M.*
3. **Voorschotcheck voor iedereen**, niet alleen voor zzp'ers: "wat staat nu in Mijn toeslagen?" naast "wat verwachten we?". Eén op de vijf huishoudens met problematische schulden heeft schuld bij Dienst Toeslagen. *Hoog, M.*
4. **Leesbaar voor ouderen en laaggeletterden**: knop voor grotere letters, randen van invoervelden met genoeg contrast (nu 2,0:1, de norm is 3:1), hints donkerder, en een rustige modus met één vraag per scherm op mobiel. *Hoog, S–M.*
5. **Op de home een snelcheck van 3 vragen: "Kan ik recht hebben?"** 20% denkt ten onrechte geen recht te hebben op zorgtoeslag (Universiteit Leiden). *Hoog, S.*
6. **Uitkomst als spiekbriefje bewaren, printen of doorsturen**, zonder account: precies wat je straks in Mijn toeslagen invult. *Hoog, M.*
7. **Vertrouwen zichtbaar maken**: wie zit erachter, "geen overheid", "gecontroleerd op <datum>" bij elk bedrag, en echte hulplijnen (Geldfit 0800-8115, BelastingTelefoon, Informatiepunt Digitale Overheid). *Hoog, S.*
8. **Familie: delen met broers en zussen moet één link zijn**, geen versleuteld bestand. Begin ook met drie situaties: "ouder gaat naar verpleeghuis", "ouder heeft hulp thuis nodig", "ouder is overleden". *Hoog, L.*
9. **Besparen: een check "Is dit echt een deal?"**. Je plakt een link en ziet de wettelijke laagste prijs van 30 dagen naast onze gangbare prijs van 90 dagen. ACM: 75% van de onderzochte winkels vermeldde kortingen onjuist. *Midden–hoog, M.*
10. **Pro: proef van 30 dagen, exports uit Bizon, OnView en Fineaid automatisch inlezen, en een bewijs-PDF per controle.** Nu is de proef 7 dagen. *Midden, M.*

---

## 1. Methode en beperkingen

- **Pagina's van concurrenten kon ik niet zelf openen.** In deze sessie is het netwerk afgesloten voor alle onderzochte sites (belastingdienst.nl, nibud.nl, hetcak.nl, tweakers.net en de rest). Alles hieronder komt uit **zoekresultaten en de samenvattingen daarvan**. Bij elke bewering staat de URL van de bron.
- **Hoe de sites eruitzien op mobiel en desktop heb ik daarom niet gezien.** Waar de kolom "Uiterlijk" leeg is, staat *niet bekeken*. In §7 staat een protocol van 30 minuten om dat zelf te doen, of om het met een browserscript te doen zodra deze hosts zijn toegestaan.
- Over de eigen site heb ik wel direct uitspraken gedaan. Die komen uit de code (`src/site`, `public/js`, `src/calc`) en uit berekeningen met de eigen rekenmotor.
- Cijfers staan er alleen met een bron. Wat ik niet kon bevestigen, staat als **niet gevonden**. Lees dit rapport samen met [markt-en-valkuilen.md](markt-en-valkuilen.md) (september 2026) en [familieregie/onderzoek.md](../familieregie/onderzoek.md). Wat daar al staat, herhaal ik hier alleen kort.

---

## 2. Concurrenten per onderdeel

### 2a. Toeslagen

| Aanbieder | Goed in | Mist | Uiterlijk | Bron |
|---|---|---|---|---|
| **Proefberekening Dienst Toeslagen** | Officieel, alle vier de toeslagen, ook voor 2026. Eerlijk over de grenzen: niet geschikt bij wonen in het buitenland (kgb en kot) of bij bijzonder vermogen, en bij huurtoeslag soms te laag als een huisgenoot langer dan een jaar weg is. Aparte hulpmiddelen voor "Heb ik een toeslagpartner?" en voor het inkomen dat je moet opgeven | Losse hulpmiddelen: je moet zelf weten welk je nodig hebt. Geen gemeentelijke regelingen. Na de proefberekening moet je apart aanvragen in Mijn toeslagen. De app werkt alleen met de DigiD-app | niet bekeken | [rekenhulpen/toeslagen](https://belastingdienst.nl/rekenhulpen/toeslagen/), [hulpmiddel](https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/hulpmiddel-proefberekening-toeslagen), [toeslagpartner](https://www.belastingdienst.nl/rekenhulpen/toeslagpartner/), [App Toeslagen](https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/app-toeslagen) |
| **Bereken Je Recht** (Nibud en Stimulansz) | Landelijke én gemeentelijke regelingen in één overzicht; gemeenten zetten hun minimabeleid erin | Werkt alleen goed als jouw gemeente meedoet (de voorganger had 144 gemeenten). Vooral ingericht voor gemeenten en wijkteams | niet bekeken | [Binnenlands Bestuur](https://www.binnenlandsbestuur.nl/sociaal/stimulansz/nibud-en-stimulansz-lanceren-bereken-je-recht), [Krimpen](https://www.binnenlandsbestuur.nl/sociaal/stimulansz/krimpen-aan-den-ijssel-blij-met-bereken-je-recht) |
| **VoorzieningenWijzer / ING Toeslagen Check** | Landelijk + lokaal + besparen, vaak met een adviseur; voor ING-klanten in de bankapp | Via instanties of bank; niet voor iedereen | niet bekeken | zie [markt-en-valkuilen §1a](markt-en-valkuilen.md) |
| **Geldfit** | Gratis en anoniem hulp: bellen (0800-8115), WhatsApp en chat. "Potjes-check" om te zien of je recht hebt op regelingen. De Belastingdienst verwijst zelf naar Geldfit | Geen eigen berekening per toeslag gevonden | niet bekeken | [Belastingdienst: hulp](https://www.belastingdienst.nl/wps/wcm/connect/nl/inkomen/content/kan-ik-hulp-krijgen), [KHN](https://khn.nl/nieuws/potjes-check-geldfit-voor-jouw-huishouden) |
| **Wijzer in geldzaken** | Korte checklists als pdf ("10 dingen om te regelen als je 18 wordt", checklist overlijden) | Geen eigen rekenhulp gevonden; verwijst naar de proefberekening | niet bekeken | [18 worden](https://www.wijzeringeldzaken.nl/18-worden/10-dingen-die-je-moet-regelen-als-je-18-wordt/10-dingen-om-te-regelen-als-je-18-wordt.pdf), [checklist overlijden](https://www.wijzeringeldzaken.nl/overlijden/checklist-overlijden/checklist-overlijden.pdf) |
| **Rekensites** (RekenmachinePro, deonlinerekenmachine, calcforlife, teamzlab) | Snel, staan hoog in zoekresultaten | Veel rekenen nog met 2026 terwijl mensen nu naar 2027 zoeken. Advertenties; geen afzender of controle zichtbaar in de zoekresultaten | niet bekeken | [RekenmachinePro](https://rekenmachinepro.nl/financien/zorgtoeslag-berekenen/), [deonlinerekenmachine](https://deonlinerekenmachine.nl/zorgtoeslag-2026-berekenen/), [calcforlife](https://calcforlife.com/nl/zorgtoeslag-berekenen/) |
| **berekenhet.nl** | — | **Niet gevonden** in de zoekresultaten | niet bekeken | — |
| **Zorgwijzer** | Snel met verwachte bedragen voor 2027 (zorgtoeslag, inkomens- en vermogensgrens) en "regel dit vóór 1 januari" | Commerciële vergelijker; artikelen, geen check | niet bekeken | [Zorgtoeslag 2027](https://www.zorgwijzer.nl/zorgverzekering-2027/zorgtoeslag-stijgt-in-2027-zoveel-krijg-je-erbij), [vóór 1 januari](https://www.zorgwijzer.nl/zorgverzekering-2027/raak-je-zorgtoeslag-niet-kwijt-in-2027-dit-regel-je-voor-1-januari) |
| **Betaalde aanvraagsites** (Toeslagenaanvragen.net € 39,50, Toeslagenaanvraag.nl € 34, Jouwtoeslag.info € 39,50) | Staan hoog in Google; ontzorgen | Laten betalen voor iets wat gratis is. Geven volgens de IBTD vaak onjuiste informatie, wat leidt tot hogere terugvorderingen. **Dit is de concurrent om het zoekverkeer**, en ToeslagBuddy moet zichtbaar het tegendeel zijn | niet bekeken | [Binnenlands Bestuur](https://www.binnenlandsbestuur.nl/sociaal/duizenden-burgers-betalen-onnodig-voor-aanvraag-toeslag), [Radar](https://radar.avrotros.nl/artikel/let-op-als-je-toeslag-aanvraagt-deze-websites-laten-je-onnodig-betalen-53964), [Kassa](https://www.bnnvara.nl/kassa/artikelen/burgers-betalen-onnodig-voor-aanvraag-toeslagen-zo-doe-je-dit-wel-gratis) |

### 2b. Familie

| Aanbieder | Goed in | Mist | Uiterlijk | Bron |
|---|---|---|---|---|
| **CAK** (rekenhulp eigen bijdrage Wlz) | De officiële proefberekening; telefoon 0800-0087; betalingsregeling mogelijk | Legt niet uit wat het betekent voor de familie (huis verkopen, schenken, twee jaar terugkijken) | niet bekeken | [CAK Wlz](https://www.hetcak.nl/regelingen/zorg-vanuit-de-wlz), [CAK gegevens](https://hetcak.nl/zorg-vanuit-de-wlz/welke-gegevens-bepaalt-cak-eigen) |
| **Consumentenbond** (Wlz, erfbelasting) | Uitleg met rekenvoorbeelden en een stappenplan van 5 stappen voor erfbelasting | Stappenplan werkt alleen zonder testament; deels alleen voor leden | niet bekeken | [eigen bijdrage Wlz](https://www.consumentenbond.nl/belastingaangifte/eigen-bijdrage-wlz), [erfbelasting berekenen](https://www.consumentenbond.nl/erven-schenken/erfbelasting-berekenen) |
| **Regelhulp.nl** (VWS, beheerd door het CAK) | Wegwijzer voor zorg en ondersteuning. Een toegankelijkheidstoets (januari 2024) vond de site "grotendeels" toegankelijk, informatief en duidelijk geschreven | Uit eigen gebruikersonderzoek: mensen met een migratieachtergrond gebruiken Regelhulp "niet of nauwelijks". Wegwijzer, geen gereedschap | niet bekeken | [gebruikersonderzoek 2024](https://www.Regelhulp.nl/binaries/regelhulp/documenten/rapporten/2024/03/06/gebruikersonderzoek/Rapport+Regelhulp+def.pdf), [toegankelijkheid](https://www.Regelhulp.nl/binaries/regelhulp/documenten/rapporten/2023/11/8/toegankelijkheidsonderzoek-regelhulp/Toegankelijkheidsonderzoek+Regelhulp+november+2023.pdf) |
| **Rijksoverheid: overlijden** | Persoonlijk overzicht na ongeveer 10 vragen, een checklist, een video, en telefoon 1400 | Lijst, geen dossier; je deelt niets met familie; niets loopt door na de checklist | niet bekeken | [rijksoverheid.nl/overlijden](https://rijksoverheid.nl/overlijden), [checklist](https://www.rijksoverheid.nl/vraag-en-antwoord/overlijden/checklist-bij-overlijden), [video](https://www.rijksoverheid.nl/documenten/videos/2024/04/09/video-regelen-overlijden-naaste) |
| **Belastingdienst: erfbelasting berekenen** | Officiële rekenhulp; "de aangifte is leidend" | Alleen belasting, niet "wie erft wat" en geen termijnen voor de familie | niet bekeken | [rekenhulpen/erfbelasting](https://www.belastingdienst.nl/rekenhulpen/erfbelasting/), [wettelijke verdeling](https://www.belastingdienst.nl/wps/wcm/connect/nl/erfbelasting/content/wettelijke-verdeling) |
| **Notaris.nl, ANBO, ABN AMRO** | Checklists na overlijden (notaris: meld het direct bij de bank) | Statische pdf's | niet bekeken | [notaris.nl](https://notaris.nl/stream/checklist-wat-moet-ik-regelen-na-een-overlijden), [ANBO](https://anbo-pcob.nl/documents/1059/2021-04-28-Checklist_hoe_te_handelen_na_overlijden_definitief-1.pdf), [ABN AMRO](https://www.abnamro.nl/nl/prive/themas/nu-regelen-voor-later/nalaten.html) |
| **Salderen-tools** (Pure Energie, verkopers van thuisbatterijen) | Rekenen het einde van salderen door (Pure Energie: meestal € 120–360 per jaar meer) | Komen van partijen die iets verkopen; Milieu Centraal is kritischer (terugverdientijd ongeveer 8 jaar met terugleverkosten, 5 zonder) | niet bekeken | [Solar Magazine](https://solarmagazine.nl/nieuws-zonne-energie/i44881/einde-salderingsregeling-kost-zonnepaneeleigenaar-120-tot-360-euro-per-jaar-nieuwe-tool-pure-energie-toont-forse-verschillen), [NOS](https://nos.nl/l/2519563), [Consumentenbond](https://www.consumentenbond.nl/zonnepanelen/zonnepanelen-2027) |
| **MantelzorgNL, Caren, Zorggenoot, Nalenta** | Zie [familieregie/onderzoek.md §5](../familieregie/onderzoek.md) | Niemand biedt één gedeelde plek voor geld, post, termijnen en verantwoording | niet bekeken | idem |

### 2c. Besparen

| Aanbieder | Goed in | Mist | Uiterlijk | Bron |
|---|---|---|---|---|
| **Tweakers Pricewatch** | Grootste vergelijker voor elektronica. Winkels leveren feeds en de lijsten worden vier keer per uur bijgewerkt. Volgens een beschrijving van derden staan verzendkosten en levertijd per aanbieding | Een prijsgrafiek en prijsalerts heb ik in de bronnen **niet bevestigd gevonden**. Vooral tech | niet bekeken | [DPG Media](https://dpgmedia.h5mag.com/2022-en/pricewatch), [Firecrawl-beschrijving](https://www.firecrawl.dev/alexandria/agents/providers/tweakers-net) |
| **Kieskeurig** | Prijsalert per maximumprijs (sinds 2017), pagina "prijsdalers" met filter op %. De Consumentenbond-prijsalert (alleen voor leden) gebruikt Kieskeurig-data met prijshistorie | Of Kieskeurig zelf een grafiek toont, is niet bevestigd | niet bekeken | [Twinkle 2017](https://twinklemagazine.nl/2017/01/nieuwe-prijsalert-kieskeurig.nl-mailt-koopjes/), [Consumentenbond prijsalert](https://www.consumentenbond.nl/uitgelicht/prijsalert) |
| **Keepa, camelcamelcamel, Prijzenvolger** | Prijsgrafieken voor Amazon en bol.com (extensie) | Keepa ondersteunt Amazon.nl niet; een extensie installeren is te moeilijk voor veel mensen | niet bekeken | [ID.nl](https://id.nl/huis-en-entertainment/computer-en-gaming/software/zo-houd-je-met-keepa-de-prijzen-op-amazon-in-de-gaten) |
| **Google Flights** | Label "laag / normaal / hoog" ten opzichte van eerdere prijzen, een datumraster (goedkoop groen, duur rood), een prijsgrafiek, alerts ook voor flexibele data. Eerlijk: "trends zijn geen garantie" | Geen Nederlandse uitleg gevonden; Google-account nodig | niet bekeken | [Google blog](https://blog.google/products-and-platforms/products/travel/how-to-find-the-best-deal-on-your-next-flight/), [9to5Google](https://9to5google.com/2023/08/28/google-flights-cheapest-time/) |
| **Skyscanner** | "Hele maand" en "Goedkoopste maand" zoeken | Een prijsalarm werkt met vaste route en vaste data en vraagt om in te loggen | niet bekeken | [Skyscanner NL](https://www.skyscanner.com/us/nl-nl/usd/vluchten), [Hele maand](https://www.skyscanner.ie/news/tips/tips-and-tools-flight-prices-whole-month) |
| **Pricewise** | Vergelijkt energie, verzekeringen en telecom (Trustpilot 4,2). **Geen productprijzen**, dus geen concurrent van /deals/; wel relevant voor de partnerblokken bij Toeslagen | — | niet bekeken | [Pricewise](https://pricewise.nl/blog/persberichten/vergelijken), [Trustpilot](https://fr-be.trustpilot.com/review/pricewise.nl) |
| **Beslist** | — | **Niet onderzocht**: geen bruikbare resultaten | niet bekeken | — |

### 2d. Professionals (bewindvoering)

| Aanbieder | Goed in | Mist | Bron |
|---|---|---|---|
| **Bizon, eStrategy, Fineaid** | Staan bij de Rechtspraak als leveranciers met een werkende koppeling op het Aansluitpunt Toezicht (digitale verantwoording aan de rechter). Stratech stopt per 2025 | Of ze een portefeuille screenen op gemiste toeslagen: **niet gevonden** | [Rechtspraak: digitaal toezicht](https://www.rechtspraak.nl/voor-advocaten-en-juristen/reglementen-procedures-en-formulieren/civiel/curatele-bewind-en-mentorschap/digitaal-toezicht) |
| **OnView** (Goirle) | Won in 2023 een aanbesteding voor schuldhulp en budgetbeheer (regio Lekstroom) | Prijzen en toeslagenmodule niet gevonden | [TED 2023](https://ted.europa.eu/en/notice/158627-2023/pdf) |
| **Centric (met Stratech)** | Werken sinds 2020 samen aan schuldhulp, bewind en budgetbeheer | Geen apart bewindvoeringspakket bevestigd | [Binnenlands Bestuur](https://www.binnenlandsbestuur.nl/digitaal/centric/totaaloplossing-voor-schuldhulpverlening) |
| **Civision** | Is een pakket van PinkRoccade voor gemeenten (Samenlevingszaken), **geen** bewindvoeringssoftware gevonden. "BAS": **niet gevonden** | — | [Softwarecatalogus](https://www.softwarecatalogus.nl/pakketversies/doelgroep/gemeente-1419/standaarden/iJw%20voor%20gemeenten%202%252E3/supported_technologies/premise) |
| **Belastingdienst** | Bewindvoerders loggen in met eHerkenning ("Inloggen voor iemand anders"). Fiscale intermediairs werken via SBR-software met Serviceberichten Toeslagen, per cliënt en per jaar gemachtigd | Per cliënt, geen screening van de hele portefeuille | [Inloggen Mijn toeslagen](https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/uitleg-inloggen-op-dienst-toeslagen), [AFAS-help](https://help.afas.nl/help/NL/SE/Tax_Surtax.htm) |

**Conclusie Pro:** het gat uit september staat nog. Ik vond geen tool die een hele portefeuille in één keer screent. De pakketten (Bizon, Fineaid, eStrategy) hebben wel de data en de koppeling met de rechter. Pro moet daarom **naast** die pakketten werken (export erin, actielijst en bewijs eruit), niet ertegenover.

### 2e. Zzp

| Aanbieder | Goed in | Mist | Bron |
|---|---|---|---|
| **Moneybird, Jortt, e-Boekhouden** | Boekhouding, de bron van de winst tot nu toe. Moneybird stopte met gratis; Jortt Starter is een gratis factuurpakket zonder boekhouding; e-Boekhouden is 15 maanden gratis voor starters | **Geen** waarschuwing voor toeslagen gevonden | [nieuws.nl](https://nieuws.nl/economie/gratis-boekhouden-wordt-zeldzaam-moneybird-stopte-ermee-rompslomp-gaat-per-factuur-rekenen) |
| **Belastingdienst** (toeslagen.nl/inkomen, pagina over wisselend inkomen) | Rekenhulp voor het inkomen; het advies om dit in de loop van het jaar te controleren | Je moet er zelf aan denken; geen herinnering of koppeling | [wisselend inkomen](https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/ik-heb-een-wisselend-inkomen-heb-ik-recht-op-toeslagen) |
| **Knab, MijnZZP** | Artikelen "zo schat je je inkomen goed in" | Geen bewaker | [Knab](https://bieb.knab.nl/ondernemen/toeslagen-in-2026-zo-schat-je-als-zzper-je-inkomen-goed-in), [MijnZZP](https://www.mijnzzp.nl/Weblogs/Van-de-redactie/Check-je-inkomen-als-je-als-zzp-er-toeslagen-ontvangt) |
| **Kabinet** | Sinds 2025 3% extra indexatie van het voorschot; een "voorzichtig voorschot" wordt verkend, met een pilot gepland voor 2026 | Werkt nog niet op maat | [Rijksoverheid dec. 2024](https://www.rijksoverheid.nl/actueel/nieuws/2024/12/05/kabinet-neemt-maatregelen-om-hoge-terugvorderingen-van-toeslagen-te-voorkomen) |

---

## 3. Wat mensen nodig hebben, maar niet krijgen

| # | Behoefte | Signaal (met bron) | Wat dit vraagt van ToeslagBuddy |
|---|---|---|---|
| B1 | **Weten dát je recht hebt.** Veel mensen denken ten onrechte dat ze niets krijgen | 20% denkt ten onrechte geen recht te hebben op zorgtoeslag, 16% op kindgebonden budget. Persoonlijke communicatie helpt ([Universiteit Leiden 2023](https://www.universiteitleiden.nl/nieuws/2023/06/waarom-vragen-veel-mensen-geen-toeslag-aan---wanneer-wel)). 27% van de huishoudens weet niet of ze recht hebben ([Kassa/Nibud](https://www.bnnvara.nl/kassa/artikelen/toeslagen-blijven-onnodig-liggen-waar-heb-jij-recht-op)). Een kwart van de mbo'ers zonder zorgtoeslag weet niet wat het is ([NOS/Nibud](https://nos.nl/artikel/2409307-nibud-mbo-ers-lopen-honderden-euro-s-mis-door-financiele-onwetendheid)) | Een snelcheck die geruststelt ("de meeste mensen met jouw inkomen krijgen dit"); geen jargon vooraf |
| B2 | **Geen verrassing achteraf** (terugvordering) | IBTD (april 2026): burgers krijgen vaak onverwacht een terugvordering, en bij de aanvraag wordt niet actief naar vermogen gevraagd ([IBTD](https://www.inspectiebtd.nl/actueel/nieuws/2026/04/30/aanvraag-toeslagen-veel-gaat-goed-maar-de-regels-zijn-te-complex)). Ongeveer 726.000 huishoudens hebben problematische schulden; één op de vijf heeft schuld bij Dienst Toeslagen ([NOS](https://nos.nl/l/2587625), [Taxlive](https://www.taxlive.nl/nl/documenten/nieuws/terugbetaling-toeslagen-leidt-steeds-vaker-tot-problemen/)). 40% moest ooit zorgtoeslag terugbetalen; 39% van hen kon dat niet in één keer ([Radar](https://radar.avrotros.nl/artikel/zorgtoeslag-terugbetalen-je-bent-niet-de-enige-en-dit-is-de-reden-62950)) | Een voorschotcheck voor iedereen, en het vermogen altijd uitvragen met uitleg |
| B3 | **Gratis en veilig aanvragen, zonder tussenpersoon** | ~50.000 mensen per jaar betalen onnodig € 50–60; 85% gaat over zorgtoeslag; bemiddelaars staan hoog in Google ([Binnenlands Bestuur](https://www.binnenlandsbestuur.nl/sociaal/duizenden-burgers-betalen-onnodig-voor-aanvraag-toeslag)). Er gaan nepsms'jes en -mails rond; Dienst Toeslagen heeft sinds 1 mei 2026 een nieuw rekeningnummer ([Belastingdienst](https://www.belastingdienst.nl/wps/wcm/connect/nl/contact/content/voorbeelden-van-valse-whatsapp-berichten-sms-berichten-mails-en-brieven)). Angst voor online oplichting houdt mensen tegen ([Universiteit Leiden](https://www.universiteitleiden.nl/nieuws/2024/02/waarom-laten-kwetsbare-groepen-toeslagen-liggen-onderzoek-maakt-kans-op-scriptieprijs)) | Op elke rekenhulp zeggen dat we niets aanvragen, niets kosten en nooit om je DigiD vragen. Een stappenplan naar het echte toeslagen.nl |
| B4 | **Begrijpen wat de overheid bedoelt** | Ombudsman: "Nummer één: ik krijg een bericht van de overheid en ik begrijp het niet". 25.000 klachten en signalen in 2025 ([NOS](https://nos.nl/l/2615252), [Tweede Kamer](https://www.tweedekamer.nl/nieuws/kamernieuws/nationale-ombudsman-biedt-jaarverslag-2025-aan)) | B1-taal, voorlezen (staat er al), brieven uitleggen (in Familie) |
| B5 | **Hulp van een mens als het digitaal niet lukt** | 75-plussers gebruiken overheidswebsites het minst (63%); 42% van de gebruikers van de digitale overheid liep tegen problemen aan (2022). Er zijn 860.000 mensen van 66 tot 75 jaar met beperkte taal-, reken- of digitale vaardigheden (Kamerbrief 2025) ([CBS 2023](https://www.cbs.nl/nl-nl/nieuws/2023/38/9-op-de-10-mensen-gebruiken-digitale-overheid), [Computable/CBS](https://www.computable.nl/?p=340765)) | Bij elke uitkomst telefoonnummers en adressen van hulp dichtbij: BelastingTelefoon 0800-0543, Geldfit 0800-8115, Informatiepunt Digitale Overheid |
| B6 | **Mantelzorg: minder papierwerk en versnippering** | 436.000+ mantelzorgers zijn zwaar of overbelast, 27% meer dan twee jaar eerder (Alzheimer Nederland, MantelzorgNL, Werk&Mantelzorg). Bijna 60% van wie mantelzorg krijgt, krijgt hulp bij geld en administratie (CBS). Werkende mantelzorgers willen vooral minder administratieve last (SCP, juni 2026) ([CBS](https://www.cbs.nl/nl-nl/longread/statistische-trends/2026/welke-55-plussers-ontvangen-mantelzorg-en-thuiszorg-?onepage=true), [VU/SCP](https://vu.nl/nl/nieuws/2026/werkende-mantelzorgers-hebben-meer-nodig-dan-flexibiliteit-op-het-werk), [Eerste Kamer: kerncijfers](https://www.eerstekamer.nl/brief_in/20260521/mantelzorg_in_beweging_kerncijfers/f=/vmxpdy8r4j5d.pdf)) | Familie: samen werken zonder gedoe, vooraf ingevulde termijnen, één plek |
| B7 | **Echte korting herkennen** | ACM: 75% van de onderzochte winkels vermeldde kortingen onjuist ([ACM](https://www.acm.nl/nl/publicaties/acm-ziet-nog-veel-misleidende-kortingen-en-adviseert-eerst-checken-dan-bestellen)). EU-controle (maart 2026): 30% van 314 webwinkels deed het fout rond Black Friday ([Europese Commissie](https://commission.europa.eu/news-and-media/news/eu-check-reveals-misleading-sales-practices-online-2026-03-26_nl)). Consumentenbond (18 november 2026): honderden nepaanbiedingen bij Amazon (mei–oktober 2026); deal-labels zonder echte korting maken echte koopjes moeilijker te vinden ([Consumentenbond](https://www.consumentenbond.nl/nieuws/2026/consumentenbond-webwinkels-omzeilen-kortingsregels-met-schijnvoordeel)). Een van-prijs moet de laagste prijs van de afgelopen 30 dagen zijn ([Consumentenbond 2025](https://www.consumentenbond.nl/nieuws/2025/black-friday-waarschuwing-nog-altijd-veel-nepaanbiedingen)) | Laat de wettelijke 30-dagenprijs zien naast onze 90-dagenprijs; een oordeel in één woord |
| B8 | **Op tijd weten wat er verandert** | Wie een alleenstaande ouder is in de bijstand en een kind heeft dat 18 wordt en in het hoger onderwijs zit, verliest bijna € 720 per maand ([NOS/Nibud](https://nos.nl/l/2598288)). Ruim 40% van de alleenstaande ouders maakt zich zorgen over de financiële toekomst ([NJi/CBS](https://www.nji.nl/kennis/armoede-en-geldzorgen/eenoudergezinnen-en-armoede)). Per 2027 veranderen de regels voor toeslagpartners ([Zorgwijzer](https://www.zorgwijzer.nl/zorgverzekering-2027/zorgtoeslag-stijgt-in-2027-zoveel-krijg-je-erbij)) | Scenario's "wat verandert er als…", plus een herinnering per mail of in je agenda (.ics) |

**Kern:** mensen missen niet nog een rekenmachine. Ze missen **zekerheid** (klopt dit, en voor welk jaar?), **een volgende stap** (wat doe ik nu, gratis en veilig?) en **bescherming tegen later** (terugbetalen, veranderingen, nepkortingen). Daarin kan ToeslagBuddy de beste zijn. Aan de berekening zelf kan het zich nauwelijks onderscheiden.

---

## 4. Aanbevelingen

Impact: hoog, midden of laag. Moeite: S = minder dan een dag, M = een paar dagen, L = een week of meer.

### 4a. Visueel ontwerp

Wat ik in de code zag (`src/site/ontwerp.css`):

- De basistekst is 18 px met regelafstand 1,6, in Figtree. Dat is goed.
- Gewone tekst heeft een contrast van 14,2:1. Hints en kleine tekst (`--zacht`) halen 6,0:1. Dat voldoet aan AA, maar niet aan 7:1.
- **De randen van invoervelden en keuzeknoppen (`--lijn-sterk` #b9b0a1) hebben maar 2,0:1 contrast op de achtergrond, en 2,15:1 op wit. WCAG 1.4.11 vraagt 3:1.**
- Invoervelden en keuzeknoppen zijn 48 px hoog. Een paar knoppen in de kop zijn 44 px.

| # | Aanbeveling | Waarom (bron) | Impact | Moeite |
|---|---|---|---|---|
| A1 | **Randen van velden en keuzeknoppen donkerder** (bijv. #8a8172, minstens 3:1) en een focusring die je altijd ziet (nu `outline: none` met een lichte schaduw) | Ouderen zien minder contrast: een 80-jarige heeft veel minder contrastgevoeligheid dan een 20-jarige ([W3C Older Users](https://www.w3.org/WAI/older-users/)); WCAG 1.4.11 | Hoog | S |
| A2 | **Knop "Groter lezen" (A / A+ / A++)** in de kop, onthouden per bezoeker. Test ook met browserzoom op 200% zonder horizontaal scrollen | 75+ heeft minder digitale vaardigheden; laat mensen de grootte zelf kiezen ([Dedicon-gids](https://dedicon.nl/sites/default/files/2025-01/GIDS_2_Doe_mee-1.pdf), [CBS](https://www.cbs.nl/nl-nl/nieuws/2026/14/bedrijven-met-digitalisering-in-top-3-eu-nederlanders-digitaal-meest-vaardig)) | Hoog | S |
| A3 | **Hints en kleine tekst minstens 16 px en 7:1** (nu max(.94rem, 15px) en 6:1). Juist hints bevatten de cruciale uitleg ("wat is toetsingsinkomen?") | Klachten over laag contrast staan bovenaan bij slechtzienden en ouderen ([internetconsultatie](https://internetconsultatie.nl/experimentennieuwstembiljet/reactie/41178/bestand), [WebAIM](https://webaim.org/articles/visual/lowvision)) | Midden | S |
| A4 | **Rustige modus op mobiel: één vraag per scherm** voor de complete check, met "vorige" en "volgende" en een voortgangsbalk ("vraag 3 van 8"). Desktop houdt het lange formulier | Mensen met weinig tijd of weinig leesvaardigheid haken af op lange formulieren [aanname: testen met persona's P1 en P2] | Hoog | M |
| A5 | **Uitkomst = één groot bedrag + één zin + één knop** ("Vraag gratis aan op toeslagen.nl"). Uitleg en berekening klap je uit. Na "Bereken" springt de focus naar de uitkomst | Ombudsman: mensen begrijpen het bericht niet (B4) | Hoog | S |
| A6 | **Bedragen altijd in Figtree met vaste cijferbreedte, nooit in Fraunces.** Fraunces alleen voor koppen van minstens 1,25 rem | Een serif met zachte vormen is op kleine maten minder goed leesbaar [aanname; controleren met P1] | Laag | S |
| A7 | **Vertrouwensstrook boven elke rekenhulp:** "Geen overheid · Gratis · We vragen nooit je DigiD of BSN · Wat je invult blijft op je telefoon". Geen huisstijl die op de Rijksoverheid lijkt | Phishing en betaalde bemiddelaars (B3); vertrouwen na de toeslagenaffaire ([markt-en-valkuilen](markt-en-valkuilen.md), valkuil 4) | Hoog | S |
| A8 | **Rust:** geen pop-ups, geen video die vanzelf start, geen carrousels, geen aftelklokken (ook niet bij deals); maximaal twee accentkleuren per scherm | Doelgroep met stress (geldzorgen, rouw, mantelzorg) | Midden | S |
| A9 | **Printversie van de uitkomst** (zwart op wit, met datum, rekenjaar en bron) | Ouderen en mantelzorgers nemen papier mee naar het Informatiepunt of naar familie | Midden | S |
| A10 | **Iconen altijd met tekst** en minstens 48 px aanraakvlak, ook voor de knoppen in de kop (nu 44 px) | Ouderen en mensen met trillende handen | Laag | S |

### 4b. Functies per onderdeel

**Toeslagen**

| # | Aanbeveling | Waarom | Impact | Moeite |
|---|---|---|---|---|
| T1 | **Jaarkeuze 2026 / 2027** in alle rekenhulpen, met 2027 als standaard vanaf 1 december. Laat de verschillen zien ("in 2027 krijg je € X meer of minder") | Mensen zoeken nu naar 2027; rekensites rekenen nog met 2026; per 2027 veranderen de regels voor toeslagpartners | Hoog | M |
| T2 | **Blok "Wat moet ik nu doen?"** onder elke uitkomst: (1) aanvragen op toeslagen.nl, met welke gegevens; (2) vóór welke datum (zorgtoeslag 2027: uiterlijk 1 september 2028; met een nieuwe zorgverzekering ook letten op 1 januari); (3) hulp dichtbij (telefoon en Informatiepunt). Nu staat er alleen een link naar toeslagen.nl (`src/i18n/nl.js`, `aanvragen`) | B3, B5 | Hoog | S |
| T3 | **Voorschotcheck:** veld "Wat staat nu in Mijn toeslagen?" bij elke rekenhulp, met als uitkomst "Je krijgt waarschijnlijk € X te veel of te weinig. Pas je inkomen aan naar € Y". De zzp-bewaker kan dit al (`src/calc/zzp.js`); maak het algemeen | B2 | Hoog | M |
| T4 | **Snelcheck van 3 vragen op de home** (samen of alleen, inkomen ongeveer met schuifjes in stappen van € 5.000, huur je?). Daarna "Je hebt waarschijnlijk recht op zorgtoeslag en huurtoeslag. Rekenen we het precies uit?" | B1 | Hoog | S |
| T5 | **Spiekbriefje** (pdf of print) met per toeslag wat je straks invult; doorsturen per WhatsApp of mail als tekst, zonder account | Helpt P1 en P5; bewijs van zorgvuldigheid | Hoog | M |
| T6 | **Scenario's "Wat verandert er als…"**: kind wordt 18, samenwonen, AOW-leeftijd, meer gaan werken, verhuizen | B8 | Midden | M |
| T7 | **Herinneringen** (.ics of mail, zoals de zzp-bewaker al heeft): "check je inkomen" per kwartaal, overstappen zorgverzekering vóór 31 december, aanvragen vóór 1 september | B2, B8 | Midden | S (.ics) / M (mail) |
| T8 | **Vermogen altijd uitvragen** met uitleg en een voorbeeld ("ook spaargeld van je kind telt niet mee, wel…") | IBTD: vermogen wordt niet actief uitgevraagd en dat leidt tot terugvorderingen | Midden | S |

**Familie**

| # | Aanbeveling | Waarom | Impact | Moeite |
|---|---|---|---|---|
| F1 | **Delen via een uitnodigingslink** (zodra Supabase aanstaat). Tot die tijd: een duidelijke stap-voor-stapuitleg voor het versleutelde bestand en "je broer ziet dit pas als…". Nu loopt delen via `exporteer` met een wachtwoordzin (`public/js/familie-app.js`) | Kern van de belofte "samen"; B6 | Hoog | L |
| F2 | **Begin met drie situaties** in plaats van een algemene regelkamer: "Ouder gaat naar verpleeghuis", "Ouder heeft hulp thuis nodig (Wmo)", "Ouder is overleden". Elke situatie vult taken en termijnen vooraf in | Versnippering (B6); de Rijksoverheid doet dit al voor overlijden (10 vragen) | Hoog | M |
| F3 | **Bij de Wlz-rekenhulp: "Wat betekent dit voor ons?"**, met als voorbeeld "Huis verkocht in 2026 → telt mee vanaf 2029" (staat in de uitleg; maak het interactief met `teltMeeVanaf`) | CAK legt de gevolgen niet uit | Midden | S |
| F4 | **Erfbelasting: de uitkomst per erfgenaam delen** met broers en zussen, plus de aangiftetermijn in de familiekalender | Notaris en Belastingdienst geven geen termijnen voor de familie | Midden | S |
| F5 | **Brief uitleggen ook zonder AI** (de basisuitleg uit `briefuitleg.js`, met bedragen en termijnen gemarkeerd) zichtbaar op de openbare familiepagina als proef | B4; de AI-uitleg staat nog uit | Midden | S |

**Besparen**

| # | Aanbeveling | Waarom | Impact | Moeite |
|---|---|---|---|---|
| D1 | **Check "Is dit echt een deal?"**: plak een link of zoek een product en zie in één woord "Echt / Normaal / Nep", met de laagste prijs van 30 dagen (wettelijk), de gangbare prijs van 90 dagen en verzendkosten | B7; Google Flights laat zien dat een label laag/normaal/hoog werkt | Midden–hoog | M |
| D2 | **Altijd twee referentieprijzen tonen**: de 30-dagenregel (wet) en de 90-dagenmediaan (onze norm), met een uitleg van één regel | Mensen kennen de 30-dagenregel uit het nieuws; verwarring over termijnen in de bronnen | Midden | S |
| D3 | **Vluchten: een datumraster in kleur** (groen goedkoop, rood duur) en een alarm voor flexibele data zonder account (alleen e-mail of push) | Skyscanner vraagt om in te loggen en vaste data | Midden | M |
| D4 | **Prijsgrafiek: markeer "Black Friday" en "prijs vlak vooraf verhoogd"** | Consumentenbond: prijzen stegen eerst en zakten daarna "als deal" | Midden | S |

**Professionals**

| # | Aanbeveling | Waarom | Impact | Moeite |
|---|---|---|---|---|
| P1 | **Exports uit Bizon, Fineaid, eStrategy en OnView herkennen** (kolomnamen koppelen), met voorbeeldbestanden per pakket | Dit zijn de pakketten met een koppeling bij de Rechtspraak | Hoog (voor Pro) | M |
| P2 | **Proef van 30 dagen** in plaats van 7 | Een portefeuille laten controleren en de uitkomsten bekijken duurt langer ([markt-en-valkuilen](markt-en-valkuilen.md), valkuil 9) | Midden | S |
| P3 | **Bewijs-pdf per controle** (datum, versie van de rekenregels, signalen, wat is afgehandeld) voor het Landelijk Kwaliteitsbureau en de rechter | Bewijs van zorgvuldigheid | Midden | M |
| P4 | **Herhaalcontrole met verschil:** "sinds de vorige keer zijn 4 cliënten veranderd" | Maakt er een abonnement van | Midden | M |

**Zzp**

| # | Aanbeveling | Waarom | Impact | Moeite |
|---|---|---|---|---|
| Z1 | **De bestaande maandherinnering (.ics) laten linken naar een vooraf ingevulde check** (eerdere antwoorden lokaal bewaard, alleen de winst bijwerken) | B2; boekhoudpakketten waarschuwen niet | Midden | S |
| Z2 | **"Haal je winst uit Moneybird, e-Boekhouden of Jortt": per pakket een schermafbeelding van waar het getal staat** | Minder fouten bij het invullen | Midden | S |
| Z3 | **Uitkomst als advies met één getal:** "Zet in Mijn toeslagen € 36.000" (doet de motor al: `adviesInkomen`), met een knop "Zo pas je het aan" | Concreet handelen | Hoog | S |

### 4c. Inhoud en teksten

| # | Aanbeveling | Waarom | Impact | Moeite |
|---|---|---|---|---|
| C1 | **Bovenaan elke rekenpagina:** "Bedragen {jaar}, gecontroleerd op {datum} met {bron}". Nu staat dit op /bronnen/; zet het bij de uitkomst | Vertrouwen; YMYL | Hoog | S |
| C2 | **Pagina "Gratis aanvragen: zo herken je betaalde tussenpersonen en nepberichten"**, gericht op de zoekvragen "zorgtoeslag aanvragen" en "toeslag aanvragen kosten" | B3; de bemiddelaars scoren op deze zoekwoorden | Hoog | S |
| C3 | **Jargon pas na de vraag uitleggen**: "Wat verdien je ongeveer per jaar, vóór belasting?" in plaats van "Toetsingsinkomen". Het begrip zelf in een uitklapper | Laaggeletterdheid (2,5 miljoen, zie markt-en-valkuilen) | Hoog | S |
| C4 | **Geruststellende zinnen:** "Twijfel je? Aanvragen is gratis en je kunt het altijd stopzetten." en "Krijg je toch te veel, dan kun je in termijnen terugbetalen." | Angst voor terugvordering (Universiteit Leiden, interviews) | Midden | S |
| C5 | **Een pagina per levensgebeurtenis** (18 worden, gaan samenwonen, kind krijgen, AOW, overlijden partner), met een tijdlijn | B8; VNG werkt ook met life events ([VNG](https://vng.nl/sites/default/files/2025-06/life-event-ik-word-18.pdf)) | Midden | M |
| C6 | **Over-pagina met een gezicht en naam**, wie meeleest, en een openbaar wijzigingslog | E-E-A-T | Midden | S |

### 4d. Wat we níet moeten doen

| Niet doen | Waarom |
|---|---|
| Geld vragen voor aanvragen of voor "premium" toeslagenchecks | Dan zijn we precies de bemiddelaar die de IBTD bekritiseert |
| Om DigiD, BSN of het rekeningnummer vragen, of "wij regelen het voor je" beloven | Phishing-klimaat; privacy; aansprakelijkheid |
| De huisstijl van de Rijksoverheid nadoen (lint, logo, blauw) | Misleidend en een vertrouwensrisico |
| Een AI-chatbot die bedragen noemt | Fouten zonder controle; bedragen alleen uit de rekenmotor |
| Kopteksten als "Tot € 1.500 extra per maand!" | Klinkt als clickbait en ondermijnt vertrouwen |
| Aftelklokken, "nog 2 op voorraad", eindeloos scrollen bij deals | Juist de dark patterns waarvoor de EU-controle waarschuwt |
| Advertenties of partnerlinks in Familie | Vertrouwen is daar het product ([verdienmodel](../verdienmodel-hele-site.md)) |
| Nieuwe onderdelen bouwen vóór 2027-bedragen, de volgende stap en de leesbaarheid op orde zijn | De basis bepaalt of mensen terugkomen |
| Duizenden gemeentepagina's laten genereren | Straf voor scaled content ([markt-en-valkuilen](markt-en-valkuilen.md), valkuil 7) |
| Een account verplichten voor de check of het spiekbriefje | Lokaal en anoniem is een sterk onderscheid |

---

## 5. Persona's met toptaken (te testen met een browserscript)

Algemene afspraken voor de tests:

- **Kiezers** (selectors): rekenhulpen hebben `form[data-calc="<soort>"]`, velden `[name="<veld>"]`, ja/nee als radioknoppen `[name="partner"][value="nee"]`, verzenden met `button[type=submit]`, en de uitkomst in `[data-result]`. Familie-rekenhulpen: `[data-rekenhulp="<soort>"] form`, velden `#r-<naam>`, keuzes `#r-<naam>-<waarde>`, uitkomst `[data-uitkomst]`.
- **Bedragen** gebruiken een vaste spatie (U+00A0) tussen € en het getal. Maak de tekst eerst gewoon voor je vergelijkt: `text.replace(/\s/g, ' ')`.
- **De verwachte bedragen komen uit de eigen rekenmotor** (`src/calc`, regels voor 2026), berekend op 28 november 2026. Een test bewijst dus dat de pagina werkt en snel is, **niet** dat het bedrag gelijk is aan dat van de Belastingdienst of het CAK. Vergelijk dat apart met de officiële proefberekening.
- **Standaard schermformaten:** mobiel 375×667 (iPhone SE), desktop 1366×768.

### P1. Riet (78), AOW'er met slecht zicht, op haar telefoon

- **Doel:** weten of ze huurtoeslag en zorgtoeslag krijgt, en hoe ze het gratis aanvraagt.
- **Context:** weduwe, huurt voor € 650, AOW plus een klein pensioen (€ 21.000 per jaar), € 15.000 spaargeld. iPhone SE met grote letters; leest langzaam; bang voor oplichting; haar zoon woont ver weg.

| Taak | Pagina en invoer | Verwacht resultaat | Succes |
|---|---|---|---|
| **1.1** In 3 minuten weten wat ze krijgt | `/` → `form[data-calc="alles"]`: partner=nee, leeftijd=78, aow aangevinkt, inkomen=21000, vermogen=15000, huurt=ja, kaleHuur=650, medebewoners=0, aantalKinderen=0 → verzenden | `[data-result]` bevat "€ 524" en "per maand"; de rij zorgtoeslag "€ 129", huurtoeslag "€ 394"; tip AIO-aanvulling zichtbaar; een link naar toeslagen.nl | Klaar binnen 180 s; met de pagina op 200% (`document.body.style.zoom` of het viewport-equivalent) geldt `document.documentElement.scrollWidth <= innerWidth`; alle klikdoelen in het formulier ≥ 44×44 px (doel 48) |
| **1.2** De uitkomst laten voorlezen | Op de uitkomst de voorleesknop indrukken | `speechSynthesis.speaking === true` binnen 2 s | Knop staat bij de uitkomst, niet alleen boven aan de pagina |
| **1.3** Een telefoonnummer voor hulp vinden | Vanaf de uitkomst, maximaal 2 klikken | Tekst bevat "0800 0543" (BelastingTelefoon) of "Informatiepunt Digitale Overheid" | Binnen 2 klikken |

**Waar het nu waarschijnlijk misgaat:** de complete check heeft vier stappen met veel velden, en er staat jargon ("toetsingsinkomen") in de hints. De randen van de velden zijn nauwelijks te zien (2:1). De uitkomst rekent met 2026 terwijl zij aan januari 2027 denkt. Er staat geen telefoonnummer bij de uitkomst (taak 1.3 faalt waarschijnlijk). Er is geen spiekbriefje voor haar zoon.

### P2. Samira (34), alleenstaande moeder met weinig tijd

- **Doel:** in één keer zien wat ze voor zichzelf en haar kinderen kan krijgen.
- **Context:** twee kinderen (4 en 9), werkt parttime (€ 28.000 per jaar), huurt voor € 800. Android-telefoon, vult het in tijdens 10 minuten in de bus, wordt onderbroken.

| Taak | Pagina en invoer | Verwacht resultaat | Succes |
|---|---|---|---|
| **2.1** Totaal in 2 minuten | `/toeslagen-alleenstaande-ouder/` → naar de check → `form[data-calc="alles"]`: partner=nee, leeftijd=34, inkomen=28000, vermogen leeg, huurt=ja, kaleHuur=800, medebewoners=0, aantalKinderen=2, `select[name=kind1]`=4, `select[name=kind2]`=9, gebruiktOpvang=nee | "€ 1.526" per maand; rijen zorgtoeslag € 129, huurtoeslag € 470, kindgebonden budget € 706, kinderbijslag € 220 | Binnen 120 s en ≤ 15 tikken/invoeracties vanaf de landingspagina |
| **2.2** Onderbreking overleven | Na het invullen van 4 velden de pagina herladen | De ingevulde waarden staan er nog (lokaal bewaard), of er verschijnt "verder waar je was" | Waarden zijn er nog |
| **2.3** Weten wat er gebeurt als haar oudste 18 wordt | Zoeken op de site of naar een scenario-pagina | Een pagina of scenario met "kind wordt 18" en een bedrag dat wegvalt | Gevonden binnen 60 s |

**Waar het nu waarschijnlijk misgaat:** het lange formulier op mobiel. Taak 2.2: de rekenhulpen (`public/js/app.js`) gebruiken geen `localStorage`, dus ingevulde waarden zijn na het herladen weg. Deze taak faalt. Taak 2.3 faalt: er zijn nog geen scenario's.

### P3. Daan (20), student met een bijbaan

- **Doel:** snel weten of hij zorgtoeslag krijgt, en hoe hij terugbetalen voorkomt.
- **Context:** hbo-student, verdient € 9.000 per jaar met zijn bijbaan, woont op een kamer zonder eigen voordeur. Komt binnen via Instagram, wil het in een minuut weten.

| Taak | Pagina en invoer | Verwacht resultaat | Succes |
|---|---|---|---|
| **3.1** Zorgtoeslag in 60 seconden | `/instagram/` → keuze zorgtoeslag → `form[data-calc="zorgtoeslag"]`: partner=nee, inkomen=9000 | "€ 129" en "per maand" in `[data-result]` | Binnen 60 s vanaf `/instagram/`, maximaal 2 tikken tot het formulier |
| **3.2** Begrijpen dat hij geen huurtoeslag krijgt voor een kamer | `/toeslagen-student/` | Tekst over een zelfstandige woonruimte of eigen voordeur zichtbaar zonder uitklappen | Gevonden binnen 30 s |
| **3.3** Weten wat hij moet doen als hij meer gaat verdienen | `/toeslag-terugbetalen/` | Tekst bevat "Mijn toeslagen" en "doorgeven" (of "wijziging") | Gevonden binnen 30 s |

**Waar het nu waarschijnlijk misgaat:** waarschijnlijk weinig. Het risico is dat hij na € 129 vertrekt zonder te weten dat hij moet doorgeven als zijn inkomen verandert. Zet een herinnering (T7) bij de uitkomst.

### P4. Mark (41), zzp'er met wisselend inkomen

- **Doel:** vóór de definitieve berekening weten of zijn voorschot nog klopt.
- **Context:** timmerman, eenmanszaak, winst tot en met september € 30.000, in Mijn toeslagen staat € 22.000; huurt voor € 900, geen partner. Laptop 's avonds, boekhoudt in e-Boekhouden. Vorig jaar moest hij € 1.800 terugbetalen [fictief].

| Taak | Pagina en invoer | Verwacht resultaat | Succes |
|---|---|---|---|
| **4.1** Voorschot controleren | `/zzp-toeslagen/` → `form[data-calc="zzp"]`: winstTotNu=30000, maand=9, urencriterium aan, ander leeg, opgegevenInkomen=22000, partner=nee, huurt=ja, kaleHuur=900, aantalKinderen=0 | Melding "Let op: je gaat waarschijnlijk terugbetalen", ongeveer "€ 3.389" over dit jaar; advies om het inkomen aan te passen naar ongeveer € 36.000 | Binnen 180 s; het advies (één getal) staat zonder scrollen onder de kop van de uitkomst |
| **4.2** Herinnering zetten | Op de uitkomst `button[data-ics]` ("Zet een maandelijkse herinnering in mijn agenda") | Download `toeslagcheck-zzp.ics` (`download`-event) met `BEGIN:VCALENDAR` en een afspraak op de 1e van de volgende maand | Binnen 1 klik na de uitkomst |
| **4.3** Weten waar hij het inkomen aanpast | Vanaf de uitkomst | Link naar Mijn toeslagen plus een korte uitleg in stappen | Binnen 1 klik |

**Waar het nu waarschijnlijk misgaat:** of het advies "€ 36.000" prominent in beeld staat, moet blijken. De maandelijkse herinnering bestaat al (`src/calc/zzp.js`), maar opent een lege check: Mark moet alles opnieuw invullen (zie Z1).

### P5. Ingrid (56), dochter en mantelzorger

- **Doel:** begrijpen wat het verpleeghuis haar moeder gaat kosten, en het regelwerk eerlijk delen met haar broer.
- **Context:** werkt 32 uur, moeder (84) gaat naar een verpleeghuis; verzamelinkomen 2024 € 26.000, spaargeld € 80.000, belasting € 3.000. Haar broer woont in Groningen. Werkt 's avonds op de laptop, moe, voelt zich schuldig.

| Taak | Pagina en invoer | Verwacht resultaat | Succes |
|---|---|---|---|
| **5.1** Eigen bijdrage verpleeghuis | `/familie/rekenhulp/verpleeghuis/`: `#r-zorg-instelling`, `#r-partner-nee`, `#r-aow-ja`, `#r-verzamelinkomen`=26000, `#r-vermogen`=80000, `#r-belasting`=3000, `#r-arbeid`=0 → Bereken | `[data-uitkomst]` toont de lage bijdrage, ongeveer € 222–231 per maand (eerste 4 maanden), en de hoge, ongeveer € 1.228–1.323 per maand; de zin over 2 jaar terugkijken; een link naar de rekenhulp van het CAK | Binnen 240 s; de uitkomst staat in gewone taal ("vanaf de 5e maand") |
| **5.2** Het dossier delen met haar broer | `/familie/app/`: dossier "Moeder" aanmaken, één taak en één datum toevoegen, delen. Test met **twee browsercontexten** (Ingrid en broer) | De broer ziet de taak en de datum in zijn eigen browser | Binnen 5 min, zonder dat er een bestand handmatig moet worden verstuurd |
| **5.3** Erfbelasting voor haar deel (later) | `/familie/rekenhulp/erfbelasting/`: `#r-wijze-los`, `#r-bedrag`=150000, `#r-relatie`=kind | Belasting "€ 12.377", vrijstelling "€ 26.230" | Binnen 90 s |

**Waar het nu waarschijnlijk misgaat:** taak 5.2 faalt nu. Delen gaat via een versleuteld exportbestand met een wachtwoordzin, niet live. Ook de start: zij zoekt "moeder naar verpleeghuis", niet "regelkamer" (F2).

### P6. Fatma (47), bewindvoerder met 60 cliënten

- **Doel:** in één middag de hele portefeuille controleren op gemiste toeslagen en te hoge voorschotten, met bewijs voor het dossier.
- **Context:** eenmanskantoor, werkt in Bizon, Windows-laptop met Chrome, is voorzichtig met privacy (cliëntgegevens mogen de computer niet verlaten), weinig tijd voor nieuwe tools.

| Taak | Pagina en invoer | Verwacht resultaat | Succes |
|---|---|---|---|
| **6.1** De demo begrijpen | `/pro/check/` → voorbeeld laden → `#pro-export` | Een lijst met signalen per cliënt; download `actielijst-toeslagen-<datum>.csv` met een kopregel en ≥ 6 rijen | Lijst binnen 10 s; download werkt |
| **6.2** Eigen lijst van 60 cliënten (testbestand met kolomnamen uit een Bizon-export **en** een BSN-kolom) | Upload via `#pro-bestand` (in de proefomgeving) | De BSN-kolom wordt geweigerd of onleesbaar gemaakt, met een melding; 60 rijen ingelezen; de lijst gesorteerd op financieel belang | Van upload tot lijst binnen 60 s; geen netwerkverzoek met cliëntgegevens (controleer het netwerklog: geen POST met rijen) |
| **6.3** Privacy en voorwaarden vinden | `/pro/` | Tekst "blijven op deze computer" plus een link naar de verwerkersovereenkomst of voorwaarden | Binnen 60 s |

**Waar het nu waarschijnlijk misgaat:** de kolomnamen van Bizon worden waarschijnlijk niet automatisch herkend (P1). Een proef van 7 dagen is te kort. Er is geen bewijs-pdf voor het Landelijk Kwaliteitsbureau.

---

## 6. Schets van een testscript (Playwright)

```js
// test/persona/p2-samira.spec.js – schets, nog niet toegevoegd aan de repository
import { test, expect } from '@playwright/test';
const plat = (s) => s.replace(/\s/g, ' ');
test.use({ viewport: { width: 375, height: 667 } });
test('P2 taak 2.1: totaal binnen 2 minuten', async ({ page }) => {
  const start = Date.now();
  await page.goto('/toeslagen-alleenstaande-ouder/');
  await page.getByRole('link', { name: /check/i }).first().click();
  const f = page.locator('form[data-calc="alles"]');
  await f.locator('[name="partner"][value="nee"]').check({ force: true });
  await f.locator('[name="leeftijd"]').fill('34');
  await f.locator('[name="inkomen"]').fill('28000');
  await f.locator('[name="kaleHuur"]').fill('800');
  await f.locator('[name="aantalKinderen"]').fill('2');
  await f.locator('select[name="kind1"]').selectOption('4');
  await f.locator('select[name="kind2"]').selectOption('9');
  await f.locator('button[type="submit"]').click();
  const uit = plat(await page.locator('[data-result]').innerText());
  expect(uit).toContain('€ 1.526');
  expect(Date.now() - start).toBeLessThan(120_000);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
```

Draai dezelfde stappen ook met `page.emulateMedia({ reducedMotion: 'reduce' })` en met 200% zoom. Voeg een axe-controle toe (`@axe-core/playwright`) op het contrast van niet-tekstelementen (WCAG 1.4.11).

---

## 7. Zelf nog doen: concurrenten echt bekijken (30 minuten)

Ik kon geen enkele concurrentenpagina openen. Doe dit één keer zelf, of laat het een browserscript doen zodra deze hosts zijn toegestaan in de netwerkinstellingen van de sessie: `www.belastingdienst.nl`, `www.nibud.nl`, `berekenjerecht.nl`, `hetcak.nl`, `www.regelhulp.nl`, `www.rijksoverheid.nl`, `www.geldfit.nl`, `tweakers.net`, `www.kieskeurig.nl`, `www.beslist.nl`, `www.skyscanner.nl`, `www.moneybird.nl`, `www.jortt.nl`, `www.e-boekhouden.nl`.

Per site, op telefoon (375 px) en laptop:

1. Hoeveel tikken tot een eerste bedrag? Stopwatch.
2. Welk jaar rekenen ze (2026 of 2027)?
3. Staat er een volgende stap bij de uitkomst (aanvragen, hulp, termijn)?
4. Hoe groot is de tekst; kun je inzoomen; zie je de randen van de velden?
5. Is de afzender duidelijk (wie, wanneer gecontroleerd)?
6. Maak twee schermafbeeldingen (mobiel en desktop) en zet ze in `docs/screenshots/concurrenten/`.

---

## 8. Bronnen (selectie, in volgorde van gebruik)

- Belastingdienst: [proefberekening](https://belastingdienst.nl/rekenhulpen/toeslagen/), [toeslagpartner](https://www.belastingdienst.nl/rekenhulpen/toeslagpartner/), [App Toeslagen](https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/app-toeslagen), [wisselend inkomen](https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/ik-heb-een-wisselend-inkomen-heb-ik-recht-op-toeslagen), [valse berichten](https://www.belastingdienst.nl/wps/wcm/connect/nl/contact/content/voorbeelden-van-valse-whatsapp-berichten-sms-berichten-mails-en-brieven), [erfbelasting](https://www.belastingdienst.nl/rekenhulpen/erfbelasting/)
- IBTD: [Aanvraag toeslagen: veel gaat goed maar de regels zijn te complex (30-04-2026)](https://www.inspectiebtd.nl/actueel/nieuws/2026/04/30/aanvraag-toeslagen-veel-gaat-goed-maar-de-regels-zijn-te-complex); [Binnenlands Bestuur over betaalde aanvragen](https://www.binnenlandsbestuur.nl/sociaal/duizenden-burgers-betalen-onnodig-voor-aanvraag-toeslag); [Kassa](https://www.bnnvara.nl/kassa/artikelen/burgers-betalen-onnodig-voor-aanvraag-toeslagen-zo-doe-je-dit-wel-gratis); [Radar](https://radar.avrotros.nl/artikel/let-op-als-je-toeslag-aanvraagt-deze-websites-laten-je-onnodig-betalen-53964)
- Schulden en terugvorderingen: [NOS 24-10-2025](https://nos.nl/l/2587625), [Taxlive](https://www.taxlive.nl/nl/documenten/nieuws/terugbetaling-toeslagen-leidt-steeds-vaker-tot-problemen/), [Radar/ZorgKiezer](https://radar.avrotros.nl/artikel/zorgtoeslag-terugbetalen-je-bent-niet-de-enige-en-dit-is-de-reden-62950), [Rijksoverheid: maatregelen](https://www.rijksoverheid.nl/actueel/nieuws/2024/12/05/kabinet-neemt-maatregelen-om-hoge-terugvorderingen-van-toeslagen-te-voorkomen), [Taxlive: jaarrapportage Dienst Toeslagen 2025](https://www.taxlive.nl/nl/documenten/vn-vandaag/jaarrapportage-dienst-toeslagen-2025-verbeteringen-en-knelpunten/)
- Niet-gebruik: [Universiteit Leiden 2023](https://www.universiteitleiden.nl/nieuws/2023/06/waarom-vragen-veel-mensen-geen-toeslag-aan---wanneer-wel), [Universiteit Leiden 2024](https://www.universiteitleiden.nl/nieuws/2024/09/ik-hoef-die-toeslag-niet-meer-waarom-mensen-het-geld-waar-ze-recht-op-hebben-niet-aanvragen), [scriptie 2024](https://www.universiteitleiden.nl/nieuws/2024/02/waarom-laten-kwetsbare-groepen-toeslagen-liggen-onderzoek-maakt-kans-op-scriptieprijs), [Kassa/Nibud](https://www.bnnvara.nl/kassa/artikelen/toeslagen-blijven-onnodig-liggen-waar-heb-jij-recht-op), [NOS/Nibud mbo](https://nos.nl/artikel/2409307-nibud-mbo-ers-lopen-honderden-euro-s-mis-door-financiele-onwetendheid)
- Ombudsman: [NOS](https://nos.nl/l/2615252), [Tweede Kamer](https://www.tweedekamer.nl/nieuws/kamernieuws/nationale-ombudsman-biedt-jaarverslag-2025-aan), [correctiebrief](https://www.eerstekamer.nl/behandeling/20260604/brief_nationale_ombudsman/document3/f=/vmy238n10qz6.pdf)
- Digitale vaardigheden en toegankelijkheid: [CBS 2026](https://www.cbs.nl/nl-nl/nieuws/2026/14/bedrijven-met-digitalisering-in-top-3-eu-nederlanders-digitaal-meest-vaardig), [CBS 2023](https://www.cbs.nl/nl-nl/nieuws/2023/38/9-op-de-10-mensen-gebruiken-digitale-overheid), [Computable](https://www.computable.nl/?p=340765), [W3C Older Users](https://www.w3.org/WAI/older-users/), [WebAIM Low Vision](https://webaim.org/articles/visual/lowvision), [Dedicon](https://dedicon.nl/sites/default/files/2025-01/GIDS_2_Doe_mee-1.pdf)
- Mantelzorg: [CBS 55-plussers](https://www.cbs.nl/nl-nl/longread/statistische-trends/2026/welke-55-plussers-ontvangen-mantelzorg-en-thuiszorg-?onepage=true), [CBS werkende mantelzorgers](https://www.cbs.nl/nl-nl/longread/diversen/2026/werkende-mantelzorgers-in-beeld?onepage=true), [VU/SCP](https://vu.nl/nl/nieuws/2026/werkende-mantelzorgers-hebben-meer-nodig-dan-flexibiliteit-op-het-werk), [RIVM](https://www.rivm.nl/nieuws/stapeling-van-zorgen-zorgt-voor-overbelasting-mantelzorgers), [Eerste Kamer: kerncijfers](https://www.eerstekamer.nl/brief_in/20260521/mantelzorg_in_beweging_kerncijfers/f=/vmxpdy8r4j5d.pdf)
- Familie-instanties: [CAK](https://www.hetcak.nl/regelingen/zorg-vanuit-de-wlz), [Regelhulp-onderzoek](https://www.Regelhulp.nl/binaries/regelhulp/documenten/rapporten/2024/03/06/gebruikersonderzoek/Rapport+Regelhulp+def.pdf), [Rijksoverheid overlijden](https://rijksoverheid.nl/overlijden), [Consumentenbond erfbelasting](https://www.consumentenbond.nl/erven-schenken/erfbelasting-berekenen), [notaris.nl](https://notaris.nl/stream/checklist-wat-moet-ik-regelen-na-een-overlijden)
- Nepkortingen: [ACM](https://www.acm.nl/nl/publicaties/acm-ziet-nog-veel-misleidende-kortingen-en-adviseert-eerst-checken-dan-bestellen), [Europese Commissie 26-03-2026](https://commission.europa.eu/news-and-media/news/eu-check-reveals-misleading-sales-practices-online-2026-03-26_nl), [Consumentenbond 2026](https://www.consumentenbond.nl/nieuws/2026/consumentenbond-webwinkels-omzeilen-kortingsregels-met-schijnvoordeel), [Consumentenbond 2025](https://www.consumentenbond.nl/nieuws/2025/black-friday-waarschuwing-nog-altijd-veel-nepaanbiedingen)
- Prijsvergelijkers: [Google Flights](https://blog.google/products-and-platforms/products/travel/how-to-find-the-best-deal-on-your-next-flight/), [Skyscanner](https://www.skyscanner.ie/news/tips/tips-and-tools-flight-prices-whole-month), [Kieskeurig 2017](https://twinklemagazine.nl/2017/01/nieuwe-prijsalert-kieskeurig.nl-mailt-koopjes/), [Consumentenbond prijsalert](https://www.consumentenbond.nl/uitgelicht/prijsalert), [Tweakers/DPG](https://dpgmedia.h5mag.com/2022-en/pricewatch)
- Bewindvoering: [Rechtspraak: digitaal toezicht](https://www.rechtspraak.nl/voor-advocaten-en-juristen/reglementen-procedures-en-formulieren/civiel/curatele-bewind-en-mentorschap/digitaal-toezicht), [TED (OnView)](https://ted.europa.eu/en/notice/158627-2023/pdf), [Centric](https://www.binnenlandsbestuur.nl/digitaal/centric/totaaloplossing-voor-schuldhulpverlening)
- Alleenstaande ouders en studenten: [NOS/Nibud kind 18](https://nos.nl/l/2598288), [NJi](https://www.nji.nl/kennis/armoede-en-geldzorgen/eenoudergezinnen-en-armoede), [NOS Nibud 2026](https://nos.nl/l/2619854)
