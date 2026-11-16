# Familieregie: ontwerp en bouwopdracht

*November 2026. Werktitel; de domeinnaam volgt. Achtergrond, cijfers en bronnen staan in [onderzoek.md](onderzoek.md). Dit document is de bouwopdracht voor de bouwagent (Fable) en wordt gebouwd in deze repository, als aparte sectie `/familie/` van de site.*

---

## 0. Voor de bouwagent: werkwijze en harde regels

1. **Lees eerst** `docs/spec.md`, `src/site/layout.js`, `build.js`, `public/js/config.js`, `src/site/deals-pages.js` en `supabase/migrations/*.sql`. Volg de bestaande conventies: Nederlandse namen voor modules en functies, statische site via `build.js`, strikte CSP zonder inline scripts (configuratie via `<script type="application/json" id="tb-config">`), NL/EN via `src/i18n`, Supabase met RLS en een `private`-schema, tests met `node:test`, PGlite voor databasetests en Playwright voor e2e.
2. **Bouw in fases** (§12). Elke fase eindigt pas als `npm run check` groen is, er schermafbeeldingen op 390 px en 1280 px (licht en donker) in `docs/screenshots/familie-*.png` staan, en axe geen ernstige fouten vindt.
3. **Verzin geen regels, bedragen of termijnen.** Elke wettelijke regel staat in `data/familie/regels/*.json` met: `bron` (officiële URL), `geldigVanaf`, `geldigTot`, `gecontroleerdOp` en `toelichting`. Kun je een regel niet met een officiële bron bevestigen? Zet `"status": "te-controleren"`; de interface toont dan "Controleer dit bij <instantie>" en rekent er niet mee.
4. **Geen echte persoonsgegevens** in fixtures, tests of schermafbeeldingen. Gebruik verzonnen namen en `@example.nl`-adressen. BSN-achtige nummers die de elfproef doorstaan worden overal geweigerd (zie bestaande Pro-module).
5. **Privacy-eerst** (§8) is geen extra. Het is de kern van het product.
6. **AI-onderdelen** (§7): laad vóór het schrijven van AI-code de `claude-api`-skill en volg die. Gebruik de officiële Anthropic SDK, nooit zelf-geschreven HTTP-aanroepen.
7. **Geen juridisch advies op maat.** Teksten leggen uit en rekenen standaardsituaties door. Zie §9.4 voor de doorverwijsregels.
8. Taal in de interface: **B1-Nederlands**, warm maar zakelijk, geen jargon zonder uitleg. De doelgroep zit in een zware periode.
9. **Vormgeving (§3A) is een harde eis.** Het product moet er uitzonderlijk mooi uitzien. Een fase is pas af als de visuele checklist in §3A.9 helemaal "ja" is en de eigenaar de schermafbeeldingen heeft goedgekeurd.

---

## 1. Productvisie

> **Eén gedeelde regelkamer voor de familie, vanaf het moment dat een ouder hulp nodig heeft tot en met de afwikkeling na het overlijden.**

### 1.1 Doelgroepen

| Rol | Wie | Wat ze willen |
|---|---|---|
| **Regelaar** (betalende klant) | Volwassen kind, 40–65 jaar, vaak werkend, doet de administratie van een ouder | Overzicht, geen termijnen missen, minder tijd kwijt, geen ruzie met broers of zussen |
| **Meekijker** | Broers, zussen, partner van de ouder | Weten wat er speelt, kunnen helpen, vertrouwen dat het goed gaat |
| **De ouder** | 75+, nog zelfstandig of al in zorg | Regie houden zolang dat kan; weten wie wat doet |
| **Nabestaande** | Na overlijden: dezelfde familie of executeur | Alles afwikkelen zonder te verdrinken |
| **Partner (B2B)** | Zelfstandige uitvaartondernemer, later werkgever of mantelzorgsteunpunt | Families iets bieden wat DELA ook biedt, onder eigen naam |

### 1.2 Persona's (voor teksten en tests)

- **Marieke (52)**, werkt 32 uur, regelt alles voor haar vader Henk (84, weduwnaar, woont nog thuis, beginnende dementie). Broer Ruud woont in Groningen, zus Petra in Spanje. Alles staat nu in een schoenendoos en een WhatsApp-groep.
- **Ahmed (47)** regelt de zaken van zijn moeder (79), die net naar een verpleeghuis is verhuisd. Het huis moet verkocht worden. Hij snapt niet waarom de CAK-bijdrage zo hoog is.
- **Familie De Vries**: vader is overleden, moeder (81) blijft achter. Drie kinderen moeten de nalatenschap afwikkelen en ondertussen moeders inkomen, toeslagen en huur regelen.

### 1.3 Belofte en onderscheid

| Belofte | Hoe | Waarom anderen dit niet hebben |
|---|---|---|
| **Je mist geen termijn meer** | Persoonlijke termijnkalender uit regelsysteem + post + profiel | Losse tools kennen je situatie niet |
| **Je hoeft geen ruzie te krijgen** | Verantwoordingslogboek met maandoverzicht voor de hele familie | Niemand biedt dit |
| **Je begrijpt elke brief** | Foto of PDF → uitleg, bedrag, termijn, taak | Lees Simpel legt uit, maar maakt geen taak en deelt niet |
| **Je weet wat zorg kost** | Rekenhulp Wlz/Wmo met uitleg van gevolgen (huisverkoop, peildatum) | CAK rekent, maar legt de gevolgen niet uit |
| **Na overlijden is het halve werk al gedaan** | Dossier gaat door naar afwikkeling: rekeningen, contracten, documenten zijn al bekend | Nalatenschapstools beginnen bij nul |

---

## 2. Modules

MVP = nodig voor de eerste betalende klant. Later = fase 3 of 4.

| # | Module | Fase |
|---|---|---|
| M1 | Familiedossier, rollen en uitnodigen | 1 (MVP) |
| M2 | Overzicht: geldzaken, contracten, contacten en documenten | 1 (MVP) |
| M3 | Termijnkalender en wijzigingsradar | 1 (MVP) |
| M4 | Taken en afspraken | 1 (MVP) |
| M5 | Postvak: brieven uitleggen | 2 |
| M6 | Verantwoordingslogboek | 2 |
| M7 | Rekenhulpen: kosten van zorg, toeslagen, zorgkostenaftrek | 1 (gratis, openbaar) + 2 (in dossier) |
| M8 | Bankafschrift-scan: contracten en abonnementen vinden | 2 |
| M9 | Vastleggen zolang het kan: volmacht, levenstestament, wensen | 3 |
| M10 | Overlijdensmodus: afwikkelen | 3 |
| M11 | Partnerportaal (uitvaartondernemers) | 4 |
| M12 | Zelfzorg voor de regelaar: verlof, belasting en werkgever | 4 |

### M1 Familiedossier, rollen en uitnodigen

- Eén **dossier** per ouder of ouderpaar. Eén regelaar maakt het aan; een abonnement hoort bij het dossier, niet bij de persoon.
- **Rollen:**
  - `regelaar`: alles;
  - `meekijker`: lezen en taken oppakken, geen documenten verwijderen;
  - `ouder`: lezen, toestemming geven, eigen wensen invullen;
  - `executeur`: alleen in overlijdensmodus, krijgt regelaarsrechten.
