# AdSense, partnerlinks en statistieken instellen

De site is er volledig klaar voor: zodra je een code in `site.config.js` zet en naar `main` pusht, staat alles automatisch en correct op de site. Dat is getest in `test/monetization.test.js`.

**Accounts aanmaken kan ik niet voor je doen.** Google, Daisycon, TradeTracker en Awin vragen je identiteit, je bankrekening en je belastinggegevens. Dat kost je ongeveer 45 minuten. Stuur daarna de codes en links naar mij, of zet ze zelf in `site.config.js`. Deel nooit wachtwoorden.

## 1. Statistieken (eerst doen, 5 minuten)

Zonder cijfers weet je niet wat werkt.

- **GoatCounter** (gratis) of **Plausible** (betaald, ongeveer € 9 per maand). Beide werken zonder cookies, dus je hebt geen cookiebanner nodig.
- Vul in `site.config.js` bij `analytics` je GoatCounter-code of je Plausible-domein in.
- Wat wordt gemeten: bezoekers, elke berekening (event `Berekening`), agenda-herinneringen en klikken op partnerlinks (event `Partnerklik`).

## 2. Google AdSense

1. Ga naar adsense.google.com, meld je aan met je Google-account en voeg de site `toeslagbuddy.nl` toe.
2. Je krijgt een publisher-ID in de vorm `ca-pub-1234567890123456`. Zet die in `site.config.js` bij `adsense.client` en push naar `main`. De site plaatst dan automatisch:
   - het verificatie-meta-tag,
   - het AdSense-script,
   - `ads.txt`.
3. Klik in AdSense op **Verifiëren** en daarna op **Beoordeling aanvragen**. Goedkeuring duurt meestal enkele dagen tot een paar weken.
4. **Verplicht in de EU:** ga in AdSense naar *Privacy en berichten* en zet het Europese toestemmingsbericht (de toestemmingsmelding van Google zelf) aan.
5. Optioneel: maak twee advertentieblokken aan en zet de slot-ID's bij `slotInhoud` en `slotOnder`. Je kunt ook in AdSense "Automatische advertenties" aanzetten; dan hoef je niets meer te doen.

## 3. Partnerlinks (affiliate)

1. Meld je als publisher aan bij **Daisycon**, **TradeTracker** en/of **Awin**, en voeg je site toe.
2. Zoek campagnes en vraag ze aan. Let op de vergoeding per actie en de voorwaarden (bijvoorbeeld of social media is toegestaan):

| Blok in `site.config.js` | Zoek op | Wanneer |
|---|---|---|
| `zorgverzekering` | zorgverzekering, zorgvergelijker | **12 november – 31 december** (piek) |
| `energie` | energie vergelijken, energieleverancier | het hele jaar |
| `internet` | internet, tv, mobiel | het hele jaar |
| `kinderopvang` | kinderopvang | het hele jaar |
| `belastinghulp` | belastingaangifte, boekhouden | maart–mei en voor zzp |

3. Plak je trackinglink bij `url` van het juiste blok en push naar `main`.
   - Het blok verschijnt dan onder de passende berekening en op de pagina's zelf, zoals `/zorgverzekering-overstappen/`.
   - Het is altijd gemarkeerd als *Partnerlink* en de link heeft `rel="sponsored"`. Beide zijn wettelijk verplicht.
4. **Instagram/TikTok:** zet in je bio de link `toeslagbuddy.nl/instagram/`. Zet onder posts met een partnerlink **#ad** of "partnerlink" (Reclamecode Social Media).

## 4. Controleren dat het werkt

- Na het pushen draait de GitHub Action *Publiceer op GitHub Pages*. Die publiceert alleen als alle tests slagen.
- Bekijk de broncode van de homepage (Ctrl+U) en zoek op `adsbygoogle` en je `ca-pub`.
- Controleer `https://www.toeslagbuddy.nl/ads.txt`.
- Klik zelf één keer op een partnerlink. In het affiliate-netwerk zie je de klik binnen een paar uur.
