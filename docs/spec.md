# Specificatie ToeslagBuddy-suite (v2, 29 september 2026)

Gebaseerd op [markt en valkuilen](onderzoek/markt-en-valkuilen.md) en [wet- en regelgeving](onderzoek/wetgeving-en-compliance.md). Een criticus-agent heeft dit document aangevallen. **De besluiten in §9 gaan voor op de rest van dit document.**

## 0. Rollen die elkaar challengen

| Rol | Bewaakt | Vetorecht op |
|---|---|---|
| Productmanager | Omzet, focus, volgorde | Features zonder meetbare waarde |
| Toeslagenexpert | Juistheid van de rekenregels | Claims als "officieel" en bedragen zonder bron |
| UX/UI-ontwerper | B1-taal, toegankelijkheid (WCAG 2.1 AA), NL/EN | Schermen die de doelgroep niet snapt |
| Privacy/compliance | AVG, BSN, AI-verordening, BW | Data op de server zonder grondslag; scripts van derden bij cliëntdata |
| Security engineer | RLS, CSP, sleutels, invoer | Alles wat de database vanuit de browser opent |
| QA (rainy day) | Foutpaden, offline, rare invoer | Releases zonder groene tests |
| Criticus | Alles | Aannames zonder bewijs |

## 1. Productlijnen en positionering

**Positionering:** "Al je toeslagen en regelingen, uitgelegd in gewone taal, en we waarschuwen je vóórdat je moet terugbetalen." Het verkoopargument is niet langer "alles in één", want dat doen anderen ook (zie het onderzoek).

| Lijn | Voor wie | Verdienmodel | Rol in de suite |
|---|---|---|---|
| **Consument** (NL + EN) | Huishoudens, studenten, ouderen, expats | Partnerlinks, later AdSense (met CMP) | Trechter en vertrouwensbewijs |
| **Toeslagbewaker** (zzp) | Zzp'ers met een wisselend inkomen | Later Plus (consument: prijs incl. btw en een opzegknop) | Onderscheidend, terugbetaalrisico |
| **Pro** (B2B) | Bewindvoerders, budgetcoaches, schuldhulp | Abonnement per kantoor, excl. btw | Omzetmotor |
| **Beheer** | Jij | – | Sturen op cijfers zonder cliëntdata |

## 2. Featurelijst (MoSCoW) voor deze bouwronde

### Must (wordt nu gebouwd)

**Pro (B2B)**
1. Organisaties met leden en rollen (`eigenaar`, `lid`), leden uitnodigen per e-mail. Eén kantoor deelt één abonnement.
2. Abonnement per organisatie: **proef van 7 dagen** (jouw keuze) die de beheerder kan verlengen tot een **pilot van 30 dagen** (advies uit het onderzoek). Na afloop wordt de toegang automatisch vergrendeld, zonder automatische omzetting naar betaald.
3. Het controleren gebeurt **lokaal** in de browser (zoals nu). Na elke controle gaan **alleen geanonimiseerde tellingen** naar de server: aantal cliënten, aantal met actie, signalen per soort, gemist en risico per jaar, en de versie van de rekenregels. Geen cliëntnummers, geen bedragen per cliënt.
4. **Rapportage** in de app: trend per controle, signalen per soort en de vergelijking met de vorige controle. Een PDF via printen, met datum en rekenversie, bruikbaar als **dossierstuk** (of het LKB er waarde aan hecht, is een aanname).
5. **Privacyfilter bij import:** kolommen `bsn`, `burgerservicenummer`, `naam`, `voornaam`, `achternaam`, `geboortedatum`, `adres`, `iban` en `email` worden weggegooid, met een melding. Een `clientnr` van 9 cijfers dat de elfproef doorstaat, wordt geweigerd. Cellen die beginnen met `= + - @` worden in de export geneutraliseerd.
6. **Rechten van betrokkenen in de app:** mijn gegevens downloaden (JSON) en mijn account verwijderen (met cascade). Een eigenaar kan de organisatie verwijderen.
7. Auditlog van beheerders- en ledenacties (uitnodigen, rol, verlengen, verwijderen), 1 jaar bewaard.

**Berichten (vervangt Web3Forms)**

