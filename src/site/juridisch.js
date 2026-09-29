// Juridische pagina's: privacyverklaring, Pro-voorwaarden, colofon,
// toegankelijkheidsverklaring en beveiligingsfactsheet. De bedrijfsgegevens
// komen uit site.config.js → bedrijf. Geen juridisch advies: laat deze teksten
// vóór de eerste betalende klant toetsen door een jurist (docs/compliance-checklist.md).
import { JAAR } from '../calc/params.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const VERSIE_JURIDISCH = '29 september 2026';
const mail = (adres) => `<a href="mailto:${adres}">${adres}</a>`;
const PRIVACY_MAIL = 'privacy@toeslagbuddy.nl';
const SECURITY_MAIL = 'security@toeslagbuddy.nl';

function wij(config) {
  const b = config.bedrijf || {};
  return {
    naam: b.naam || b.handelsnaam || config.naam,
    handelsnaam: b.handelsnaam || config.naam,
    plaats: b.adres || b.vestigingsplaats || '',
    kvk: b.kvk || '',
    btwId: b.btwId || '',
    email: b.email || 'info@toeslagbuddy.nl',
  };
}

// Lijst met bedrijfsgegevens; lege velden worden 'volgt' zodat de eigenaar ziet wat mist
function gegevensLijst(config) {
  const w = wij(config);
  const rij = (k, v) => `<li><strong>${k}:</strong> ${v ? esc(v) : '<em>volgt</em>'}</li>`;
  return `<ul>
${rij('Naam', w.naam)}
${w.handelsnaam !== w.naam ? rij('Handelsnaam', w.handelsnaam) : ''}
${rij(config.bedrijf?.adres ? 'Vestigingsadres' : 'Vestigingsplaats', w.plaats)}
${rij('KvK-nummer', w.kvk)}
${rij('Btw-identificatienummer', w.btwId)}
<li><strong>E-mail:</strong> ${mail(w.email)}</li>
<li><strong>Privacyvragen:</strong> ${mail(PRIVACY_MAIL)}</li>
<li><strong>Beveiligingsproblemen melden:</strong> ${mail(SECURITY_MAIL)}</li>
</ul>`;
}

