# Verwerkingsregister ToeslagBuddy (art. 30 AVG)

*Versie 29-09-2026. Houd dit register bij: bij elke nieuwe functie die gegevens opslaat, eerst een korte privacytoets (art. 25 AVG), daarna een regel hier. Herzie het elk halfjaar. Dit is geen juridisch advies.*

**Verwerkingsverantwoordelijke:** de onderneming uit `site.config.js → bedrijf` (naam, vestigingsplaats, KvK-nummer). Contact: privacy@toeslagbuddy.nl.
**Functionaris gegevensbescherming:** niet verplicht (geen overheidsinstantie, geen grootschalige verwerking van bijzondere gegevens als kernactiviteit), niet aangesteld.

Waarom een register, ondanks minder dan 250 medewerkers: de uitzondering van art. 30 lid 5 geldt niet voor verwerkingen die niet incidenteel zijn. Accountbeheer is structureel.

## 1. Verwerkingen waarvoor ToeslagBuddy verwerkingsverantwoordelijke is

| # | Verwerking | Doel | Grondslag (art. 6) | Betrokkenen | Categorieën gegevens | Ontvangers / verwerkers (locatie) | Doorgifte buiten EER | Bewaartermijn | Beveiliging (zie beveiligingsbeleid.md) |
|---|---|---|---|---|---|---|---|---|---|
| V1 | Pro-accounts en organisaties | Account, proef/pilot en abonnement leveren | b (overeenkomst) | Medewerkers van kantoren (bewindvoerders, budgetcoaches) | Naam, zakelijk e-mailadres, organisatie, KvK (optioneel), aantal cliënten (optioneel), rol, abonnementsstatus, inlogmomenten | Supabase (Frankfurt) | Supabase Inc. is een Amerikaans moederbedrijf: SCC's via de DPA | Looptijd account. Verlopen proef zonder omzetting: 90 dagen. Account zonder organisatie: 30 dagen na einde proef | RLS, security-definer-functies, MFA voor beheer |
| V2 | Geaggregeerde tellingen per controle | Rapportage en trend voor de organisatie | b | Medewerkers (wie de controle deed) | Bandbreedte aantal cliënten, signalen per soort (<5 als −1), bedragen alleen bij n ≥ 10 en afgerond op € 500, rekenversie, datum, user-id | Supabase (Frankfurt) | SCC's | Zolang de organisatie bestaat; na opzegging + 12 maanden | Vaste jsonb-sleutels, geen vrije tekst; validatie in `controle_opslaan()` |
| V3 | Inloggen per e-mailcode | Authenticatie | b | Medewerkers, beheerder | E-mailadres, tijdstip, IP-adres (Auth-logboek) | Supabase Auth, Brevo (Frankrijk) als SMTP | SCC's (Supabase) | Brevo-verzendlogboek max. 90 dagen; Auth-logboek volgens Supabase | Eenmalige codes, rate limits |
| V4 | Auditlog | Beveiliging, verantwoording aan kantoren | f (gerechtvaardigd belang) | Medewerkers, beheerder | Wie, actie, doel, details (jsonb), tijdstip | Supabase (Frankfurt) | SCC's | 365 dagen (pg_cron) | Alleen-lezen voor eigenaren en beheerders; niemand wijzigt |
| V5 | Berichten via formulieren (contact, pilot, abonnement, wachtlijst) | Vraag beantwoorden, pilot of abonnement regelen | b (precontractueel) of f | Bezoekers, prospects | Naam, e-mailadres, organisatie, telefoon (optioneel), bericht, taal | Supabase (opslag), Brevo (doorsturen naar de privé-mailbox via Edge Function) | SCC's (Supabase) | Database 90 dagen (pg_cron). Mailbox: max. 12 maanden, tenzij klantrelatie | Insert-only voor anon, honeypot, rate limit, HTML escapen |
| V6 | E-mail aan info@, privacy@, security@ | Correspondentie | f | Iedereen die mailt | E-mailadres, inhoud | E-mailprovider/doorstuurdienst *(invullen: welke, waar)* | *(invullen)* | Max. 12 maanden, tenzij klantrelatie of verzoek AVG (dan 2 jaar na afhandeling, als bewijs) | MFA op de mailbox |
| V7 | Hosting (serverlogboeken) | Website veilig laten werken | f | Bezoekers | IP-adres, URL, user-agent, tijdstip | GitHub Pages (VS, DPF) of TransIP (NL) — zie `site.config.js → hosting` | GitHub: DPF | Bepaald door hostingpartij | HTTPS |
| V8 | Bezoekersstatistieken (alleen als ingevuld in `site.config.js`) | Inzicht in gebruik | f | Bezoekers (niet op /pro/* en /beheer/*) | Geaggregeerd: pagina, verwijzer, land, apparaat. Geen cookies | Plausible (EE/DE) of GoatCounter (EU) | Nee | Alleen totalen | Geen cookies; niet op Pro |
| V9 | Advertenties (alleen als AdSense is ingevuld) | Inkomsten | a (toestemming via CMP met TCF v2.3) + Tw 11.7a | Bezoekers (niet op /pro/* en /beheer/*) | Cookies, advertentie-ID's | Google (VS, DPF) | DPF | Bepaald door Google | CMP, CSP |
| V10 | Nieuwsbrief (alleen als ingevuld) | Nieuwsbrief sturen | a | Abonnees | E-mailadres | Nieuwsbriefdienst *(invullen)* | *(invullen)* | Tot afmelding | Dubbele opt-in aanbevolen |
| V11 | Facturatie (zodra betaald abonnement) | Factureren, fiscale plicht | c (wettelijke plicht) | Contactpersonen van kantoren | Organisatie, KvK, factuuradres, contactpersoon, bedragen | Boekhoudpakket *(invullen)*, later Mollie (NL) | *(invullen)* | 7 jaar (art. 52 AWR) | MFA |

## 2. Géén verwerking door ToeslagBuddy

| Gegevens | Waarom geen verwerking | Technische onderbouwing |
|---|---|---|
| Invoer in de rekenhulpen (consument) | Blijft in de browser; niets naar een server | Geen netwerkverkeer met invoer (alleen statische bestanden); zie privacyverklaring |
| Toeslagbewaker zzp | `localStorage` op het apparaat van de gebruiker | Geen server; export/import door de gebruiker zelf |
| Cliëntenlijst van kantoren (CSV) | Controle draait in de browser van het kantoor; alleen V2 gaat naar de server | Privacyfilter in `src/calc/pro.js` (kolommen weg, BSN-elfproef); schema-validatie in `controle_opslaan()`; CSP op Pro-pagina's: alleen `self` + Supabase |
| Spraak (voorlezen) | Alleen lokale stemmen (`localService`) | `public/js/stem.js`, e2e-test R9 |
| AI-video's (HeyGen) | Vooraf gemaakt; bedragen alleen in ondertitels in de browser | `public/js/persona.js` |

## 3. Verwerkersovereenkomsten (vastleggen: versie en datum)

| Leverancier | DPA | Vastgelegd op | Versie |
|---|---|---|---|
| Supabase | https://supabase.com/legal/dpa (geldt via de voorwaarden) | *(invullen)* | *(invullen)* |
| Brevo | Via de voorwaarden in het account | *(invullen)* | *(invullen)* |
| GitHub | https://github.com/customer-terms/github-data-protection-agreement | *(invullen)* | *(invullen)* |
| Plausible / GoatCounter (als gebruikt) | https://plausible.io/dpa | *(invullen)* | *(invullen)* |
| E-mailprovider / doorstuurdienst | *(invullen)* | *(invullen)* | *(invullen)* |
| Mollie (later) | Via Mollie-dashboard | – | – |

## 4. Wijzigingslog

| Datum | Wijziging | Door |
|---|---|---|
| 2026-09-29 | Eerste versie; Web3Forms vervangen door Supabase + Brevo (V5) | Bouwagent B |