- **Uitnodigen** via e-mail met een eenmalige link (Supabase Auth magic link). Maximaal 8 leden per dossier.
- **Toestemming van de ouder:** bij het aanmaken kiest de regelaar:
  - (a) ouder doet mee en geeft toestemming in de app;
  - (b) ouder heeft schriftelijk toestemming gegeven (upload of vinkje met datum);
  - (c) er is een volmacht of bewind/mentorschap.

  Dit wordt vastgelegd met datum en wie het vastlegde. Zonder (a), (b) of (c) blijven gezondheidsvelden uit (§8).
- **Acceptatie:** een meekijker ziet direct het overzicht; een ingetrokken lid verliest binnen 1 minuut toegang (RLS, geen cache); alle wijzigingen staan in het auditlog.

### M2 Overzicht

Een rustige pagina met kaarten:

- **Geld:** rekeningen (bank + laatste 4 cijfers, nooit het volledige IBAN), vaste lasten, inkomsten (AOW, pensioen, toeslagen).
- **Contracten:** energie, zorgverzekering, telefoon, verzekeringen, abonnementen, huur of hypotheek. Per contract: aanbieder, kosten, einddatum of opzegtermijn, wie het regelt.
- **Contacten:** huisarts, thuiszorg, wijkverpleging, gemeente (Wmo-consulent), notaris, buren, met het rolnummer of klantnummer als dat helpt.
- **Documenten:** ID, polissen, beschikkingen, testament (alleen "bestaat, ligt bij notaris X"), volmacht. Versleuteld opgeslagen (§8.3).
- **Instellen in 15 minuten** met een begeleide intake van 12 vragen (§4.2). Daarna stelt de app een checklist voor.
- Kaarten tonen **leeg-staten** met één duidelijke volgende stap ("Voeg de zorgverzekering toe, dan waarschuwen we vóór 31 december").

### M3 Termijnkalender en wijzigingsradar

Het hart van het product. Een **regelmotor** (`src/familie/termijnen.js`) zet profiel + contracten + post + regels om in termijnen.

**Soorten termijnen (voorbeelden; elke regel met bron in `data/familie/regels/termijnen.json`):**

| Groep | Voorbeeld | Bron die de bouwagent moet bevestigen |
|---|---|---|
| Jaarlijks | Zorgverzekering overstappen of aanpassen vóór 31 december / 1 februari met opzegservice | zorgverzekeraars/Rijksoverheid |
| Jaarlijks | Toeslagen: wijzigingen doorgeven; definitieve berekening controleren | Belastingdienst/Toeslagen |
| Jaarlijks | Aangifte inkomstenbelasting (vóór 1 mei); voorlopige aanslag | Belastingdienst |
| Contract | Einddatum of opzegtermijn van contracten (uit M2/M8) | eigen invoer |
| Document | Paspoort/ID verloopt; rijbewijs 75+ met medische keuring (CBR) | Rijksoverheid, CBR |
| Zorg | Herindicatie Wmo; CAK-bijdrage na verhuizing naar zorginstelling; verzoek om herberekening als inkomen/vermogen fors daalde | gemeente, CAK |
| Post | Termijn uit een brief (bezwaar 6 weken, betaaltermijn), uit M5 | brief zelf |
| Wetswijziging | Wmo-eigen bijdrage inkomens- en vermogensafhankelijk per 1-1-2027; einde salderen per 1-1-2027; aftrekpost CVO afgebouwd 2026–2028 | Rijksoverheid, Staatsblad |
| Overlijden | Zie M10 | |

- Elke termijn heeft: datum, wat er moet gebeuren (één zin), waarom (link naar regel + bron), wie (rol of persoon), status.
- **Meldingen:**
  - e-mail en webpush, 30, 7 en 1 dag(en) van tevoren;
  - een **wekelijks familiebericht** op zondagavond ("Deze week: 2 dingen, Marieke doet de zorgverzekering").
- **Wijzigingsradar:** als er een nieuwe regel in `regels/` komt die op dit dossier van toepassing is, krijgt de familie één bericht in gewone taal: "Per 1 januari 2027 verandert de eigen bijdrage voor huishoudelijke hulp. Voor jullie vader betekent dit waarschijnlijk: …".
- **Acceptatie:** unit-tests voor elke termijnregel met vaste "vandaag"-datum; nooit een termijn zonder bron; als een regel `te-controleren` is, staat er "controleer" in plaats van een datum.

### M4 Taken en afspraken

- Taken ontstaan uit termijnen, brieven, de intake of handmatig. Velden: titel, toelichting, wie, deadline, status, gekoppelde documenten.
- **Oppakken met één tik** ("Ik doe dit"). De familie ziet wie wat doet; geen dubbel werk.
- **Afsprakenlijst** voor de familie (bijvoorbeeld "Ruud betaalt de tuinman, Petra belt elke zondag"): vrij tekstveld met datum en wie het vastlegde.

### M5 Postvak: brieven uitleggen

- Upload foto(s) of PDF van een brief. In de browser:
  - (1) foto's worden rechtgezet en verkleind;
  - (2) tekst wordt uitgelezen met OCR;
  - (3) BSN's (elfproef), IBAN's en geboortedata worden vervangen door `[BSN]`, `[IBAN]`, `[GEBOORTEDATUM]` **voordat** er iets het apparaat verlaat.
- De gelakte tekst gaat naar een Supabase Edge Function die Claude aanroept (§7) en **gestructureerde uitvoer** teruggeeft:
  - afzender;
  - soort brief;
  - samenvatting in B1;
  - wat moet je doen;
  - termijn;
  - bedrag;
  - bezwaar mogelijk;
  - zekerheid per veld;
  - citaat uit de brief voor elk bedrag en elke datum.
- De interface toont **bedrag en termijn altijd naast het citaat** uit de brief, met de knop "Klopt" of "Klopt niet". Pas na "Klopt" worden ze een termijn en taak.
- De originele afbeelding wordt versleuteld opgeslagen (§8.3); de gelakte tekst en het resultaat staan in de database.
- **Grenzen:** brieven over strafzaken, schulden met deurwaarder of conflicten met instanties krijgen standaard een doorverwijzing (Juridisch Loket, schuldhulp van de gemeente) naast de uitleg.

### M6 Verantwoordingslogboek

Het onderdeel dat ruzie voorkomt.

- Elke uitgave of opname die een familielid **namens de ouder** doet, wordt vastgelegd met:
  - datum;
  - bedrag;
  - waarvoor;
  - van welke rekening;
  - bon (foto, versleuteld);
  - wie.
- Optioneel import uit bankafschrift (M8): transacties worden voorgesteld, de regelaar bevestigt "dit was voor pa".
- **Maandoverzicht**, automatisch op de 1e van de maand naar alle leden: in, uit, saldo per rekening (alleen als de regelaar saldi invult), bijzonderheden, contante opnames zonder bon.
- **Onveranderbaar:** een vastgelegde regel kan niet worden gewijzigd, alleen gecorrigeerd met een nieuwe regel (append-only + auditlog). Zo is het betrouwbaar als bewijs.
- **Mantelzorgvergoeding** die een kind zichzelf geeft, is een aparte, zichtbare categorie, met uitleg dat dit afgesproken moet zijn.
- Export als PDF (printen via de browser) voor de kantonrechter, de notaris of de familie.