8. Formulieren schrijven naar de tabel `berichten` in Supabase (EU). Die is insert-only voor anonieme bezoekers, en er zit een grens op de lengte en een honeypot op.
   - Een Supabase Edge Function (`bericht-doorsturen`) stuurt elk bericht via **Brevo (EU)** door naar jouw privé-adres. Dat adres staat alleen als geheim in Supabase, nooit in de repo of op de site.
   - Berichten worden na 90 dagen automatisch gewist (`pg_cron`).
   - Terugval: zolang Supabase niet is ingesteld, kan Web3Forms nog worden gebruikt, maar dan met een waarschuwing in de build en in de documentatie.

**Beheeromgeving `/beheer/`**

9. Alleen toegankelijk voor e-mailadressen in de tabel `beheerders`. Vergt MFA (TOTP via Supabase Auth, AAL2).
10. Het dashboard toont:
    - proeven, activatie (eerste controle), omzetting en MRR;
    - organisaties die verlopen;
    - nieuwe berichten;
    - controles per week (alleen tellingen).
11. Acties: een proef verlengen tot een pilot, het abonnement op actief of opgezegd zetten. Elke actie komt in het auditlog.

**Compliance**

12. Geen AdSense of statistieken op `/pro/*` en `/beheer/*`. Een strikte CSP-meta op die pagina's; een ruimere CSP op de rest.
13. Voorlezen alleen met lokale stemmen (`localService`). Anders wordt de voorleesknop verborgen.
14. Bedrijfsgegevens in de footer (art. 3:15d BW): naam, vestigingsplaats, `info@toeslagbuddy.nl` (doorgestuurd adres, niet je privé-adres), KvK en btw-id, via `site.config.js → bedrijf`. Een leeg KvK-nummer geeft een waarschuwing in de build.
15. Documenten:
    - volledige privacyverklaring;
    - verwerkingsregister;
    - datalekprocedure en incidentenregister;
    - model-verwerkersovereenkomst;
    - beveiligingsfactsheet voor kantoren;
    - toegankelijkheidsverklaring;
    - `/.well-known/security.txt`;
    - uitgebreide Pro-voorwaarden: B2B, excl. btw, opzegging, geheimhouding, aansprakelijkheidsgrens en forum.

**Tweetaligheid**

16. Een NL/EN-schakelaar op elke pagina, met `hreflang` en `/en/`-pagina's. In het Engels:
    - de complete check en alle rekenhulpen;
    - de kernuitleg over zorgtoeslag, huurtoeslag, kindgebonden budget, kinderopvangtoeslag, kinderbijslag en terugbetalen;
    - Pro (landing, aanmelden, inloggen, app);
    - privacy, contact en voorwaarden;
    - de Engelse uitlegscripts voor de persona's.
    De lange Nederlandse artikelen (doelgroepen, alle regelingen) krijgen in het Engels een samenvatting met een link naar de Nederlandse versie. Dat is eerlijker dan machinevertaalde dunne inhoud (valkuil 7).

**Rainy scenarios (getest, zie §6)**

17. Elk foutpad uit §6 heeft een test of een expliciete fallback.

### Should (volgende ronde)
- Betalen via Mollie. Een webhook zet het abonnement op actief. Dit vergt een account.
- Kolomherkenning voor exports uit Bizon en OnView. Dit vergt een voorbeeldexport.
- Herhaalcontrole met een herinnering.
- Bedragen 2027 zodra ze bekend zijn.
- De officiële tabel voor de kinderopvangtoeslag.
- Pools.

### Won't (bewust niet)
- **Cliëntdossiers of cliëntnummers op de server.** Dan wordt ToeslagBuddy verwerker van gegevens over kwetsbare mensen, met een DPIA en veel verkoopfrictie. De tellingen per organisatie bevatten geen cliëntgegevens.
- **Namens cliënten aanvragen** of een koppeling met Mijn Toeslagen.
- **Een AI-chatbot met persoonlijk advies.**
- **Gemeentepagina's in bulk.**

## 3. Architectuur

```
Browser (statische site, GitHub Pages of TransIP)
 ├─ rekenen: src/calc/*.js (ES-modules, gedeeld met de tests)
 ├─ i18n: src/i18n/{nl,en}.js → pagina's worden per taal gebouwd
 ├─ Pro-app: controle lokaal → alleen tellingen via RPC naar Supabase
 └─ formulieren → RPC `bericht_plaatsen` (anon, rate-limited)

Supabase (regio Frankfurt)
 ├─ Auth: inloglink per e-mail; MFA (TOTP) verplicht voor beheerders
 ├─ Postgres + RLS: alle tabellen dicht, toegang alleen via policies en security-definer-functies
 ├─ Edge Function bericht-doorsturen → Brevo SMTP API (EU) → jouw privé-adres (geheim)
 └─ pg_cron: dagelijks opruimen (berichten 90 d, auditlog 365 d, rate-limit 1 d)
```

