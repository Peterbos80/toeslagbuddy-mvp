# Model pre-DPIA voor kantoren die ToeslagBuddy Pro gebruiken

*Versie 29-09-2026. Een model dat een bewindvoerderskantoor, budgetcoach of schuldhulporganisatie kan hergebruiken voor de eigen DPIA (art. 35 AVG). Het kantoor is verwerkingsverantwoordelijke voor de cliëntgegevens en blijft verantwoordelijk voor de eigen beoordeling. ToeslagBuddy werkt mee (vragen beantwoorden, documenten leveren). Geen juridisch advies.*

**Hoe te gebruiken:** vul de cursieve delen in, schrap wat niet past, laat het beoordelen door je privacyfunctionaris.

## 1. Is een DPIA nodig?

De AP-lijst van verplichte DPIA's noemt onder meer grootschalige verwerking van gegevens waaruit de **financiële situatie** blijkt, en verwerking van gegevens van **kwetsbare personen** (onder bewind). Een kantoor verwerkt die gegevens al in zijn eigen administratie; de vraag is of het gebruik van ToeslagBuddy Pro daar een **nieuw risico** aan toevoegt.

Conclusie in dit model: ToeslagBuddy Pro voegt een beperkte, lokale verwerking toe (in de browser van de medewerker). Een volledige DPIA voor ToeslagBuddy Pro zelf is waarschijnlijk niet verplicht, maar documenteer deze pre-DPIA in het dossier. *Beoordeling kantoor: …*

## 2. Beschrijving van de verwerking

| Onderdeel | Beschrijving |
|---|---|
| Doel | Per cliënt signaleren of toeslagen of gemeentelijke regelingen worden gemist, of een terugvordering dreigt |
| Grondslag (kantoor) | *Wettelijke taak / overeenkomst met de cliënt (bewind) — invullen door kantoor* |
| Gegevens per cliënt | Eigen cliëntnummer, leeftijd, partner ja/nee, verwacht toetsingsinkomen, vermogen, huur, huishouden, leeftijden kinderen, huidige voorschotten |
| **Niet** nodig en automatisch geweigerd | BSN, naam, geboortedatum, adres, IBAN, e-mail, telefoon (kolommen worden weggelaten; cliëntnummers die de BSN-elfproef doorstaan worden geweigerd) |
| Waar vindt de verwerking plaats? | In de browser op de computer van de medewerker. De CSV wordt niet geüpload |
| Wat gaat naar ToeslagBuddy (Supabase, Frankfurt)? | Alleen geaggregeerde tellingen per organisatie: bandbreedte aantal cliënten (1–9, 10–49, 50–199, 200+), signalen per soort (aantallen < 5 als "<5"), bedragen alleen bij ≥ 10 cliënten en afgerond op € 500, rekenversie, datum. Plus accountgegevens van medewerkers |
| Uitvoer | Actielijst (CSV) en rapport (PDF via printen) op de computer van de medewerker |
| Bewaartermijn uitvoer | *Door kantoor: bijvoorbeeld opslaan in het dossiersysteem en lokaal verwijderen* |

## 3. Noodzaak en evenredigheid

- **Dataminimalisatie:** alleen gegevens die nodig zijn voor de berekening; directe identificatoren worden geweigerd.
- **Pseudonimisering:** het cliëntnummer is voor het kantoor herleidbaar (dus persoonsgegeven), maar verlaat de browser niet.
- **Alternatief:** handmatig narekenen per cliënt kost veel tijd en leidt tot gemiste toeslagen; het doel (de cliënt geen geld laten mislopen, terugvorderingen voorkomen) is in het belang van de betrokkene.

## 4. Risico's en maatregelen

| Risico | Kans | Impact | Maatregel (ToeslagBuddy) | Maatregel (kantoor) | Restrisico |
|---|---|---|---|---|---|
| Medewerker zet BSN of naam in de CSV | Middel | Hoog | Kolommen weggelaten, BSN-elfproef, melding in gewone taal; voorwaarden verbieden het | Werkinstructie: export zonder identificatoren | Laag |
| CSV of actielijst blijft rondslingeren op de pc of in Downloads | Middel | Middel | Bestanden worden niet op de server bewaard | Versleutelde laptops, opslaan in dossiersysteem, lokale kopie verwijderen | *Invullen* |
| Scripts van derden lezen cliëntgegevens in de pagina mee | Laag | Hoog | Geen advertenties/statistieken op Pro; strikte CSP (alleen eigen scripts + Supabase); framebuster | Actuele browser, geen onbekende browserextensies | Laag |
| Formule-injectie via de actielijst in Excel | Laag | Middel | Cellen met = + - @ worden geneutraliseerd | – | Laag |
| Herleidbaarheid van tellingen op de server | Laag | Laag | Bandbreedtes, "<5", bedragen alleen bij n ≥ 10 en afgerond | – | Laag |
| Onbevoegde toegang tot het account van een medewerker | Laag | Laag–middel (alleen tellingen en accountgegevens) | Inlogcode per e-mail, RLS per organisatie, auditlog | MFA op de mailbox van medewerkers; vertrokken medewerkers direct verwijderen | Laag |
| Doorgifte naar de VS (Supabase-moeder, CLOUD Act) | Laag | Laag (geen cliëntgegevens) | EU-regio, SCC's, minimale gegevens | – | Laag |
| Fout in de rekenregels leidt tot verkeerde actie | Middel | Middel | Tests op officiële voorbeelden, rekenversie op rapport, "indicatie" | Signaal altijd controleren in Mijn toeslagen | Laag |

## 5. Rechten van betrokkenen (cliënten)

Omdat ToeslagBuddy geen cliëntgegevens bewaart, worden verzoeken (inzage, correctie, verwijdering) afgehandeld in de administratie van het kantoor. Lokale uitvoer (CSV/PDF) valt onder het eigen dossierbeheer.

## 6. Conclusie en ondertekening

*Conclusie kantoor:* …
*Datum, naam privacyfunctionaris / verantwoordelijke:* …
*Herbeoordeling:* bij wijziging van ToeslagBuddy Pro (bijvoorbeeld als cliëntgegevens op de server zouden worden bewaard: dan eerst een verwerkersovereenkomst en een volledige DPIA) of uiterlijk na 2 jaar.

## Bijlagen die ToeslagBuddy op verzoek levert

- Beveiligingsfactsheet (`/pro/beveiliging/`)
- Verklaring "geen verwerker voor cliëntgegevens" (`docs/verwerkersovereenkomst-model.md`, deel A)
- Uittreksel verwerkingsregister (V1–V4)
