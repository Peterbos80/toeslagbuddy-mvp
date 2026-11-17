# Verdienmodel van de hele site – eerlijk

Gecontroleerd op 17 november 2026. Deze notitie gaat over **alle onderdelen**: Toeslagen, Familie, Besparen, Professionals en Zzp. Ze vult [verdienplan.md](verdienplan.md) (Pro) en [familieregie/ontwerp.md](familieregie/ontwerp.md) §10 (Familie) aan.

## Eerst de eerlijke basis

- **Zonder bezoekers verdient geen enkel onderdeel iets.** De site staat technisch klaar, maar inkomsten beginnen pas als mensen hem vinden en gebruiken.
- **Niemand kan een plek bovenaan in Google garanderen.** We doen alles wat zoekmachines zelf vragen (zie *Vindbaarheid* hieronder). Hoe snel bezoekers komen, is onzeker: reken op 3 tot 12 maanden voordat nieuwe pagina's goed gevonden worden.
- **Er staat nu nog niets aan dat geld ontvangt.** Daarvoor zijn accounts op jouw naam nodig (Mollie, partnerprogramma's, eventueel AdSense). Die kan ik niet voor je aanmaken: ze vragen je identiteit, KvK-nummer en bankrekening.
- **Het meeste geld komt van mensen of kantoren die een abonnement nemen**, niet van advertenties. Advertenties op een site met 15.000 bezoekers per maand leveren ongeveer € 50 tot € 150 per maand op.

## Per onderdeel

| Onderdeel | Wie betaalt | Hoe | Wat staat klaar | Wat jij nog moet doen |
|---|---|---|---|---|
| **Familie** (`/familie/`) | Families | € 7,99/maand of € 79/jaar; € 99 eenmalig voor de afwikkeling; 30 dagen gratis | Prijzenpagina, database met abonnementen en betalingen (alleen de server schrijft), regelkamer werkt gratis op het apparaat | Mollie-account, Supabase aanzetten, `betalenActief` op `true` |
| **Familie-partners** (`/familie/partner/`) | Uitvaartondernemers | € 99/maand voor een nazorgportaal met eigen naam; de ondernemer ziet nooit de inhoud van een dossier | Database (partners, uitnodigingscodes) met tests | Eerste 3 ondernemers zelf benaderen (dit kan niet automatisch) |
| **Professionals** (`/pro/`) | Bewindvoerders, budgetcoaches | € 1 per cliënt per maand, minimaal € 99 | Volledige Pro-app, proefperiode | Zie [validatie-bewindvoerders.md](validatie-bewindvoerders.md) |
| **Zzp** (`/zzp-toeslagen/`) | Zzp'ers | Nu gratis; later € 4–5/maand voor een koppeling met de boekhouding; nu alleen een partnerlink naar boekhoudprogramma's | Toeslagbewaker, partnerblok | Partneraccount bij een boekhoudprogramma |
| **Besparen** (`/deals/`) | Winkels (commissie) | Partnerlinks via Daisycon, TradeTracker of Awin; meestal 2–8% van de aankoop | Prijsvergelijking met bewijs, jagers, gemarkeerde partnerlinks (`rel="sponsored"`) | Aanmelden bij de netwerken; daarna draaien de echte prijsfeeds automatisch |
| **Toeslagen** (rekenhulpen en artikelen) | Adverteerders, partners | Partnerblokken die bij het onderwerp passen (zorgverzekering, energie, internet, kinderopvang, hulp bij aangifte); eventueel AdSense | Blokken staan op de juiste pagina's en verschijnen pas als de link is ingevuld in `site.config.js` | Partnerlinks invullen |

**Familie krijgt bewust geen partnerlinks of advertenties.** Wie de zaken van een zieke of overleden ouder regelt, moet erop kunnen vertrouwen dat we niets aanraden om er zelf aan te verdienen. Dat vertrouwen is het product.

## Realistische rekensom na 18–24 maanden

Alle getallen zijn schattingen, geen beloftes.

| Bron | Aanname | Per maand |
|---|---|---|
| Familie | 300 betalende families × gemiddeld € 7 (na btw en kosten) | € 2.100 |
| Familie-afwikkeling | 15 per maand × € 99 | € 1.485 |
| Familie-partners | 5 uitvaartondernemers × € 99 | € 495 |
| Professionals | 25 kantoren × € 100 | € 2.500 |
| Besparen | 40.000 bezoekers, 2% koopt via een link, € 3 commissie | € 2.400 |
| Toeslagen-partnerlinks | 15.000 bezoekers, vooral in het overstapseizoen | € 300–800 |
| **Totaal** | | **≈ € 9.000–10.000** |

**Kans dat dit lukt: laag tot redelijk, ongeveer 15–25%.** Het hangt vooral af van twee dingen die geen code kan regelen: of mensen de site vinden (vindbaarheid) en of kantoren en uitvaartondernemers willen betalen (verkoop). Zonder Pro en partners, dus alleen consumenten, is € 10.000 per maand onwaarschijnlijk (< 5%).

## Wat automatisch gaat (past in 1 uur per week)

- Prijzen verzamelen, bronnen van de regels controleren, nieuws ophalen: GitHub Actions, elke dag of week.
- Na elke publicatie: gewijzigde pagina's melden bij zoekmachines (IndexNow), sitemap en `llms.txt` bijwerken.
- Betalingen en abonnementen: Mollie en de database (zodra de accounts er zijn).
- Jouw uur per week: meldingen van de regelcontrole bekijken, vragen beantwoorden, één partner of kantoor benaderen.

## Vindbaarheid (wat er nu staat)

- Sitemap met alle openbare pagina's; `robots.txt` die zoekmachines én AI-zoekrobots (ChatGPT-zoeken, Claude, Perplexity, Google) toelaat, met uitzondering van de apps.
- `llms.txt`: een korte wegwijzer zodat AI-assistenten de site goed kunnen citeren.
- IndexNow: na elke publicatie meldt de site zelf welke pagina's zijn veranderd (Bing, Yandex, Seznam, Naver; Bing levert ook de antwoorden van ChatGPT-zoeken en Copilot).
- Gestructureerde gegevens (organisatie, broodkruimels, rekenhulpen, artikelen, veelgestelde vragen) en een eigen deelafbeelding per onderdeel.

**Wat alleen jij kunt doen (eenmalig, ongeveer 15 minuten):**

1. Google Search Console: voeg `toeslagbuddy.nl` toe met je eigen Google-account, kies *HTML-tag* en plak de code in `site.config.js` → `vindbaar.google`. Dien daarna `https://www.toeslagbuddy.nl/sitemap.xml` in.
2. Bing Webmaster Tools: importeer de site vanuit Search Console (één klik), of plak de code in `vindbaar.bing`.
3. Google Bedrijfsprofiel is niet nodig: de site heeft geen bezoekadres.