### M7 Rekenhulpen

**Openbaar en gratis** (zonder account, voor zoekverkeer; alles in de browser):

1. **Eigen bijdrage verpleeghuis (Wlz):**
   - lage of hoge bijdrage;
   - effect van vermogen boven de vrijstelling (meetellen als extra inkomen);
   - peildatum van 2 jaar eerder;
   - wat er gebeurt na verkoop van het huis.

   Regels en bedragen in `data/familie/regels/wlz-<jaar>.json`. Met de knop "Bevestig bij het CAK" (link naar de officiële rekenhulp).
2. **Eigen bijdrage Wmo** 2026 (abonnementstarief) en vanaf 2027 (inkomens- en vermogensafhankelijk), zodra de regels officieel zijn gepubliceerd. Tot dan: uitleg met de status `te-controleren`.
3. **Toeslagen voor je ouder:** hergebruik `src/calc/toeslagen.js` (huurtoeslag, zorgtoeslag), met ouderenspecifieke uitleg.
4. **Aftrek specifieke zorgkosten:** welke kosten tellen mee, met drempel. Regels uit Belastingdienst-bronnen.
5. **Zonnepanelen na 1-1-2027:** wat verandert er voor je ouder, met een eenvoudige berekening (zelfverbruik, terugleververgoeding, terugleverkosten). Alleen invoer die mensen zelf kennen (jaaropwek, jaarverbruik, contractvoorwaarden); geen verkooppraat.

**In het dossier** worden dezelfde rekenhulpen automatisch ingevuld met dossiergegevens, en leveren ze termijnen op (M3).

Elke rekenhulp toont:
- de uitkomst;
- "zo hebben we gerekend" (stap voor stap);
- bronnen met datum;
- "wanneer klopt dit niet" (uitzonderingen).

### M8 Bankafschrift-scan

- Upload een CSV-, MT940- of CAMT.053-export. **Verwerking volledig in de browser.** Het bestand wordt niet geüpload.
- Herkenning in drie lagen:
  1. lijst bekende tegenpartijen (`data/familie/organisaties.json`: energie, telecom, zorgverzekeraars, verzekeraars, loterijen, goede doelen, streamingdiensten, kranten);
  2. patronen (zelfde tegenpartij en bedrag, maandelijks of jaarlijks);
  3. **optioneel** AI voor onbekende terugkerende tegenpartijen. Alleen de tegenpartijnaam en het bedragpatroon gaan dan naar de server, nooit IBAN, naam van de ouder of het hele afschrift. Per keer vraagt de app expliciete toestemming.
- Uitkomst: voorstel van contracten voor M2 en transacties voor M6. De regelaar bevestigt per stuk.

### M9 Vastleggen zolang het kan

- Checklist met uitleg (geen juridische documenten genereren):
  - levenstestament / volmacht (inclusief een "verantwoordingsclausule" als onderwerp om met de notaris te bespreken);
  - testament;
  - wilsverklaringen;
  - wensen voor uitvaart en zorg;
  - digitale nalatenschap (accounts).
- **Wensenboek** dat de ouder zelf (of samen met een kind) invult. Zichtbaar voor de familie als de ouder dat wil.
- Knop "Bespreek met notaris": genereert een printbare samenvatting van vragen. Geen verwijsvergoedingen (§9.4).

### M10 Overlijdensmodus: afwikkelen

Activeren door de regelaar, met bevestiging van een tweede lid. Het dossier krijgt dan een rustige, andere toon en een ander overzicht.

1. **Eerste dagen:** wat de uitvaartondernemer doet en wat de familie zelf moet doen.
2. **Opzeggen en melden:** per contract uit M2/M8 een kant-en-klare melding:
   - per brief, e-mail of formulier, met de juiste route uit `organisaties.json`;
   - benodigde documenten (overlijdensakte, verklaring van erfrecht ja/nee);
   - status per organisatie.

   Brieven als printbare pagina of als e-mailtekst om te kopiëren. **Geen** automatisch verzenden in de eerste versie.
3. **Aanvaarden of verwerpen:** uitleg van zuiver aanvaarden, beneficiair aanvaarden en verwerpen, met de signalen voor schulden (uit M6/M8 en post). Termijnregels alleen met bevestigde bron; anders "bespreek met notaris".
4. **Erfbelasting:** rekenhulp met vrijstellingen en tarieven per jaar uit `regels/erfbelasting-<jaar>.json`, plus de aangiftetermijn.
5. **Wettelijke verdeling** (zonder testament): wie erft wat bij partner + kinderen. Bij een testament: "de notaris bepaalt; wij helpen met de lijst".
6. **Inkomen van de achterblijvende partner:**
   - Anw-voorwaarden (uitleg + link SVB);
   - nabestaandenpensioen (vraag het pensioenfonds; checklist);
   - toeslagen na overlijden (10%-regeling, vermogensverdeling tot 5 jaar later aan te passen);
   - huurtoeslag en zorgtoeslag opnieuw berekenen (hergebruik `src/calc`).
7. **Aangifte inkomstenbelasting van de overledene** (nabestaandenmachtiging) en de definitieve berekening van toeslagen: termijnen en uitleg.
8. **Boedelrekening:** M6 gaat door als boedelrekening (inkomsten en uitgaven van de nalatenschap), met eindoverzicht per erfgenaam.
9. **Afsluiten:** dossier wordt na 12 maanden (instelbaar 3–24) automatisch gearchiveerd en daarna verwijderd. Familie krijgt vooraf een export.

### M11 Partnerportaal (uitvaartondernemers)

- Partner krijgt een eigen **onderdomein-vrije huisstijl**: logo, kleur en naam op de uitnodiging en in de kop van het dossier ("Aangeboden door Uitvaartzorg Van Dam").
- Partner maakt bij het eerste gesprek een **uitnodiging** aan (alleen e-mailadres van de familie). Het dossier start direct in overlijdensmodus.
- Partner ziet **alleen**: aantal uitnodigingen, geactiveerd ja/nee en een tevredenheidscijfer achteraf. **Nooit** de inhoud van dossiers.
- Prijs: abonnement per maand, onbeperkt aantal families (§10).
- Materiaal voor de partner: printbare kaart met QR-code, tekst voor de website, uitleg voor het team.

### M12 Zelfzorg voor de regelaar

- Uitleg van zorgverlof (kort- en langdurend), de belastingregels die voor mantelzorgers gelden, en een gespreksvoorbereiding voor de werkgever.
- **Belastingmeter:**
  - korte vragenlijst per maand;
  - bij signalen van overbelasting volgt een doorverwijzing naar MantelzorgNL of het lokale mantelzorgsteunpunt;
  - geen diagnose.

---

## 3. Informatiearchitectuur en routes

