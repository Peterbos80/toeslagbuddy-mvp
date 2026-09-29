# Backlog

Legenda: ✅ klaar en getest · 🔜 volgende · 💡 idee · ⛔ wacht op jou (account of keuze nodig)

## Klaar in deze ronde (29 september 2026)

| # | Feature | Getest met |
|---|---|---|
| ✅ 1 | Ontwerp voor de doelgroep: grotere tekst (18px), grotere invoervelden, vertrouwensbalk, grote startknop, snelkeuze per doelgroep | axe (WCAG 2 AA), schermafbeeldingen op mobiel |
| ✅ 2 | Stappenplan: de complete check toont één stap tegelijk, met voortgangsbalk en controle van verplichte velden | e2e `home: stappenplan` |
| ✅ 3 | **Voorleesknop** op elke pagina (Web Speech API), voor wie moeite heeft met lezen | handmatig; verschijnt alleen als de browser voorlezen ondersteunt |
| ✅ 4 | Menuknop op mobiel, blok "Hulp nodig?" (BelastingTelefoon, Informatiepunt Digitale Overheid, schuldhulp) | e2e `mobiel` |
| ✅ 5 | Browsertests en toegankelijkheidstests in GitHub Actions; **publiceren alleen als alles slaagt** | CI |
| ✅ 6 | Test op kapotte interne links en ongeldige gestructureerde gegevens | `test/links.test.js` |
| ✅ 7 | **Dagelijkse nieuwsverzamelaar** (RSS van Rijksoverheid, filter op toeslagen en inkomen), nieuwspagina, nieuwsblok op de homepage, eigen RSS-feed | `test/nieuws.test.js` |
| ✅ 8 | AdSense: verificatie-meta, script, advertentieblokken en `ads.txt` automatisch zodra het ID is ingevuld | `test/monetization.test.js` |
| ✅ 9 | Partnerblokken ook op de pagina zelf, klikken meten (event `Partnerklik`) | `test/monetization.test.js` |
| ✅ 10 | Pagina **Zorgverzekering 2027 overstappen**, voor het overstapseizoen | axe, links |
| ✅ 11 | **Video's (9:16, MP4)** voor Reels en TikTok, automatisch gemaakt uit de carrousels | lokaal gerenderd en gecontroleerd |
| ✅ 12 | Instagram Reels plaatsen (`IG_FORMAT=reel`) en TikTok-concept in de inbox | `test/social.test.js` |
| ✅ 13 | **Mijn toeslagbewaker** (zzp): checks bewaren, geschiedenis, exporteren en importeren, zonder account | e2e `zzp-dashboard` |

## Klaar in ronde 3 (29 september 2026, middag)

| # | Feature | Getest met |
|---|---|---|
| ✅ 23 | Levendiger ontwerp: Nunito, kleurverlopen, zwevende munten, iconen, glans, oplopende bedragen, geanimeerde balken, onthullen bij scrollen | axe, e2e, schermafbeeldingen |
| ✅ 24 | **Persoonlijke uitleg-video's**: geanimeerde persona (op leeftijd en situatie gekozen, anders Buddy), met stem, ondertitels en bediening | `test/uitleg.test.js`, e2e |
| ✅ 25 | **Alle regelingen van Nederland** (34, van Dienst Toeslagen, SVB, UWV, DUO, Belastingdienst, gemeenten en fondsen), met filter en zoeken | e2e |
| ✅ 26 | **Wijzigingsmonitor**: dagelijkse controle van de officiële bronpagina's, met een GitHub-issue bij gewijzigde bedragen | `test/monitor.test.js` |
| ✅ 27 | **Pro met inloggen**: aanmelden, inloglink per e-mail, afgeschermde omgeving, proef van 7 dagen, vergrendeld na afloop, abonnement aanvragen | `test/proef.test.js`, e2e (demo) |
| ✅ 28 | **Formulieren naar je privé-e-mail** via Web3Forms; nergens een e-mailadres op de site; contactpagina | e2e |
| ✅ 29 | **Grappige persona-updates** voor X en TikTok, met spelregeltest | `test/social.test.js` |

## Volgende (in volgorde van opbrengst)

| # | Feature | Waarom | Status |
|---|---|---|---|
| 14 | Automatisch betalen voor Pro (Mollie → abonnement op 'actief') | Van proef naar abonnement zonder handwerk | ⛔ Mollie-account nodig |
| 14b | Uitkomst delen als afbeelding (WhatsApp, stories) | Viraal bereik | 🔜 |
| 14c | Pagina 'Wie zit erachter' en een deskundige die de rekenregels controleert | Vertrouwen (voor Google) | ⛔ jouw naam en foto |
| 15 | Kolommen van de meestgebruikte exports van bewindvoeringssoftware automatisch herkennen | Minder werk bij het inladen | 🔜 voorbeeldexport nodig uit de pilotgesprekken |
| 16 | Kinderopvangtoeslag met de volledige officiële tabel (69 inkomensklassen) | Exact in plaats van ±1 procentpunt | 🔜 |
| 17 | Bedragen 2027 overal bijwerken zodra ze definitief zijn (eind november) | Piek in zoekverkeer in december en januari | 🔜 zodra ze gepubliceerd zijn |
| 18 | Pagina's per gemeente voor de grootste 20 gemeenten (kwijtschelding, individuele inkomenstoeslag) | Veel lokale zoekvragen, en bruikbaar voor Pro | 💡 |
| 19 | Rekenhulp die andere sites kunnen insluiten (huurdersverenigingen, bibliotheken) | Verwijzende links en bereik | 💡 |
| 20 | Accounts voor zzp'ers en de Moneybird-koppeling | Betaalde versie van de zzp-bewaker | ⛔ na de wachtlijst, zie [accounts-zzp.md](accounts-zzp.md) |
| 21 | Engelstalige versie ("Dutch benefits calculator") | Expats en internationale studenten | 💡 |
| 22 | Samenwerking met een leverancier van bewindvoeringssoftware | Pro als knop in hun pakket | 💡 na 5 klanten |

## Wacht op jou (⛔)

- AdSense, Daisycon, TradeTracker en Awin aanvragen: [geld-verdienen-instellen.md](geld-verdienen-instellen.md)
- E-mail instellen: [email.md](email.md)
- Instagram, Meta-app en TikTok-app aanmaken: [instagram.md](instagram.md)
- In GitHub: standaardbranch op `main` zetten en `main` toestaan in de omgeving github-pages
- Supabase-project voor Pro-accounts: [pro-accounts.md](pro-accounts.md)
- Web3Forms-sleutel voor formulieren: [email.md](email.md)
