# DealBuddy (/deals/) – techniek

DealBuddy is een apart onderdeel van toeslagbuddy.nl. Het zoekt aanbiedingen
(parfum tot vliegtickets), rekent altijd met de **totaalprijs inclusief
verzending** en vergelijkt die met de **gangbare prijs**. Alles draait op
gratis diensten. Marktonderzoek en businessplan staan in `docs/deals/`.

## In het kort

| Onderdeel | Waar | Wat |
|---|---|---|
| Rekenmotor | `src/deals/*.js` | Puur JS, in browser én Node. Plat in `/js/` (build.js). |
| Bronnen ("agents") | `scripts/deals/` | Feeds, vluchten, JSON-LD, jager, demo, verzamelen, mail. |
| Opslag | `data/deals/` | Historie per product/route (JSON, max. 180 dagen), status, alarmen. |
| Site | `src/site/deals-pages.js` | Voorgerenderde pagina's + `dist/deals/data/*.json`. |
| Browser | `public/js/deals-*.js` | Filters, grafiek, volglijst, vluchten, jagers, live zoeken, account. |
| Live zoeken | `supabase/functions/deals-zoek/` | Edge Function, Server-Sent Events. |
| Account-jagers | `supabase/migrations/20261108_deals.sql`, `scripts/deals/agent.js` | Jachten en rapporten per gebruiker. |
| Planning | `.github/workflows/deals.yml` | Elk uur; site om de 6 uur opnieuw. |

## De rekenregels (`src/deals/`)

- **aanbod.js** – één vorm voor alle bronnen. Product-sleutel = EAN/GTIN met
  geldig controlecijfer (GTIN-12/14 → EAN-13), anders slug van merk + titel.
  `totaal = prijs + verzending`, met gratis verzending vanaf een drempel.
  Onbekende verzending telt als € 0 maar krijgt `verzendBekend: false`
  (−5 dealscore, label 'verzendkosten onbekend'). Vreemde valuta alleen met
  een opgegeven koers; anders overslaan. Ontdubbelen per product+winkel+dag.
- **historie.js** – per dag per winkel de laagste totaalprijs.
  - *Gangbare prijs* = mediaan van de laagste dagprijs over 90 dagen, **zonder
    vandaag** (anders trekt de deal zelf de vergelijking omlaag). Minder dan
    90 dagen: wat er is, minimaal 7 punten, anders `null`.
  - *Modus-band* = prijsband (5% van de mediaan, min. € 1) waarin de prijs
    het vaakst lag; bij gelijk aantal de goedkoopste.
  - *Laagste 30* = laagste dagprijs in de 30 dagen vóór vandaag (Omnibus).
  - *Echte korting* = 1 − nu/gangbaar.
  - *Nep-korting*: de winkel noemt een 'van'-prijs, maar de prijs is < 5%
    onder gangbaar of niet lager dan laagste30.
  - *Dealscore* 0–100: echte korting (70), versheid (15), betrouwbaarheid
    winkel (15); nep = ÷ 2; > 70% korting = 'verdacht laag' (max. 40).
- **vluchten.js** – gangbare prijs per route + vertrekmaand (mediaan van de
  laagste prijs per waarneemdag), prijskalender met kwintiel-niveaus.
- **alarm.js** – regels (product/categorie/zoekterm/vlucht, minKorting %,
  maxPrijs incl. verzending), matchen, bewijs-drempels en ontdubbelen.
- **grafiek.js** – traplijn per winkel, gangbaar, laagste30, beste prijs,
  'eerst duurder, dan korting'-detectie, tekst-tabel per week.
- **opdracht.js / rapport.js** – jacht in gewone taal → criteria; rapport met
  oordeel *Nu kopen / Wachten / Nep-korting gezien bij X / Nog te weinig data*.
  'Seizoensdip verwacht' zeggen we niet: daarvoor is minstens een jaar data
  nodig en we bewaren 180 dagen.
- **samenvoegen.js** – SSE-lezer en het samenvoegen van live-resultaten.

## Bronnen aanzetten