**Waarom geen eigen server:** er is geen server om te patchen of die kan uitvallen. **Kosten:** het gratis plan van Supabase pauzeert na 7 dagen zonder activiteit en maakt geen downloadbare back-ups. Neem daarom **Supabase Pro (ongeveer $25 per maand)** vóór de eerste pilot. Supabase draait in de EU, en RLS is testbaar met PGlite in CI.

## 4. Datamodel (Supabase, migratie `20260930_suite.sql`)

| Tabel | Kolommen (kern) | Wie mag wat (RLS) |
|---|---|---|
| `organisaties` | id, naam, kvk (optioneel), abonnement (`proef`/`pilot`/`actief`/`opgezegd`/`verlopen`), proef_eind, aangemaakt | Leden lezen hun eigen organisatie; de eigenaar wijzigt alleen de naam en het KvK-nummer; de rest alleen via beheerfuncties |
| `leden` | organisatie_id, user_id, rol (`eigenaar`/`lid`), toegevoegd | Leden zien de leden van hun eigen organisatie; alleen de eigenaar voegt toe of verwijdert, via een functie |
| `uitnodigingen` | id, organisatie_id, email, token-hash, verloopt (7 d), door | Alleen de eigenaar |
| `pro_profielen` | (bestaand) id, email, naam, organisatie, clienten, … | Blijft staan voor compatibiliteit; wordt bij aanmelden gekoppeld aan een nieuwe organisatie |
| `controles` | id, organisatie_id, door, aantal, met_actie, gemist_jaar, risico_jaar, signalen jsonb (tellingen per soort), rekenversie, aangemaakt | Leden lezen en voegen toe voor hun eigen organisatie, alleen via `controle_opslaan()` met validatie. Vrije tekst is **onmogelijk**: jsonb met vaste sleutels en getallen |
| `berichten` | id, soort, onderwerp, email, naam, tekst (≤ 5000), taal, aangemaakt, doorgestuurd | Anon: **alleen insert via de functie**; lezen alleen door beheerders |
| `beheerders` | email | Niet leesbaar voor gewone gebruikers |
| `audit_log` | id, wie, actie, doel, details jsonb, wanneer | Beheerders lezen alles; eigenaren lezen die van hun organisatie; niemand wijzigt of verwijdert |
| `rate_limit` | sleutel (hash van IP/e-mail + soort), teller, venster | Alleen functies |

**Functies (security definer, `search_path` vast):**
- `mijn_omgeving()`: het profiel, de organisatie, de rol, de proefstatus en de leden.
- `controle_opslaan(json)`: valideert het schema en de grenzen (aantal 1–100.000, bedragen ≥ 0 en < 10 mln, alleen de bekende signaalsoorten) en controleert de toegang (proef, pilot of actief).
- `lid_uitnodigen(email)`, `uitnodiging_accepteren(token)`, `lid_verwijderen(user)`.
- `mijn_gegevens()`: export naar JSON.
- `account_verwijderen()`: verwijdert de gebruiker. Als eigenaar zonder andere leden gaat de organisatie mee.
- `bericht_plaatsen(...)`: een honeypot, en maximaal 5 berichten per uur per sleutel.
- `beheer_*`: statistieken, verlengen, abonnement zetten. Ze vereisen `is_beheerder()` **en** `auth.jwt()->>'aal' = 'aal2'`.

**Trigger:** bij een nieuwe gebruiker ontstaan een profiel, een organisatie (de naam uit de aanmelding) en het eigenaarschap, met een proef van `proef_dagen`, standaard 7. Een uitgenodigde gebruiker krijgt **geen** eigen organisatie; de uitnodiging koppelt hem.

**Bewaartermijnen:**

| Gegevens | Termijn |
|---|---|
| Berichten | 90 dagen |
| Auditlog | 365 dagen |
| Controles | zolang de organisatie bestaat; na opzegging plus 12 maanden gewist |
| Accounts zonder organisatie | 30 dagen na het verlopen van de proef gewist |

## 5. Beveiliging

