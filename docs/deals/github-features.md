# Ideeën van GitHub: wat kunnen we lenen en beter maken?

**Stand: 8 november 2026.** De GitHub-repositories zelf konden in deze sessie niet worden geopend. Licenties en functies komen uit zoekresultaten. **Controleer het LICENSE-bestand in elke repository voordat je code overneemt.** We nemen vooral **ideeën** over. Code nemen we alleen over bij een ruime licentie (MIT, BSD, Apache-2.0), met bronvermelding.

## 1. Overzicht

| Project | Licentie | Slim idee | Zwakte | Wat wij beter doen |
|---|---|---|---|---|
| [changedetection.io](https://github.com/dgtlmoon/changedetection.io) | Apache-2.0 ([bron](https://dev.co/devops/open-source/changedetection-io)); hosted versie $ 8,99 per maand | Aparte modus voor **voorraad en prijs** op één productpagina. "Browser Steps": klikken of velden invullen vóór een check ([docs](https://www.mintlify.com/dgtlmoon/changedetection.io/features/restock-price-monitoring)) | Werkt **per URL**. Weet niet dat 6 winkels hetzelfde product verkopen. Geen gangbare prijs, geen verzending | Product-niveau (EAN + ml) over winkels heen. Alert op "% onder de mediaan incl. verzending" |
| [Huginn](https://github.com/huginn/huginn) | MIT **[controleren]** | Agents die elkaar **events** sturen (zoals IFTTT, maar zelf gehost). Agents zijn in een graaf te koppelen | Algemeen en technisch. Geen UX voor consumenten. Ruby en zwaar | Vaste keten van 5 agents (zie §2). Elke stap logt en is uitlegbaar |
| [PriceBuddy](https://github.com/jez500/pricebuddy) | Open source, licentie niet bevestigd ([AlternativeTo](https://alternativeto.net/software/pricebuddy/about)) | Meerdere winkel-URL's per product. Dashboard sorteert van laag naar hoog. Docker | Eén gebruiker, URL's met de hand invoeren | Winkels automatisch vinden via EAN uit de feeds |
| [Discount Bandit](https://github.com/Cybrarist/Discount-Bandit) | LICENSE aanwezig, soort niet bevestigd ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2FCybrarist%2FDiscount-Bandit)) | **Meerdere gebruikers**. Melding als zelfgekozen voorwaarden kloppen ([selfhostyourself](https://selfhostyourself.com/services/discount-bandit)) | Vooral Amazon-winkels. Voorwaarden zijn absolute prijzen | Voorwaarde relatief aan de markt: "≥ 25% onder gangbaar, ≥ 2 winkels" |
| [PriceGhost](https://github.com/clucraft/PriceGhost) | Niet bevestigd | Elke website, alerts op daling, doelprijs of **terug op voorraad** ([GitHub](https://github.com/clucraft/PriceGhost)) | Losse URL's, geen bewijs | "Terug op voorraad onder gangbare prijs" als aparte alert |
| [fast-flights](https://github.com/AWeirdDev/flights) | MIT ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Faweirddev%2Fflights)); TS-port ook MIT | Google Flights opvragen via een **Base64-protobuf-URL**, zonder browser. Erg snel | Gaat in tegen de voorwaarden van Google. Breekt als Google iets wijzigt | **Niet in productie.** Alleen het idee: één compacte "zoek-URL" per route die we zelf opslaan en delen |
| [extruct](https://github.com/scrapinghub/extruct) | BSD-3-Clause ([Cloudsmith](https://cloudsmith.com/navigator/pypi/extruct)) | Haalt JSON-LD, microdata en Open Graph in één keer uit HTML | Veel winkels vullen `shippingDetails` niet in | Fallback naar onze eigen tabel met verzendregels per winkel |
| [price-parser](https://github.com/scrapinghub/price-parser/) | BSD-3 ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fscrapinghub%2Fprice-parser)) | Prijs en munt uit rommelige tekst ("€ 1.299,-") | Begrijpt geen "2 voor € 30" of "vanaf" | Eigen regels voor NL-acties ("2e halve prijs" → prijs per stuk) |
| [Crawlee](https://github.com/apify/crawlee) | Apache-2.0 **[controleren]** | Wachtrij, herkansingen, automatisch schalen | Heeft ook proxy-rotatie en anti-blokkadefuncties | Alleen de nette delen gebruiken: wachtrij per domein, backoff. **Geen** ontwijking (zie [databronnen §5](databronnen.md)) |
| [Apprise](https://github.com/caronc/apprise) | BSD **[controleren]** | Eén bibliotheek voor 100+ meldkanalen (mail, Telegram, Signal …). Wordt gebruikt door changedetection.io | Alleen versturen, geen inhoud | Mail via Brevo eerst. Later Telegram of push via hetzelfde idee |
| [tweakers-pricewatch](https://github.com/tychobrouwer/tweakers-pricewatch) | Niet bevestigd | Mail als een Tweakers-product onder een drempel zakt | Leunt op een niet-publieke API van Tweakers | Wij gebruiken eigen bronnen en scrapen Tweakers niet |
| Grafiekbibliotheken: [uPlot](https://github.com/leeoniya/uPlot), [Apache ECharts](https://github.com/apache/echarts) | MIT / Apache-2.0 **[controleren]** | Snelle tijdreeksen; trapgrafieken zoals Keepa | Alleen een grafiek, geen betekenis | Grafiek met **band** (gangbare prijs), **lijn** (laagste 30 dagen) en **stip** (nu). Zie §3 |
| Vluchtprijs-voorspellers, bijv. [flight-prices-predicitons](https://awesome.ecosyste.ms/projects/github.com%2Fboyan-apostolov%2Fflight-prices-predicitons) | Wisselend | Voorspellen of "de goedkoopste dag om te kopen" nu is | Getraind op oude Kaggle-data, niet live. Doen alsof ze zeker zijn | Eerlijk advies: "Deze prijs is lager dan 85% van wat we in 60 dagen zagen". Geen schijnzekerheid |
| Nepkorting-detectie | **Geen open-source project gevonden** | Onderzoek van Oxylabs vergeleek 10.000 "van"-prijzen met echt betaalde prijzen ([Oxylabs](https://oxylabs.io/blog/oxylabs-research-on-fake-discounts-are-shopping-events-worth-the-deal)) | Alleen een rapport, geen tool | **Kans: wij bouwen de eerste open "Nepkorting-meter" voor NL.** Zie §4 |

## 2. Agents: een vaste keten in plaats van een losse graaf

We nemen het idee van Huginn over (agents die events doorgeven), maar met een **vaste keten**. Zo is elke alert uit te leggen.

| Agent | Taak | Input → output | Leent van |
|---|---|---|---|
| **1. Verzamelaar** | Feeds en API's binnenhalen | feed → `observatie(product, winkel, prijs, verzending, tijd, bron)` | Huginn (planning), Crawlee (wachtrij) |
| **2. Koppelaar** | Is dit hetzelfde product? | EAN + inhoud + variant → `product_id`. Twijfel → handmatige wachtrij | Eigen werk |
| **3. Jager** | Zoekt kandidaten | Nieuwe observatie ≥ X% onder gangbaar → `kandidaat` | changedetection.io (alleen bij verandering) |
| **4. Controleur** | Live check van prijs, voorraad en verzending | kandidaat → `geverifieerd` of `afgewezen (reden)` | extruct, price-parser |
| **5. Bewijzer** | Maakt het bewijspakket en de mail | geverifieerd → mail met grafiek en tabel | uPlot/ECharts, Apprise |

**Verbetering ten opzichte van alle projecten:** elke stap schrijft een regel in een **auditlog**. In de mail staat een link "Waarom krijg ik dit?". Die toont precies welke metingen het bewijs vormen.

## 3. De bewijsgrafiek (beter dan Keepa)

Keepa toont lijnen per verkoper. Dat is sterk voor experts, maar druk voor gewone mensen. Onze grafiek beantwoordt één vraag: **"Is dit nu goedkoop?"**

- **Grijze band:** 25e–75e percentiel van de totaalprijs (incl. verzending) over 90 dagen. Dit is de "normale" zone.
- **Stippellijn:** gangbare prijs (mediaan).
- **Groene lijn:** laagste prijs van de laatste 30 dagen. Dit is het Omnibus-referentiepunt.
- **Grote stip:** de prijs nu, met het label "−27% t.o.v. gangbaar".
- **Kleine streepjes onderaan:** aantal winkels per dag. Zo zie je of het bewijs breed is.
- In de mail komt een **statisch PNG-plaatje** (mailprogramma's tonen geen JavaScript) en daaronder een tabel met de prijzen per winkel.

## 4. Nepkorting-meter (eigen idee, niet gevonden op GitHub)

Bij elke aanbieding met een "van"-prijs controleren we drie dingen:

| Check | Regel | Label |
|---|---|---|
| Van-prijs vs. eigen historie van de winkel | Van-prijs > laagste prijs van deze winkel in 30 dagen | "Van-prijs hoger dan eigen 30-dagen-laagste" |
| Van-prijs vs. markt | Van-prijs > 75e percentiel van de markt | "Van-prijs boven wat de markt normaal vraagt" |
| Prijs vlak vóór de actie verhoogd | Stijging ≥ 15% in de 14 dagen vóór de korting | "Prijs eerst verhoogd" |

**Belangrijk:** we noemen het een **signaal**, geen beschuldiging. Bijvoorbeeld: "Volgens onze metingen was dit product de afgelopen 30 dagen bij deze winkel al € 79". Bij twijfel (minder dan 10 metingen) tonen we geen label. Zie [marktonderzoek §4a](marktonderzoek.md).

## 5. Andere slimme functies om in te bouwen

| Functie | Gezien bij | Onze versie |
|---|---|---|
| Prijs per eenheid | Supermarktapps | **€ per ml** bij parfum. Zo vergelijk je 50 ml en 100 ml eerlijk |
| Terug op voorraad | changedetection.io, PriceGhost | Alleen melden als de prijs ook onder gangbaar ligt |
| "Any dates"-tracking | Google Flights | "Elke vlucht AMS–Lissabon in mei, 5–8 dagen, ≥ 30% onder gangbaar" |
| Error fares | Going, Jack's Flight Club (door mensen gekozen) | Automatisch: prijs > 3 standaardafwijkingen onder de route-mediaan → snelle alert met "Let op: mogelijk een fout, boek snel en wacht met hotel" |
| Hot/cold stemmen | Pepper | Gebruikers kunnen alleen een **feit** melden ("verlopen", "verkeerd product"). Geen stemmen over smaak |
| Categorie-watch | — | "Elke EdP van Dior of Chanel ≥ 30% onder gangbaar", niet alleen één product |
| Kopieerbare deal-link | fast-flights (zoek-URL) | Elke deal heeft een vaste pagina met grafiek. Deelbaar en goed voor SEO |

## 6. Wat we bewust níet overnemen

- **Browserextensies die meekijken of cookies overschrijven** (zie de Honey-rechtszaak, [Android Authority](https://www.androidauthority.com/paypal-lawsuit-honey-extension-3513286)).
- **Proxy-rotatie en het oplossen van CAPTCHA's** uit scraper-frameworks.
- **Google Flights of Google Shopping scrapen** (fast-flights) in productie.
- **Stemmen als bewijs** (Pepper): een mening is geen prijsfeit.
