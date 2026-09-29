// Grappige persona-updates voor X/Threads en korte TikTok-scripts.
// De persona's zijn vaste, herkenbare merkfiguren (zoals de Duolingo-uil):
// fictief en altijd als ToeslagBuddy-account. Humor over het systeem en de
// rompslomp – nooit over mensen met weinig geld of de toeslagenaffaire.
import { euro, zorgtoeslag } from '../src/calc/toeslagen.js';
import { HUURTOESLAG, KINDGEBONDEN_BUDGET, JAAR } from '../src/calc/params.js';

const zorgMax = Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12);
const LINK = 'toeslagbuddy.nl';

export const updates = [
  // Henk (71) – droog, mopperend op technologie, eigenlijk heel slim
  { persona: 'henk', tekst: `Henk hier. Heb vandaag voor het eerst zelf ingelogd met DigiD. Kleinzoon zei "gewoon de app scannen". Ik heb nu een foto van een QR-code in mijn fotoalbum. Maar goed: huurtoeslag geregeld. 💪 ${LINK}` },
  { persona: 'henk', tekst: `Vroeger kreeg je bij de bank een rolletje drop. Nu krijg ik ${euro(zorgMax)} zorgtoeslag per maand als ik het zelf aanvraag. Ik weet niet wat ik liever heb. (De toeslag. Het is de toeslag.)` },
  { persona: 'henk', tekst: 'Mijn buurman zegt dat toeslagen "niks voor ons soort mensen" zijn. Hij laat al 3 jaar huurtoeslag liggen. Ik heb hem koffie gegeven en de check laten doen. Nu betaalt híj de koffie.' },
  // Sanne (21) – student, zelfspot, memes
  { persona: 'sanne', tekst: `POV: je bent 21, eet voor de 4e dag pasta pesto en ontdekt dat je al een jaar ${euro(zorgMax)}/maand zorgtoeslag laat liggen 🫠 Studenten, check dit nou even. ${LINK}` },
  { persona: 'sanne', tekst: 'Mijn studieschuld: 😰\nMijn zorgtoeslag: 🥹\nMijn huurtoeslag voor een studio (sinds ik 21 ben is het meer!): 🤑\nMijn pasta pesto: 🍝 (blijft)' },
  { persona: 'sanne', tekst: 'Fun fact: je studiefinanciering telt níet mee als inkomen voor toeslagen. Minder fun fact: je bijbaan bij de bubbletea-zaak wel. Geef het op tijd door, dan hoef je in je afstudeerjaar niks terug te betalen ✨' },
  // Ilse (36) – alleenstaande moeder, warm, relativerend
  { persona: 'ilse', tekst: `Mijn dochter vroeg wat "alleenstaande-ouderkop" betekent. Ik zei: dat is ${euro(KINDGEBONDEN_BUDGET.alleenstaandeOuderkop)} per jaar extra omdat mama alles alleen doet. Ze zei: "dus mama is een superheld met een subsidie." Klopt.` },
  { persona: 'ilse', tekst: 'Dingen die ik als alleenstaande moeder niet heb: tijd, rust, een schone auto.\nDingen die ik wél heb: kindgebonden budget, huurtoeslag en een spreadsheet waar NASA jaloers op is. 📊' },
  { persona: 'ilse', tekst: 'Tip van moeder tot moeder: kinderalimentatie telt niet mee als inkomen voor toeslagen. Partneralimentatie wel. Ik had dat 2 jaar eerder willen weten. Nu weet jij het. ❤️' },
  // Dani (29) – zzp'er, sarcastisch over administratie
  { persona: 'dani', tekst: 'Zzp-leven: januari rustig, maart 3 klussen tegelijk, juli op het strand, november paniek. Mijn toeslag: "Ik ga uit van een stabiel jaarinkomen." Dani: 🙃 Doe elke maand de check, scheelt je een terugvordering.' },
  { persona: 'dani', tekst: 'Omzet ≠ winst ≠ toetsingsinkomen. Ik heb dit op een post-it op mijn laptop geplakt. Mijn accountant heeft er een lijstje omheen gemaakt. We groeien allebei.' },
  { persona: 'dani', tekst: `Huur boven ${euro(HUURTOESLAG.maximaleHuurgrens)}? Sinds ${JAAR} kun je tóch huurtoeslag krijgen. Ik vertelde dit op een verjaardag en werd behandeld als een halve god. Word ook een halve god: ${LINK}` },
  // Mo (34) – vader, druk gezin
  { persona: 'mo', tekst: 'Lisa en ik dachten dat we "te veel verdienen voor toeslagen". Toen rekenden we de kinderopvangtoeslag uit. Nu denken we dat we te weinig slapen. Beide klopt. 😴' },
  { persona: 'mo', tekst: 'Onze peuter kan nog geen "kinderopvangtoeslag" zeggen, maar wel "Belastingdienst". Het was een druk jaar. Check je uurprijs tegen het maximum, alles daarboven betaal je zelf.' },
  // Buddy – het merk zelf
  { persona: 'buddy', tekst: `Elk jaar blijft er ruim 1 miljard euro aan toeslagen liggen (CPB). Wij vinden dat zonde. Check in 2 minuten wat jij kunt krijgen – anoniem, zonder DigiD. ${LINK}` },
  { persona: 'buddy', tekst: 'Wat is het verschil tussen een toeslagpartner en een partner? Precies. Wij hebben er een hele pagina over gemaakt. 🧐 toeslagbuddy.nl/toeslagpartner' },
];

export const tiktokScripts = [
  { persona: 'henk', titel: 'Henk probeert DigiD', hook: '"Ik ben 71 en ik ga nu een QR-code scannen. Bid voor me."', beats: ['Henk houdt de telefoon verkeerd om', 'Kleinkind grijpt in (alleen handen in beeld)', 'Henk ziet zijn huurtoeslag: "Kijk. Dáár doe je het voor."'], cta: 'Help je opa of oma: toeslagbuddy.nl' },
  { persona: 'sanne', titel: 'Student ontdekt gratis geld', hook: '"Niemand heeft me verteld dat dit bestond."', beats: ['Sanne scrollt door haar bankapp: ‘€ 3,12’', 'Doet de check op ToeslagBuddy', 'Zoom op het bedrag, dramatische muziek'], cta: 'Studenten: link in bio' },
  { persona: 'dani', titel: 'Omzet vs winst vs toetsingsinkomen', hook: '"Drie woorden die zzp’ers laten huilen."', beats: ['Dani met drie post-its', 'Scheurt ‘omzet’ eraf', 'Laat de toeslagbewaker zien'], cta: 'Zzp? Check maandelijks: link in bio' },
  { persona: 'ilse', titel: 'Superheld met subsidie', hook: '"Mijn dochter vroeg wat de alleenstaande-ouderkop is."', beats: ['Ilse in de keuken, kinderen maken lawaai', 'Legt in 10 seconden de ouderkop uit', 'Dochter geeft haar een zelfgemaakte cape'], cta: 'Alleenstaande ouders: check wat je krijgt' },
];

// Controle op de spelregels (gebruikt in de tests)
export const VERBODEN = [/toeslagenaffaire/i, /fraude/i, /arm(e|oedzaaier)/i, /uitvreter/i, /profiteur/i];