| Maatregel | Waar |
|---|---|
| RLS op elke tabel; `revoke all` voor `anon` en `authenticated`, daarna gerichte grants | migratie + PGlite-tests |
| Beheerfuncties vereisen MFA (AAL2) én staan in de beheerderslijst | SQL + test |
| `service_role` alleen in Supabase-geheimen (Edge Function), nooit in de repo of browser | test: grep in de build-output op `service_role` en `eyJ…` met rol `service_role` |
| Het privé-e-mailadres staat alleen als Supabase-geheim `DOORSTUUR_EMAIL` | test: geen `@` behalve `info@`/`privacy@`/`security@` in de build |
| CSP-meta: Pro en beheer staan alleen `self` en het Supabase-domein toe | layout + e2e |
| Geen AdSense of statistieken op `/pro/*` en `/beheer/*` | layout + test |
| Invoer: grenzen op lengte en getallen in de browser **en** in SQL | calc/validatie + SQL-checks |
| CSV-formule-injectie in de export | `pro.js` + unit-test |
| Tellingen zonder cliëntgegevens | schema-validatie in `controle_opslaan` + test |
| MFA op GitHub, Supabase, Brevo, de registrar en de mailbox | jouw actie (checklist) |

## 6. Rainy scenarios (moeten werken of netjes falen)

| # | Scenario | Verwacht gedrag | Test |
|---|---|---|---|
| R1 | Geen internet bij het versturen van een formulier | Duidelijke melding, de invoer blijft staan, opnieuw proberen kan | e2e (route abort) |
| R2 | `localStorage` geblokkeerd (privémodus, Safari) | Rekenen werkt; de zzp-bewaker meldt "opslaan niet mogelijk" | e2e |
| R3 | CSV met BSN- of naamkolom | Kolom verwijderd plus een melding; de export bevat geen BSN | unit + e2e |
| R4 | CSV van 20 MB of met 100.000 regels | Weigert boven 5 MB of 10.000 regels, met een melding | unit + e2e |
| R5 | CSV met rare tekens, puntkomma of komma, Excel-BOM, lege regels | Wordt correct gelezen | unit |
| R6 | Formule-injectie (`=HYPERLINK(...)`) | Geneutraliseerd in de export | unit |
| R7 | Negatief of absurd inkomen (1e12), leeftijd 200 | Validatiefout in gewone taal | unit + e2e |
| R8 | `manifest.json` voor video's geeft 404 of ongeldige JSON | Terug naar de getekende persona | e2e |
| R9 | Geen spraak of alleen netwerkstemmen | Voorleesknop verborgen; ondertitels blijven | e2e |
| R10 | Sessie verlopen of inloglink ongeldig | Terug naar inloggen met uitleg | e2e (demo) |
| R11 | Proef verlopen | Vergrendeld scherm met een upgrade-formulier; de server weigert de RPC ook | SQL-test + e2e |
| R12 | Een lid probeert gegevens van een andere organisatie te lezen of te schrijven | 0 rijen of een fout | PGlite-test |
| R13 | Een gebruiker probeert zijn eigen abonnement of `proef_eind` te wijzigen | Geweigerd | PGlite-test |
| R14 | Spam op formulieren (100×) | Na 5 per uur geweigerd; de honeypot vangt bots | PGlite-test |
| R15 | Een beheerder zonder MFA roept een beheerfunctie aan | Geweigerd | PGlite-test |
| R16 | Supabase is onbereikbaar | De Pro-app toont "tijdelijk niet beschikbaar"; de lokale controle werkt; tellingen worden later opnieuw geprobeerd (outbox in `localStorage`) | e2e |
| R17 | JavaScript uit | Uitlegpagina's leesbaar; de rekenhulp meldt "zet JavaScript aan" | e2e |
| R18 | Engelse bezoeker op een Nederlandstalige pagina | Schakelaar naar het Engelse equivalent, of naar `/en/` met uitleg | e2e |
| R19 | Rekenregels van het volgende jaar nog niet bekend | Banner "bedragen 2027 volgen", en de berekening blijft over 2026 | bestaand |
| R20 | De bronpagina van de monitor is onbereikbaar | Geen vals alarm; na 3 dagen een issue "bron onbereikbaar" | unit |

## 7. Eerlijk: wat kan wel en wat niet, en de mitigatie

