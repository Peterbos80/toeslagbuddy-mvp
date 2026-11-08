# Marktonderzoek DealBuddy (8 november 2026)

**Wat is DealBuddy?** Een nieuw onderdeel van toeslagbuddy.nl (werknaam). Het zoekt steeds naar aanbiedingen, van parfum tot vliegtickets, **inclusief verzendkosten**. Jij stelt in hoeveel korting je wilt ten opzichte van de **gangbare prijs**. Pas als een deal echt is, krijg je een e-mail met de link en het bewijs.

**Methode en beperkingen.** Dit onderzoek is gedaan met alleen een webzoekmachine. Pagina's konden niet volledig worden geopend. Cijfers komen uit zoekresultaten en samenvattingen daarvan. Controleer elk getal bij de bron voordat je het in een pitch of persbericht gebruikt. Aannames zijn gemarkeerd met **[aanname]**. Dit is geen juridisch advies.

## 1. Hoe groot is de markt?

| Cijfer | Waarde | Bron |
|---|---|---|
| Online bestedingen NL 2025 | € 35,7 miljard (−1% t.o.v. 2024), 347 miljoen aankopen | [NielsenIQ/Thuiswinkel](https://nielseniq.com/global/nl/news-center/2026/meer-online-productaankopen-minder-uitgaven-aan-reizen-en-evenementen-in-2025/), [Accountant.nl](https://www.accountant.nl/nieuws/2026/3/nederlandse-onlinebestedingen-zijn-in-2025-iets-gedaald/) |
| Trend | Producten groeien (+2% bij NL-webshops), diensten (reizen, tickets) dalen | [Betaalvereniging](https://www.betaalvereniging.nl/en/?p=4949) |
| Buitenlandse webshops | 13% van de bestedingen, € 4,5 miljard, aantal aankopen +9% | idem |
| Gebruik prijsvergelijkers | 58% gebruikt ze; 76% vindt vergelijken belangrijk (2022) | [Emerce / Multiscope](https://www.emerce.nl/nieuws/drie-vijf-nederlanders-gebruikt-prijsvergelijkingsite) |
| Vaak vergelijken | Maar 8% vergelijkt vaker dan 1× per maand via Tweakers of Consumentenbond | idem |

**Wat betekent dit?** De markt is groot maar groeit nauwelijks. Bijna iedereen vergelijkt soms prijzen, maar weinig mensen doen het vaak. **Daar zit de kans:** mensen willen niet zelf zoeken, ze willen een seintje als het echt goedkoop is. Een alert-dienst past daar beter bij dan nog een vergelijkingssite.

**Schatting doelgroep.** Stel dat 5–10% van de 13 miljoen online shoppers actief op deals jaagt: 0,6 tot 1,3 miljoen mensen **[aanname]**. Pepper noemt zichzelf de grootste shopping-community van Nederland ([Trustpilot](https://ca.trustpilot.com/review/nl.pepper.com)), maar publiceert geen NL-gebruikerscijfers.

## 2. Het speelveld

### 2a. Prijsvergelijkers

| Speler | Wat ze goed doen | Verdienmodel | Gat voor DealBuddy |
|---|---|---|---|
| **Tweakers Pricewatch** | Sterk in elektronica. Toont per winkel verzendkosten en levertijd ([Firecrawl-beschrijving](https://www.firecrawl.dev/alexandria/tweakers-net)). Meldpunt voor foute prijzen | Vergoeding per doorklik naar de winkel ([DPG Media](https://dpgmedia.h5mag.com/2022-en/pricewatch)) | Bijna alleen tech. Geen parfum, geen vluchten. Prijshistorie niet via een publieke API ([GitHub-project](https://github.com/tychobrouwer/tweakers-pricewatch)) |
| **Kieskeurig** (Reshift) | Breed assortiment, prijsalert sinds 2017 ([Twinkle](https://twinklemagazine.nl/2017/01/nieuwe-prijsalert-kieskeurig.nl-mailt-koopjes/)) | Van kosten per klik naar kosten per verkoop ([CB Insights](https://www.cbinsights.com/company/kieskeurig)) | Alert op een vaste prijs, niet op "% onder gangbaar" |
| **Beslist.nl** | Groot productaanbod. 74% van het verkeer komt via Google ([Semrush](https://cw.semrush.com/website/beslist.nl/overview)) | Kosten per klik van winkels | Afhankelijk van Google. Geen historie of bewijs |
| **Vergelijk.nl** | Toont ook parfum, met laagste prijs per winkel ([Vergelijk.nl](https://www.vergelijk.nl/parfum_haar/p/205/)) | Klik en feeds | Geen alerts, geen echtheidscheck |
| **Google Shopping** | Grootste bereik. Sinds de EU-zaak mogen vergelijkers (CSS) in Shopping adverteren ([Emerce](https://www.emerce.nl/achtergrond/voorbij-hype-googles-css)) | Advertenties | Geen eigen kortingsdrempel, geen bewijs, geen NL-focus |
| **idealo** | Prijshistorie (ongeveer 3 maanden) en prijsalert per mail ([Dealavo](https://dealavo.com/?p=13822)) | Kosten per klik, ongeveer € 0,56 per klik **[onzeker]** | Vooral Duitsland. Alert op een vaste prijs |
| **Consumentenbond Prijsalert** | Betrouwbaar merk | Alleen voor leden met een bepaald lidmaatschap ([Consumentenbond](https://www.consumentenbond.nl/uitgelicht/prijsalert)) | Betaalmuur, beperkt assortiment |

### 2b. Dealcommunity's

| Speler | Sterk | Zwak (klachten) |
|---|---|---|
| **Pepper.com NL** | Leden plaatsen deals en stemmen ze "hot" of "cold". Snel bij error fares. 12 landen, 25 miljoen bezoekers per maand (groepscijfer) ([Dealroom](https://app.dealroom.co/companies/pepper_nl)) | Trustpilot 3,1 uit 5 ([Trustpilot](https://ca.trustpilot.com/review/nl.pepper.com)). Klachten: moderatie zou op commissie letten, veel verlopen deals, "hot" deals die geen goede prijs zijn ([Trustpilot BE](https://nl-be.trustpilot.com/review/pepper.com)). Verdient ook aan merkprofielen en samenwerkingen ([OMR](https://omr.com/de/daily/mydealz-plattform-fabian-spielberger-interview)) |

**Belangrijk inzicht.** Bij Pepper bepaalt de *stemming* of iets een goede deal is. Dat is een mening, geen feit. DealBuddy kan het omgekeerde doen: **een deal is pas een deal als de cijfers het bewijzen.**

### 2c. Prijstrackers

| Speler | Sterk | Zwak |
|---|---|---|
| **Keepa** | Zeer goede prijsgrafieken voor Amazon, ook Amazon.nl. Betaalde API vanaf € 49 per maand ([RevenueGeeks](https://revenuegeeks.com/software/keepa/api)) | Alleen Amazon. Geen verzendkosten van andere winkels |
| **camelcamelcamel** | Gratis alerts en grafieken voor Amazon | Alleen Amazon, geen NL-focus |
| **PayPal Honey** | Kortingscodes automatisch invullen | Rechtszaak in de VS: Honey zou affiliate-commissies van makers "overpakken" ([Android Authority](https://www.androidauthority.com/paypal-lawsuit-honey-extension-3513286)). Van meer dan 20 naar ongeveer 14 miljoen gebruikers ([PPC Land](https://ppc.land/honey-loses-7-000-merchants-as-judge-lets-creator-lawsuit-proceed/)). **Les: geen browserextensie die meekijkt. Vertrouwen is alles.** |

### 2d. Vluchten

| Speler | Sterk | Zwak |
|---|---|---|
| **Google Flights** | Label "laag / normaal / hoog" ten opzichte van de gebruikelijke prijs. Grafiek van 60 dagen. E-mail bij grote daling ([Thrifty Traveler](https://thriftytraveler.com/news/google-flights-price-history), [NerdWallet](https://www.nerdwallet.com/travel/learn/google-flight-alerts)) | Gmail-account nodig. "Grote daling" wordt niet uitgelegd. Je kunt geen eigen drempel instellen. Geen bewijs in de mail |
| **Skyscanner / Kayak** | Alerts per route, breed aanbod | Alert op een prijs, niet op "% onder normaal" |
| **Going** (vroeger Scott's Cheap Flights) | Mensen kiezen deals uit, ook error fares | Vooral VS-vertrekpunten. $ 25–199 per jaar in deze categorie; besparingen niet onafhankelijk gecontroleerd ([The Ethos](https://the-ethos.co/are-flight-deal-clubs-worth-it-we-checked-the-math/)) |
| **Jack's Flight Club** | Europese versie, gratis 1–2 deals per week, premium met error fares ([JFC](https://jacksflightclub.com/eu-upgrade)) | Engelstalig, VK-focus. Weinig vertrek vanaf Eindhoven, Rotterdam en Groningen **[aanname]** |

### 2e. Parfum

Er is **geen duidelijke, sterke Nederlandse parfumvergelijker** gevonden. Er zijn Vergelijk.nl (algemeen), Bstore.nl (zoekt op Amazon, bol en Coolblue) en kleine sites zoals parfum-vergelijken.nl ([zoekresultaten](https://www.vergelijk.nl/parfum_haar/p/205/), [Bstore](https://bstore.nl/amazon/PARFUMS%20SAPHIR/)).

**Waarom parfum interessant is:**

- Er zijn veel winkels (Douglas, ICI Paris XL, Notino, Flaconi, Parfumdreams, bol) en de prijzen verschillen sterk **[aanname]**.
- Verzendkosten maken het verschil bij kleine bestellingen.
- Er is affiliate-commissie: ICI Paris XL 5% via Awin; Parfumdreams tot 12% ([Awin-profielen](https://ui.awin.com/merchant-profile/84311)).
- **Risico:** namaak en "tester"-flacons. Je moet dus EAN, inhoud (ml) en soort (EdT of EdP) controleren.

## 3. Gaten in de markt (samengevat)

1. **Korting ten opzichte van de gangbare prijs.** Alle alerts werken met een *vaste prijs*. Niemand laat je zeggen: "Mail me bij 25% onder de normale prijs, inclusief verzending."
2. **Bewijs in de alert.** Geen enkele dienst stuurt mee *waarom* het een deal is: prijzen bij meerdere winkels, 30 dagen historie en de laagste prijs van de laatste 30 dagen.
3. **Nepkorting ontmaskeren.** 30% van de Europese webshops toonde kortingen fout tijdens Black Friday 2025 ([CCPC/Europese Commissie](https://www.ccpc.ie/news-and-media/news/article/2026/03/26/investigation-by-ec--ccpc-and-european-consumer-authorities-finds-1-in-3-traders-incorrectly-display-discounts-online-during-black-friday-sales)). Consumenten willen weten of "−50%" klopt.
4. **Eén plek voor alles.** Tweakers is tech, Keepa is Amazon, Google Flights is vluchten. Niemand combineert parfum, elektronica en vluchten in één Nederlandse watchlist.
5. **Vertrouwen en privacy.** Na het Honey-schandaal en de klachten over Pepper is er ruimte voor een eerlijke, open dienst zonder extensie.

## 4. Wetten en regels

### 4a. Kortingen tonen: de 30-dagenregel (Omnibus)

- **Regel:** bij een prijsverlaging moet de "van"-prijs de **laagste prijs van de laatste 30 dagen** zijn. Zie artikel 5a van het Besluit prijsaanduiding producten ([Staatsblad 2022, 485](https://zoek.officielebekendmakingen.nl/stb-2022-485.html)). Dit geldt per verkoopkanaal.
- **Uitzonderingen:** bederfelijke producten, producten die korter dan 30 dagen te koop zijn, en oplopende kortingen ([ACM](https://www.acm.nl/nl/publicaties/acm-wil-einde-aan-nepkortingen-na-komst-strengere-regels)).
- **Boetes:** de ACM gaf in 2024 boetes aan koopjedeal.nl (€ 163.000), Leen Bakker (€ 130.000), JYSK (€ 112.500), G-Star (€ 110.000) en Tommy Hilfiger (€ 105.500) ([ACM](https://www.acm.nl/nl/publicaties/acm-legt-boetes-op-aan-webwinkels-voor-nepkortingen)).
- **Grijs gebied:** bol gebruikt een eigen "meestal-prijs". De ACM waarschuwt voor vage termen als "adviesprijs" of "meestal-prijs" ([ACM](https://www.acm.nl/nl/publicaties/acm-ziet-nog-veel-misleidende-kortingen-en-adviseert-eerst-checken-dan-bestellen)).

**Wat betekent dit voor DealBuddy?**

- DealBuddy is zelf **geen verkoper**. De 30-dagenregel geldt dus niet direct voor ons.
- Maar als wij "−30%" laten zien, is dat een **prijsvergelijking in een commerciële boodschap** (wij verdienen aan de klik). Dan geldt het verbod op misleidende handelspraktijken (art. 6:193c BW) **[aanname: juridisch laten toetsen]**.
- **Regel voor ons:** we tonen altijd *waartegen* we vergelijken. Bijvoorbeeld: "28% onder de mediaanprijs van 6 winkels, 45 dagen, incl. verzending". We noemen ook de laagste prijs van de laatste 30 dagen. Nooit alleen "−28%".

### 4b. Wat komt eraan: Digital Fairness Act

De Europese Commissie werkt aan een Digital Fairness Act. Het voorstel komt naar verwachting eind 2026. Onderwerpen: misleidende prijsvergelijkingen, "vanaf €"-prijzen, drip pricing (verplichte kosten pas aan het eind tonen) en dark patterns ([Freshfields](https://technologyquotient.freshfields.com/post/102lw3c/the-eus-proposed-digital-fairness-act-an-e-commerce-players-guide-to-potential), [Bird & Bird](https://www.twobirds.com/en/insights/2025/eu-–-consultation-on-the-digital-fairness-act)).

**Kans voor ons:** "totaalprijs inclusief verzending" en "geen nepurgentie" worden misschien de norm. Wij zijn dan al klaar.

### 4c. Scrapen, databankrecht en voorwaarden

Kort samengevat (de volledige juridische kaart staat in [databronnen.md](databronnen.md#5-juridische-kaart-crawlen-nleu-2026)):

- **Ryanair / PR Aviation (HvJ EU C-30/14, 2015):** valt een databank niet onder het databankrecht, dan mag de eigenaar scrapen toch verbieden in de gebruiksvoorwaarden ([Pinsent Masons](https://www.pinsentmasons.com/out-law/news/website-operators-can-prohibit-screen-scraping-of-unprotected-data-via-terms-and-conditions-says-eu-court-in-ryanair-case)).
- **Innoweb / Wegener (C-202/12, 2013):** een *gespecialiseerde metazoekmachine* die live in de databank van een ander zoekt, kan inbreuk maken op het databankrecht ([IFJ](https://www.ifj.org/media-centre/news/detail/category/authors-rights/article/use-of-meta-search-engine-for-data-scraping-infringes-eu-database-right-decides-cjeu)). **Dit lijkt sterk op wat DealBuddy wil doen.**
- **CV-Online Latvia (C-762/19, 2021):** er is pas inbreuk als het overnemen de investering van de databankmaker schaadt ([SCL](https://www.scl.org/12290-cjeu-search-engine-copying-of-databases-infringes-sui-generis-right-where-it-adversely-affects-database-maker-investment/)).

**Conclusie:** gebruik feeds en API's met toestemming waar het kan. Haal losse feiten (prijs, verzending, voorraad) van openbare pagina's alleen beperkt op en per product. Kopieer nooit een hele prijsdatabase van een concurrent zoals Tweakers.

### 4d. Affiliate-links: duidelijk zeggen dat we eraan verdienen

- De Nederlandse Reclame Code eist dat reclame herkenbaar is. Affiliate-relaties vallen daaronder. De vernieuwde Reclamecode Social Media & Influencer Marketing geldt sinds 1 juli 2026 ([Emerce](https://www.emerce.nl/wire/reclamecode-social-media-influencer-marketing-vernieuwd), [Ondernemersplein](https://ondernemersplein.overheid.nl/wetten-en-regels/reclameregels-voor-social-media-influencer-marketing/)).
- De Stichting Reclame Code kreeg in 2025 6.611 klachten, tegen 4.957 in 2024 ([Emerce](https://www.emerce.nl/?p=6857564)).
- **Voor DealBuddy:**
  - Zet bij elke deal en in elke mail: "We krijgen een vergoeding als je via deze link koopt. Dat verandert de volgorde niet."
  - Rangschik **nooit** op commissie. Leg dit uit op een pagina "Zo verdienen we".
  - Zet op social media #ad of #affiliate bij elke post.

### 4e. Privacy (AVG)

- We bewaren alleen een e-mailadres en een watchlist.
- Dubbele opt-in: eerst bevestigen, daarna pas mails. Elke mail heeft een afmeldlink.
- We maken geen profielen en verkopen geen gegevens.
- Gebruik EU-verwerkers, bijvoorbeeld Brevo (Frankrijk). Sluit een verwerkersovereenkomst en zet DealBuddy in het [verwerkingsregister](../verwerkingsregister.md).

## 5. Conclusie

| Vraag | Antwoord |
|---|---|
| Is er ruimte? | **Ja, in een niche:** alerts op echte korting met bewijs, over meerdere categorieën. Een brede vergelijkingssite tegen Google en Tweakers kunnen we **niet winnen**. |
| Wat is het grootste risico? | Toegang tot data (voorwaarden, databankrecht) en weinig verkeer in het begin. |
| Waar beginnen? | Parfum en verzorging (geen sterke NL-concurrent, 5–12% commissie) en vluchten vanaf NL-luchthavens (veel zoekverkeer, wel lage commissie). Elektronica pas later, want daar zijn Tweakers en Kieskeurig sterk. |
