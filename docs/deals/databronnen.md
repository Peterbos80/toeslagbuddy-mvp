# Databronnen DealBuddy: waar halen we prijzen en verzendkosten vandaan?

**Stand: 8 november 2026.** Onderzocht met alleen een webzoekmachine. Controleer voorwaarden en prijzen bij de bron voordat je een account aanmaakt. **[aanname]** = niet bevestigd. Dit is geen juridisch advies. Laat de juridische kaart (§5) toetsen door een IT-jurist voordat je groot gaat crawlen.

## 1. Overzicht van bronnen

| Bron | Wat krijg je | Toegang | Kosten | Versheid | Licentie / regels |
|---|---|---|---|---|---|
| **bol.com partnerprogramma: productfeed** | Alle producten per productgroep (CSV/XML). Kolom laat zien of bol of een partner verkoopt | Partneraccount (gratis), via FTP ([bol API-docs](https://api.bol.com/marketing/docs/product-feed/index.html)) | Gratis | **Elke 2 uur** ververst | Alleen gebruiken om naar bol te linken met jouw partnerlink |
| **Daisycon** | Productfeeds per campagne (niet elke campagne heeft er een) ([Daisycon](https://daisycon.com/nl/campagnes/20758-voordeelmarkt-nl)) | Publisheraccount, site wordt met de hand gekeurd ([Daisycon-gids](https://daisycon.com/affiliate-marketing-guide/part-3)) | Gratis | Per adverteerder, vaak dagelijks **[aanname]** | Per campagne goedkeuring nodig. Cookie vaak 24 uur |
| **TradeTracker** | Productfeeds, ook in Google Shopping-formaat | Gratis account, site wordt gekeurd ([TradeTracker](https://tradetracker.com/benl/knowledge-centre/gdpr/)) | Gratis | Per adverteerder | Uitbetaling tot 2× per maand |
| **Awin** | Productfeeds (CSV/XML) van onder andere ICI Paris XL, Flaconi en Parfumdreams ([Awin](https://ui.awin.com/merchant-profile/84311)) | Publisheraccount. Awin vraagt vaak een kleine borg bij aanmelden **[aanname]** | Gratis tot laag | Dagelijks **[aanname]** | Per adverteerder goedkeuring. Let op couponregels |
| **Travelpayouts: Aviasales Data API** | Vluchtprijzen uit de cache (zoekgeschiedenis van gebruikers), endpoints zoals `prices_for_dates` ([Travelpayouts](https://support.travelpayouts.com/hc/en-us/articles/203956163)) | Gratis account + koppeling Aviasales-programma ([vereisten](https://support.travelpayouts.com/hc/en-us/articles/203956083-Requirements-for-Aviasales-data-API-access)) | Gratis | **2–7 dagen oud** (cache) | Data per markt. Live Search API pas vanaf 50.000 maandelijkse gebruikers |
| **Skyscanner Affiliate / Travel API** | Live prijzen, plus "indicatieve" prijzen | Alleen voor goedgekeurde partners, via impact.com ([Skyscanner Partner Support](https://skyscannerpartnersupport.zendesk.com/hc/en-us/articles/4687312848797-Which-services-can-I-access-and-what-are-the-rate-limits)) | Geen kosten per call | Live | Mogelijk pas vanaf 100.000 gebruikers per maand **[onzeker]**. Cachen mogelijk verboden |
| **Kiwi.com Tequila** | Vluchten incl. virtueel combineren | **Alleen op uitnodiging** sinds mei 2024 ([Kiwi.com](https://media.kiwi.com/articles-and-interviews/better-for-business-kiwi-com-takes-a-new-approach-to-partnerships/)) | n.v.t. | Live | Voor ons nu niet bereikbaar |
| **Amadeus Self-Service** | Vluchtzoek-API's | **Gestopt op 17 juli 2026.** Alleen Enterprise blijft bestaan ([PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers), [Skift](https://skift.com/2026/09/03/amadeus-brings-travel-tech-into-claude/)) | Enterprise-contract | Live | Niet geschikt |
| **Duffel** | Live aanbiedingen van airlines (NDC) en boeken | Self-service. Een bron meldt dat nieuwe ontwikkelaars sinds juli 2026 geen gratis sandbox meer krijgen **[onzeker]** ([Duffel](https://duffel.com/pricing), [Geekflare](https://geekflare.com/guides/flight-booking-api/)) | $ 3 per boeking + 1%. Zoeken gratis tot 1.500 zoekopdrachten per boeking, daarboven $ 0,005 per zoekopdracht | Live | Bedoeld om **te boeken**, niet als prijsvergelijker. Past pas in v2 |
| **Keepa API** | Prijshistorie Amazon (ook Amazon.nl) | Betaald abonnement ([RevenueGeeks](https://revenuegeeks.com/software/keepa/api)) | Vanaf € 49 per maand (20 tokens per minuut; 1 token per product) | Bijna live | Alleen Amazon. Lees de licentie over het tonen van grafieken |
| **SerpApi (Google Shopping)** | Google Shopping-resultaten als JSON | Account | Gratis 250 zoekopdrachten per maand; vanaf $ 25 per 1.000 ([vergelijking](https://apiserpent.com/blog/serpapi-pricing-explained)) | Live | Je gebruikt Google-resultaten via een derde. Juridisch grijs; alleen ter controle |
| **Google Merchant / Content API** | Alleen je **eigen** producten | Voor winkels | — | — | **Geen** publieke prijs-API voor andermans producten |
| **Tweakers, Pepper, Kieskeurig, Beslist** | — | **Geen publieke API** ([GitHub-project](https://github.com/tychobrouwer/tweakers-pricewatch)) | — | — | **Niet scrapen.** Hun prijsdatabase is waarschijnlijk beschermd (zie §5) |
| **Winkelpagina's (schema.org JSON-LD)** | `Product` + `Offer`: prijs, munt, voorraad, soms `shippingDetails` | Openbaar, geen account | Alleen serverkosten | Zo vaak als jij ophaalt | Feiten zijn vrij; let op robots.txt, voorwaarden en databankrecht |
| **Platform-endpoints** | Shopify `/products.json`, WooCommerce Store API `/wp-json/wc/store/v1/products` | Openbaar, zonder sleutel ([WooCommerce](https://developer.woocommerce.com/docs/apis/store-api/), [DEV](https://dev.to/shan_yun_ab0c7ad30b46ad2d/shopifys-open-secret-every-store-exposes-productsjson-30ni)) | Alleen serverkosten | Live | Winkels kunnen dit uitzetten. Shopify-endpoint is geen officieel contract |

## 2. Verzendkosten: het lastigste deel

Feeds hebben vaak een veld `shipping` of `delivery_costs`, maar dat is vaak leeg of verouderd **[aanname]**. Daarom gebruiken we vier lagen:

1. **Feedveld** (bol, Daisycon, Awin) of `OfferShippingDetails` in JSON-LD.
2. **Verzendregels per winkel** in onze eigen tabel. Bijvoorbeeld: "gratis vanaf € 20, anders € 4,95". Die vullen we één keer met de hand in en controleren we elke maand.
3. **Controle bij de kassa** alleen voor de top-3 in een alert. Dit kan alleen als het zonder inloggen kan, en nooit met nepbestellingen.
4. **Duidelijk tonen** wat we weten: "incl. verzending (bron: winkelregel, gecontroleerd 3 nov)". Weten we het niet, dan staat er "verzending onbekend". Zo'n deal telt niet mee voor het bewijs.

Vluchten: we tonen de prijs incl. belastingen. Bagage tonen we apart ("prijs zonder ruimbagage") **[aanname: niet altijd in de cache-data]**.

## 3. Aanpak in fases

| Fase | Wanneer | Bronnen | Wat de eigenaar moet doen | Kosten per maand |
|---|---|---|---|---|
| **0. Zonder account** | Nu (MVP, demo) | JSON-LD + Shopify/WooCommerce-endpoints van ±20 gekozen winkels, alleen voor producten op de watchlist. Een eigen verzendregeltabel | Niets. Wel: de pagina `/deals/crawler/` met contact en opt-out goedkeuren | € 0–6 (kleine server **[aanname]**) |
| **1. Gratis accounts** | Maand 1–2 | bol-productfeed, Daisycon, TradeTracker, Awin (parfum!), Travelpayouts Data API, Brevo (mail) | Accounts aanmaken op naam van het bedrijf (KvK nodig), site laten keuren, per winkel aanmelden. API-sleutels als geheimen opslaan, **nooit** in de repository | € 0 |
| **2. Betaald, klein** | Vanaf 1.000 actieve alerts | Keepa (€ 49), SerpApi als controle op ontbrekende winkels ($ 25–75), Brevo Starter | Budget vrijmaken, creditcard koppelen, maandlimiet instellen | € 80–150 |
| **3. Partnerschappen** | Vanaf 50.000 gebruikers per maand | Skyscanner Travel API, Travelpayouts Live Search, directe feeds van winkels | Gesprekken met partners, cijfers delen | Commissie, geen vaste kosten |

**Advies:** parfum en verzorging via Awin en Daisycon, algemene producten via bol, vluchten via Travelpayouts. Daarmee heb je in fase 1 al genoeg data voor echte bewijs-alerts, zonder één pagina te scrapen.

## 4. Live zoeken: snel én met bewijs

De eigenaar wil "de snelste terugkoppeling van de markt". Dat lukt alleen met **twee sporen tegelijk**.

```
Gebruiker zoekt "Dior Sauvage 100 ml"
  │
  ├─ Spoor 1: eigen index (feeds + eerdere metingen)  → antwoord binnen 0,3 s
  │     toont: gangbare prijs, laagste 30 dagen, top-10 aanbiedingen
  │
  └─ Spoor 2: live controle (parallel, met tijdslimiet 4 s)
        ├─ JSON-LD/API van de top-5 winkels uit spoor 1
        ├─ Travelpayouts (bij vluchten)
        └─ resultaten komen binnen via een stream (Server-Sent Events)
              → per regel een vinkje "nu gecontroleerd 14:02"
              → blijkt een prijs anders: regel bijwerken, nooit stil laten staan
```

**Regels voor de agents (crawlers op de achtergrond):**

- **Adaptieve frequentie.** Producten op veel watchlists en net onder de drempel: elke 15 min. Normale producten: elke 6–24 uur. Vluchten: 1–4× per dag (de cache is toch 2–7 dagen oud).
- **Feed eerst, pagina daarna.** Alleen als de feed een flinke prijsdaling laat zien, halen we de winkelpagina op ter **verificatie**. Dat scheelt 90% van de verzoeken **[aanname]**.
- **Wachtrij per domein.** Maximaal 1 verzoek per 5–10 seconden per winkel. Elke 429- of 503-fout verdubbelt de wachttijd.
- **Tijd tot alert** is onze kern-KPI: van "prijs gezien" tot "mail verstuurd" binnen 5 minuten, mét verificatie.

**Wat "snelste van de markt" eerlijk betekent:**

| Concurrent | Waar zij sneller of breder zijn | Waar wij sneller kunnen zijn |
|---|---|---|
| Google Shopping | Grootste index, ververst continu | Wij zijn sneller bij **jouw** drempel: zij sturen geen alert op "% onder gangbaar" |
| Tweakers Pricewatch | Duizenden tech-winkels, feeds van winkels | Parfum en vluchten; alert met verzending en bewijs |
| Skyscanner / Google Flights | Echt live vluchtprijzen | Wij zijn niet sneller in live zoeken. Wel in "is dit écht goedkoop voor deze route?" plus een eigen drempel |
| Pepper | Mensen melden error fares soms binnen minuten | Wij verifiëren automatisch en sturen alleen wat de cijfers bewijzen. Minder ruis |

**Kosten van live API's bij groei** (grove schatting **[aanname]**):

| Scenario | Live calls per dag | Via SerpApi (~$ 0,01 per call) | Via eigen JSON-LD-ophaling |
|---|---|---|---|
| 1.000 zoekopdrachten, 5 controles elk | 5.000 | ≈ $ 1.500 per maand | ≈ € 10 per maand serverkosten |
| 10.000 zoekopdrachten | 50.000 | ≈ $ 15.000 per maand (onbetaalbaar) | ≈ € 40 per maand + meer blokkades |

**Conclusie:** betaalde zoek-API's zijn alleen geschikt als **controle bij de top-3 van een alert**, niet voor elke zoekopdracht. Cache live-resultaten 10–15 minuten en deel ze tussen gebruikers.

## 5. Juridische kaart: crawlen (NL/EU, 2026)

### 5a. Toegestaan (laag risico)

| Wat | Waarom |
|---|---|
| Losse **feiten** van openbare pagina's (prijs, voorraad, verzendkosten) | Feiten zijn niet auteursrechtelijk beschermd |
| **Affiliate-feeds en API's** waarvoor je bent goedgekeurd | Uitdrukkelijke toestemming en licentie |
| Crawlen dat **robots.txt respecteert**, met een herkenbare bot-naam en contact-URL | Laat goede trouw zien. Robots.txt kan ook een tekst- en datamining-voorbehoud zijn (art. 4 DSM-richtlijn, art. 15o Auteurswet) ([Kluwer Copyright Blog](https://copyrightblog.kluweriplaw.com/2025/01/16/dpg-media-et-al-vs-howardshome-a-national-ruling-on-dsms-press-publishers-rights-and-tdm-exceptions/?output=pdf), [KVAN](https://www.kvan.nl/wp-content/uploads/2026/04/Kennisdocument-KVAN-Tekst-en-Datamining-in-de-Auteurswet.pdf)) |
| **Openbare platform-endpoints**: WooCommerce Store API (officieel zonder sleutel), Shopify `/products.json`, sitemaps, RSS | Door het platform openbaar gemaakt, bedoeld voor klantgerichte functies |
| **Doorlinken** naar de productpagina van de winkel | Stuurt verkeer naar de winkel; vervangt de winkel niet |

### 5b. Grijs gebied (kan, met maatregelen)

| Wat | Risico | Bron |
|---|---|---|
| Systematisch **een groot deel** van de catalogus van één winkel kopiëren | Databankrecht (sui generis) als de winkel substantieel investeerde in de databank | [CV-Online Latvia, C-762/19](https://www.scl.org/12290-cjeu-search-engine-copying-of-databases-infringes-sui-generis-right-where-it-adversely-affects-database-maker-investment/) |
| Een **gespecialiseerde metazoekmachine** die live de databank van een ander doorzoekt | Kan "hergebruik" zijn → inbreuk | [Innoweb / Wegener, C-202/12](https://www.ifj.org/media-centre/news/detail/category/authors-rights/article/use-of-meta-search-engine-for-data-scraping-infringes-eu-database-right-decides-cjeu) |
| Scrapen terwijl de **voorwaarden** het verbieden (browsewrap) | Contractbreuk, ook zonder databankrecht | [Ryanair / PR Aviation, C-30/14](https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case) |
| Teksten en foto's van producten overnemen | Auteursrecht. **Gebruik ze dus niet**; toon alleen naam, EAN, prijs en link | — |
| Namen van verkopers op marktplaatsen (dit kunnen personen zijn) | AVG | — |

**Hoe CV-Online ons helpt:** er is pas inbreuk als we de investering van de winkel **schaden**. Als we (1) per product ophalen en niet de hele catalogus, (2) altijd doorlinken naar de winkel en (3) de winkel klanten opleveren, is ons verhaal sterk **[aanname: juridisch laten toetsen]**.

### 5c. Niet doen (hoog risico)

| Wat | Waarom |
|---|---|
| **CAPTCHA's** (laten) oplossen | Het omzeilen van een beveiliging maakt toegang mogelijk "wederrechtelijk". Dat brengt ons dicht bij **computervredebreuk** (art. 138ab Sr: "binnendringen", onder andere met een "valse sleutel") ([art. 138ab](https://omgevingsweb.nl/wetgeving/wetboek-van-strafrecht/tweede-boek-misdrijven/titel-v-misdrijven-tegen-de-openbare-orde/artikel-138ab/)) **[aanname: geen rechtspraak gevonden over scrapen]** |
| **IP-rotatie of residential proxies** om een blokkade te ontwijken | De winkel heeft "nee" gezegd. Dit is bewuste omzeiling, ook voor het contract en het databankrecht |
| **Inloggen** met (nep)accounts, of nepbestellingen doen | Gaat voorbij de openbare pagina. Ook fraude-risico |
| **Browserfingerprint vervalsen**, je voordoen als Googlebot | Misleiding. Bewijs van kwade trouw |
| Zo vaak opvragen dat de site trager wordt | Kan onder art. 138b Sr vallen (toegang belemmeren door gegevens te sturen) **[aanname]** |
| **Google, Skyscanner, Tweakers of Pepper** scrapen (ook via fast-flights in productie) | Voorwaarden verbieden het. Dit zijn de databanken van concurrenten → Innoweb-risico |
| Doorgaan na een **sommatie** | Dan wordt opzet aantoonbaar |

### 5d. De meest offensieve strategie die we kunnen verdedigen: "Hunter"

De "hunter" is **snel en breed, maar netjes**:

1. **Feeds en API's eerst** (fase 1). Winkels in een affiliate-programma geven met hun feed zelf toestemming. Dit is je **witte lijst**.
2. **Openbare endpoints** daarna: WooCommerce Store API, Shopify `/products.json`, sitemaps, JSON-LD. Hiermee krijg je veel snelheid zonder trucs.
3. **Alleen watchlist-producten** crawlen, niet hele catalogi. Bewaar per meting alleen: URL, EAN, prijs, verzending, voorraad, tijdstip en een hash van de pagina.
4. **Herkenbare bot**: `DealBuddyBot/1.0 (+https://www.toeslagbuddy.nl/deals/crawler/)`. Op die pagina staat wat we ophalen, hoe vaak, en een **opt-out-formulier**. Een opt-out voeren we binnen 24 uur uit.
5. **Robots.txt** respecteren, ook `Crawl-delay`. Een blokkade (403, CAPTCHA) betekent: **stoppen** voor dat domein en een melding naar de eigenaar. Daarna vragen we de winkel om toestemming of een feed.
6. **Snelheid** halen we uit slim plannen (adaptieve frequentie, feed-signalen, gedeelde cache), **niet** uit meer verzoeken.
7. **Logboek** per verzoek (wanneer, wat, statuscode). Dit is je bewijs van netjes gedrag als er een klacht komt.
8. Benader winkels die veel verkeer van ons krijgen: "Wij stuurden u 300 klanten. Mag ik uw feed?" Zo wordt scrapen een partnerschap.

## 6. Bewijsdata per alert

Om een alert met **bewijs** te sturen, bewaren we per product een tijdreeks. Een deal is pas "bewezen" als alle regels kloppen:

| Regel | Standaard | Waarom |
|---|---|---|
| Minimaal aantal winkels met een actuele prijs | **≥ 2** (liefst ≥ 3) | Eén winkel kan zelf een "nepkorting" hebben |
| Historie | **≥ 30 dagen**, minimaal 10 metingen | Sluit aan op de 30-dagenregel |
| Gangbare prijs | **Mediaan** van de dagelijkse laagste totaalprijs (incl. verzending) per winkel, over 30–90 dagen | Een mediaan is ongevoelig voor uitschieters en nepprijzen |
| Laagste prijs laatste 30 dagen | Laagste totaalprijs over alle winkels | Toont of "nu" écht het laagst is |
| Drempel | Totaalprijs ≤ gangbaar × (1 − jouw %) | Jouw instelling |
| Verificatie | Prijs en voorraad live gecontroleerd **≤ 10 min** voor het versturen | Geen verlopen deals in je inbox |
| Zelfde product | EAN/GTIN + inhoud (bijv. 100 ml) + variant. Geen tester of refill | Voorkomt appels-met-peren |

Vluchten: "gangbaar" = mediaan voor dezelfde route, maand en reisduur uit de Travelpayouts-cache (60 dagen). Het bewijsniveau is hier lager, want het is één aggregator. Dat zetten we eerlijk in de mail: "Bewijsniveau: middel".

## 7. E-mail: Brevo

| Onderdeel | Keuze |
|---|---|
| Aanbieder | **Brevo** (Parijs). Data op EU-servers, AVG ([Brevo](https://www.brevo.com/marketing-platform), [review](https://www.sendx.io/blog/brevo-pricing-plans-costs-alternatives-2026)) |
| Kosten | Gratis: 300 mails per dag (met Brevo-logo). Starter vanaf ongeveer $ 9 per maand **[controleren]** |
| Soort mail | Alerts = **transactioneel** (de gebruiker vraagt erom), via de Brevo API |
| Afzender | Subdomein `alerts.toeslagbuddy.nl`, zodat problemen de gewone mail niet raken |

**Afleverbaarheid (verplicht bij Gmail, Yahoo en Outlook)** ([Bird](https://bird.com/docs/knowledge-base/deliverability/gmail-yahoo-requirements)):

1. **SPF**: Brevo toevoegen aan het bestaande SPF-record bij TransIP. Er mag maar **één** SPF-record zijn, dus samenvoegen en niet een tweede toevoegen (zie [hosting.md](../hosting.md)).
2. **DKIM**: de DKIM-records van Brevo toevoegen bij TransIP.
3. **DMARC**: begin met `v=DMARC1; p=none; rua=mailto:dmarc@toeslagbuddy.nl`. Na 4 weken zonder fouten naar `p=quarantine`.
4. **One-click afmelden** (`List-Unsubscribe` + RFC 8058) in elke mail. Afmelden binnen 2 dagen verwerken.
5. **Klachtenpercentage** onder 0,1% houden (de grens is 0,3%). Daarom: dubbele opt-in, maximaal 1 bundelmail per dag per gebruiker, en geen alerts zonder bewijs.

**Privacy:**

- Bij Brevo staat alleen een e-mailadres + voorkeuren. De watchlist blijft in onze eigen database.
- Sluit een verwerkersovereenkomst met Brevo en zet Brevo in het [verwerkingsregister](../verwerkingsregister.md).
- Zet open- en kliktracking **uit**, of vraag er toestemming voor. Affiliate-links werken zonder tracking-pixel.