| Route | Inhoud | Indexeren |
|---|---|---|
| `/familie/` | Landingspagina: belofte, hoe het werkt, prijzen, vertrouwen (privacy), rekenhulpen | ja |
| `/familie/rekenhulp/verpleeghuis/` | M7.1 | ja |
| `/familie/rekenhulp/wmo/` | M7.2 | ja |
| `/familie/rekenhulp/zorgkosten/` | M7.4 | ja |
| `/familie/rekenhulp/zonnepanelen-2027/` | M7.5 | ja |
| `/familie/gids/<onderwerp>/` | Uitleg-artikelen (§11), elk met één rekenhulp of checklist | ja |
| `/familie/checklist/na-overlijden/` | Gratis interactieve checklist (lokaal opgeslagen) | ja |
| `/familie/app/` | De app: inloggen, dossiers | nee (`noindex`, `afgeschermd`) |
| `/familie/app/d/<id>/…` | Overzicht, kalender, taken, post, logboek, documenten, instellingen | nee |
| `/familie/partner/` | Uitleg en aanmelden voor partners | ja |
| `/familie/partner/app/` | Partnerportaal | nee |
| `/familie/privacy/`, `/familie/voorwaarden/` | Eigen privacyverklaring en voorwaarden | ja |

**De app** is een client-side app in vanilla JS-modules (geen framework, net als de rest van de site), met hash- of pad-routering binnen `/familie/app/`. Gedeelde UI-onderdelen komen in `public/js/familie/`.

De vormgeving staat in §3A. Die is net zo belangrijk als de functies: **het moet er uitzonderlijk mooi uitzien.**

---

## 3A. Vormgeving: de lat ligt hoog

De eigenaar wil dat het product er **super mooi** uitziet. Dat is een harde eis, geen wens. Mensen vertrouwen een product met hun ouders en hun geld alleen als het er verzorgd, rustig en professioneel uitziet. Het niveau is dat van de beste fintech- en zorgapps: alles klopt tot op de pixel. Niets kopiëren, wel even goed.

### 3A.1 Ontwerpprincipes

1. **Rust.** Veel witruimte, één hoofdactie per scherm, nooit meer dan drie kleuren tegelijk in beeld. De gebruiker zit in een zware periode; het scherm mag nooit schreeuwen.
2. **Warmte.** Warme papiertinten in plaats van klinisch wit, zachte vormen, een menselijke toon. Geen ziekenhuisgevoel en geen bankgevoel.
3. **Helderheid.** Grote, goed leesbare letters (ook voor de ouder van 84). Cijfers altijd uitgelijnd (`font-variant-numeric: tabular-nums`). Bedragen en datums springen eruit.
4. **Vertrouwen.** Elke uitkomst laat zien waar die vandaan komt (bron, citaat, wie het deed). Het ontwerp maakt transparantie zichtbaar: kleine bronlabels, avatars bij elke actie, een rustig slotje bij versleutelde documenten.
5. **Ingetogen bij verlies.** In de overlijdensmodus wordt alles stiller: gedempte kleuren, geen felicitaties, geen confetti, geen uitroeptekens.

### 3A.2 Kleuren (design tokens in `public/css/familie.css` als CSS-variabelen)

| Token | Licht | Donker | Gebruik |
|---|---|---|---|
| `--f-achtergrond` | `#FBF8F3` (warm papier) | `#14191B` | Pagina |
| `--f-oppervlak` | `#FFFFFF` | `#1C2326` | Kaarten |
| `--f-oppervlak-2` | `#F4EFE7` | `#232B2E` | Verzonken vlakken, invoer |
| `--f-lijn` | `#E7E1D8` | `#2B3438` | Randen, scheidingen |
| `--f-inkt` | `#1F2A2E` | `#ECE7DF` | Tekst |
| `--f-inkt-zacht` | `#5B6770` | `#A9B2B6` | Bijschriften |
| `--f-primair` | `#2F6B5E` (diep saliegroen) | `#7CC4B0` | Hoofdknoppen, links, actief |
| `--f-primair-zacht` | `#E3EFEA` | `#1F3530` | Geselecteerd, badges |
| `--f-accent` | `#C8693F` (terracotta), alleen vlakken/iconen | `#E39A76` | Aandacht, "deze week" |
| `--f-accent-tekst` | `#A4512D` | `#F0B494` | Accent als tekst (contrast) |
| `--f-let-op` | `#B7791F` / zacht `#FBF0D9` | `#E0B25C` / `#3A2F1A` | Termijn dichtbij |
| `--f-goed` | `#3D7A4F` / zacht `#E4F0E7` | `#86C59A` / `#1E3325` | Gedaan, klopt |
| `--f-rouw-primair` | `#5E6B73` (leigrijs) | `#9AA7AE` | Vervangt primair in overlijdensmodus |

- **Elk tekst-/achtergrondpaar haalt WCAG AA (≥ 4,5:1; grote tekst ≥ 3:1).** Een unit-test leest de tokens en rekent het contrast van alle gebruikte paren uit; die test moet slagen.
- Familieleden krijgen een vaste, zachte avatarkleur (afgeleid van hun id) uit een palet van 8 tinten die onderling goed te onderscheiden zijn. De naam of initialen staan er altijd bij, zodat kleur nooit de enige drager is.
- Donkere modus volgt het systeem, met een schakelaar (zoals de rest van de site).

### 3A.3 Typografie (zelf gehost, CSP `font-src 'self'`, OFL-licentie in `public/fonts/`)

- **Koppen:** *Fraunces* (variabel, OFL), gewicht 500–600, met de "soft"-as iets omhoog voor een warme, menselijke uitstraling.
- **Tekst en interface:** *Atkinson Hyperlegible Next* (OFL, ontworpen voor slechtziende lezers; past bij oudere gebruikers). Als terugval: de bestaande *Nunito*.
- **Schaal** (verhouding 1,25):
  - lopende tekst 18 px in de app, 17 px op informatiepagina's;
  - bijschrift 15 px, nooit kleiner dan 14 px;
  - H3 21 px, H2 26 px, H1 33 px, hero 42–52 px (`clamp()`).
- Regelhoogte 1,55 voor tekst en 1,15 voor koppen; maximaal ~68 tekens per regel.
- Bedragen: tabelcijfers, euroteken los ervoor met smalle spatie, decimalen iets kleiner en zachter (`€ 412,30`).

### 3A.4 Ruimte, vorm en diepte

- **Raster van 4 px**; vaste afstanden 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Afronding:** knoppen en invoer 12 px, kaarten 20 px, grote vlakken 28 px, avatars rond.
- **Schaduw:** zacht en warm, nooit grijs-hard. Bijvoorbeeld `0 1px 2px rgb(60 40 20 / .06), 0 8px 24px rgb(60 40 20 / .06)`. In donker: geen schaduw, wel een iets lichtere rand.
- **Breedte:** de app is maximaal 1120 px met een linker zijbalk vanaf 1024 px. Op de telefoon (het belangrijkste scherm) komt er een **onderbalk** met vijf tabs: Overzicht, Kalender, Taken, Post, Meer. Daarboven een ronde knop "＋" (brief scannen, uitgave, taak).
- **Raakvlakken** minimaal 48 × 48 px.

### 3A.5 Iconen en illustraties