const tabel = (koppen, rijen, label) =>
  `<div class="tabel-scroll" tabindex="0" role="region" aria-label="${label}"><table class="juridisch-tabel"><thead><tr>${koppen.map((k) => `<th scope="col">${k}</th>`).join('')}</tr></thead><tbody>${rijen
    .map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;

// Wat de server per Pro-controle bewaart (spec §9, B5)
const TELLINGEN =
  'een bandbreedte voor het aantal cliënten (1–9, 10–49, 50–199 of 200+), het aantal signalen per soort (aantallen onder de 5 als ‘minder dan 5’), bedragen alleen bij 10 of meer cliënten en afgerond op € 500, de versie van de rekenregels en de datum';

// ───────────────────────────── PRIVACY ─────────────────────────────
function privacyBody({ config }) {
  const a = config.analytics;
  const stats = a.plausibleDomain ? 'Plausible Insights (Estland; servers in Duitsland)' : a.goatcounterCode ? 'GoatCounter (EU)' : '';
  const web3forms = !!config.formulieren?.accessKey;
  const hosting =
    config.hosting === 'transip'
      ? ['TransIP (Nederland)', 'Gegevens blijven in Nederland.']
      : ['GitHub Pages (GitHub Inc., Verenigde Staten)', 'GitHub valt onder het EU-VS Data Privacy Framework.'];

  const rijen = [
    ['Rekenhulpen en toeslagcheck', 'Wat je invult: inkomen, huur, vermogen, kinderen en leeftijd', 'De berekening maken', 'Niemand. De berekening gebeurt op je eigen apparaat. Wij krijgen deze gegevens niet', 'Niet bij ons'],
    ['Toeslagbewaker voor zzp’ers', 'Je bewaarde checks (winst, inkomen, datum)', 'Je eigen overzicht, alleen als je op ‘Bewaar’ klikt', 'Niemand. Het staat alleen in de opslag van je eigen browser', 'Tot je het zelf wist'],
    ['Cliëntenlijst in ToeslagBuddy Pro', 'De cliëntgegevens die een kantoor inleest', 'De controle voor het kantoor', 'Niemand. De controle draait in de browser van het kantoor. Het kantoor is zelf verantwoordelijk voor deze gegevens', 'Niet bij ons'],
    ['Tellingen per Pro-controle', `Per organisatie: ${TELLINGEN}. Ook welk account de controle deed`, 'Rapportage en trend voor je organisatie. Grondslag: overeenkomst (art. 6 lid 1 b AVG)', 'Supabase (database in Frankfurt, Duitsland)', 'Zolang de organisatie bestaat. Na opzegging nog 12 maanden, daarna gewist'],
    ['Pro-account', 'Naam, zakelijk e-mailadres, organisatie, KvK-nummer (optioneel), aantal cliënten (optioneel), rol, proef- of abonnementsstatus, inlogmomenten', 'Je account en abonnement leveren. Grondslag: overeenkomst (b)', 'Supabase (Frankfurt)', 'Zolang je account bestaat. Een verlopen proef zonder abonnement: 90 dagen. Een account zonder organisatie: 30 dagen na het einde van de proef. Facturen: 7 jaar (wettelijke bewaarplicht)'],
    ['Inlogcode per e-mail', 'E-mailadres en tijdstip', 'Veilig inloggen zonder wachtwoord. Grondslag: overeenkomst (b)', 'Supabase en Brevo (Sendinblue SAS, Frankrijk) voor het versturen', 'Verzendlogboek maximaal 90 dagen'],
    ['Auditlog', 'Welk account wat deed (uitnodigen, rol wijzigen, verlengen, verwijderen) en wanneer', 'Beveiliging en verantwoording aan je organisatie. Grondslag: gerechtvaardigd belang (f)', 'Supabase (Frankfurt)', '365 dagen'],
    [
      'Berichten via onze formulieren (contact, pilot, abonnement, wachtlijst)',
      'Naam, e-mailadres, organisatie, telefoon (optioneel) en je bericht',
      'Je vraag beantwoorden of een pilot of abonnement regelen. Grondslag: overeenkomst of de voorbereiding daarvan (b), anders gerechtvaardigd belang (f)',
      web3forms
        ? 'Web3Forms (Web3Creative, India). Let op: India heeft geen passend beschermingsniveau volgens de EU. Daarom maken we gebruik van standaardcontractbepalingen. We stappen over op een dienst in de EU'
        : 'Supabase (Frankfurt) en Brevo (Frankrijk), die het bericht doorstuurt naar onze mailbox',
      'In de database 90 dagen. In onze mailbox zolang nodig om je vraag af te handelen, maximaal 12 maanden, tenzij er een klantrelatie uit voortkomt',
    ],
    ['E-mail aan info@, privacy@ of security@', 'Je e-mailadres en je bericht', 'Je vraag beantwoorden. Grondslag: gerechtvaardigd belang (f)', 'Onze e-mailprovider (doorsturen naar onze mailbox)', 'Maximaal 12 maanden, tenzij er een klantrelatie uit voortkomt'],
    ['Bezoek aan de website (hosting)', 'IP-adres, opgevraagde pagina, browser en tijdstip in het serverlogboek', 'De website veilig laten werken. Grondslag: gerechtvaardigd belang (f)', `${hosting[0]}. ${hosting[1]}`, 'Bepaald door de hostingpartij; wij gebruiken deze logboeken niet'],
    [
      'Bezoekersstatistieken',
      stats ? 'Anonieme totalen: bezochte pagina, verwijzende site, land, soort apparaat. Geen cookies, geen IP-adres opgeslagen' : '–',
      stats ? 'Zien welke pagina’s helpen. Grondslag: gerechtvaardigd belang (f)' : 'We gebruiken nu geen statistieken',
      stats ? `${stats}. Niet op de Pro- en beheerpagina’s` : '–',
      stats ? 'Alleen totalen' : '–',
    ],
    [
      'Advertenties',
      config.adsense.client ? 'Cookies en advertentie-ID’s, alleen als je daar toestemming voor geeft' : '–',
      config.adsense.client ? 'Advertenties tonen. Grondslag: toestemming (a)' : 'We tonen nu geen advertenties van derden',
      config.adsense.client ? 'Google Ireland / Google LLC (VS, Data Privacy Framework). Niet op de Pro- en beheerpagina’s' : '–',
      config.adsense.client ? 'Zie het privacybeleid van Google; je kunt je toestemming altijd intrekken' : '–',
    ],
    ...(config.nieuwsbrief.formAction
      ? [['Nieuwsbrief', 'E-mailadres', 'Je de nieuwsbrief sturen. Grondslag: toestemming (a)', 'Onze nieuwsbriefdienst', 'Tot je je afmeldt']]
      : []),
  ];

  return `
<p class="subtiel">Versie ${VERSIE_JURIDISCH}.</p>
<h2>In het kort</h2>
<ul>
<li><strong>Wat je invult in de rekenhulpen, blijft op je eigen apparaat.</strong> Wij krijgen het niet.</li>
<li><strong>Cliëntgegevens van kantoren komen niet op onze server.</strong> ToeslagBuddy Pro controleert de lijst in de browser. Wij krijgen alleen geaggregeerde tellingen per organisatie.</li>
<li><strong>Wel verwerken wij gegevens van Pro-accounts en van berichten</strong> die je ons stuurt. Die staan in de EU.</li>
<li><strong>Geen trackingcookies.</strong> Op de Pro- en beheerpagina’s draaien geen scripts van andere partijen.</li>
</ul>

