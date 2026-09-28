# Hosting: GitHub Pages met je TransIP-domein

De site wordt gratis gehost door GitHub Pages. Bij elke wijziging op `main` bouwt de workflow `.github/workflows/pages.yml` de site opnieuw en zet hem live. Bij TransIP heb je alleen je domeinnaam nodig; een webhostingpakket is niet nodig.

## Eenmalig instellen (ongeveer 10 minuten)

### 1. GitHub Pages aanzetten

1. Ga naar github.com/Peterbos80/toeslagbuddy-mvp → **Settings** → **Pages**.
2. Kies bij *Build and deployment → Source* voor **GitHub Actions**.
3. Vul bij *Custom domain* **www.toeslagbuddy.nl** in en klik op **Save**.
4. Ga naar **Actions** → **Publiceer op GitHub Pages** → **Run workflow** (branch `main`).

### 2. DNS instellen bij TransIP

Ga in het TransIP-controlepaneel naar **toeslagbuddy.nl** → **DNS**. Zet daar de **nameservers op TransIP** en de optie **TransIP-instellingen** uit, zodat je de records zelf kunt aanpassen. Verwijder de bestaande `A`-, `AAAA`- en `CNAME`-records voor `@` en `www`. Voeg daarna deze records toe:

| Naam | TTL | Type | Waarde |
|---|---|---|---|
| `@` | 1 uur | A | `185.199.108.153` |
| `@` | 1 uur | A | `185.199.109.153` |
| `@` | 1 uur | A | `185.199.110.153` |
| `@` | 1 uur | A | `185.199.111.153` |
| `@` | 1 uur | AAAA | `2606:50c0:8000::153` |
| `@` | 1 uur | AAAA | `2606:50c0:8001::153` |
| `@` | 1 uur | AAAA | `2606:50c0:8002::153` |
| `@` | 1 uur | AAAA | `2606:50c0:8003::153` |
| `www` | 1 uur | CNAME | `peterbos80.github.io.` |

Let op de punt aan het eind van `peterbos80.github.io.`: TransIP heeft die nodig.

**Records voor e-mail** (`MX`, en de `TXT`-records voor SPF en DKIM) laat je staan.

### 3. HTTPS aanzetten

Het duurt 10 minuten tot een paar uur voordat de DNS-wijziging overal is doorgevoerd. Daarna maakt GitHub automatisch een SSL-certificaat aan.

Ga dan terug naar **Settings → Pages** en vink **Enforce HTTPS** aan. Kun je dat nog niet aanvinken, dan is het certificaat nog niet klaar; probeer het later opnieuw.

### 4. Controleren

- https://www.toeslagbuddy.nl moet de site tonen.
- https://toeslagbuddy.nl (zonder www) moet automatisch doorsturen naar www.

## Aanbevolen: domein verifiëren bij GitHub

Dit voorkomt dat iemand anders jouw domein aan een eigen GitHub-site koppelt.

1. Ga naar je GitHub-profiel → **Settings** → **Pages** → **Add a domain** en vul `toeslagbuddy.nl` in.
2. GitHub geeft je een `TXT`-record. Zet dat bij TransIP in de DNS en klik daarna op **Verify**.

## Liever toch TransIP-webhosting?

Dat kan ook. Zet de secrets `TRANSIP_HOST`, `TRANSIP_USER` en `TRANSIP_PASSWORD` (je SFTP-gegevens) in GitHub. De workflow *Test en deploy naar TransIP* uploadt dan naar je webhostingpakket. Laat de DNS in dat geval op de standaardinstellingen van TransIP staan.