- **Eén eigen set lijniconen** (SVG, 24 px raster, lijndikte 1,75, ronde uiteinden) in `public/img/familie/iconen.svg` als sprite. Ongeveer 40 stuks:
  - geld, contract, brief, kalender, taak, familie, document, slot, bron, huis;
  - zorg, zon, bank, telefoon, kaars (alleen overlijdensmodus), enzovoort.

  Geen icon-bibliotheek van derden nodig.
- **Illustraties** voor lege staten, onboarding en de landingspagina:
  - eigen SVG's in één stijl: rustige lijntekeningen met één vlak in `--f-primair-zacht` en een klein accent in terracotta;
  - onderwerpen: een tafel met papieren en een kop koffie, twee handen die een map doorgeven, een kalender met een lichtje, een huis met een boom;
  - **geen** stockfoto's, geen AI-gegenereerde mensen, geen cliparts.
  - Illustraties passen zich aan de donkere modus aan (via `currentColor` en CSS-variabelen).

### 3A.6 Beweging

- Korte, zachte overgangen van 150–250 ms met `cubic-bezier(.2,.8,.2,1)`.
- Kaarten verschijnen met 8 px opschuiven en vervagen in.
- Paginawissels gebruiken de View Transitions API waar de browser die heeft (anders gewoon wisselen).
- **Signatuurmomenten:**
  1. **Brief scannen:** een zachte scanlijn over de foto, daarna lichten bedragen en datums één voor één op in de brief en schuiven ze naar de uitleg ernaast.
  2. **Taak oppakken:** de avatar van wie het oppakt schuift in de taak; een klein vinkje bij "gedaan", zonder confetti.
  3. **Deze week:** bij openen tellen de termijnen kort op naar hun aantal.
- `prefers-reduced-motion`: alle beweging uit, behalve directe kleurwissels.
- Nooit iets dat knippert of opvalt zonder reden.

### 3A.7 Componenten (allemaal op de stijlpagina, §3A.9)

- Knoppen: primair, secundair, stil, gevaarlijk.
- Invoer: tekst, bedrag, datum, keuzelijst, ja/nee-kaarten, uploadvlak met slepen.
- Kaarten: overzichtskaart, termijnkaart (met "over 6 dagen"-label in `--f-let-op`), taakkaart met avatar, brief-kaart met afzenderlogo als neutraal icoon (nooit het echte logo van een instantie), logboekregel.
- Kalender-tijdlijn: verticale lijn, maandkoppen, stip per termijn, een "vandaag"-markering.
- Bronlabel: klein, met een boekje-icoon, opent een paneel met bron, datum en uitleg.
- Lege staat: illustratie, één zin, één knop.
- Meldingen en toasts: rustig, onderaan, verdwijnen na 4 seconden, altijd met een "ongedaan maken" waar dat kan.
- Avatargroep: maximaal 4 zichtbaar, daarna "+2".
- Stappenvoortgang voor de intake: rustige balk, geen percentage.
- **Grafiek in het logboek-maandoverzicht:**
  - eenvoudige staafjes per maand, in en uit;
  - eigen SVG zonder bibliotheek, met tabel als tekstalternatief;
  - zelfde kleuren als de rest, licht en donker.

### 3A.8 De landingspagina `/familie/`

- **Hero:**
  - grote Fraunces-kop: "Samen de zaken van je ouders regelen. Zonder schoenendoos, zonder ruzie.";
  - eronder een illustratie van een gedeelde tafel;
  - rechts (desktop) een **echte, werkende miniatuur** van het "Deze week"-scherm met verzonnen familie, geen plaatje.
- Drie beloftes met icoon:
  - je mist geen termijn;
  - iedereen ziet hetzelfde;
  - na een overlijden ligt alles al klaar.
- **"Zo werkt het"** in drie stappen, met korte, ingetogen animaties bij het scrollen (uit bij reduced motion).
- Rekenhulp verpleeghuis direct op de pagina, in een kaart.
- **Vertrouwensblok:** wat we wel en niet opslaan, versleuteling in gewone taal, geen reclame, geen verkoop van gegevens, geen commissies.
- Prijzen: twee kaarten (Familie, Afwikkeling) en een regel voor partners.
- Een stille, persoonlijke voettekst.

### 3A.9 Werkwijze voor de bouwagent: visuele kwaliteit afdwingen

1. **Begin met de stijlpagina** `/familie/stijl/` (noindex). Daarop staan alle tokens, de typografie, iconen, illustraties en componenten in alle staten (normaal, hover, focus, uitgeschakeld, fout, laden), in licht en donker. Bouw schermen pas als deze pagina af is.
2. **Na elk scherm:** maak schermafbeeldingen op 390 px en 1280 px, licht en donker. Bekijk ze zelf en loop deze lijst langs. Pas aan tot alles "ja" is:
   - [ ] Is er per scherm één duidelijke hoofdactie?
   - [ ] Liggen alle elementen op het 4-px-raster, met gelijke afstanden tussen gelijke dingen?
   - [ ] Komen er hooguit drie kleuren in beeld, met kleur alleen waar die iets betekent?
   - [ ] Zijn de koppen in Fraunces, de tekst in Atkinson, en de cijfers tabelcijfers?
   - [ ] Hebben lege staten een illustratie, één zin en één knop?
   - [ ] Is er nergens tekst kleiner dan 14 px, of contrast onder AA?
   - [ ] Zijn de focusringen zichtbaar en mooi (2 px `--f-primair`, 2 px afstand)?
   - [ ] Is er op 360 px niets afgekapt en geen horizontaal scrollen?
   - [ ] Klopt de donkere modus echt, zonder vergeten witte vlakken of verkeerde illustratiekleuren?
   - [ ] Staan laadstaten met skeletten in de vorm van de inhoud, zonder springende lay-out (CLS < 0,05)?
   - [ ] Zou je dit scherm met trots laten zien naast de beste app die je kent?
3. **Visuele regressietests:** Playwright maakt van de stijlpagina en vijf hoofdschermen schermafbeeldingen, en vergelijkt die met referentiebeelden in `test/e2e/familie-beelden/` (pixelverschil met een kleine drempel). Een bewuste wijziging werkt de referentie bij in dezelfde commit.
4. **Prestatie:** Lighthouse op de landingspagina en een rekenhulp: Performance ≥ 95, Accessibility 100, Best Practices ≥ 95. Fonts worden voorgeladen en hebben een subset; geen render-blokkerende scripts.
5. **Eindcontrole per fase:** stuur de eigenaar een overzicht van alle schermafbeeldingen (licht en donker, telefoon en desktop). De eigenaar beslist of het mooi genoeg is. Is het dat niet, dan gaat de fase niet door.

---

## 4. Belangrijkste schermen

### 4.1 Overzicht (dashboard van een dossier)

```
┌────────────────────────────────────────────────────────┐
│  Henk de Vries (84)                [Familie: 4 leden]  │
│  ───────────────────────────────────────────────────── │
│  Deze week                                              │
│  ● Zorgverzekering: overstappen kan tot 31 dec  Marieke │
│  ● Brief CAK: bezwaar kan tot 12 jan            open    │
│  ───────────────────────────────────────────────────── │
│  [Geld]  [Contracten 11]  [Contacten 7]  [Documenten 9] │
│  ───────────────────────────────────────────────────── │
│  Logboek november: 6 uitgaven · € 412,30 · 1 zonder bon │
│  Verandert binnenkort: Wmo-bijdrage per 1-1-2027  →     │
└────────────────────────────────────────────────────────┘
```