<h2>Wie zijn wij?</h2>
<p>${esc(wij(config).naam)} is verantwoordelijk voor de verwerking van persoonsgegevens op deze website, zoals beschreven in deze privacyverklaring.</p>
${gegevensLijst(config)}

<h2>Welke gegevens, waarom en hoe lang?</h2>
${tabel(['Onderdeel', 'Welke gegevens', 'Waarom (doel en grondslag)', 'Wie helpt ons (waar)', 'Hoe lang'], rijen, 'Welke gegevens we verwerken')}

<h2>Opslag op je eigen apparaat</h2>
<p>We gebruiken geen trackingcookies. Sommige onderdelen bewaren wel iets in de opslag van je browser (<code>localStorage</code>). Dat is nodig om die onderdelen te laten werken, dus we vragen er geen toestemming voor. Het blijft op je apparaat.</p>
<ul>
<li><strong>Toeslagbewaker:</strong> je bewaarde checks, alleen als je op ‘Bewaar’ klikt. Wissen kan met ‘Alles wissen’.</li>
<li><strong>Pro-inlog:</strong> je sessie, zodat je ingelogd blijft. Weg na uitloggen.</li>
<li><strong>Pro-controles:</strong> de precieze trend van je eigen controles en tellingen die nog verstuurd moeten worden. Per gebruiker, weg na uitloggen.</li>
<li><strong>Pro-demo:</strong> een proefaccount dat alleen in deze browser bestaat.</li>
</ul>

<h2>Voorlezen en video’s</h2>
<p>De voorleesknop en de uitleg door een persona gebruiken alleen een stem die op je eigen apparaat draait. Is die er niet, dan zie je alleen de ondertitels. Zo gaat er geen tekst met jouw bedragen naar een spraakdienst. De AI-video’s zijn vooraf gemaakt met HeyGen. Jouw gegevens gaan niet naar HeyGen: je persoonlijke bedragen staan alleen in de ondertiteling op je eigen apparaat.</p>

<h2>Partnerlinks</h2>
<p>Sommige links naar vergelijkingssites zijn partnerlinks. Klik je erop en sluit je iets af, dan krijgen wij misschien een vergoeding. Jij betaalt niets extra. Na het klikken gelden de privacyregels van die website.</p>

<h2>Gegevens buiten de EU</h2>
<p>Onze database staat in de EU (Frankfurt). Supabase is wel een Amerikaans bedrijf. Daarom gelden de standaardcontractbepalingen van de Europese Commissie. ${config.hosting === 'transip' ? '' : 'GitHub (hosting van de website) valt onder het EU-VS Data Privacy Framework. '}We verkopen je gegevens nooit en we gebruiken ze niet voor profilering of automatische besluiten.</p>

<h2>Cliëntgegevens van kantoren</h2>
<p>Gebruik je ToeslagBuddy Pro als bewindvoerder, budgetcoach of schuldhulpverlener? Dan blijf jij verantwoordelijk voor de gegevens van je cliënten. De controle draait in je eigen browser. Kolommen met een naam, BSN, geboortedatum, adres, IBAN, e-mailadres of telefoonnummer laten we automatisch weg. Omdat cliëntgegevens niet op onze server komen, zijn wij hiervoor geen verwerker. Meer uitleg staat in de <a href="/pro/beveiliging/">beveiligingsfactsheet</a>.</p>

<h2>Jouw rechten</h2>
<p>Je mag ons vragen:</p>
<ul>
<li>welke gegevens we van je hebben (inzage), en een kopie daarvan;</li>
<li>je gegevens te verbeteren of aan te vullen;</li>
<li>je gegevens te wissen;</li>
<li>minder te doen met je gegevens (beperking);</li>
<li>je gegevens in een bestand te krijgen, zodat je ze ergens anders kunt gebruiken (overdraagbaarheid).</li>
</ul>
<p>Gebruiken we je gegevens op basis van gerechtvaardigd belang? Dan mag je daartegen bezwaar maken. Heb je toestemming gegeven? Dan mag je die altijd intrekken.</p>
<p>Heb je een Pro-account? Dan kun je in je omgeving zelf je gegevens downloaden en je account verwijderen. Je kunt ons ook mailen: ${mail(PRIVACY_MAIL)}. We reageren binnen een maand. Soms vragen we je om te laten zien dat het om jouw gegevens gaat.</p>
<p><strong>Klacht?</strong> Laat het ons eerst weten, dan zoeken we samen een oplossing. Je mag ook altijd een klacht indienen bij de <a href="https://autoriteitpersoonsgegevens.nl" rel="noopener">Autoriteit Persoonsgegevens</a>.</p>

<h2>Beveiliging en datalekken</h2>
<p>We beveiligen gegevens met passende maatregelen, zoals versleutelde verbindingen, strenge toegangsregels in de database en tweestapsverificatie voor beheerders. Zie de <a href="/pro/beveiliging/">beveiligingsfactsheet</a>. Gaat er toch iets mis? Dan melden we een datalek binnen 72 uur bij de Autoriteit Persoonsgegevens als dat nodig is, en we informeren jou als het risico voor jou groot is.</p>

