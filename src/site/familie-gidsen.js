// Gidsen van /familie/gids/. Elke gids: één onderwerp, de kern bovenaan,
// alleen feiten uit de officiële bronnen (bron-id's uit data/familie/bronnen.json)
// en één rekenhulp of checklist. Geen advies op maat.
export const GIDSEN = [
  {
    slug: 'administratie-ouders-regelen',
    titel: 'De administratie van je ouders regelen: zo begin je',
    kort: 'Administratie van je ouders regelen',
    description: 'Stappenplan om de administratie van je ouder wordende vader of moeder over te nemen: toestemming, overzicht, vaste lasten, post en afspraken met broers en zussen.',
    icoon: 'document',
    kern: ['Begin met toestemming: je ouder beslist zolang dat kan.', 'Maak eerst overzicht: inkomsten, vaste lasten, contracten en contactpersonen.', 'Spreek met broers en zussen af wie wat doet, en leg uitgaven vast.'],
    html: `
<h2>1. Vraag toestemming en leg die vast</h2>
<p>Je ouder is en blijft de baas over de eigen zaken. Vraag of je mag helpen, en waarmee. Schrijf op wanneer je ouder toestemming gaf. Wil je ook bankzaken regelen of beslissen als je ouder dat zelf niet meer kan? Dan is een volmacht of levenstestament bij de notaris nodig. Dat kan alleen zolang je ouder zelf nog kan beslissen.</p>
<h2>2. Maak overzicht</h2>
<ul><li><strong>Inkomsten:</strong> AOW, pensioen, toeslagen.</li><li><strong>Vaste lasten:</strong> huur of hypotheek, energie, water, zorgverzekering, telefoon en internet, verzekeringen, abonnementen, loterijen en goede doelen.</li><li><strong>Contactpersonen:</strong> huisarts, thuiszorg, gemeente, bank, notaris.</li><li><strong>Papieren:</strong> waar liggen het paspoort, de polissen, het testament?</li></ul>
<p>Tip: een bankafschrift van een paar maanden laat bijna alle vaste lasten zien. In de regelkamer kun je een afschrift inlezen; het bestand blijft op je eigen apparaat.</p>
<h2>3. Kijk wat er blijft liggen</h2>
<p>Veel ouderen missen geld waar ze recht op hebben. Check de <a href="/toeslagen-aow/">toeslagen voor AOW'ers</a> en de <a href="/familie/rekenhulp/zorgkosten/">aftrek van zorgkosten</a>. Loop ook de abonnementen na: wat wordt nog gebruikt?</p>
<h2>4. Verdeel de taken en leg uitgaven vast</h2>
<p>Spreek af wie de post doet, wie de bankzaken en wie de contacten met de zorg. Betaal je iets namens je ouder? Bewaar de bon en schrijf op waarvoor het was. Dat voorkomt later vragen, ook als iedereen elkaar vertrouwt.</p>
<h2>5. Houd termijnen in de gaten</h2>
<p>Brieven van de Belastingdienst, het CAK en de gemeente hebben vaak een termijn. Voor bezwaar is dat meestal 6 weken. Zet elke termijn direct in de agenda, met wie het oppakt.</p>`,
    bronnen: [],
    hulp: ['/familie/app/', 'Maak het overzicht in de regelkamer'],
  },
  {
    slug: 'wat-kost-een-verpleeghuis',
    titel: 'Wat kost een verpleeghuis? De eigen bijdrage uitgelegd',
    kort: 'Wat kost een verpleeghuis?',
    description: 'De eigen bijdrage voor het verpleeghuis (Wlz) in gewone taal: lage en hoge bijdrage, waarom het CAK 2 jaar terugkijkt, wat spaargeld doet en wat er gebeurt als het huis wordt verkocht.',
    icoon: 'huis',
    kern: ['De eerste 4 maanden betaal je de lage eigen bijdrage, daarna meestal de hoge.', 'Het CAK rekent met het inkomen en vermogen van 2 jaar geleden.', 'Is het inkomen nu veel lager? Dan kun je een aanpassing aanvragen.'],
    html: `
<h2>Lage en hoge eigen bijdrage</h2>
<p>Woont je ouder in een instelling, dan betaalt die de eerste 4 maanden de lage eigen bijdrage. Daarna gaat meestal de hoge eigen bijdrage gelden. Bij langdurige zorg thuis betaal je altijd de lage eigen bijdrage. Welke bijdrage voor jullie geldt, staat op de beschikking van het CAK.</p>
<h2>Waarom 2 jaar terug?</h2>
<p>Het CAK rekent met het inkomen en vermogen van 2 jaar geleden, omdat die gegevens vaststaan. De Belastingdienst geeft ze door. In januari krijg je een beschikking met het bedrag per maand en de berekening.</p>
<h2>Wat doet spaargeld?</h2>
<p>Vermogen tot het toetsbedrag telt niet mee. Van het vermogen daarboven telt 4% mee als inkomen. Voorbeeld van het CAK: een echtpaar met € 90.000 spaargeld zit € 16.096 boven het toetsbedrag voor partners. Daarvan telt 4%, dus € 643,84, mee als inkomen.</p>
<h2>En als het huis wordt verkocht?</h2>
<p>De opbrengst wordt spaargeld. Dat telt mee vanaf het moment dat het op 1 januari op de bank staat, en het CAK kijkt 2 jaar terug. Je merkt een verkoop dus pas later in de eigen bijdrage. Reken het door met de rekenhulp.</p>
<h2>Kun je de bijdrage niet betalen?</h2>
<p>Neem contact op met het CAK. Is het inkomen nu veel lager dan 2 jaar geleden, dan kun je een aanpassing aanvragen. Soms is een vrijstelling of betalingsregeling mogelijk.</p>`,
    bronnen: ['cak-wlz-2026', 'cak-toetsbedrag', 'cak-wlz-aanpassen'],
    hulp: ['/familie/rekenhulp/verpleeghuis/', 'Bereken de eigen bijdrage'],
  },
  {
    slug: 'erfenis-aanvaarden-of-verwerpen',
    titel: 'Erfenis aanvaarden of verwerpen: wat zijn je keuzes?',
    kort: 'Erfenis aanvaarden of verwerpen',
    description: 'Je hoeft een erfenis niet te aanvaarden. Lees het verschil tussen zuiver aanvaarden, beneficiair aanvaarden en verwerpen, en waarom je eerst niets moet meenemen of betalen.',
    icoon: 'weegschaal',
    kern: ['Je hebt drie keuzes: zuiver aanvaarden, beneficiair aanvaarden of verwerpen.', 'Neem niets mee en betaal geen rekeningen voordat je hebt gekozen. De uitvaart betalen mag wel.', 'Er is geen wettelijke termijn, maar schuldeisers mogen na 3 maanden om betaling vragen.'],
    html: `
<h2>De drie keuzes</h2>
<ul><li><strong>Zuiver aanvaarden:</strong> je krijgt alle bezittingen, maar je bent ook aansprakelijk voor alle schulden. Ook als de schulden hoger zijn dan de bezittingen.</li>
<li><strong>Beneficiair aanvaarden:</strong> je bent niet aansprakelijk voor schulden. Eerst worden alle schulden uit de erfenis betaald; wat overblijft, wordt verdeeld.</li>
<li><strong>Verwerpen:</strong> je krijgt niets en hebt niets met de afhandeling te maken. Let op: daardoor kunnen je kinderen erfgenaam worden.</li></ul>
<h2>Eerst niets doen met de erfenis</h2>
<p>Neem je spullen van de overledene mee, verkoop je ze of betaal je openstaande rekeningen? Dan heb je de erfenis volgens de wet zuiver aanvaard. Er is één uitzondering: de begrafenis of uitvaart mag je uit de erfenis betalen.</p>
<h2>Hoe lang heb je de tijd?</h2>
<p>Er is geen wettelijke termijn om te kiezen. Wel mogen schuldeisers de erfgenamen de eerste 3 maanden niet om betaling vragen. Heb je meer tijd nodig, dan vraag je dat aan bij de rechtbank.</p>
<h2>Hoe leg je je keuze vast?</h2>
<p>Voor beneficiair aanvaarden of verwerpen leg je een verklaring nalatenschap af bij de rechtbank. Bij zuiver aanvaarden hoeft dat niet. Twijfel je, bijvoorbeeld omdat je niet weet of er schulden zijn? Vraag advies aan een notaris.</p>`,
    bronnen: ['ro-aanvaarden'],
    hulp: ['/familie/checklist/na-overlijden/', 'Open de checklist na een overlijden'],
  },
  {
    slug: 'wie-erft-zonder-testament',
    titel: 'Wie erft er zonder testament? De wettelijke verdeling',
    kort: 'Wie erft zonder testament?',
    description: 'Zonder testament bepaalt de wet wie erft. Bij een partner en kinderen geldt de wettelijke verdeling: gelijke delen, maar alles gaat eerst naar de partner. Met voorbeeld en de gevolgen voor de erfbelasting.',
    icoon: 'familie',
    kern: ['Partner en kinderen erven elk een gelijk deel.', 'De hele erfenis gaat eerst naar de partner; de kinderen krijgen een tegoed.', 'De kinderen betalen wel meteen erfbelasting; de langstlevende ouder schiet die voor.'],
    html: `
<h2>Zo werkt de wettelijke verdeling</h2>
<p>Had de overledene geen testament, en was die getrouwd of geregistreerd partner met kinderen? Dan zijn de partner en de kinderen voor gelijke delen erfgenaam. Maar alle bezittingen en schulden gaan automatisch naar de partner. De kinderen krijgen hun deel als vordering in geld op de langstlevende ouder.</p>
<h2>Voorbeeld van de Belastingdienst</h2>
<p>Een overledene laat een echtgenoot en 2 kinderen achter. De erfenis is € 180.000. Er zijn 3 erfgenamen, dus ieder erft € 60.000. De hele erfenis gaat naar de echtgenoot, die elk kind € 60.000 schuldig is.</p>
<h2>En de erfbelasting?</h2>
<p>De kinderen betalen erfbelasting over hun deel, ook al krijgen ze het geld nog niet. Omdat ze er nog niet bij kunnen, schiet de langstlevende ouder de belasting voor. Dat bedrag wordt verrekend met hun tegoed. Overlijdt later ook de langstlevende ouder, dan betalen de kinderen over dat tegoed niet nog een keer erfbelasting.</p>
<h2>Met een testament</h2>
<p>Een testament kan het anders regelen. Of er een testament is, vraag je gratis na bij het Centraal Testamentenregister. De notaris legt uit wat erin staat.</p>`,
    bronnen: ['bd-wettelijke-verdeling', 'ro-testament-opvragen'],
    hulp: ['/familie/rekenhulp/erfbelasting/', 'Bereken wie wat erft en betaalt'],
  },
  {
    slug: 'toeslagen-na-overlijden-partner',
    titel: 'Toeslagen na het overlijden van je partner',
    kort: 'Toeslagen na een overlijden',
    description: 'Wat gebeurt er met zorgtoeslag en huurtoeslag als je partner overlijdt? Welke brieven je krijgt, wat je moet controleren, en hoe de 10%-regeling terugbetalen kan voorkomen.',
    icoon: 'euro',
    kern: ['De gemeente geeft het overlijden door; je hoeft dat niet zelf te melden.', 'Controleer wel het inkomen: dat verandert bijna altijd.', 'Moet je terugbetalen omdat je inkomen steeg? Kijk of de 10%-regeling voor je geldt.'],
    html: `
<h2>Wat gebeurt er vanzelf?</h2>
<p>De gemeente geeft het overlijden door aan Dienst Toeslagen. Binnen ongeveer 5 weken krijg je een nieuwe voorlopige berekening, en binnen ongeveer 8 weken wordt het nieuwe bedrag uitbetaald. Stond de toeslag op naam van je partner, dan wordt die op jouw naam gezet.</p>
<h2>Wat moet je zelf doen?</h2>
<ul><li><strong>Controleer het inkomen</strong> en geef veranderingen door. Na een overlijden verandert het inkomen bijna altijd, bijvoorbeeld door nabestaandenpensioen.</li>
<li><strong>Kijk naar het vermogen:</strong> voor een alleenstaande geldt een andere grens.</li></ul>
<p>Je hoeft dit niet meteen te doen. Het kan ook later, tot aan de definitieve berekening na afloop van het jaar. Houd er wel rekening mee dat je te veel ontvangen toeslag moet terugbetalen.</p>
<h2>De 10%-regeling</h2>
<p>Toeslagen worden berekend met het inkomen over het hele jaar. Krijg je na het overlijden een hoger inkomen, dan telt dat ook mee voor de maanden waarin je partner nog leefde. Daardoor kun je moeten terugbetalen. Stond de toeslag op naam van je partner, en was je inkomen vóór het overlijden minstens 10% lager? Dan kun je vragen om het hogere inkomen voor die maanden niet mee te tellen.</p>
<h2>Hulp nodig?</h2>
<p>De Belastingdienst heeft een aparte telefoonlijn voor nabestaanden: 0800 - 235 83 54.</p>`,
    bronnen: ['bd-toeslagen-partner', 'bd-10-procent', 'bd-ib-overledene'],
    hulp: ['/toeslagen-aow/', 'Bereken de toeslagen opnieuw'],
  },
  {
    slug: 'geld-van-je-ouders-verantwoorden',
    titel: 'Het geld van je ouders beheren zonder ruzie',
    kort: 'Geld beheren zonder ruzie',
    description: 'Regel je de bankzaken van je vader of moeder? Zo voorkom je wantrouwen bij broers en zussen: afspraken vooraf, alles vastleggen en elke maand een overzicht delen.',
    icoon: 'logboek',
    kern: ['Wantrouwen ontstaat zelden door fraude, vaak door onduidelijkheid.', 'Leg elke uitgave namens je ouder vast, met bon.', 'Deel elke maand een overzicht met de familie, ook als niemand erom vraagt.'],
    html: `
<h2>Waarom dit misgaat</h2>
<p>Eén kind krijgt de bankpas en regelt alles. De anderen zien alleen dat het spaargeld slinkt. Niemand heeft iets fout gedaan, en toch groeit het wantrouwen. Achteraf uitleggen waar € 80 contant in maart voor was, lukt bijna niemand.</p>
<h2>Maak vooraf afspraken</h2>
<ul><li>Wie mag wat betalen, en tot welk bedrag zonder overleg?</li><li>Mag iemand een vergoeding krijgen voor reiskosten of mantelzorg? Hoeveel?</li><li>Wie kijkt mee? Spreek een vast moment af, bijvoorbeeld elk kwartaal.</li></ul>
<p>Laat je bij de notaris een volmacht of levenstestament opstellen? Vraag dan om erin op te nemen dat de gevolmachtigde verantwoording aflegt, en aan wie.</p>
<h2>Leg alles vast</h2>
<p>Schrijf bij elke uitgave op: datum, bedrag, waarvoor, van welke rekening, en bewaar de bon. Doe dat ook bij contante opnames. Een vergoeding voor jezelf zet je apart, zichtbaar voor iedereen.</p>
<h2>Deel een maandoverzicht</h2>
<p>Een overzicht dat vanzelf elke maand komt, haalt de lading eraf: niemand hoeft erom te vragen. In de regelkamer staat het klaar op de eerste van de maand. Een vastgelegde regel kan daar niet meer worden veranderd, alleen verbeterd met een nieuwe regel.</p>
<h2>Als het toch botst</h2>
<p>Kom je er samen niet uit? Een mediator helpt vaak sneller en goedkoper dan een rechtszaak. Het Juridisch Loket geeft gratis eerste advies.</p>`,
    bronnen: [],
    hulp: ['/familie/app/', 'Begin een logboek in de regelkamer'],
  },
  {
    slug: 'zonnepanelen-ouders-2027',
    titel: 'Zonnepanelen bij je ouders: wat verandert er in 2027?',
    kort: 'Zonnepanelen in 2027',
    description: 'Op 1 januari 2027 stopt de salderingsregeling. Wat betekent dat voor je ouders met zonnepanelen, wat moet je nakijken in het energiecontract en wat kun je doen?',
    icoon: 'zon',
    kern: ['Vanaf 1 januari 2027 mag teruggeleverde stroom niet meer worden weggestreept tegen verbruik.', 'Tot 2030 krijg je minimaal 50% van de kale leveringsprijs voor teruggeleverde stroom.', 'Stroom die je direct zelf gebruikt, blijft het meest waard.'],
    html: `
<h2>Wat is salderen?</h2>
<p>Tot en met 31 december 2026 mag je de stroom die je teruglevert wegstrepen tegen de stroom die je afneemt. Lever je in de zomer 2.500 kWh terug, dan mag je in de winter 2.500 kWh gebruiken zonder daarvoor te betalen.</p>
<h2>Wat verandert er?</h2>
<p>Vanaf 1 januari 2027 mag dat niet meer. Je ouders krijgen dan voor alle teruggeleverde stroom een vergoeding van de leverancier. Tot 2030 is die minimaal 50% van de kale leveringsprijs, dus de prijs zonder belastingen. Leveranciers mogen ook terugleverkosten rekenen; de ACM houdt daar toezicht op.</p>
<h2>Wat kun je nakijken?</h2>
<ul><li>Wanneer loopt het energiecontract af?</li><li>Wat is de terugleververgoeding na 1 januari, en welke terugleverkosten rekent de leverancier?</li><li>Hoeveel stroom wordt er teruggeleverd? Dat staat op de jaarafrekening.</li></ul>
<h2>Wat kun je doen?</h2>
<p>Over stroom die je zelf opwekt en direct gebruikt, betaal je geen belasting en geen kosten. Het loont dus om overdag te wassen en te drogen. Laat je niet opjagen tot een grote aankoop: reken eerst uit wat het voor jullie scheelt.</p>`,
    bronnen: ['ro-salderen'],
    hulp: ['/familie/rekenhulp/zonnepanelen-2027/', 'Reken het door met je eigen contract'],
  },
];