### 4.2 Intake (12 vragen, één per scherm, overslaan mag)

1. Voor wie regel je dit (voornaam, geboortejaar)?
2. Woont je ouder alleen, met partner, of in een zorginstelling?
3. Huur of koop?
4. Welke inkomsten: AOW, pensioen, anders?
5. Krijgt je ouder toeslagen?
6. Is er hulp via de gemeente (Wmo) of een indicatie voor langdurige zorg (Wlz)? *(gezondheidsgegeven: alleen na toestemming, M1)*
7. Is er een volmacht of levenstestament?
8. Is er een testament (bij welke notaris)?
9. Wie regelen er mee (uitnodigen)?
10. Bij welke bank(en)?
11. Zonnepanelen?
12. Wat is nu het meest dringend? (vrije keuze uit lijst)

Uitkomst: een gevuld overzicht met lege plekken als taken, en een eerste termijnkalender.

### 4.3 Brief uitgelegd

- Links (op desktop) de afbeelding van de brief, rechts de uitleg.
- Bedragen en datums zijn gemarkeerd in de afbeelding (coördinaten uit OCR) en in de uitleg.
- Knoppen: "Klopt, maak taak" · "Klopt niet" · "Vraag iemand uit de familie".

---

## 5. Datamodel (Supabase, migratie `supabase/migrations/2026xxxx_familie.sql`)

Alle tabellen in schema `familie`, RLS aan, standaard alles dicht.

| Tabel | Belangrijkste velden | Opmerkingen |
|---|---|---|
| `dossiers` | id, naam_ouder (voornaam), geboortejaar, status (`actief`, `overlijden`, `archief`), aangemaakt_door, partner_id, abonnement_status, verwijderen_op | Geen BSN, geen volledige geboortedatum |
| `leden` | dossier_id, user_id, rol, uitgenodigd_door, toegevoegd_op, ingetrokken_op | |
| `toestemmingen` | dossier_id, soort (`ouder-app`, `schriftelijk`, `volmacht`, `bewind`), vastgelegd_door, datum, document_id | Vereist voor gezondheidsvelden |
| `profiel` | dossier_id, woonsituatie, huur_koop, inkomens (jsonb), toeslagen (jsonb), zorg (jsonb, alleen met toestemming), zonnepanelen | Eén rij per dossier |
| `contracten` | dossier_id, organisatie_id, soort, kosten_per_maand, einddatum, opzegtermijn_dagen, verantwoordelijke | |
| `organisaties` | id, naam, soort, opzegroute (jsonb), documenten_nodig, bron, gecontroleerd_op | Openbaar leesbaar, beheerd via repo-bestand |
| `contacten` | dossier_id, rol, naam, telefoon, notitie | |
| `documenten` | dossier_id, soort, titel, opslagpad, versleuteld (bool), sleutel_versie, geupload_door | Bestand zelf in Storage, versleuteld (§8.3) |
| `brieven` | dossier_id, document_id, afzender, soort, samenvatting, acties (jsonb), termijn, bedrag, citaten (jsonb), bevestigd_door, model, gelakte_tekst | |
| `termijnen` | dossier_id, regel_id, datum, titel, waarom, bron, wie, status | Regel_id verwijst naar `regels/`-bestand |
| `taken` | dossier_id, titel, toelichting, wie, deadline, status, bron (`termijn`, `brief`, `intake`, `handmatig`) | |
| `logboek` | dossier_id, datum, bedrag_cent, richting, categorie, omschrijving, rekening_label, bon_document_id, door, corrigeert_id | **Append-only**: geen UPDATE/DELETE-policy; correcties als nieuwe rij |
| `afspraken` | dossier_id, tekst, door, datum | |
| `meldingen` | user_id, dossier_id, soort, verzonden_op, kanaal | |
| `audit` | dossier_id, user_id, actie, object, object_id, tijd | Alleen INSERT, via `private`-functie |
| `partners` | id, naam, logo_pad, kleur, abonnement_status | |
| `partner_leden` | partner_id, user_id, rol | |
| `uitnodigingen` | partner_id, email_hash, dossier_id, geactiveerd_op | Partner ziet alleen deze tabel, gefilterd |
| `betalingen` | dossier_id of partner_id, mollie_id, bedrag_cent, status, periode | Alleen via Edge Function geschreven |

**RLS-kern:**
- een gebruiker ziet een rij alleen als hij actief (niet ingetrokken) lid is van het dossier;
- schrijfrechten per rol;
- `logboek` en `audit` zonder update/delete;
- de partner ziet nooit dossierinhoud.

Hulpfuncties in `private` met `security definer`, `search_path = ''` en `revoke execute from public`, zoals in de bestaande migraties.

**Opruimen:** `private.familie_opruimen()` (dagelijks via `pg_cron` of GitHub Actions):
- verwijdert gearchiveerde dossiers na `verwijderen_op`;
- verwijdert ongebruikte uitnodigingen na 30 dagen;
- verwijdert accounts zonder dossier na 90 dagen.

---

## 6. Regelsysteem en rekenkernen

- `data/familie/regels/` bevat JSON-bestanden per onderwerp en jaar:
  - `termijnen.json`
  - `wlz-2026.json`, `wlz-2027.json`
  - `wmo-2026.json`, `wmo-2027.json`
  - `erfbelasting-2026.json`
  - `toeslagen-overlijden.json`
  - `salderen.json`
  - `zorgkosten-2026.json`
- **Schema** voor elke regel: `id`, `titel`, `uitleg_b1`, `voorwaarden` (eenvoudige expressies op het profiel), `bedragen`, `bron`, `geldigVanaf`, `geldigTot`, `gecontroleerdOp`, `status` (`bevestigd` | `te-controleren`).
- Een **schema-test** faalt als een regel geen bron of geen datum heeft, of als `gecontroleerdOp` ouder is dan 400 dagen.
- Rekenkernen in `src/familie/` (gedeeld door browser en Node, zoals `src/deals/`):
  - `termijnen.js`
  - `wlz.js`
  - `wmo.js`
  - `erfbelasting.js`
  - `verdeling.js`
  - `logboek.js` (maandoverzicht, controles)
  - `bankscan.js`
  - `lakken.js` (BSN/IBAN/datums vervangen)
  - `intake.js`
- **Elke rekenkern** heeft voorbeeldberekeningen uit officiële bronnen als test (bijvoorbeeld rekenvoorbeelden van het CAK of de Belastingdienst), met de bron-URL in de test.
- Een maandelijkse GitHub Action `familie-regels.yml` opent een issue als een bron-URL niet meer bereikbaar is, of als `gecontroleerdOp` binnen 30 dagen verloopt. Geen automatische wijziging van regels.

---

## 7. AI-onderdelen