<h2>Wijzigingen</h2>
<p>Verandert er iets in hoe we met gegevens omgaan, dan passen we deze verklaring aan. Bovenaan staat de datum van de laatste versie. Bij grote wijzigingen voor Pro-klanten sturen we vooraf een bericht.</p>`;
}

// ───────────────────────────── PRO-VOORWAARDEN ─────────────────────────────
function voorwaardenBody({ config }) {
  const w = wij(config);
  const dagen = config.pro?.proefDagen || 7;
  const artikel = (nr, kop, inhoud) => `<h2 id="artikel-${nr}">${nr}. ${kop}</h2>\n${inhoud}`;
  return `
<p class="subtiel">Versie ${VERSIE_JURIDISCH}. Deze voorwaarden gelden voor ToeslagBuddy Pro. Je kunt ze opslaan of printen (bijvoorbeeld als PDF via Ctrl+P).</p>
${artikel(1, 'Wie wij zijn', `<p>ToeslagBuddy Pro wordt geleverd door:</p>${gegevensLijst(config)}`)}
${artikel(2, 'Alleen voor organisaties', `<ul>
<li>ToeslagBuddy Pro is een dienst voor organisaties en beroepsmatige gebruikers, zoals bewindvoerders, budgetcoaches, schuldhulpverleners en gemeenten. Het is geen dienst voor consumenten.</li>
<li>Door je aan te melden, verklaar je dat je handelt voor je beroep of bedrijf.</li>
<li>Voor een betaald abonnement is een KvK-nummer verplicht. Zonder KvK-nummer zetten we een proef niet om naar een abonnement.</li>
</ul>`)}
${artikel(3, 'Proef en pilot', `<ul>
<li>De proef duurt ${dagen} dagen, met alle functies. Je hebt geen betaalgegevens nodig.</li>
<li>De proef stopt vanzelf. Hij wordt <strong>niet</strong> automatisch een betaald abonnement. Je hoeft dus niets op te zeggen.</li>
<li>Wij kunnen een proef verlengen tot een begeleide pilot van maximaal 30 dagen. Ook die stopt vanzelf.</li>
<li>Na afloop gaan opslaan, trend, team en rapport op slot. Kies je niet voor een abonnement, dan wissen we je account en de tellingen van je organisatie 90 dagen na het einde van de proef.</li>
</ul>`)}
${artikel(4, 'Abonnement en prijs', `<ul>
<li>Het abonnement kost € 1 per cliënt per maand, met een minimum van € 99 per maand.</li>
<li><strong>Alle prijzen zijn exclusief btw.</strong></li>
<li>De prijs gaat uit van het aantal cliënten dat je bij de aanvraag opgeeft. Verandert dat aantal flink, geef het dan door. We passen de prijs aan vanaf de volgende maand.</li>
<li>Eén organisatie deelt één abonnement, ook met meerdere leden.</li>
</ul>`)}
${artikel(5, 'Betaling en facturen', `<ul>
<li>Je krijgt elke maand vooraf een factuur per e-mail, met een betaallink.</li>
<li>De betaaltermijn is 14 dagen.</li>
<li>Betaal je niet op tijd, dan sturen we een herinnering. Betaal je daarna nog steeds niet, dan mogen we je toegang tijdelijk blokkeren tot de betaling binnen is.</li>
</ul>`)}
${artikel(6, 'Looptijd en opzeggen', `<ul>
<li>Het abonnement loopt per maand en wordt elke maand verlengd, tot jij of wij opzeggen.</li>
<li>Je kunt altijd opzeggen tegen het einde van de lopende maand. Mail naar ${mail(w.email)} of gebruik het <a href="/contact/">contactformulier</a>. We bevestigen je opzegging per e-mail.</li>
<li>Wij kunnen opzeggen met een termijn van één maand.</li>
<li>Na het einde van het abonnement stopt je toegang. Download vóór die tijd wat je wilt bewaren. De tellingen van je organisatie wissen we 12 maanden na het einde.</li>
</ul>`)}
${artikel(7, 'Prijswijzigingen', '<p>We laten een prijswijziging minimaal één maand van tevoren per e-mail weten. Gaat de prijs omhoog, dan mag je het abonnement kosteloos opzeggen per de datum waarop de nieuwe prijs ingaat.</p>')}
${artikel(8, 'Goed gebruik', `<ul>
<li>Gebruik een eigen cliëntnummer. Zet <strong>geen</strong> BSN, namen, geboortedata, adressen, IBAN, e-mailadressen of telefoonnummers in de lijst. Die zijn niet nodig. ToeslagBuddy laat zulke kolommen automatisch weg en weigert cliëntnummers die op een BSN lijken, maar jij blijft verantwoordelijk voor wat je inleest.</li>
<li>Je account is persoonlijk. Deel je inlogcode niet. Nodig alleen mensen van je eigen organisatie uit.</li>
<li>Bewaar de actielijst en het rapport veilig, bijvoorbeeld in je dossiersysteem.</li>
<li>Je probeert de dienst niet te misbruiken, te overbelasten of de beveiliging te omzeilen.</li>
</ul>`)}
${artikel(9, 'Gegevens en privacy', `<ul>
<li><strong>Accountgegevens:</strong> voor de gegevens van je account en je organisatie (naam, zakelijk e-mailadres, organisatie, abonnement en het auditlog) zijn wij de verwerkingsverantwoordelijke. Zie de <a href="/privacy/">privacyverklaring</a>.</li>
<li><strong>Cliëntgegevens:</strong> de controle van je cliëntenlijst draait in je eigen browser. Cliëntgegevens komen niet op onze server. Wij ontvangen alleen geaggregeerde tellingen per organisatie: ${TELLINGEN}. Geen cliëntnummers, namen, BSN of bedragen per cliënt.</li>
<li>Daarom zijn wij voor cliëntgegevens geen verwerker in de zin van de AVG, en is een verwerkersovereenkomst niet nodig. Op verzoek bevestigen we dit schriftelijk, met de <a href="/pro/beveiliging/">beveiligingsfactsheet</a> als technische onderbouwing.</li>
<li>Gaan we ooit cliëntgegevens op onze server bewaren, dan doen we dat pas nadat we samen een verwerkersovereenkomst hebben gesloten.</li>
</ul>`)}
${artikel(10, 'Geheimhouding', '<p>Wij en jij houden vertrouwelijke informatie van de ander geheim. Wij kijken niet in de gegevens van je organisatie, behalve als jij ons om hulp vraagt, als het nodig is voor de beveiliging of als de wet ons daartoe verplicht. Iedereen die voor ons werkt, heeft dezelfde geheimhoudingsplicht. Deze plicht blijft gelden na het einde van het abonnement.</p>')}
${artikel(11, 'Beschikbaarheid en onderhoud', `<ul>
<li>We doen ons best om ToeslagBuddy Pro altijd beschikbaar te houden, maar we kunnen niet beloven dat het nooit uitvalt.</li>
<li>Onderhoud doen we zoveel mogelijk buiten kantoortijden. Groot onderhoud kondigen we van tevoren aan.</li>
<li>Is onze server even niet bereikbaar, dan werkt de controle in je browser gewoon door. Tellingen versturen we later.</li>
<li>De rekenregels werken we bij als de bedragen voor een nieuw jaar bekend zijn.</li>
</ul>`)}
${artikel(12, 'Uitkomsten', `<p>ToeslagBuddy Pro is een hulpmiddel om signalen te vinden. De uitkomsten zijn een indicatie, gebaseerd op de officiële rekenregels voor ${JAAR}. De kinderopvangtoeslag is een benadering. Controleer een signaal altijd in Mijn toeslagen voordat je iets doorgeeft. Aan de uitkomsten kun je geen rechten ontlenen. Het rapport vermeldt de datum en de versie van de rekenregels.</p>`)}
${artikel(13, 'Aansprakelijkheid', `<ul>
<li>Onze aansprakelijkheid is beperkt tot directe schade, tot maximaal het bedrag dat je in de 12 maanden vóór de gebeurtenis die de schade veroorzaakte aan abonnementsgeld hebt betaald.</li>
<li>We zijn niet aansprakelijk voor indirecte schade, zoals gevolgschade, gemiste omzet of een terugvordering die ontstaat doordat een signaal niet is gecontroleerd.</li>
<li>Deze beperkingen gelden niet bij opzet of bewuste roekeloosheid van ons of van onze leidinggevenden.</li>
</ul>`)}
${artikel(14, 'Rechten op de software', '<p>De software, teksten en rekenregels van ToeslagBuddy blijven van ons. Jouw gegevens blijven van jou. Je mag de actielijst en het rapport gebruiken in je eigen dossiers.</p>')}
${artikel(15, 'Wijziging van deze voorwaarden', '<p>We kunnen deze voorwaarden aanpassen. Een wijziging laten we minimaal één maand van tevoren weten. Ben je het niet eens met een wezenlijke wijziging, dan mag je het abonnement opzeggen per de datum waarop de wijziging ingaat.</p>')}
${artikel(16, 'Recht en geschillen', `<ul>
<li>Op deze voorwaarden en de overeenkomst is Nederlands recht van toepassing.</li>
<li>Een geschil leggen we alleen voor aan de bevoegde rechter van de rechtbank in het arrondissement waar ${esc(w.handelsnaam)} is gevestigd${w.plaats ? ` (${esc(config.bedrijf.vestigingsplaats || w.plaats)})` : ''}. We proberen er eerst samen uit te komen.</li>
<li>Deze voorwaarden zijn in het Nederlands geschreven. Alleen de Nederlandse tekst is bindend; een vertaling is alleen ter informatie.</li>
</ul>`)}`;
}

// ───────────────────────────── NIEUWE PAGINA'S ─────────────────────────────
export const juridischePaginas = [
  {
    slug: '/colofon/',
    kort: 'Colofon',
    title: 'Colofon en verantwoording',
    description: 'Bedrijfsgegevens van ToeslagBuddy, hoe we rekenen, hoe we AI gebruiken en hoe je een beveiligingsprobleem meldt.',
    h1: 'Colofon en verantwoording',
    intro: 'Wie ToeslagBuddy maakt, hoe we rekenen en hoe we met AI, advertenties en beveiliging omgaan.',
    body: ({ config }) => `