| Wat je vraagt | Kan het? | Mitigatie |
|---|---|---|
| "Alle data veilig, voldoen aan de wet" | **Grotendeels.** De techniek kan ik bouwen en testen. Juridische zekerheid kan ik niet geven | Een jurist toetst de voorwaarden, privacyverklaring en verwerkersovereenkomst vóór de eerste betalende klant (vanaf ± € 1.000; reken op meer) |
| Databases live zetten | **Nee, niet zelf.** Ik heb geen Supabase-account en mag geen accounts voor je aanmaken | Migraties plus een stappenplan van **1 à 2 uur plus wachttijd voor DNS** (`docs/pro-accounts.md`). Tot dan draait de demo-modus. De database-regels zijn **gesimuleerd** getest met PGlite (echte Postgres, maar het auth-schema, de rollen en de JWT zijn nagebootst). Dat is geen volledige Supabase-test |
| E-mail onzichtbaar naar jouw adres | **Ja,** zodra jij in Supabase het geheim `DOORSTUUR_EMAIL` en de Brevo-sleutel invult | Tot dan staat bij formulieren "mail naar info@toeslagbuddy.nl" (doorgestuurd adres). Web3Forms (India) vervalt. Let op: antwoord altijd **als info@** (send-as), anders lekt je privé-adres alsnog |
| Alles in twee talen | **Kern ja, alles nee.** Machinevertaalde lange artikelen schaden de SEO (valkuil 7) | Engels voor de rekenhulpen, kernuitleg, Pro en juridische pagina's; samenvattingen voor de rest |
| Rekenregels 100% juist | **Nee.** De kinderopvangtoeslag is een benadering; de bedragen voor 2027 zijn nog niet bekend | Het label "indicatie", bronnen per bedrag, een monitor, tests op officiële voorbeelden, en een externe review (backlog) |
| Automatisch betalen | **Nog niet.** Dat vergt een Mollie-account | Tot dan een aanvraagformulier en handmatig op 'actief' zetten in `/beheer/` |
| Beheerders-MFA afdwingen | **Ja, zodra je TOTP-factor is ingeschreven.** De database eist AAL2 plus een geverifieerde factor | Schrijf de factor direct na het aanmaken in. Bewaar herstelcodes in een wachtwoordkluis; bij verlies herstel via Supabase Studio (eigenaar van het project) |
| Realistische AI-video's | **Ja,** met een HeyGen-sleutel | Altijd een AI-label. Het onderzoek raadt voor wantrouwige doelgroepen de getekende persona aan: die blijft de standaard |
| 7 dagen proef | **Ja,** zo gebouwd | Het onderzoek zegt: te kort voor een kantoor. Jij kunt in `/beheer/` met één klik verlengen tot een pilot van 30 dagen |
| Proef "afsluiten" na 7 dagen | **Deels.** De controle draait lokaal en de code is openbaar; een handige gebruiker kan de rekenmotor dus zelf draaien. Wat écht op slot gaat: opslaan van controles, trend, team en het rapport | De betaalde waarde zit in geschiedenis, team, ondersteuning, het rapport als dossierstuk en jaarlijkse updates, niet in geheime rekenregels |
| Tellingen "anoniem" | **Niet helemaal.** Bij kleine aantallen zijn tellingen herleidbaar | De server krijgt alleen bandbreedtes en afgeronde bedragen (§9, B5). Wij noemen het "geaggregeerd", niet "anoniem" |
| Inloglink werkt altijd | **Nee.** Outlook Safe Links opent links vooraf en verbruikt ze | Een 6-cijferige code in de mail is de hoofdroute; de link is een extra |
| Aansprakelijkheid afdekken | **Niet met software** | Beroepsaansprakelijkheidsverzekering (IT en advies) vóór de eerste betalende klant; een limiet in de voorwaarden |
| Geen bugs | **Niemand kan dat beloven** | Unit-, database- en browsertests; publiceren alleen bij groen; foutpaden getest (§6) |

## 8. Bouwvolgorde (agents)

1. **Specificatie** (dit document), daarna de **criticus**.
2. Parallel, elk in een eigen worktree:
   - **A. Database, beveiliging en rapportage:**
     - de migratie en PGlite-tests;
     - de Pro-app-tabbladen Rapportage, Team en Account (export en verwijderen);
     - een outbox voor tellingen;
     - de beheeromgeving;
     - de berichten-RPC met de Edge Function.
   - **B. Compliance en rainy day:**
     - het privacyfilter, de grenzen op invoer en de formule-injectie;
     - de CSP, geen derde partijen op Pro, lokale stemmen en de bedrijfsgegevens;
     - de juridische pagina's en documenten, en security.txt;
     - de rainy-e2e-tests.