| Taak | Invoer | Uitvoer | Waar |
|---|---|---|---|
| Brief uitleggen (M5) | Gelakte tekst van de brief | JSON volgens vast schema (structured outputs) | Edge Function `familie-brief` |
| Tegenpartij herkennen (M8) | Lijst `{tegenpartij, bedragpatroon}` zonder persoonsgegevens | `{soort, organisatie_suggestie, zekerheid}` | Edge Function `familie-tegenpartij` |
| Wijzigingsradar-tekst (M3) | Regel + geanonimiseerd profiel | Korte B1-uitleg, door mens gecontroleerd vóór publicatie | Script in de repo, niet live |

**Afspraken:**
- Gebruik de officiële Anthropic TypeScript SDK in de Edge Function (Deno, `npm:`-import). **Laad eerst de `claude-api`-skill** en volg die voor model, structured outputs, het afhandelen van `stop_reason: "refusal"` en de server-side fallback.
- **Model:** het standaardmodel uit de skill (op dit moment `claude-opus-5-5`). De keuze voor een goedkoper model is aan de eigenaar en alleen na meting met de evaluatieset hieronder.
- **Systeemprompt** vast en gecachet; volatiele inhoud (de brief) als laatste.
- **Nooit** bedragen of datums laten "raden": het schema vereist een letterlijk citaat bij elk bedrag en elke datum. Ontbreekt dat citaat, dan toont de interface het veld niet.
- **Lakken vóór verzenden** gebeurt in de browser (`lakken.js`). De Edge Function lakt opnieuw als vangnet, en weigert tekst waarin nog een geldig BSN staat.
- **Kostenbewaking:** maximaal 30 brieven per dossier per maand; tellers in de database; bij overschrijding een nette melding.
- **Evaluatieset:** `test/fixtures/familie/brieven/` met minstens 25 verzonnen maar realistische brieven:
  - CAK, Belastingdienst/Toeslagen, gemeente, zorgverzekeraar, energie, bank, deurwaarder;
  - elk met de verwachte uitvoer.

  `npm test` draait met een nep-model (vaste antwoorden). Een apart script `scripts/familie/eval-brieven.js` draait de echte set alleen handmatig, met de sleutel als secret.
- **Secrets:** `ANTHROPIC_API_KEY` alleen als Supabase-secret, nooit in de repo of de browser.

---

## 8. Privacy en beveiliging

### 8.1 Grondslagen

- **Gegevens van gebruikers:** overeenkomst.
- **Gegevens over de ouder:** gerechtvaardigd belang van de familie + toestemming of volmacht (M1).
- **Gezondheidsgegevens** (Wlz-indicatie, zorg): uitdrukkelijke toestemming (art. 9 lid 2a AVG), alleen als de toestemmingsvlag staat. Anders zijn die velden niet zichtbaar en worden ze niet opgeslagen.

### 8.2 Minimalisatie

- Geen BSN.
- Geen volledig IBAN.
- Geen volledige geboortedatum.
- Geen diagnoses: "indicatie Wlz ja/nee + zorgprofiel" is het maximum.
- Bankafschriften worden alleen in de browser verwerkt.

### 8.3 Versleuteling van documenten

- Documenten en bonnen worden **in de browser versleuteld** (WebCrypto AES-GCM 256) met een dossiersleutel, vóór upload naar Supabase Storage.
- De dossiersleutel wordt per lid **ingepakt** met een sleutel die is afgeleid van een passkey (WebAuthn PRF) of, als dat niet kan, van een herstelzin die het lid zelf bewaart.
- Een nieuw lid krijgt de sleutel via een bestaand lid (opnieuw inpakken).

  Valt het hele team zijn sleutels kwijt, dan zijn de documenten weg. Dat wordt **eerlijk uitgelegd** bij het aanmaken. Data in de database zelf (geen documenten) is versleuteld at rest door Supabase.
- **Uitzondering:** voor M5 gaat de gelakte tekst (niet de afbeelding) naar de server voor AI-uitleg, met toestemming per brief.

### 8.4 Hosting en verwerkers

- Supabase EU (Frankfurt).
- Brevo voor e-mail (EU).
- Mollie (NL).
- Anthropic voor AI. Doorgifte vermelden; alleen gelakte tekst.

Verwerkersregister en DPIA bijwerken: `docs/verwerkingsregister.md` en een nieuwe `docs/familieregie/dpia.md` op basis van `docs/dpia-model.md`. **De DPIA is af vóór de eerste echte gebruiker.**

### 8.5 Beveiliging

- RLS-tests met PGlite voor elke rol: regelaar, meekijker, ingetrokken lid, ouder, partner, anoniem.
- Rate limits op Edge Functions.
- CSP zonder inline scripts.
- Sessies van 12 uur.
- Opnieuw inloggen voor het verwijderen van een dossier en het wijzigen van rollen.
- Auditlog zichtbaar voor alle leden ("wie deed wat").

### 8.6 Bewaartermijnen

- Actief dossier: zolang er een abonnement is, plus 90 dagen.
- Overlijdensmodus: 12 maanden na afsluiten (instelbaar).
- Daarna eerst een export, dan verwijderen.

---

## 9. Juridische grenzen en vertrouwen

1. **Geen advies op maat:** teksten "leggen uit" en "rekenen een standaardsituatie door". Elke rekenhulp noemt zijn grenzen.
2. **Geen notaris:** het product maakt geen testamenten, volmachten of verklaringen van erfrecht.
3. **Geen financiële dienst:** het product beheert geen geld en doet geen betalingen namens de ouder.
4. **Doorverwijzen** (vaste lijst in `data/familie/doorverwijzen.json`):

   | Situatie | Doorverwijzing |
   |---|---|
   | Schulden of deurwaarder | Gemeentelijke schuldhulp, Geldfit |
   | Conflict in de familie over geld of volmacht | Mediation, Juridisch Loket |
   | Testament met bijzondere bepalingen, onderneming, buitenland, Wlz-clausule | Notaris |
   | Wilsonbekwaamheid zonder volmacht | Uitleg over bewind/mentorschap bij de kantonrechter |
   | Overbelasting | MantelzorgNL |

   **Geen** betaalde doorverwijzingen of commissies. Dat beschermt het vertrouwen.
5. **Geen namaak van instanties:** geen logo's of huisstijl van CAK, Belastingdienst of gemeenten; wel links naar hun officiële pagina's.

---

## 10. Prijzen en betalen

| Product | Prijs | Inhoud |
|---|---|---|
| Gratis | €0 | Alle openbare rekenhulpen en checklists; één dossier met overzicht en kalender voor 30 dagen |
| **Familie** | €7,99/maand of €79/jaar, per dossier, hele familie | Alles behalve partnerfuncties |
| **Afwikkeling** (los) | €99 eenmalig, 12 maanden | M10 + M2/M4/M5/M6 voor de nalatenschap; **gratis** voor dossiers met ≥ 6 maanden Familie |
| **Partner** (uitvaartondernemer) | €99/maand, onbeperkt families (aanname, te valideren) | M11; families krijgen Afwikkeling gratis |

- Betalen via **Mollie** (iDEAL, kaart, SEPA-incasso voor abonnementen):
  - Edge Function `familie-betalen` maakt de betaling of het abonnement aan;
  - `familie-mollie-webhook` verwerkt de status (idempotent, controleert de betaling opnieuw via de API);
  - de status gaat naar `betalingen` en `dossiers.abonnement_status`.