<h2>Bedrijfsgegevens</h2>
${gegevensLijst(config)}
<h2>Onafhankelijk</h2>
<p>ToeslagBuddy hoort <strong>niet</strong> bij de overheid, de Belastingdienst, Dienst Toeslagen, de SVB of een gemeente. We gebruiken bewust geen huisstijl die op de overheid lijkt.</p>
<h2>Hoe we rekenen</h2>
<p>De berekeningen zijn gebaseerd op de officiële rekenregels en bedragen voor ${JAAR}. Bij elk bedrag bewaren we de bron en de datum van controle; zie <a href="/bronnen/">bronnen en rekenregels</a>. Automatische tests vergelijken onze uitkomsten met officiële voorbeelden. Een monitor kijkt elke dag of bronnen veranderen. De kinderopvangtoeslag is een benadering van de officiële tabel. Zie je een fout? <a href="/contact/">Laat het ons weten</a>.</p>
<h2>Hoe we AI gebruiken</h2>
<ul>
<li>De persona’s die je uitkomst uitleggen, zijn <strong>fictief</strong>. De getekende persona wordt op je eigen apparaat gemaakt.</li>
<li>Realistische video’s zijn gemaakt met AI (HeyGen). Ze hebben altijd een zichtbaar label ‘AI-gegenereerde video · fictief persoon’.</li>
<li>Bij het schrijven van teksten en code gebruiken we AI-hulpmiddelen. Rekenregels en bedragen controleren we zelf, met tests.</li>
<li>Er is geen chatbot en we geven geen persoonlijk advies met AI.</li>
</ul>
<h2>Advertenties en partnerlinks</h2>
<p>De site wordt betaald met partnerlinks en later mogelijk advertenties. Die zijn altijd herkenbaar als ‘Partnerlink’ of advertentie en hebben geen invloed op de berekening. Op de Pro-pagina’s staan nooit advertenties.</p>
<h2>Techniek</h2>
<p>ToeslagBuddy is een statische website zonder eigen server. Het lettertype (Nunito, Open Font License) staat op onze eigen server, dus je browser haalt niets op bij andere partijen. Lees ook onze <a href="/privacy/">privacyverklaring</a> en de <a href="/toegankelijkheid/">toegankelijkheidsverklaring</a>.</p>
<h2>Beveiligingsprobleem gevonden?</h2>
<p>Meld het aan ${mail(SECURITY_MAIL)}. Lees eerst <a href="/pro/beveiliging/#melden">hoe je een kwetsbaarheid meldt</a>. Onze gegevens staan ook in <a href="/.well-known/security.txt">security.txt</a>.</p>`,
  },
  {
    slug: '/toegankelijkheid/',
    kort: 'Toegankelijkheid',
    title: 'Toegankelijkheidsverklaring',
    description: 'Hoe toegankelijk is ToeslagBuddy? Ons doel is WCAG 2.1 niveau AA. Lees wat we doen, wat nog niet goed gaat en hoe je een probleem meldt.',
    h1: 'Verklaring over toegankelijkheid',
    intro: 'Iedereen moet ToeslagBuddy kunnen gebruiken, ook met een beperking, een oude telefoon of weinig leeservaring.',
    body: () => `