Een bron staat aan zodra zijn geheim of config bestaat. Zonder echte bron
draait de **demo-bron** (verzonnen winkels op `.example`, verzonnen merken,
EAN's met voorvoegsel 200, overal het label 'demo'). Forceren:
repo-variabele `DEALS_DEMO` = `aan` of `uit`.

Zet geheimen in GitHub → Settings → Secrets and variables → Actions.
**Nooit in de repo.**

| Geheim / variabele | Soort | Bron |
|---|---|---|
| `DAISYCON_FEED_URLS` | secret | Daisycon-productfeeds (XML of CSV). Komma's of regels; optioneel `Winkelnaam=https://…`. |
| `TRADETRACKER_FEED_URLS` | secret | TradeTracker-productfeeds (XML). |
| `AWIN_FEED_URLS` | secret | Awin Create-a-Feed (CSV). |
| `TRAVELPAYOUTS_TOKEN` | secret | Travelpayouts Data API (gratis). Gaat in de kop `X-Access-Token`, nooit in een url. |
| `TRAVELPAYOUTS_MARKER` | variabele | Optioneel: partner-ID voor de link. |
| `JSONLD_WINKELS` | variabele | JSON of pad; standaard `data/deals/jsonld-winkels.json`: `[{ "winkel": "Naam", "urls": ["https://…"], "verzendkosten": 3.95, "gratisVerzendingVanaf": 25 }]` |
| `DEALS_JAGER` | variabele | `aan` = de jager bezoekt de winkels uit `data/deals/winkels.json`. |
| `DEALS_JAGER_BUDGET` | variabele | Max. verzoeken per shard per ronde (standaard 300). |
| `DEALS_HEADLESS` | env | `aan` = Playwright-terugval voor JS-pagina's (traag, alleen op de VM). |
| `DEALS_PUBLICEER_UREN` | variabele | Site opnieuw publiceren elke N uur (standaard 6). |
| `BREVO_API_KEY` | secret | Mail via Brevo (EU, gratis 300/dag). Ook als geheim in Supabase voor bericht-doorsturen. |
| `DEALS_EMAIL` | secret | Jouw adres voor de bewijsmails. Komt nergens anders terecht. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | secret | Alleen voor `agent.js --alleen-jachten` (jachten met account). Nooit in de site. |
| `DEALS_MIN_DAGEN`, `DEALS_MIN_WINKELS`, `DEALS_VLUCHT_MIN_DAGEN` | env | Bewijs-drempels voor mail (30 / 2 / 14). |
| `DEALS_MELD_DEMO=1` | env | Alleen om te testen: ook mailen over demo-gegevens. |

Edge Function `deals-zoek` (Supabase → Edge Functions → Secrets):
`TRAVELPAYOUTS_TOKEN`, `BOL_CLIENT_ID` + `BOL_CLIENT_SECRET` (gratis
bol.com-partnerprogramma, Marketing Catalog API), `DEALS_SITE_URL`.
Uitrollen: `supabase functions deploy deals-zoek`. De site gebruikt
`pro.supabaseUrl` en `pro.supabaseAnonKey` uit `site.config.js`; de CSP
zet dat domein dan vanzelf in `connect-src`.

### Feed-formaten (getest met fixtures in `test/fixtures/deals/`)
- **Daisycon**: `<datafeed><programs><program><program_info><name>` en per
  `<product><product_info>`: `title, link, price, price_old, price_shipping,
  ean, brand, category, in_stock`; CSV met dezelfde kolommen (`;`).
- **TradeTracker**: `<product ID>` met `name`, `price currency=`, `URL`,
  `images/image`, `categories/category path=`, `properties/property name=…`
  (`EAN`, `brand`, `deliveryCosts`, `fromPrice`, `stock`).
- **Awin**: `aw_deep_link, product_name, merchant_name, search_price,
  rrp_price, delivery_cost, currency, ean, product_GTIN, brand_name,
  category_name, in_stock`.
- **Travelpayouts** `v3/prices_for_dates`: `origin, destination, price,
  airline, departure_at, return_at, transfers, link, found_at`.

## De agents

```
node scripts/deals/verzamel.js [--invoer uit-jager]   # bronnen → historie
node scripts/deals/meld.js                            # bewijsmail eigenaar
node scripts/deals/jager/jager.js --shard 1/8         # winkels zelf bezoeken
node scripts/deals/verse-check.js                     # alarm-producten nakijken
node scripts/deals/agent.js [--doorlopend --interval 60] [--alleen-jachten]
```

`agent.js --doorlopend` draait alles in één proces (jager → verzamelen →
meld → jachten), elke N minuten. Daarmee kan het onveranderd naar een kleine
server. **GitHub Actions is een tussenoplossing**: geplande workflows starten
'best effort' (soms later of overgeslagen) en een privé-repo heeft 2.000 gratis
minuten per maand (8 shards × elk uur gaat daar ruim overheen; een openbare
repo heeft onbeperkt gratis minuten). Gratis 24/7-alternatief: een **Oracle
Cloud Always Free**-VM (optioneel) met
`node scripts/deals/agent.js --doorlopend` als systemd-dienst, en een
`git push` van `data/deals/` (of een eigen build). Op de VM werkt ook de
ETag-cache (`data/deals/http-cache.json`) over rondes heen.

## De jager: wat we wel en niet doen

**Wel**
- robots.txt eerst, altijd (RFC 9309; langste regel wint; Crawl-delay).
  robots.txt is ook het machineleesbare voorbehoud tegen tekst- en datamining
  (EU-richtlijn 2019/790, art. 4) – negeren is een auteursrechtrisico.
- Herkenbare User-Agent: `DealBuddyBot/1.0 (+https://www.toeslagbuddy.nl/deals/over/)`.
- Per host één verzoek tegelijk, minimaal 5 s ertussen; hosts parallel.
- Openbare endpoints die winkels aan iedereen tonen: Shopify
  `/products.json`, `/products/<handle>.js`, `/policies/shipping-policy`;
  WooCommerce Store API `/wp-json/wc/store/v1/products`; Lightspeed
  `?format=json`; anders sitemap → productpagina → JSON-LD, microdata,
  OpenGraph `product:price:amount`, `<meta itemprop=price>`.
- Ontdekken via robots.txt → sitemap(s), ook sitemap-index en `.gz`;
  productachtige adressen en categorie-woorden eerst.
- Prioriteit: alarm-/gevolgde producten, tips en recent gedaalde prijzen eerst;
  de lange staart hooguit eens per dag. Budget per ronde, 8 shards.
- Voorwaardelijke verzoeken (ETag / If-Modified-Since), time-outs, opnieuw
  proberen bij 5xx met oplopende wachttijd.
- Tips uit openbare RSS (bijv. Pepper): pas tonen na controle op de winkel zelf.
- Producten koppelen op EAN; zonder EAN alleen als merk, inhoud (50 ≠ 100 ml),
  variant (tester, set, navulling, unboxed, sample) en soort (EDP ≠ EDT)
  gelijk zijn en de titels genoeg lijken. Twijfel = niet koppelen, geen alarm.
- Alleen feiten opslaan: titel, prijs, verzending, url, afbeeldings-url.
- Opt-out: `data/deals/optout.json` (domeinen) – de jager slaat ze over en
  verzamelen gooit hun prijzen weg. Contact staat op /deals/over/.
- Status per winkel (ok / robots / geblokkeerd / fout) op /deals/over/.

**Niet**
- Geen captcha's oplossen, geen wisselende of 'residential' proxies, geen
  vermomde browser-vingerafdruk, geen inloggen, geen betaalmuren.
- Een 401/403 = stoppen met die winkel voor deze ronde. 429 = Retry-After
  volgen (max. 60 s), daarna stoppen.
- Geen teksten of foto's kopiëren. bol.com en Amazon niet crawlen (alleen
  via hun partner-API's); ze staan als 'uitgesloten' in `winkels.json`.
- Geen massaal live crawlen: live = API's + het nakijken van bekende URL's.

## Bewijsmail (meld.js)

Mail alleen als het bewijs sterk is: **≥ 2 winkels/bronnen** en **≥ 30 dagen**
historie (vluchten: ≥ 2 bronnen of ≥ 14 dagen), **echte korting ≥ drempel**
tegenover de gangbare prijs (mediaan incl. verzending) én **onder de laagste
prijs van 30 dagen**. Demo-gegevens nooit (behalve met `DEALS_MELD_DEMO=1`).
Niet twee keer voor dezelfde prijs; opnieuw bij nog eens ≥ 5% daling
(`data/deals/verzonden.json`, zonder adressen). De mail (HTML + tekst, alles
ge-escaped, onderwerp zonder CR/LF) heeft: product, link (met
partnerlink-melding), totaal, gangbaar, echte korting, laagste 30 dagen, een
mini-grafiek (PNG op `/deals/bewijs/<slug>/grafiek.png`, mail toont geen SVG),
een tabel per winkel (incl. verzending, laatst gezien) en per week
(laagste/mediaan), aantal dagen en bronnen, en een link naar de
bewijspagina (`noindex`). Zonder `BREVO_API_KEY`/`DEALS_EMAIL`: proefdraai
naar `data/deals/concept-meldingen/` (in .gitignore). Eén digest per ronde,
dagteller (max. 250) – wat niet past, gaat de volgende ronde mee.

**Bezorging:** verstuur vanaf `deals@toeslagbuddy.nl`, geverifieerd als
afzender in Brevo. Zet **één** SPF-record met Brevo erin (bijv.
`v=spf1 include:spf.brevo.com include:… ~all` – twee SPF-records maakt SPF
ongeldig), plus de DKIM- en DMARC-records die Brevo geeft.

## Live zoeken (Edge Function `deals-zoek`)

Browser (`deals-live.js`): eerst direct de index (0 ms), daarna per bron een
SSE-bericht (`start`, `bron` met `status ok|timeout|fout` en `ms`, `klaar`).
Chips: 'bol.com ✓ 0,8 s', 'Winkel X ✗ time-out'; 'nu geverifieerd hh:mm' en
'nieuwe laagste prijs'. Server: bronnen parallel, 2,5 s time-out per bron,
cache 10 min, limiet 20/min per IP en 600/min totaal per isolate (te veel →
429 → de site toont de index). Voor een harde limiet over alle isolates kan
de bestaande `rate_limit`-tabel worden gebruikt. Zonder Supabase-config:
alleen de index, met uitleg.

## Persoonlijke jagers

- Zonder account (`/deals/jagers/`): jachten in localStorage; bij elk bezoek
  een nieuw rapport (index + live als dat aan staat), tijdlijn, 'Ik ben er weer'.
- Met account: inloggen met een link per mail (Supabase Auth, REST, geen
  extra bibliotheek), toestemming aanvinken, jachten naar
  `public.deals_jachten` (RLS: alleen eigen rijen; criteria gecontroleerd;
  max. 20). `agent.js --alleen-jachten` (service role, alleen als geheim)
  draait jachten die aan de beurt zijn (uur/dag/week), slaat rapporten op in
  `public.deals_rapporten` en mailt alleen bij een betekenisvolle verandering
  of een gehaalde drempel, met afmeldlink (`deals_afmelden(token)`). Account
  verwijderen (`account_verwijderen`) verwijdert jachten en rapporten.
- Migratie uitrollen: `supabase db push` (of de SQL in de SQL-editor).

## Gratis limieten en wat er dan gebeurt

| Dienst | Gratis | Als het op is |
|---|---|---|
| GitHub Actions | openbaar onbeperkt; privé 2.000 min/mnd | Jager uit (`DEALS_JAGER`), of VM. |
| GitHub Pages | 1 GB, 100 GB/mnd verkeer | – |
| Supabase Free | 500 MB database, 500k Edge-aanroepen/mnd; pauzeert na 7 dagen zonder activiteit (de uurlijkse jachten houden hem wakker) | Live zoeken → 429 → index. |
| Brevo Free | 300 mails/dag | Digest gaat de volgende ronde/dag mee. |
| Travelpayouts | gratis, gecachte prijzen (2–7 dagen oud) | Getoond als 'indicatie, x dagen oud'. |
| Affiliate-feeds | gratis na goedkeuring | Bron blijft uit; demo of jager. |

Amadeus Self-Service is gesloten en Kiwi Tequila alleen op uitnodiging: niet
gebruikt.

## Juridisch (kort)

- Prijzen met korting: de Omnibus-regel (laagste prijs van 30 dagen) is de
  plicht van de winkel; wij controleren en waarschuwen bij nep-kortingen.
- Partnerlinks staan erbij (`rel="sponsored nofollow noopener"`, label
  'partnerlink'); de volgorde hangt nooit af van een vergoeding.
- Demo-producten zijn `noindex` en hebben geen Product-JSON-LD.
- Alleen feiten (prijs is geen auteursrechtelijk werk); geen databank
  massaal overnemen, robots.txt/TDM-voorbehoud respecteren, opt-out bieden.

## Testen

```
node build.js && npm test && npm run test:e2e
```

- `test/deals-motor.test.js` – rekenmotor (randgevallen: geen verzending,
  valuta, uitschieters, te weinig punten, nep-'van'-prijs, drempel gratis
  verzending, gelijke prijzen), opdrachten, rapporten, grafiek, SSE.
- `test/deals-bronnen.test.js` – feeds, Travelpayouts, JSON-LD/microdata/OG,
  robots, beleefd ophalen (403/429/5xx/budget/ETag), Shopify/Woo/Lightspeed,
  sitemaps (index + .gz), tips, wachtrij, koppelen, demo, verzamelen.
- `test/deals-meld.test.js` – bewijsmail (proefdraai, Brevo-payload, escaping,
  drempels, ontdubbelen, quotum), Edge Function-logica, account-jachten.
- `test/db/deals.test.js` – RLS, criteria, max. 20, rapporten, afmelden.
- `test/e2e/deals.e2e.js` – filters, kaarten, grafiek (periode, winkel uit,
  tooltip), alarm → volglijst, vluchtkalender, export/import, jagers, live
  zoeken met nagebootste SSE, account met nagebootste Supabase, axe op alle
  deals-pagina's (licht en donker), 360 px breed, geen consolefouten.
- Schermafbeeldingen: `node scripts/deals/screenshots.js` → `docs/screenshots/deals-*.png`.
