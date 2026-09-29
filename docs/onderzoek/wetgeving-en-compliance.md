# Wet- en regelgeving en compliance voor ToeslagBuddy

*Stand: 29-09-2026. Dit is een verkennend onderzoek en **geen juridisch advies**. De bronnen zijn via zoekmachines gevonden; wetten.overheid.nl en de sites van leveranciers konden niet rechtstreeks worden geopend. Laat de punten met **[onzeker]** en de voorwaarden vóór de lancering van de betaalde versie controleren door een privacyjurist of advocaat.*

## 0. Samenvatting

De architectuur (rekenen in de browser, gegevens in de EU-regio van Supabase) is vanuit privacy sterk. De grootste risico's zitten in vier dingen: **derde partijen die meedraaien op pagina's met cliëntgegevens** (AdSense, spraak), **Web3Forms (India)**, **ontbrekende bedrijfsgegevens en een onvolledige privacyverklaring**, en de **geplande serveropslag voor Pro**. Die opslag maakt ToeslagBuddy verwerker voor gegevens van kwetsbare mensen.

## 1. AVG

### 1.1 Rollen per datastroom

| Datastroom | Rol ToeslagBuddy | Grondslag (art. 6 AVG) | Leverancier, locatie | Advies bewaartermijn |
|---|---|---|---|---|
| Berekeningen consumenten (browser) | Geen verwerking zolang er niets naar de server gaat | – | – | – |
| Cliënt-CSV van bewindvoerders (browser) | Geen verwerker zolang er niets naar de server gaat; de bewindvoerder is verwerkingsverantwoordelijke | Voor de bewindvoerder: wettelijke taak of overeenkomst | – | – |
| Pro-account (naam, organisatie, e-mail, aantal cliënten, proef/abonnement) | Verwerkingsverantwoordelijke | Overeenkomst (b) | Supabase Inc. (VS), regio Frankfurt | Looptijd + 2 jaar. Facturen 7 jaar (fiscale bewaarplicht). |
| Formulieren (contact, pilot, abonnement, wachtlijst) | Verwerkingsverantwoordelijke | Precontractueel (b) of gerechtvaardigd belang (f) | Web3Forms (Web3Creative, India), AWS | 12 maanden. Wachtlijst: tot lancering + 3 maanden. |
| Doorsturen van mail naar info@ | Verwerkingsverantwoordelijke | f | ImprovMX **[onzeker: vestiging niet onderzocht]** | Kort |
| Inloglinks per e-mail | Verwerkingsverantwoordelijke | b | Supabase en eventueel een SMTP-dienst (Brevo, Frankrijk: EU; Resend: VS) | Logboek 30–90 dagen |
| Hosting, IP-logboeken | Verwerkingsverantwoordelijke (GitHub waarschijnlijk verwerker) **[onzeker]** | f (beveiliging) | GitHub Inc. (VS, DPF) | Bepaald door GitHub |
| Statistieken | Verwerkingsverantwoordelijke | f | Plausible (EU, Hetzner DE) of GoatCounter (EU) | Alleen totalen |
| AdSense | Gezamenlijk of zelfstandig verantwoordelijk naast Google | Toestemming (a) + Tw 11.7a | Google (VS, DPF) | Bepaald door Google |
| AI-video's (HeyGen) | Geen persoonsgegevens van bezoekers | – | HeyGen (Los Angeles) | – |
| Gepland: rapportages per organisatie, auditlog | **Verwerker** voor cliëntgegevens; verantwoordelijke voor het auditlog van eigen gebruikers | Voor de klant: wettelijke taak. Auditlog: f | Supabase | Klant bepaalt (verwerkersovereenkomst). Auditlog 1 jaar. |