- **Opzeggen** kan met twee klikken in de app. Na opzeggen is het dossier nog 90 dagen leesbaar, met export.
- Prijzen staan in `data/familie/prijzen.json` en worden in fase 0 getest (§12).

---

## 11. Groei zonder advertentiebudget

1. **Gratis rekenhulpen en gidsen** (M7, `/familie/gids/`) op zoekvragen met hoge intentie, bijvoorbeeld:
   - eigen bijdrage verpleeghuis berekenen;
   - huis verkopen verpleeghuis CAK;
   - Wmo eigen bijdrage 2027;
   - volmacht ouders bank;
   - administratie ouders regelen;
   - wat regelen na overlijden;
   - erfbelasting berekenen;
   - zonnepanelen ouders 2027.

   Elke gids heeft één rekenhulp of checklist, een datum "bijgewerkt op" en bronnen. Structured data als `FAQPage`/`HowTo` waar dat klopt.
2. **Momenten in de kalender:**
   - december (zorgverzekering, wetswijzigingen 1 januari);
   - maart–april (aangifte);
   - Week van de Mantelzorg (november);
   - steeds een gids en een nieuwsbrief.
3. **Partners:** zelfstandige uitvaartondernemers (M11), en mantelzorgsteunpunten die het gratis aanbevelen (bijvoorbeeld een gratis jaar voor families via een steunpunt-code).
4. **Familie nodigt familie uit:** elk dossier heeft gemiddeld 3–4 leden. Elk lid ziet het product en kan later een eigen dossier starten voor een andere ouder of schoonouder.
5. **Social:** hergebruik `social/render.js` voor korte uitlegkaarten ("3 dingen die veranderen op 1 januari voor je ouders").

---

## 12. Fasering met acceptatiecriteria

### Fase 0: valideren (1–2 weken bouwen, daarna 4–6 weken meten)

- Eerst de stijlpagina `/familie/stijl/` (§3A.9), daarna de landingspagina volgens §3A.8.
- Landingspagina `/familie/` met belofte, drie schermvoorbeelden (statisch), prijs, en twee knoppen:
  - "Zet me op de wachtlijst";
  - "Reserveer nu met 50% korting op het eerste jaar" (€39,50 via Mollie, terugbetaalbaar tot de start).
- Rekenhulp M7.1 (verpleeghuis) en de checklist na overlijden: live, gratis, om zoekverkeer te meten.
- Vragenlijst van 5 vragen na aanmelding ("Wat is nu het lastigst?").
- **Door de eigenaar:** 10 gesprekken met regelaars en 10 met zelfstandige uitvaartondernemers. Interviewgids in `docs/familieregie/interviewgids.md` (maakt de bouwagent).
- **Doorgaan als:** ≥ 150 wachtlijst-aanmeldingen en ≥ 20 reserveringen **of** ≥ 3 uitvaartondernemers die een intentieverklaring tekenen. Anders: bijsturen op wat de gesprekken leren.

### Fase 1: MVP

- M1, M2, M3, M4 en M7 (openbaar + in dossier), betalen voor Familie.
- **Acceptatie:**
  - een nieuwe gebruiker richt in < 15 minuten een dossier in met 3 leden;
  - de kalender toont ≥ 5 relevante termijnen met bron;
  - alle RLS-tests slagen;
  - e2e-test van uitnodigen tot taak oppakken;
  - axe schoon.

### Fase 2

- M5 (post met AI), M6 (logboek + maandoverzicht), M8 (bankscan).
- **Acceptatie:**
  - evaluatieset ≥ 90% juiste termijnen en bedragen, 0 verzonnen bedragen (elk bedrag heeft een citaat);
  - geen BSN verlaat de browser (test met nep-BSN's die de elfproef doorstaan);
  - logboek is aantoonbaar append-only.

### Fase 3

- M9, M10 (afwikkelen) en de losse Afwikkeling-aankoop.
- **Acceptatie:**
  - testscenario familie De Vries volledig doorlopen in e2e;
  - erfbelasting- en verdelingstests met officiële rekenvoorbeelden;
  - opzegbrieven voor de 50 meest voorkomende organisaties.

### Fase 4

- M11 (partnerportaal) en M12.
- **Acceptatie:** partner kan in 5 minuten een uitnodiging maken; partner ziet aantoonbaar geen dossierinhoud (RLS-test).

---

## 13. Tests en kwaliteit

- **Unit:** elke rekenkern, regelschema, lakken (BSN/IBAN/datums), bankscan-parsers (CSV van de grote banken, MT940, CAMT.053; voorbeeldbestanden verzonnen), termijnmotor met vaste datum.
- **Database (PGlite):** RLS per rol, append-only logboek, opruimfunctie, partner-isolatie.
- **E2E (Playwright):**
  - landingspagina → wachtlijst;
  - rekenhulp verpleeghuis;
  - dossier aanmaken → lid uitnodigen → taak oppakken;
  - brief uploaden (nep-model) → bevestigen → termijn;
  - logboekregel + maandoverzicht;
  - overlijdensmodus → opzegbrief;
  - telefoonbreedte 360 px zonder horizontaal scrollen; donkere modus.
- **Toegankelijkheid:** axe zonder ernstige fouten; volledig met toetsenbord te bedienen; tekst vergrootbaar tot 200%.
- **Teksten:** een test controleert dat alle teksten via `src/i18n` lopen (NL verplicht, EN mag later).

---

## 14. Meten en stopcriteria

Privacyvriendelijk meten (geen trackers van derden; eigen tellers zonder persoonsgegevens):

| Meting | Doel na 6 maanden |
|---|---|
| Bezoekers rekenhulpen per maand | 10.000 |
| Gratis → betaald | ≥ 4% |
| Leden per dossier | ≥ 2,5 |
| Actief na 90 dagen | ≥ 60% |
| Partners | ≥ 5 |
| Omzet per maand | ≥ €2.000 (op weg naar €10.000 na 12–24 maanden) |

**Stoppen of omgooien** als na 6 maanden live minder dan 100 betalende dossiers én minder dan 3 partners zijn bereikt. Kijk dan eerst of de gratis rekenhulpen wél veel verkeer trekken; dan kan het verdienmodel anders (bijvoorbeeld werkgevers).

---

## 15. Open vragen voor de eigenaar

1. Definitieve naam en domein. Familieregie.nl is bezet; voorstel **Regelkring** (regelkring.nl, vrij op 16-11-2026; zie onderzoek §4). Eigen domein vanaf de start, of eerst `/familie/` op deze site? Houd de productnaam in één constante (`src/familie/merk.js`), zodat een naamswissel één wijziging is.
2. Mollie-account aanmaken (gratis, kosten per transactie).
3. Wie voert de gesprekken in fase 0 (§12)? Dit is het belangrijkste werk dat niet te automatiseren is.
4. Akkoord met de prijzen in §10 als startpunt?
5. Wil je Vlaanderen later meenemen? Dan maakt de bouwagent de regels nu al per land (`regels/nl/`, later `regels/be-vl/`).
