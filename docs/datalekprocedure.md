# Datalekprocedure en incidentenregister

*Versie 29-09-2026. Op basis van art. 33 en 34 AVG. Print deze procedure of zet hem in je wachtwoordkluis, zodat je hem ook hebt als de site of je laptop niet werkt.*

## Wat is een datalek?

Een beveiligingsincident waarbij persoonsgegevens verloren gaan, of waarbij iemand er onbevoegd bij kan (inzien, kopiëren, wijzigen, wissen). Ook als het per ongeluk gebeurt, bijvoorbeeld:

- een e-mail met klantgegevens naar het verkeerde adres;
- een gestolen of verloren laptop of telefoon zonder versleuteling;
- de `service_role`-sleutel van Supabase in een commit of in de website;
- een fout in de databaseregels (RLS) waardoor een lid gegevens van een andere organisatie ziet;
- een gehackt account (GitHub, Supabase, Brevo, domein, mailbox);
- ransomware of een verwijderde database zonder back-up.

## Klok

| Termijn | Wat |
|---|---|
| Direct | Indammen (stap 2) en vastleggen (stap 3) |
| **Binnen 24 uur** na ontdekking | Getroffen **klanten (kantoren) informeren**, als hun organisatie of hun medewerkers geraakt zijn (belofte in de beveiligingsfactsheet) |
| **Binnen 72 uur** na ontdekking | **Melden bij de Autoriteit Persoonsgegevens**, tenzij het lek waarschijnlijk geen risico oplevert. Onvolledig melden mag; later aanvullen |
| Zonder onredelijke vertraging | **Betrokkenen informeren** als het risico voor hen **hoog** is (art. 34) |

## Stappen

1. **Ontdekken en melden.** Iedereen die een mogelijk lek ziet (jij, een klant, een onderzoeker via security@), meldt het direct bij de eigenaar. Noteer datum en tijd van ontdekking: vanaf dan loopt de klok.
2. **Indammen.** Afhankelijk van het lek:
   - Sleutels roteren: Supabase (`anon` en `service_role`, JWT-secret), Brevo-API-sleutel, GitHub-tokens, TransIP-wachtwoord.
   - Sessies intrekken: in Supabase alle sessies uitloggen (Auth → Users) of het JWT-secret roteren.
   - Account vergrendelen: wachtwoord wijzigen, MFA controleren, onbekende apparaten verwijderen.
   - Fout in RLS: de functie of policy direct intrekken (`revoke execute …`) of de Pro-app tijdelijk op onderhoud zetten.
   - Gelekte sleutel in Git: sleutel eerst roteren (verwijderen uit de geschiedenis is niet genoeg).
3. **Vastleggen** in het incidentenregister (hieronder), ook als je denkt dat het meevalt.
4. **Beoordelen.** Welke gegevens, hoeveel personen, welke organisaties, is het versleuteld, kan het worden misbruikt? Gebruik de [meldplicht-hulp van de AP](https://www.autoriteitpersoonsgegevens.nl/themas/beveiliging/datalekken/datalek-melden). Twijfel = melden.
5. **Kantoren informeren (≤ 24 uur).** Mail de eigenaar van elke getroffen organisatie vanaf info@: wat er is gebeurd, welke gegevens, wat je al hebt gedaan, wat zij moeten doen, contactpersoon. Let op: de kantoren hebben zelf mogelijk een meldplicht voor hun cliënten; cliëntgegevens staan in principe niet bij ons, zeg dat er expliciet bij.
6. **Melden bij de AP (≤ 72 uur)** via het [meldformulier datalekken](https://datalekken.autoriteitpersoonsgegevens.nl). Bewaar het meldnummer in het register.
7. **Betrokkenen informeren** bij hoog risico: in duidelijke taal, met wat ze zelf kunnen doen.
8. **Herstellen en leren.** Oorzaak oplossen, test toevoegen die het had moeten vangen, dit document en `beveiligingsbeleid.md` bijwerken.

## Contacten (invullen en ook offline bewaren)

| Wie | Hoe |
|---|---|
| Eigenaar | *(naam, telefoon)* |
| Tweede contactpersoon / noodprocedure (vakantie) | *(naam, telefoon; toegang tot wachtwoordkluis via noodtoegang)* |
| Supabase support | support@supabase.com / dashboard |
| Autoriteit Persoonsgegevens | datalekken.autoriteitpersoonsgegevens.nl |
| Beroepsaansprakelijkheidsverzekeraar | *(polisnummer, telefoon)* |
| Jurist | *(naam, telefoon)* |

## Incidentenregister (sjabloon)

Registreer **alle** beveiligingsincidenten met persoonsgegevens, ook als je ze niet meldt (art. 33 lid 5). Bewaar het register minimaal 5 jaar. Zet het niet in de openbare repo: bewaar het in je wachtwoordkluis of een privémap.

| Nr | Ontdekt op (datum, tijd) | Gemeld door | Wat is er gebeurd | Oorzaak | Welke gegevens | Aantal betrokkenen / organisaties | Gevolgen en risico (laag / risico / hoog) | Maatregelen (indammen, herstel) | Kantoren geïnformeerd (datum, tijd) | Gemeld bij AP (ja/nee, datum, meldnummer, waarom niet) | Betrokkenen geïnformeerd (ja/nee, waarom) | Afgesloten op |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-001 | | | | | | | | | | | | |

## Oefenen

Doe één keer per jaar een oefening op papier (15 minuten): "de `service_role`-sleutel staat in een publieke commit". Loop de stappen door en controleer dat de contacten kloppen. Noteer de oefening in het register (als 'oefening').
