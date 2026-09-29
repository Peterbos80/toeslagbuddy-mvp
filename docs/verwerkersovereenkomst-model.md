# Verwerkersrol: verklaring (nu) en model-verwerkersovereenkomst (later)

*Versie 29-09-2026. Geen juridisch advies: laat deel B door een jurist opstellen of toetsen voordat je het gebruikt.*

## Deel A — Verklaring: ToeslagBuddy is geen verwerker voor cliëntgegevens (huidige situatie)

Te sturen aan een kantoor dat om een verwerkersovereenkomst vraagt (op briefpapier, ondertekend, als PDF).

> **Verklaring over de verwerking van cliëntgegevens in ToeslagBuddy Pro**
>
> [Naam onderneming], handelend onder de naam ToeslagBuddy, gevestigd in [plaats], KvK [nummer] ("ToeslagBuddy"), verklaart het volgende over de dienst ToeslagBuddy Pro, versie van [datum]:
>
> 1. De controle van cliëntgegevens vindt volledig plaats in de browser op de computer van de gebruiker. Het cliëntbestand (CSV) en de uitkomsten per cliënt worden niet naar ToeslagBuddy of naar derden verstuurd, en niet door ToeslagBuddy opgeslagen.
> 2. ToeslagBuddy ontvangt per controle uitsluitend geaggregeerde tellingen op organisatieniveau: een bandbreedte voor het aantal cliënten (1–9, 10–49, 50–199, 200+), het aantal signalen per soort (waarbij aantallen onder de 5 niet exact worden opgeslagen), bedragen alleen bij 10 of meer cliënten en afgerond op € 500, de versie van de rekenregels en de datum. Deze tellingen bevatten geen cliëntnummers, namen, BSN's of bedragen per cliënt.
> 3. ToeslagBuddy verwerkt daarom geen persoonsgegevens van cliënten ten behoeve van [kantoor] en is voor die gegevens geen verwerker in de zin van art. 4 lid 8 en art. 28 AVG. Voor de accountgegevens van medewerkers van [kantoor] is ToeslagBuddy zelf verwerkingsverantwoordelijke (zie de privacyverklaring).
> 4. Wijzigt ToeslagBuddy de dienst zodanig dat cliëntgegevens op de server worden verwerkt, dan gebeurt dat pas nadat met [kantoor] een verwerkersovereenkomst is gesloten.
>
> [Plaats, datum, handtekening]

### Technische onderbouwing (bijlage bij de verklaring)

| Bewering | Hoe het technisch is geborgd | Controleerbaar via |
|---|---|---|
| CSV verlaat de browser niet | De rekenmotor (`src/calc/pro.js`) draait als JavaScript-module in de browser; het bestand wordt met de File API gelezen, niet geüpload | Netwerktabblad van de browser (F12): tijdens de controle geen verzoek met cliëntgegevens |
| Geen scripts van derden die kunnen meelezen | Strikte Content-Security-Policy op `/pro/*`: `script-src 'self'`, `connect-src 'self'` + het Supabase-project; geen advertenties/statistieken | Paginabron (meta-tag), automatische test `test/veiligheid.test.js` en `test/e2e/rainy.e2e.js` |
| Server accepteert geen cliëntgegevens | `controle_opslaan()` accepteert alleen een vast schema met getallen (geen vrije tekst), grenzen en bekende signaalsoorten | Migratie en databasetests (agent A, `supabase/`) |
| Geen BSN in de import | Kolommen `bsn`, `burgerservicenummer`, `naam`, `geboortedatum`, `adres`, `iban`, `email`, `telefoon` (ook deelnamen) worden weggelaten; cliëntnummers die de elfproef doorstaan worden geweigerd | `test/csv-privacy.test.js` |
| Export veilig in Excel | Formule-injectie geneutraliseerd | `test/csv-privacy.test.js` (R6) |

## Deel B — Model-verwerkersovereenkomst (alleen als cliëntgegevens ooit op de server komen)

*Nu niet van toepassing. Gebruik dit als startpunt, samen met een volledige DPIA en een herziene beveiligingsfactsheet. Overweeg dan een EU-eigen hostingpartij (CLOUD Act).*

**Partijen:** [Kantoor] ("Verwerkingsverantwoordelijke") en [onderneming] h.o.d.n. ToeslagBuddy ("Verwerker").

1. **Onderwerp en duur.** Verwerker verwerkt persoonsgegevens uitsluitend ten behoeve van de dienst ToeslagBuddy Pro zoals beschreven in Bijlage 1, zolang de hoofdovereenkomst loopt.
2. **Instructies.** Verwerker verwerkt alleen op schriftelijke instructie van Verwerkingsverantwoordelijke (art. 28 lid 3 a), ook bij doorgifte buiten de EER, tenzij een wettelijke plicht anders vereist (dan melden vooraf, tenzij verboden).
3. **Geheimhouding.** Iedereen die bij Verwerker toegang heeft, is tot geheimhouding verplicht (lid 3 b).
4. **Beveiliging.** Verwerker neemt de maatregelen uit Bijlage 2 (art. 32), waaronder versleuteling, RLS, MFA, logging, back-ups en jaarlijkse toetsing (OWASP ASVS L1; pentest bij opslag van cliëntgegevens).
5. **Subverwerkers.** Toegestaan: Bijlage 3 (bijv. Supabase, regio Frankfurt; Brevo). Nieuwe subverwerkers worden minimaal 30 dagen vooraf gemeld; Verwerkingsverantwoordelijke mag bezwaar maken en dan kosteloos opzeggen (lid 2 en 4).
6. **Rechten van betrokkenen.** Verwerker helpt binnen 5 werkdagen bij verzoeken (lid 3 e).
7. **Bijstand.** Verwerker helpt bij DPIA's, voorafgaande raadpleging en art. 32–36 (lid 3 f).
8. **Datalekken.** Verwerker meldt een inbreuk **binnen 24 uur** na ontdekking, met de informatie van art. 33 lid 3, en houdt Verwerkingsverantwoordelijke op de hoogte (zie `docs/datalekprocedure.md`).
9. **Einde.** Na afloop verwijdert of retourneert Verwerker alle persoonsgegevens binnen 30 dagen, naar keuze van Verwerkingsverantwoordelijke, tenzij bewaring wettelijk verplicht is (lid 3 g); back-ups worden binnen de back-uptermijn overschreven.
10. **Audit.** Verwerker stelt alle informatie beschikbaar die nodig is om naleving aan te tonen en werkt mee aan audits, maximaal één keer per jaar op kosten van Verwerkingsverantwoordelijke, tenzij er aanwijzingen voor niet-naleving zijn (lid 3 h).
11. **Aansprakelijkheid.** Conform de hoofdovereenkomst, met inachtneming van art. 82 AVG.
12. **Recht en forum.** Nederlands recht; rechtbank [arrondissement].

**Bijlage 1:** categorieën betrokkenen en gegevens, doelen, bewaartermijnen.
**Bijlage 2:** beveiligingsmaatregelen (uit `docs/beveiligingsbeleid.md` en de factsheet).
**Bijlage 3:** subverwerkers met locatie en doorgiftemechanisme.