3. **C. Engels:** i18n-laag, `/en/`-pagina's, hreflang, de schakelaar, Engelse persona-scripts. Dit gebeurt na A en B, omdat het dezelfde bestanden raakt.
4. **Integratie:** alle tests, schermafbeeldingen, publiceren.

## 9. Uitkomst van de criticus en besluiten (gaan voor)

De criticus vond 6 blokkerende, 13 belangrijke en 4 kleine punten. Besluiten:

### Blokkerend: allemaal overgenomen
| # | Probleem | Besluit |
|---|---|---|
| B1 | De ingebouwde SMTP van Supabase mailt alleen naar teamleden, en maar een paar keer per uur | **Brevo-SMTP ook voor Auth.** SPF, DKIM en DMARC op toeslagbuddy.nl en Auth-rate-limits komen in het stappenplan |
| B2 | Het gratis plan pauzeert na 7 dagen en maakt geen back-ups | Supabase Pro vóór de eerste pilot; back-up en herstel één keer testen (§3 aangepast) |
| B3 | Functies zijn standaard uitvoerbaar door `anon` | `revoke execute on all functions … from public, anon, authenticated`, daarna gerichte grants. Hulpfuncties in schema `private` (niet via de API bereikbaar), `set search_path = ''`, en policies zonder recursie (hulpfunctie `private.mijn_org_ids()`) |
| B4 | Stored XSS in `/beheer/` | Alles wat een gebruiker aanlevert, gaat via `textContent`. De CSP is strikt, zonder `'unsafe-inline'` voor scripts (de inline scripts zijn al vervangen door `<script type="application/json" id="tb-config">` en `public/js/config.js`). Een test met een `<img onerror>`-payload. In de mail: HTML escapen en CR/LF weg uit het onderwerp |
| B5 | Tellingen zijn herleidbaar | De server bewaart alleen:<br>• een bandbreedte voor het aantal cliënten (`1-9`, `10-49`, `50-199`, `200+`);<br>• signalen per soort, met aantallen onder 5 als "<5" (opgeslagen als −1);<br>• bedragen **alleen bij n ≥ 10**, afgerond op € 500;<br>• de rekenversie en de datum.<br>Exacte trend en details blijven lokaal (per gebruiker in `localStorage`, gewist bij uitloggen) en in de PDF. In teksten: "geaggregeerd", niet "anoniem" |
| B6 | Uitnodigingen niet uitgewerkt | **Geen uitnodigingsmail.** De eigenaar maakt een uitnodigingslink en deelt die zelf. Accepteren kan alleen als `auth.email()` gelijk is aan het uitgenodigde adres, eenmalig en binnen 7 dagen. Maximaal 10 uitnodigingen per dag en 5 leden tijdens de proef. Het token wordt alleen als hash (sha256) opgeslagen |