<p class="subtiel">Versie ${VERSIE_JURIDISCH}.</p>
<h2>Ons doel</h2>
<p>We willen voldoen aan de richtlijnen <strong>WCAG 2.1 op niveau AA</strong> (EN 301 549). Op dit moment voldoet ToeslagBuddy <strong>gedeeltelijk</strong>: we hebben nog geen volledige handmatige toets laten doen. Hieronder staat eerlijk wat we wel en niet weten.</p>
<h2>Hoe we testen</h2>
<ul>
<li>Vóór elke publicatie testen we automatisch <strong>alle pagina’s</strong> met axe-core op de regels van WCAG 2.1 niveau A en AA. Bij een ernstig probleem gaat de site niet live.</li>
<li>We testen elke pagina op een smal scherm (360 pixels), zonder horizontaal scrollen.</li>
<li>We testen met ‘minder beweging’ aan, en zonder JavaScript.</li>
<li>Een handmatige toets met alleen het toetsenbord en met een schermlezer staat gepland. Die resultaten zetten we hier.</li>
</ul>
<h2>Wat we doen</h2>
<ul>
<li>Teksten in eenvoudige taal (taalniveau B1).</li>
<li>Rekenhulpen in kleine stappen, met een melding in gewone taal als iets niet klopt.</li>
<li>Een voorleesknop, als je apparaat een eigen stem heeft.</li>
<li>Bij elke uitleg door een persona: ondertitels en de hele tekst om te lezen.</li>
<li>Goed contrast, ook in de donkere modus, en minder beweging als je dat in je apparaat hebt ingesteld.</li>
</ul>
<h2>Wat nog niet goed gaat</h2>
<ul>
<li>De voorleesknop werkt alleen als je apparaat een stem op het apparaat zelf heeft. Stemmen via internet gebruiken we niet, voor je privacy.</li>
<li>Brede tabellen moet je op een klein scherm opzij schuiven.</li>
<li>Het rapport van ToeslagBuddy Pro maak je via ‘printen als PDF’. Die PDF is niet volledig toegankelijk voor schermlezers.</li>
<li>De AI-video’s hebben ondertitels, maar geen gebarentaal.</li>
<li>Zonder JavaScript werken de rekenhulpen niet. De uitleg kun je wel lezen.</li>
</ul>
<h2>Probleem gevonden?</h2>
<p>Kun je iets niet gebruiken of lezen? Laat het ons weten via ${mail('info@toeslagbuddy.nl')} of het <a href="/contact/">contactformulier</a>. Vertel op welke pagina het was en wat er misging. We reageren binnen vijf werkdagen en laten weten wanneer het is opgelost.</p>
<h2>Wet</h2>
<p>Kleine bedrijven zijn (nog) niet verplicht om aan de Europese toegankelijkheidswet te voldoen. Wij doen het toch, omdat onze bezoekers het nodig hebben.</p>`,
  },
  {
    slug: '/pro/beveiliging/',
    kort: 'Beveiliging',
    title: 'Beveiligingsfactsheet ToeslagBuddy Pro – voor bewindvoerders en kantoren',
    description: 'Waar staan de gegevens van ToeslagBuddy Pro, wat blijft lokaal en hoe is het beveiligd? Factsheet voor bewindvoerders, budgetcoaches en schuldhulpverleners.',
    h1: 'Beveiliging van ToeslagBuddy Pro',
    intro: 'Voor kantoren die willen weten waar gegevens staan en hoe ze worden beschermd. Handig voor je privacyfunctionaris, je dossier of een audit.',
    body: ({ config }) => `