**Let op, pseudonimisering:** een cliëntnummer blijft een persoonsgegeven voor de bewindvoerder, die het nummer kan herleiden ([overweging 26 AVG; ICTRecht](https://www.ictrecht.nl/blog/pseudonimisering-onder-de-loep-persoonsgegevens-voor-de-%C3%A9%C3%A9n-anoniem-voor-de-ander)). Slaat ToeslagBuddy rapportages op per cliëntnummer, dan is het verwerker. Alleen echt geaggregeerde cijfers per organisatie (bijvoorbeeld "12 signalen, € 8.400 totaal", met een minimale groepsgrootte) zijn waarschijnlijk geen persoonsgegevens **[onzeker: randgeval]**.

### 1.2 Rechten van betrokkenen
- Inzage en export (art. 15 en 20): een knop "Mijn gegevens downloaden" (JSON) in `/pro/app/`. Tot die er is: handmatig, binnen 1 maand.
- Verwijdering (art. 17): een knop "Account verwijderen". Die wist `auth.users`, en via de cascade ook `pro_profielen`. Verwijder daarnaast de formulierberichten in je mailbox en bij Web3Forms.
- Correctie (art. 16): dit kan al voor naam, organisatie en aantal cliënten. Het e-mailadres wijzigen gaat via Supabase Auth.

### 1.3 Verwerkingsregister, DPIA en datalekken
- **Register (art. 30):** de uitzondering voor organisaties met minder dan 250 medewerkers geldt niet bij verwerkingen die niet incidenteel zijn. Accountbeheer is structureel, dus maak een eenvoudig register (tabel 1.1 is een goed begin).
- **DPIA (art. 35):** voor de huidige opzet is een DPIA niet verplicht: er worden geen cliëntgegevens op de server bewaard. Voor de **geplande opslag van rapportages** wel waarschijnlijk. De [AP-lijst van verplichte DPIA's](https://www.autoriteitpersoonsgegevens.nl/documenten/lijst-verplichte-dpia) noemt het grootschalig verwerken van gegevens waaruit de financiële situatie blijkt, en de betrokkenen zijn kwetsbaar (onder bewind). De DPIA is primair de plicht van de bewindvoerder als verantwoordelijke; ToeslagBuddy moet meewerken (art. 28 lid 3 f). Advies: schrijf een modelversie (een "pre-DPIA") die klanten kunnen hergebruiken.
- **Datalekken (art. 33 en 34):** melden bij de AP binnen 72 uur als er risico is. Registreer alle incidenten intern ([AP](https://www.autoriteitpersoonsgegevens.nl/en/themes/security/data-breaches/this-is-how-you-report-a-data-breach)). Als verwerker (straks) meld je een lek "zonder onredelijke vertraging" aan de bewindvoerder. Leg een termijn vast, bijvoorbeeld 24 uur.

### 1.4 Verwerkersovereenkomsten en doorgifte buiten de EU

| Leverancier | Verwerkersovereenkomst | Doorgifte | Beoordeling |
|---|---|---|---|
| **Supabase** | [DPA](https://supabase.com/legal/dpa) geldt door het accepteren van de voorwaarden; er wordt niet apart getekend. Leg versie en datum vast. | Data in Frankfurt, maar het moederbedrijf zit in de VS (CLOUD Act). Doorgifte via SCC's. Supabase staat volgens een secundaire bron niet op de DPF-lijst **[onzeker]** ([bron](https://github.com/orgs/supabase/discussions/2341)). | Aanvaardbaar voor accountgegevens. Voor opgeslagen cliëntrapportages: benoem het risico in de DPIA en overweeg een EU-eigen alternatief. |
| **Web3Forms** | [DPA](https://web3forms.com/dpa) beschikbaar | Web3Creative zit in **Kerala, India**, met data op AWS in een onbekende regio. India heeft geen adequaatheidsbesluit, dus SCC's plus een eigen transfer impact assessment zijn nodig ([privacy](https://web3forms.com/privacy)). Standaardbewaring is 3 jaar. | **Probleem.** Pro-aanvragen en contactberichten kunnen gevoelige inhoud bevatten. Vervangen door een EU-dienst (bijvoorbeeld [Tally, België](https://tally.so/help/best-gdpr-form-builders) of Formbricks, Duitsland) of door een eigen Supabase-functie met EU-SMTP (Brevo). Stel tot die tijd de bewaartermijn bij Web3Forms in op 7 dagen. |
| **HeyGen** | [DPA](https://www.heygen.com/data-processing-addendum); [DPF-gecertificeerd plus SCC's](https://www.heygen.com/gdpr-compliant) | VS | Er gaan geen persoonsgegevens van bezoekers naar HeyGen, dus beperkt relevant. EU/UK-alternatief: Synthesia (Londen; het VK heeft een adequaatheidsbesluit). |
| **Plausible / GoatCounter** | [Plausible DPA](https://plausible.io/dpa); GoatCounter: [GDPR-pagina](https://www.goatcounter.com/help/gdpr) | Alleen EU ([Plausible](https://plausible.io/eu-hosted-web-analytics)) | In orde |
| **GitHub Pages** | De [DPA](https://github.com/customer-terms/github-data-protection-agreement) dekt bij gratis accounts mogelijk niet Pages **[onzeker]** | VS, DPF | Pages logt IP-adressen ([bron](https://github.com/orgs/community/discussions/22277)). Noem dit in de privacyverklaring, of kies de TransIP-route (NL) die al in de repo zit. |
| Mollie (gepland) | Verwerkersovereenkomst sluiten | NL | In orde |

## 2. BSN

Het BSN mag alleen worden gebruikt als een wet dat uitdrukkelijk regelt (art. 46 UAVG; Wabb, [wetten.nl](https://wetten.overheid.nl/BWBR0022428/); [uitleg](https://deprivacyexperts.nl/het-gebruik-van-het-bsn-juridische-kaders-praktijk-en-de-rol-van-de-functionaris-gegevensbescherming/)). Een bewindvoerder mag het BSN gebruiken in contact met overheidsinstanties die het nummer vereisen. **Een commerciële rekentool heeft geen eigen grondslag.** Een toeslagenberekening heeft het BSN ook niet nodig.

Gevolgen voor de CSV-import (`src/calc/pro.js`):
- Nu staat er alleen een hint: "Eigen cliëntnummer (geen naam of BSN)". `leesCsv` leest **alle** kolommen in, dus ook een kolom `bsn` of `naam`. Staat er een BSN in de kolom `clientnr`, dan komt het in de gedownloade actielijst.
- **Moet:** kolommen als `bsn`, `burgerservicenummer`, `naam` en `geboortedatum` herkennen en direct weggooien, met een melding. Waarden in `clientnr` die bestaan uit 9 cijfers en voldoen aan de elfproef weigeren of maskeren.
- Zolang niets de browser verlaat, verwerkt ToeslagBuddy het BSN niet zelf. Bij de geplande serveropslag moet het BSN technisch onmogelijk zijn.

## 3. Bewindvoerders

- Het [Besluit kwaliteitseisen CBM](https://wetten.overheid.nl/BWBR0034760) (gewijzigd in [Stb. 2021, 469](https://zoek.officielebekendmakingen.nl/stb-2021-469.html) en [Stb. 2024, 444](https://zoek.officielebekendmakingen.nl/stb-2024-444.html)) stelt eisen aan opleiding, integriteit, dossiervorming, klachtenregeling en bedrijfsvoering. De naleving wordt jaarlijks getoetst door het [LKB](https://www.rechtspraak.nl/voor-advocaten-en-juristen/reglementen-procedures-en-formulieren/civiel/curatele-bewind-en-mentorschap/landelijk-kwaliteitsbureau-cbm) en via het [accountantsprotocol](https://www.nba.nl/wet--en-regelgeving/controleprotocollen/ministeries/justitie-en-veiligheid/cbm/). **[onzeker]** Ik heb geen concrete IT-eisen aan software gevonden. De eisen aan bedrijfsvoering en privacy (privacyreglement, zorgvuldige omgang met dossiers) landen in de praktijk bij leveranciers als vragen om een verwerkersovereenkomst, een beschrijving van de beveiliging en soms ISO 27001 of ISAE 3402. Branchevereniging BPBI heeft een eigen [kwaliteitsverordening](https://www.bpbi.nl/themas/kwaliteit/kwaliteit-2020/).
- **Geheimhouding:** bewindvoerders hebben een geheimhoudingsplicht tegenover hun cliënt. Van ToeslagBuddy verwachten ze een geheimhoudingsclausule en, zodra er serveropslag is, een verwerkersovereenkomst.
- **Wat klanten zullen vragen:** (1) een verwerkersovereenkomst of de schriftelijke bevestiging "wij zijn geen verwerker" met technische onderbouwing, (2) een beveiligingsfactsheet, (3) waar de data staat, (4) of het rapport bruikbaar is als dossierstuk. Het FAQ-antwoord "Wij verwerken geen persoonsgegevens" klopt voor cliënten, maar niet voor de accounts van de bewindvoerders zelf. Formuleer het nauwkeuriger.

## 4. AI-verordening

- **Art. 50 lid 4 (deepfakes):** geldt sinds 2 augustus 2026 en is niet uitgesteld door de Digital Omnibus ([EC FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)). Volgens de definitieve richtsnoeren van 20 juli 2026 is een **fotorealistische fictieve persoon ook een deepfake** ([Greenberg Traurig](https://www.gtlaw.com/en/insights/2026/6/deepfakes-chatbots-ai-generated-text-european-commission-details-transparency-obligations-under-the-ai-act); [Bird & Bird](https://www.twobirds.com/en/insights/2026/european-commission-adopts-final-guidelines-on-ai-act-article-50-transparency-obligations-first-impr)). De bestaande maatregelen voldoen: een zichtbaar label, een tekst onder de video en metadata (`public/js/persona.js`, e2e-test). **Zou moeten:** hetzelfde label in elke Instagram- of TikTok-post, en daarnaast het AI-label van het platform aanzetten.
- **Art. 50 lid 2** (machineleesbare markering) is een plicht van de aanbieder, HeyGen. De eigen metadata is een extra.
- **Chatbot (art. 50 lid 1):** komt er een chat, meld dan bij de start duidelijk "Je praat met een AI". Geef geen persoonlijk advies alsof het van een mens komt.
- **Art. 4 (AI-geletterdheid):** geldt al. Voor een eenmanszaak is een korte notitie over hoe AI wordt gebruikt voldoende.

## 5. Cookies, advertenties en affiliate

- **Telecommunicatiewet art. 11.7a** geldt voor cookies, `localStorage` en scripts ([ACM](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/online-beinvloeden/cookies-plaatsen)). Functionele opslag (de Supabase-sessie, de zzp-geschiedenis op verzoek van de gebruiker) is toegestaan zonder toestemming. Vermeld dit wel. Plausible en GoatCounter werken zonder cookies: geen toestemming nodig, wel informeren.
- **AdSense:** in de EER is een **door Google gecertificeerde CMP met IAB TCF** verplicht, en sinds 28-02-2026 **TCF v2.3** ([Google](https://support.google.com/adsense/answer/13554116?hl=en); [Kukie](https://kukie.io/blog/google-adsense-cookie-consent)). De CMP van Google zelf ("Privacy en berichten") volstaat. Zonder toestemming krijg je Limited Ads. Consent Mode v2 regelt de CMP.
- **Kritiek (code):** `adsenseHead()` wordt in `src/site/layout.js` op **alle** pagina's geladen, ook op `/pro/app/` en `/pro/check/`, waar cliëntgegevens in de DOM staan, en op de rekenpagina's. Een advertentiescript van derden kan de pagina lezen. **Moet:** geen advertentie- of statistiekscripts op de Pro-pagina's, en een Content-Security-Policy (via een `<meta>`-tag, want GitHub Pages ondersteunt geen headers). De privacytekst "er gaat niets naar een server" klopt alleen als er op die pagina's geen scripts van derden draaien.
- **Spraak (bevinding):** `persona.js` gebruikt de Web Speech API. In Chrome zijn de "Google"-stemmen netwerkstemmen, waardoor de uitgesproken zin **mogelijk met de persoonlijke bedragen naar Google gaat** **[onzeker, afhankelijk van de browser]**. Kies alleen stemmen met `localService === true`.
- **Affiliate:** de [Reclamecode Social Media & Influencer Marketing](https://ondernemersplein.overheid.nl/wetten-en-regels/reclameregels-voor-social-media-influencer-marketing/) is herzien per 1 juli 2026 ([DDMA](https://ddma.nl/kennisbank/nieuwe-regels-voor-influencer-marketing-dit-verandert-er-vanaf-1-juli-2026/)) en eist een duidelijke vermelding, ook bij affiliatelinks. Op de site is het label "partnerlink" in orde. Op Instagram: `#adv` of "Bevat partnerlinks" aan het begin van de post. Kinderopvang- of zorgverzekeringsadvies mag niet sturend zijn richting de partner (misleiding, art. 6:193c BW).

## 6. Consumentenrecht en B2B-voorwaarden

- **Pro is B2B.** Herroepingsrecht, Wet prijsaanduiding en de opzegknop voor consumenten gelden niet. Prijzen **exclusief btw** zijn toegestaan als duidelijk is dat het aanbod voor zakelijke klanten is. Maak dat expliciet ("alleen voor organisaties; vul je KvK-nummer in"), want vrijwillige budgetcoaches kunnen consumenten zijn.
- **Algemene voorwaarden:** vóór of bij het sluiten van de overeenkomst ter hand stellen (art. 6:233–234 BW); aanvinken met een link is gebruikelijk, bied daarnaast een download aan. Door **reflexwerking** kunnen kleine bewindvoerderskantoren toch beroep doen op de grijze lijst ([KVdL](https://kvdl.com/en/articles/consequential-effect-black-and-grey-list-for-non-consumers)). Houd de beperking van de aansprakelijkheid redelijk: 12 maanden abonnementsgeld plus een uitzondering voor opzet en bewuste roekeloosheid.
- **Wat ontbreekt in `/pro/voorwaarden/`:** identiteit en KvK-nummer, opzegtermijn en -wijze, hoe betaling en facturering werken, prijswijzigingen, beschikbaarheid, geheimhouding, verwerkersrol, toepasselijk recht en forum.
- **Proef:** loopt vanzelf af zonder omzetting naar een betaald abonnement. Dat is goed en voorkomt het risico van een abonnementsval.
- **Toeslagbewaker Plus voor zzp'ers (gepland):** toeslagen zijn een privézaak, dus zzp'ers zijn hier vaak **consument**. Dan gelden prijzen inclusief btw, informatie over herroeping (bij digitale diensten), **de verplichte opzeg- of herroepingsknop sinds 19-06-2026** (art. 6:230oa BW, [NRTO](https://www.nrto.nl/nieuws/let-op-vanaf-19-juni-is-een-herroepingsknop-verplicht-indien-u-zakendoet-met-consumenten)) en na stilzwijgende verlenging maandelijkse opzegbaarheid.
- **Art. 3:15d BW (bedrijfsgegevens):** naam, vestigingsadres, **e-mailadres**, KvK-nummer en btw-id moeten eenvoudig en permanent te vinden zijn ([ICTRecht](https://www.ictrecht.nl/blog/de-5-belangrijkste-informatieplichten-deel-1-bedrijfsgegevens)). Het ontwerp "geen enkel e-mailadres op de site" (`docs/email.md`, en een e2e-test die dat afdwingt) **botst hiermee**. **Moet:** in de footer en de colofon komen `info@toeslagbuddy.nl`, het KvK-nummer en het btw-identificatienummer (niet het omzetbelastingnummer, dat bij een eenmanszaak herleidbaar kan zijn tot het BSN). Pas de e2e-test daarop aan.

## 7. Toegankelijkheid

De [Toegankelijkheidswet (EAA)](https://ondernemersplein.overheid.nl/wetten-en-regels/regels-voor-digitale-toegankelijkheid/) geldt sinds 28-06-2025 voor onder meer e-commercediensten aan consumenten. **Micro-ondernemingen** (minder dan 10 medewerkers en maximaal € 2 mln omzet of balanstotaal) zijn vrijgesteld van de eisen voor diensten. Pro is B2B en valt daar sowieso buiten. **Conclusie:** nu niet verplicht **[onzeker bij groei of bij een consumentenabonnement]**. De norm is WCAG 2.1 AA (EN 301 549). De e2e-test gebruikt al axe met `wcag2a` en `wcag2aa`. Dat is goed, maar niet volledig: doe ook een handmatige toetsenbord- en schermlezercheck. Gemeenten en andere overheidsklanten ("Organisatie"-tarief) eisen vaak WCAG 2.1 AA via aanbestedingen.

## 8. Aansprakelijkheid en de schijn van overheid

- **Foutieve berekening:** een disclaimer ("indicatie, geen rechten") helpt, maar sluit aansprakelijkheid niet volledig uit. Tegenover consumenten is een volledige uitsluiting vaak onredelijk bezwarend (art. 6:237 f BW). Bij grove fouten in de rekenregels blijft onrechtmatige daad mogelijk (art. 6:162 BW). **Mitigatie:** bronnen en controledatum per parameter (al aanwezig in `params.js`), tests op officiële voorbeelden (aanwezig), een versienummer en datum op het Pro-rapport, snel herstel met een wijzigingslog, en een **beroepsaansprakelijkheidsverzekering** (zie §10). Vermijd claims als "officiële rekenregels" als die niet 100% worden gevolgd: de kinderopvangtoeslag is een benadering (zie de README). Zeg "gebaseerd op" en noem de beperkingen.
- **Geen overheidslook:** het rijkslogo en de Rijkshuisstijl zijn voorbehouden aan het Rijk ([rijkshuisstijl.nl](https://www.rijkshuisstijl.nl/over-de-rijkshuisstijl/auteursrecht-rijkshuisstijl)). Een site die op de overheid lijkt, kan misleidend zijn (art. 6:193c BW; ACM). De huidige site heeft een eigen stijl en een disclaimer in de footer ("hoort niet bij de Belastingdienst"). Dat is goed. Vermijd de kleur rijksblauw met een lintlogo, "toeslagen.nl"-achtige domeinen, en het woord "officieel" in titels en advertenties. Laat affiliate- en advertentieblokken niet lijken op een stap in een aanvraag.

## 9. Beveiliging (proportioneel)

Art. 32 AVG eist passende maatregelen. De Cyberbeveiligingswet (NIS2, in werking sinds 15-08-2026) geldt **niet** voor deze schaal ([NCSC](https://www.ncsc.nl/cyberbeveiligingswet-nis2)), maar klanten kunnen de eisen via hun contracten doorgeven.
- **Aanwezig:** RLS en kolomrechten in de migratie, inloggen zonder wachtwoord, HTTPS, HSTS en beveiligingsheaders in `.htaccess` (alleen bij TransIP, niet bij GitHub Pages).
- **Moet:** MFA op GitHub, Supabase, Google, Web3Forms, HeyGen, de domeinregistrar en de mailbox. De `service_role`-sleutel nooit in de repo. Back-ups en herstel testen. Een schriftelijk datalekproces.
- **Zou moeten:** een CSP via een meta-tag; Subresource Integrity voor scripts van derden; `/.well-known/security.txt` ([RFC 9116](https://www.rfc-editor.org/info/rfc9116/)) met een beleid voor gecoördineerde meldingen; een auditlog van beheerdershandelingen (wijzigingen van `abonnement` en `proef_eind`); bescherming tegen CSV-formule-injectie in de actielijst (cellen die beginnen met `=`, `+`, `-` of `@` voorzien van een voorloopteken); een jaarlijkse zelftest (OWASP ASVS niveau 1). Een externe pentest pas zodra cliëntgegevens op de server worden bewaard of een grotere klant erom vraagt.

## 10. Checklist

| # | Actie | Niveau | Huidige status (op basis van de code) |
|---|---|---|---|
| 1 | Geen scripts van derden (AdSense, statistieken) op `/pro/*` | Moet | **Niet in orde:** `adsenseHead()` staat op alle pagina's |
| 2 | Bedrijfsgegevens (naam, adres, e-mail, KvK, btw-id) in de footer (art. 3:15d BW) | Moet | **Ontbreekt;** een test verbiedt het e-mailadres |
| 3 | Volledige privacyverklaring: identiteit, Pro-accounts, Supabase, Web3Forms, GitHub, ImprovMX, bewaartermijnen, rechten, klachtrecht bij de AP | Moet | **Onvolledig** (`/privacy/`) |
| 4 | Verwerkingsregister | Moet | Ontbreekt (tabel 1.1 is een aanzet) |
| 5 | Verwerkersovereenkomsten vastleggen (Supabase, Plausible, Web3Forms, Mollie) | Moet | Onbekend; Supabase via de voorwaarden |
| 6 | Web3Forms vervangen door een EU-dienst, of een transfer impact assessment plus bewaartermijn 7 dagen | Moet | Web3Forms actief in de configuratie |
| 7 | BSN- en naamkolommen weigeren of verwijderen bij import; elfproef-check op `clientnr` | Moet | Alleen een hint in de tekst |
| 8 | Gecertificeerde CMP met TCF v2.3 vóór AdSense | Moet (bij AdSense) | Vermeld in de README; AdSense staat nu uit |
| 9 | AI-label op video's | Moet | **In orde** (label, tekst, metadata, test) |
| 10 | AI-label en `#adv` in social posts | Moet | Niet gecontroleerd |
| 11 | Pro-voorwaarden uitbreiden (identiteit, opzegging, geheimhouding, forum, uitzondering bij opzet) | Moet | Summier |
| 12 | MFA op alle beheeraccounts | Moet | Niet te zien in de code |
| 13 | Datalekprocedure en incidentenregister | Moet | Ontbreekt |
| 14 | Verwerkersovereenkomst plus modelversie van de DPIA vóór opslag van rapportages | Moet (bij de geplande functie) | Nog niet gebouwd |
| 15 | Alleen lokale stemmen (`localService`) | Zou moeten | Kiest de eerste Nederlandse stem |
| 16 | Knoppen voor export en verwijderen van het account | Zou moeten | Ontbreken |
| 17 | CSP-meta-tag, security.txt, formule-injectie tegengaan | Zou moeten | Ontbreken |
| 18 | Hosting in de EU (TransIP) in plaats van GitHub Pages | Zou moeten | TransIP-route is beschikbaar |
| 19 | Handmatige WCAG 2.1 AA-check | Zou moeten | axe AA-test aanwezig |
| 20 | Beveiligingsfactsheet voor bewindvoerders | Zou moeten | Ontbreekt |
| 21 | FAQ "wij verwerken geen persoonsgegevens" nauwkeuriger maken | Zou moeten | Te stellig |
| 22 | Consumentenregels (btw, opzegknop) bij Toeslagbewaker Plus | Moet (bij lancering) | Gepland |

## 11. Niet technisch op te lossen, en de mitigatie

| Risico | Mitigatie |
|---|---|
| Een bewindvoerder zet toch een BSN of naam in het bestand, of bewaart de actielijst onveilig | Filter en waarschuwing (punt 7), gebruiksvoorwaarden die dit verbieden, en in de handleiding "sla de export op in je dossiersysteem" |
| De CLOUD Act bij Amerikaanse leveranciers (Supabase, GitHub, Google) | Minimaal opslaan, EU-regio, SCC's en DPF, en het risico benoemen in de DPIA. Bij gevoelige serveropslag een EU-eigen alternatief. |
| Een fout in de rekenregels leidt tot schade | Beroeps- en bedrijfsaansprakelijkheidsverzekering (voor IT of adviesdiensten), limiet in de voorwaarden, versiebeheer van de regels, jaarlijkse vier-ogencontrole |
| De rol van ToeslagBuddy wordt verkeerd ingeschat bij toekomstige functies | Voor elke nieuwe functie die gegevens opslaat een korte privacytoets ("privacy by design", art. 25) |
| Uitleg van regels verandert (AP, ACM, AI-richtsnoeren) | Deze notitie elk halfjaar herzien; meldingen van AP en ACM volgen |
| Sociale media: reposts zonder AI-label | Label in de video zelf inbranden |
| Afhankelijkheid van één persoon (beheer, datalek in de vakantie) | Een tweede contactpersoon of een noodprocedure, met de sleutels in een wachtwoordkluis |

*Nogmaals: dit document is geen juridisch advies. Laat de voorwaarden, de privacyverklaring en de verwerkersovereenkomst vóór de eerste betalende klant beoordelen door een jurist.*