### Belangrijk: overgenomen, met deze keuzes
| # | Besluit |
|---|---|
| 7 | De trigger maakt **alleen een profiel**. De organisatie ontstaat via RPC `organisatie_aanmaken(naam)` bij de eerste login, als er geen lidmaatschap is. `unique(user_id)` op `leden`. De proef start bij het aanmaken van de organisatie. `clienten` wordt veilig geparsed (maximaal 100.000, anders null) |
| 8 | Eerlijk vermeld in §7: de vergrendeling beschermt opslag, team, trend en het rapport, niet de rekenmotor. Auth-rate-limits in het stappenplan |
| 9 | `beheerders(user_id)`. `private.is_beheerder()` eist AAL2 **en** een geverifieerde factor in `auth.mfa_factors`. Een beheerder krijgt geen proeforganisatie |
| 10 | Berichten: een honeypot, een minimale invultijd (3 s, gecontroleerd in de browser en via `gestart_op` in de RPC), maximaal 3 per uur per e-mailadres en **30 per uur globaal**. Doorsturen via een Database Webhook (pg_net) naar de Edge Function. Mislukt dat, dan blijft `doorgestuurd=false` staan en probeert een cronjob het opnieuw. Er komt geen captcha van een derde partij |
| 11 | Advies: **productie op TransIP** (echte headers, EU). Op GitHub Pages komen een JS-framebuster op `/pro/*` en `/beheer/`, en de CSP-meta als eerste element in `<head>` |
| 12 | Inloggen met een **6-cijferige code** (`verifyOtp`) als hoofdroute; de link werkt ook. Supabase-template: `{{ .Token }}` |
| 13 | PGlite-tests heten "gesimuleerd". `docs/pro-accounts.md` krijgt een SQL-rooktest om na de installatie in Supabase te draaien |
| 14 | **Scope:** team blijft, maar minimaal (uitnodigingslink, geen mail). Het auditlog blijft, omdat het goedkoop is en vertrouwen geeft aan kantoren. Beheer wordt één pagina: read-only cijfers plus drie acties (verlengen tot pilot, actief, opgezegd). Mollie blijft Should (een account is nodig) |
| 15 | `pro_profielen` verliest `abonnement` en `proef_eind`. De migratie wordt herschreven (er draait nog geen database). "Verlopen" wordt afgeleid, niet opgeslagen |
| 16 | De laatste eigenaar kan niet vertrekken zolang er leden zijn; hij draagt eerst over via `eigendom_overdragen`. De foreign keys van `audit_log` zijn `on delete set null`. Een verlopen proef zonder omzetting wordt na 90 dagen gewist (de mail vooraf komt pas met Brevo, anders een melding in de app) |
| 17 | De outbox krijgt een `id` (uuid, unique; idempotent) en een sleutel per `user_id`, gewist bij uitloggen. `controle_opslaan` staat maximaal 50 keer per dag per organisatie toe, en het aantal cliënten maximaal 10.000 (gelijk aan R4) |
| 18 | Web3Forms vervalt. Zonder Supabase: "mail naar info@toeslagbuddy.nl". In het stappenplan: antwoorden als info@ (send-as) |
| 19 | **Engels:** de check, de rekenhulpen, de 5 kernpagina's, privacy, contact, een Engelse Pro-landingspagina (samenvatting, "de app is in het Nederlands") en Engelse persona-uitleg in de getekende speler (spraak en-GB, alleen lokale stemmen). De voorwaarden alleen in het Nederlands, met een Engelse samenvatting ("de Nederlandse tekst is bindend"). Signaal- en foutteksten uit `src/calc` gaan via i18n. Review van het Engels door een moedertaalspreker staat op jouw lijst |

### Klein: overgenomen
- §7 aangepast:
  - "15 minuten" wordt 1–2 uur;
  - MFA na de inschrijving van de factor;
  - "dossierstuk";
  - een verzekering;
  - de jurist "vanaf € 1.000".
- In de code wordt "officiële rekenregels" overal "gebaseerd op de officiële rekenregels".
- Het KvK-nummer is **verplicht** bij de omzetting naar betaald (`beheer_abonnement_zetten` weigert zonder KvK).
- Extra rainy scenarios:

| # | Scenario | Verwacht gedrag |
|---|---|---|
| R21 | TOTP-telefoon kwijt | Herstelprocedure in de documentatie |
| R22 | JWT verlopen tijdens een lange sessie of offline | Automatisch verversen; lukt dat niet, dan terug naar de code-invoer, en de tellingen blijven in de outbox |
| R23 | Verwijderd lid met een open sessie | Elke functie controleert het lidmaatschap opnieuw → geweigerd |
| R24 | Uitnodiging voor iemand die al lid is van een organisatie | Nette fout |
| R25 | Proefstatus volgens de server | De server is leidend (`mijn_omgeving()` geeft `nu()` mee) |
| R26 | Upload van `.xlsx` | Melding "sla op als CSV" |
| R27 | Brevo-quota op | `doorgestuurd=false`, opnieuw proberen, zichtbaar in beheer |
| R28 | Project gepauzeerd of onbereikbaar | = R16 |
| R29 | Andere rekenversie dan de vorige controle | De trend markeert "niet vergelijkbaar" |

- `mijn_gegevens()` bevat ook de eigen auditregels en de berichten van het eigen e-mailadres.
- Na het verwijderen van het account wordt meteen uitgelogd. De JWT blijft technisch nog maximaal 1 uur geldig, maar elke functie controleert of de gebruiker nog bestaat.

**Oordeel na de verwerking:** haalbaar in één bouwronde, met eerlijke claims. De grootste resterende risico's liggen buiten de code:
- nul klanten: de pilotgesprekken zijn jouw werk;
- de accounts (Supabase Pro, Brevo, DNS) die jij moet aanmaken;
- de juridische toets.