<p class="subtiel">Versie ${VERSIE_JURIDISCH}. Vragen of een ondertekende versie nodig? Mail ${mail('info@toeslagbuddy.nl')}.</p>
<h2>In één oogopslag</h2>
${tabel(['Vraag', 'Antwoord'], [
  ['Komen cliëntgegevens op jullie server?', '<strong>Nee.</strong> De controle draait in je eigen browser. De cliëntenlijst, cliëntnummers, bedragen per cliënt, de actielijst en het rapport blijven op je eigen computer.'],
  ['Wat komt er wel op de server?', `Je account (naam, zakelijk e-mailadres, organisatie, rol, abonnement), het auditlog en per controle alleen geaggregeerde tellingen: ${TELLINGEN}.`],
  ['Waar staan die gegevens?', 'Bij Supabase, in de EU (Frankfurt, Duitsland). E-mail loopt via Brevo (Frankrijk).'],
  ['Zijn jullie verwerker voor mijn cliënten?', 'Nee, omdat cliëntgegevens niet op onze server komen. Dat bevestigen we op verzoek schriftelijk. Jij blijft verwerkingsverantwoordelijke.'],
  ['Kan er een BSN op de server komen?', 'Nee. De server accepteert per controle alleen vaste getallen, geen vrije tekst. Bovendien laat de import kolommen als BSN, naam, geboortedatum, adres, IBAN, e-mail en telefoon weg, en weigert hij cliëntnummers die de elfproef van een BSN doorstaan.'],
], 'Beveiliging in één oogopslag')}

<h2>Wat blijft op je eigen computer</h2>
<ul>
<li>Het CSV-bestand en alles wat erin staat.</li>
<li>De uitkomst per cliënt, de actielijst (CSV) en het rapport (PDF via printen).</li>
<li>De precieze trend van je controles. Die staat per gebruiker in de browser en wordt gewist bij uitloggen.</li>
</ul>

<h2>Toegang en inloggen</h2>
<ul>
<li>Inloggen met een eenmalige code per e-mail. Er zijn geen wachtwoorden die kunnen uitlekken.</li>
<li>Elke tabel in de database is afgesloten met Row Level Security. Leden zien alleen gegevens van hun eigen organisatie. Toegang loopt via gecontroleerde databasefuncties.</li>
<li>Beheerders moeten inloggen met tweestapsverificatie (MFA). Zonder die tweede stap werken de beheerfuncties niet.</li>
<li>Elke actie van beheerders en eigenaren (uitnodigen, rol wijzigen, verlengen, verwijderen) komt in een auditlog dat niemand kan aanpassen. Het log wordt 1 jaar bewaard.</li>
<li>De geheime sleutel van de database staat nooit in de website of in de broncode. Een test controleert dat bij elke publicatie.</li>
</ul>

<h2>Beveiliging in de browser</h2>
<ul>
<li>Op de Pro- en beheerpagina’s draaien <strong>geen scripts van andere partijen</strong>: geen advertenties, geen statistieken, geen lettertypen van buiten.</li>
<li>Een strikte Content-Security-Policy staat alleen onze eigen scripts toe en verbindingen met onze eigen database.</li>
<li>De pagina’s weigeren om in een frame van een andere website te draaien (tegen clickjacking).</li>
<li>Alles wat gebruikers invoeren, tonen we als tekst, nooit als code.</li>
<li>In de actielijst (CSV) zetten we een ’ voor cellen die met = + - of @ beginnen. Zo kan een bestand geen formule in Excel starten.</li>
<li>Alle verbindingen zijn versleuteld (HTTPS).</li>
</ul>

<h2>Back-ups en continuïteit</h2>
<ul>
<li>De database draait op een betaald plan van Supabase met dagelijkse back-ups. We testen het terugzetten minimaal één keer per jaar.</li>
<li>Is de server onbereikbaar, dan werkt de controle in je browser gewoon door. Tellingen worden later verstuurd.</li>
<li>Een verlopen proef zonder abonnement wordt na 90 dagen gewist. Na opzegging wissen we de tellingen na 12 maanden.</li>
</ul>

<h2>Datalekken</h2>
<ul>
<li>We hebben een schriftelijke datalekprocedure en een incidentenregister.</li>
<li>Raakt een incident jouw organisatie, dan laten we het je <strong>binnen 24 uur</strong> na ontdekking weten.</li>
<li>Als het nodig is, melden we het binnen 72 uur bij de Autoriteit Persoonsgegevens.</li>
</ul>

<h2>Leveranciers</h2>
${tabel(['Leverancier', 'Waarvoor', 'Waar'], [
  ['Supabase', 'Database, inloggen', 'EU (Frankfurt). Amerikaans bedrijf; standaardcontractbepalingen'],
  ['Brevo', 'Inlogcodes en doorsturen van berichten', 'EU (Frankrijk)'],
  [config.hosting === 'transip' ? 'TransIP' : 'GitHub Pages', 'Hosting van de (openbare) websitebestanden', config.hosting === 'transip' ? 'Nederland' : 'VS; EU-VS Data Privacy Framework. Ziet alleen IP-adressen van bezoekers'],
], 'Leveranciers')}

<h2>Testen en controle</h2>
<ul>
<li>Vóór elke publicatie draaien automatische tests: rekenregels, databaseregels (gesimuleerd), browsertests, toegankelijkheid en beveiliging (onder andere: geen scripts van derden op Pro, geen geheime sleutels in de website).</li>
<li>Eén keer per jaar doen we een zelftest volgens OWASP ASVS niveau 1.</li>
<li>Een externe pentest laten we doen zodra er cliëntgegevens op de server zouden komen, of als een grote klant erom vraagt.</li>
</ul>

<h2>Documenten op aanvraag</h2>
<p>Voor je dossier of je privacyfunctionaris sturen we op verzoek: een schriftelijke verklaring dat wij geen verwerker zijn voor cliëntgegevens, een model voor een DPIA (een beoordeling van de privacyrisico’s), een uittreksel uit ons verwerkingsregister en deze factsheet als PDF.</p>

<h2 id="melden">Een kwetsbaarheid melden</h2>
<p>Heb je een zwakke plek gevonden in de beveiliging? Meld het ons via ${mail(SECURITY_MAIL)}. We vragen je:</p>
<ul>
<li>ons genoeg informatie te geven om het probleem na te bootsen;</li>
<li>geen gegevens van anderen in te zien, te wijzigen of te bewaren, meer dan nodig is om het probleem aan te tonen;</li>
<li>geen aanvallen te doen die de dienst verstoren, en geen social engineering;</li>
<li>het probleem niet openbaar te maken voordat het is opgelost (uiterlijk 90 dagen).</li>
</ul>
<p>Wij reageren binnen drie werkdagen, houden je op de hoogte en doen geen aangifte als je je aan deze regels houdt. Onze gegevens staan ook in <a href="/.well-known/security.txt">security.txt</a>.</p>`,
  },
];

export { privacyBody, voorwaardenBody };
