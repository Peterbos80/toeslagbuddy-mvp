// English pages under /en/. Same calculation engine and amounts (params.js)
// as the Dutch pages; written for expats, international students and labour
// migrants, not machine-translated. `nl` = the Dutch counterpart (language
// switch); `vertaling: false` = a summary, so no hreflang pair.
// Only phone numbers that are checked are used (see docs/i18n.md).
import {
  JAAR,
  ZORGTOESLAG as Z,
  HUURTOESLAG as H,
  KINDGEBONDEN_BUDGET as K,
  KINDEROPVANGTOESLAG as O,
  KINDERBIJSLAG as B,
} from '../calc/params.js';
import { zorgtoeslag, huurtoeslag, kindgebondenBudget, kotPercentage, euro as euroTaal } from '../calc/toeslagen.js';
import { zorgtoeslagTabel, huurtoeslagTabel, huurtoeslagGrensTabel, kgbTabel, kgbGrensTabel, tabel, maxInkomen } from './tabellen.js';
import { formulier } from './layout.js';
import { privacyBodyEn, voorwaardenSamenvatting } from './juridisch-en.js';

const euro = (n, d = 0) => euroTaal(n, d, 'en');
const e2 = (n) => euro(n, 2);
const pct = (n) => `${(n * 100).toLocaleString('en-GB', { maximumFractionDigits: 3 })}%`;
const pctKot = (p) => `${(p * 100).toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`;
const VOLGEND = JAAR + 1;
const zorgMax = Math.floor(zorgtoeslag({ inkomen: 0 }).perJaar / 12);
const zorgMaxPartner = Math.floor(zorgtoeslag({ inkomen: 0, partner: true }).perJaar / 12);

// Link to a Dutch-only page: the link text is the Dutch title
const nl = (href, titel) => `<a href="${href}" hreflang="nl" lang="nl">${titel}</a>`;
const BUITENLAND = '<a href="tel:+31555385385">+31 55 538 53 85</a>';
const checkLink = '<p class="let-op"><strong>Tip:</strong> the <a href="/en/#check">complete check</a> calculates all allowances in one go, and also shows schemes from your municipality.</p>';

export const pagesEn = [
  // ───────────────────────────── HOME ─────────────────────────────
  {
    slug: '/en/',
    taal: 'en',
    nl: '/',
    title: `Dutch benefits calculator ${JAAR}: check all allowances in 2 minutes | ToeslagBuddy`,
    description: `Free, anonymous calculator for Dutch allowances (toeslagen) in ${JAAR}: healthcare allowance, rent allowance, child budget, childcare allowance and child benefit. In English, for expats, students and workers from abroad.`,
    h1: `Which Dutch benefits can you get in ${JAAR}?`,
    intro: 'Answer a few simple questions. You will see straight away how much healthcare allowance, rent allowance and money for your children you may be able to get in the Netherlands.',
    calc: 'alles',
    anker: 'check',
    body: () => `
<h2>The Dutch allowances in short</h2>
<p>The Dutch government pays <strong>allowances</strong> (toeslagen) to help people on a low or middle income with the cost of health insurance, rent and children. Many people who have just moved to the Netherlands do not know they can get them. This check calculates all of them at once.</p>
<div class="kaarten">
<a href="/en/healthcare-allowance/"><strong>Healthcare allowance</strong><span>Up to ${euro(zorgMax)} per month towards your health insurance</span></a>
<a href="/en/rent-allowance/"><strong>Rent allowance</strong><span>For a self-contained rented home</span></a>
<a href="/en/child-budget/"><strong>Child budget</strong><span>Up to ${euro(K.bedragPerKind)} per child per year</span></a>
<a href="/en/childcare-allowance/"><strong>Childcare allowance</strong><span>Up to 96% of childcare costs back</span></a>
<a href="/en/child-benefit/"><strong>Child benefit</strong><span>For every child, whatever your income</span></a>
<a href="/en/repaying-allowances/"><strong>Avoid paying back</strong><span>What to report, and when</span></a>
</div>

<h2 id="who">Expats, international students and labour migrants</h2>
<p>Allowances are not only for Dutch citizens. What matters is where you live, whether you are insured in the Netherlands, and your income. The most important rules:</p>
<ul>
<li><strong>You live in the Netherlands legally.</strong> You are Dutch, a citizen of the EU, EEA or Switzerland, or you have a valid Dutch residence permit.</li>
<li><strong>You are registered at your address</strong> in the Personal Records Database (BRP) of your municipality. That is how you get a <strong>citizen service number (BSN)</strong>. Without a BSN you cannot apply.</li>
<li><strong>You have DigiD.</strong> You need DigiD (the Dutch government login) to apply online. You can request it on <a href="https://www.digid.nl/en" rel="noopener">digid.nl</a> once you have a BSN and a Dutch address.</li>
<li><strong>For healthcare allowance you need Dutch health insurance.</strong> If you work in the Netherlands, even part-time, you must take out Dutch basic health insurance, and then you can often get healthcare allowance. See <a href="/en/healthcare-allowance/#students">the rules for international students</a>.</li>
<li><strong>For rent allowance you need a self-contained home</strong> (your own front door, kitchen and toilet) and you must be registered there. A room with shared facilities, as in most shared and agency housing, usually does not count.</li>
</ul>
<p class="let-op"><strong>Labour migrants:</strong> is your health insurance arranged by your employment agency? Then you usually have Dutch basic insurance and may be able to get healthcare allowance. Check your payslip or ask the agency. When you leave the Netherlands, <strong>stop your allowances and report your departure</strong>, otherwise you will have to pay money back later. If you live outside the Netherlands but work here, other rules apply; check <a href="https://www.toeslagen.nl" rel="noopener">toeslagen.nl</a>.</p>

<h2 id="allowance-partner">What is an allowance partner (toeslagpartner)?</h2>
<p>Your allowance partner decides for a large part how much you get, because your incomes are added together. It is not always the same as your partner in daily life.</p>
<ul>
<li>You are always allowance partners if you are <strong>married</strong> or have a <strong>registered partnership</strong>.</li>
<li>If you live together at the same address without being married, you are allowance partners if, for example, you have a child together, have a cohabitation agreement from a notary, own a home together, are registered as each other’s partner with a pension fund, or were already each other’s (tax) partner last year.</li>
<li>A <strong>housemate</strong> is not an allowance partner but a <strong>co-resident</strong>. For rent allowance, the income and assets of co-residents do count. For the other allowances they do not.</li>
</ul>
<p>Does your partner still live abroad? The rules for partners abroad are complicated, so check in Mijn toeslagen or call the BelastingTelefoon before you apply. Getting the partner question wrong is one of the most common reasons for having to pay back. More detail (in Dutch): ${nl('/toeslagpartner/', 'Wie is je toeslagpartner?')}</p>

<h2 id="how-to-apply">How to apply</h2>
<ol>
<li>First check what you are entitled to with the <a href="#check">check above</a>.</li>
<li>Go to <a href="https://www.toeslagen.nl" rel="noopener">toeslagen.nl</a> and log in to <strong>Mijn toeslagen</strong> with your DigiD. The application itself is in Dutch.</li>
<li>Choose ‘Toeslag aanvragen’ (apply for an allowance), fill in your expected income for this year and, for rent allowance, your basic rent.</li>
<li>You receive a decision letter (beschikking) with your advance payment (voorschot). After that it is paid every month, usually around the 20th.</li>
<li>After the year ends, Dienst Toeslagen calculates the final amount. If you received too little, you get the rest. If you received too much, you <a href="/en/repaying-allowances/">pay it back</a>.</li>
</ol>
<p><strong>Deadlines:</strong> healthcare allowance, rent allowance and child budget for ${JAAR} can be requested until 1 September ${VOLGEND}. Childcare allowance must be requested within 3 months after the month in which childcare starts.</p>
<p><strong>No DigiD?</strong> You can authorise someone else, such as a family member or a support worker, or get free help at an Informatiepunt Digitale Overheid in a public library. Questions about your own file: call the BelastingTelefoon on <a href="tel:08000543">0800 0543</a> (free from a Dutch phone) or ${BUITENLAND} from abroad. Please check the current number and opening hours on <a href="https://www.belastingdienst.nl" rel="noopener">belastingdienst.nl</a>.</p>

<h2 id="in-dutch">Pages only in Dutch: short summaries</h2>
<p><strong>Did you come here from a Dutch page?</strong> Not every page is available in English. We would rather give you an honest summary than a poor machine translation. Your browser can translate the Dutch page if you need the details.</p>
<div class="samenvattingen">
<h3>Situations</h3>
<ul>
<li>${nl('/toeslagen-student/', 'Toeslagen voor studenten')}: Dutch student finance (studiefinanciering) does not count as income, but a part-time job does. Rent allowance only for a self-contained studio. In the year you graduate, report your new income on time.</li>
<li>${nl('/toeslagen-alleenstaande-ouder/', 'Toeslagen voor alleenstaande ouders')}: single parents get up to ${euro(K.alleenstaandeOuderkop)} a year extra child budget. Child maintenance you receive does not count as income; partner maintenance does.</li>
<li>${nl('/toeslagen-aow/', 'Toeslagen voor AOW’ers')}: pensioners often get healthcare and rent allowance. If you lived abroad and have no full Dutch state pension (AOW), the SVB may top up your income (AIO).</li>
<li>${nl('/zzp-toeslagen/', 'Toeslagbewaker voor zzp’ers')}: a tool for the self-employed to check each month whether the advance payment still matches your profit (in Dutch).</li>
</ul>
<h3>Schemes and limits</h3>
<ul>
<li>${nl('/regelingen-laag-inkomen/', 'Regelingen bij een laag inkomen')}: remission of municipal taxes, special assistance, an individual income supplement, the municipal health insurance and help for children.</li>
<li>${nl('/alle-regelingen/', 'Alle toeslagen en regelingen')}: an overview of more than 30 benefits, tax credits and schemes, with a filter by situation.</li>
<li>${nl('/inkomensgrenzen-toeslagen/', 'Inkomensgrenzen toeslagen')}: income limits: healthcare allowance ${euro(Z.maxInkomenAlleen)} (single) or ${euro(Z.maxInkomenPartner)} (together); rent allowance depends on your rent.</li>
<li>${nl('/vermogensgrens-toeslagen/', 'Vermogensgrenzen toeslagen')}: asset limits on 1 January: healthcare allowance ${euro(Z.vermogensgrensAlleen)} (single), rent allowance ${euro(H.vermogensgrensPerPersoon)} per person. Savings abroad count too.</li>
<li>${nl('/toeslagen-2027/', `Toeslagen ${VOLGEND}`)}: expected changes for ${VOLGEND} after the budget day. The final amounts follow in November.</li>
<li>${nl('/zorgverzekering-overstappen/', `Zorgverzekering ${VOLGEND} overstappen`)}: you can switch health insurer until 31 December; your healthcare allowance does not change.</li>
<li>${nl('/nieuws/', 'Nieuws over toeslagen')}: daily news about allowances from official Dutch sources.</li>
</ul>
<h3>About ToeslagBuddy</h3>
<ul>
<li>${nl('/bronnen/', 'Bronnen en rekenregels')}: the official sources behind every amount, and when we last checked them.</li>
<li>${nl('/over/', 'Over ToeslagBuddy')}, ${nl('/colofon/', 'Colofon')} and ${nl('/disclaimer/', 'Disclaimer')}: who we are, our company details, how we use AI, and that the results are an estimate.</li>
<li>${nl('/toegankelijkheid/', 'Toegankelijkheidsverklaring')}: our accessibility statement (goal: WCAG 2.1 AA).</li>
</ul>
</div>

<h2>Why ToeslagBuddy?</h2>
<ul>
<li><strong>Everything in one check</strong>: one overview with the total amount, not five separate calculators.</li>
<li><strong>Private</strong>: the calculation happens on your own phone or computer. We do not store anything.</li>
<li><strong>Up to date</strong>: based on the official ${JAAR} rules and amounts. The same calculator runs our Dutch pages.</li>
<li><strong>Independent</strong>: we are not the government. Always apply on toeslagen.nl.</li>
</ul>`,
    faq: [
      ['Can I get Dutch allowances as a foreigner?', 'Yes, if you live in the Netherlands legally, are registered at your address and meet the conditions for income, assets and (for healthcare allowance) Dutch health insurance. Your nationality itself does not matter, but your residence status does.'],
      ['Do I need a BSN and DigiD?', 'Not for this calculation. To apply you need a citizen service number (BSN), which you get when you register with your municipality, and DigiD to log in to Mijn toeslagen.'],
      ['Is this calculation official?', 'No. ToeslagBuddy is an independent calculator. It is based on the official rules, but only Dienst Toeslagen decides how much you actually get. Always apply through toeslagen.nl.'],
      ['What happens to my data?', 'Nothing. The calculation runs entirely in your browser. Your answers are not sent to us or anyone else.'],
      ['Which income do I fill in if I arrived halfway through the year?', 'Your expected income for the whole calendar year in the Netherlands, including holiday pay. Income you earned abroad before you moved can count as well. If you are not sure, estimate a little higher: getting money later is easier than paying it back.'],
    ],
  },

  // ───────────────────────────── HEALTHCARE ALLOWANCE ─────────────────────────────
  {
    slug: '/en/healthcare-allowance/',
    taal: 'en',
    nl: '/zorgtoeslag-berekenen/',
    kort: 'Healthcare allowance',
    title: `Healthcare allowance calculator ${JAAR} (zorgtoeslag): how much per month?`,
    description: `Calculate your Dutch healthcare allowance (zorgtoeslag) for ${JAAR}. Up to ${euro(zorgMax)} per month (single) or ${euro(zorgMaxPartner)} (couple). Income limit ${euro(Z.maxInkomenAlleen)}. Includes the rules for international students.`,
    h1: `Healthcare allowance calculator ${JAAR}`,
    intro: 'Healthcare allowance (zorgtoeslag, officially ‘healthcare benefit’) is a monthly contribution towards your Dutch health insurance. Enter your income and see how much you get per month.',
    calc: 'zorgtoeslag',
    body: () => `
<h2>Healthcare allowance ${JAAR} in short</h2>
${tabel(['', 'Single', 'With allowance partner'], [
  ['Maximum healthcare allowance per month', euro(zorgMax), euro(zorgMaxPartner)],
  ['Maximum income per year', euro(Z.maxInkomenAlleen), euro(Z.maxInkomenPartner)],
  ['Maximum assets', euro(Z.vermogensgrensAlleen), euro(Z.vermogensgrensPartner)],
])}

<h2>Who can get healthcare allowance?</h2>
<ul>
<li>You are 18 or older.</li>
<li>You have <strong>Dutch basic health insurance</strong> (basisverzekering), or insurance under a treaty (verdragsverzekering).</li>
<li>You are Dutch, an EU, EEA or Swiss citizen, or you have a valid residence permit.</li>
<li>Your income and assets are below the limits in the table above.</li>
</ul>

<h2 id="students">International students: only if you work (or have a paid internship)</h2>
<p>This is the rule that confuses most international students:</p>
<ul>
<li><strong>Only studying?</strong> Then you usually stay insured in your own country (for example with an EHIC card or a private student insurance). You do not need Dutch health insurance, and you <strong>cannot get healthcare allowance</strong>.</li>
<li><strong>A part-time job, even a small one?</strong> Then you must take out Dutch basic health insurance. With that insurance you can usually get healthcare allowance.</li>
<li><strong>An internship?</strong> If you are paid at least the Dutch minimum wage, you must take out Dutch health insurance and you can get healthcare allowance. With a lower internship allowance you stay insured in your own country.</li>
</ul>
<p class="let-op"><strong>Stopped working?</strong> Then you may no longer have to have Dutch health insurance. Report the change to your insurer and in Mijn toeslagen straight away. If you keep receiving healthcare allowance without the right to it, you will have to pay it all back. Official explanation: <a href="https://www.belastingdienst.nl/wps/wcm/connect/bldcontenten/belastingdienst/individuals/benefits/moving_to_the_netherlands/i_have_dutch_healthcare_insurance/healthcare-benefit-if-you-come-to-study-in-the-netherlands" rel="noopener">healthcare benefit if you come to study in the Netherlands</a> (Dienst Toeslagen).</p>
<p>Dutch student finance (studiefinanciering) does not count as income. Your job does.</p>

<h2>Healthcare allowance by income (${JAAR})</h2>
<p>This table shows the healthcare allowance per month for different incomes.</p>
${zorgtoeslagTabel('en')}

<h2>How healthcare allowance is calculated</h2>
<p>The government assumes an average premium: the <strong>standard premium</strong> (standaardpremie). In ${JAAR} it is ${euro(Z.standaardpremie)} per person per year. You pay part of it yourself: the <strong>norm premium</strong> (normpremie). You receive the difference as healthcare allowance.</p>
<ul>
<li>Norm premium for a single person: ${pct(Z.normpercentageAlleen)} of the threshold income (${euro(Z.drempelinkomen)}), plus ${pct(Z.afbouwpercentage)} of your income above it.</li>
<li>Norm premium with an allowance partner: ${pct(Z.normpercentagePartner)} of the threshold income, plus ${pct(Z.afbouwpercentage)} of your joint income above it. The standard premium then counts twice.</li>
</ul>
<p>Example: a single person with an income of ${euro(32000)} pays a norm premium of ${euro(zorgtoeslag({ inkomen: 32000 }).normpremie)}. The healthcare allowance is ${euro(Z.standaardpremie)} − ${euro(zorgtoeslag({ inkomen: 32000 }).normpremie)} = ${euro(zorgtoeslag({ inkomen: 32000 }).perJaar)} per year, or ${euro(zorgtoeslag({ inkomen: 32000 }).perMaand)} per month.</p>
<p class="let-op"><strong>Save money:</strong> healthcare allowance only covers part of your premium. Between 12 November and 31 December you can switch to a cheaper health insurer (${nl('/zorgverzekering-overstappen/', 'uitleg in het Nederlands')}).</p>
${checkLink}`,
    faq: [
      [`How much healthcare allowance will I get in ${JAAR}?`, `Up to ${euro(zorgMax)} per month as a single person and ${euro(zorgMaxPartner)} with an allowance partner. The higher your income above ${euro(Z.drempelinkomen)}, the less you get.`],
      [`What is the income limit for healthcare allowance in ${JAAR}?`, `${euro(Z.maxInkomenAlleen)} per year for a single person and ${euro(Z.maxInkomenPartner)} for you and your allowance partner together.`],
      ['I am an international student with a part-time job. Can I get it?', 'Usually yes: with a job you must take out Dutch basic health insurance, and then you can apply for healthcare allowance. Without a job (only studying) you cannot.'],
      ['When is healthcare allowance paid?', 'Dienst Toeslagen pays an advance every month, usually around the 20th, for the following month.'],
      ['Do I have to pay it back if my income rises?', 'Yes, if your income turns out higher than you reported. Report changes straight away in Mijn toeslagen.'],
    ],
  },

  // ───────────────────────────── RENT ALLOWANCE ─────────────────────────────
  {
    slug: '/en/rent-allowance/',
    taal: 'en',
    nl: '/huurtoeslag-berekenen/',
    kort: 'Rent allowance',
    title: `Rent allowance calculator ${JAAR} (huurtoeslag): with the new rules`,
    description: `Calculate your Dutch rent allowance (huurtoeslag) for ${JAAR} with the new rules: no maximum rent any more, service charges no longer count, full allowance from age 21. With tables by rent and income.`,
    h1: `Rent allowance calculator ${JAAR}`,
    intro: `Rent allowance (huurtoeslag, officially ‘housing benefit’) helps with the rent of a self-contained home. Since 1 January ${JAAR} it is calculated in a new, simpler way. Work out what you get.`,
    calc: 'huurtoeslag',
    body: () => `
<h2>Who can get rent allowance?</h2>
<ul>
<li>You rent a <strong>self-contained home</strong>: with your own front door, kitchen and toilet. For a room with shared facilities you usually get no rent allowance. This includes most student rooms and most housing arranged by employment agencies.</li>
<li>You live in the home and are <strong>registered at the address</strong> with your municipality. If your landlord does not allow you to register, you cannot get rent allowance.</li>
<li>As a rule you are 18 or older, and you live in the Netherlands legally.</li>
<li>Your assets are not above ${euro(H.vermogensgrensPerPersoon)} per person (${euro(H.vermogensgrensPerPersoon * 2)} with an allowance partner).</li>
<li>Your income is not too high. There is no fixed income limit any more: it depends on your rent (see the table below).</li>
</ul>

<h2>What is new in ${JAAR}?</h2>
<ul>
<li><strong>No maximum rent any more.</strong> Is your basic rent above ${e2(H.maximaleHuurgrens)}? You can still get rent allowance; it is calculated as if your rent were ${e2(H.maximaleHuurgrens)}.</li>
<li><strong>Service charges no longer count.</strong> Only your basic rent (kale huur) counts.</li>
<li><strong>Full rent allowance from age 21</strong> (was 23). If you are 18, 19 or 20, rent up to ${e2(H.maximaleHuurgrensJong)} counts.</li>
<li><strong>Gradual reduction.</strong> If you earn more, your rent allowance goes down by ${Math.round(H.afbouwpercentageEen * 100)} cents for every extra euro for single people, and ${Math.round(H.afbouwpercentageMeer * 100)} cents for larger households.</li>
</ul>

<h2>Rent allowance per month – single person</h2>
${huurtoeslagTabel(1, 'en')}
<h2>Rent allowance per month – 2 people</h2>
${huurtoeslagTabel(2, 'en')}

<h2>Up to which income do you get rent allowance?</h2>
<p>Because there is no fixed income limit, the maximum income depends on your rent. These amounts apply to households below the state pension age.</p>
${huurtoeslagGrensTabel('en')}

<h2>How rent allowance is calculated</h2>
<ol>
<li><strong>Rent used:</strong> your basic rent, up to ${e2(H.maximaleHuurgrens)} (${e2(H.maximaleHuurgrensJong)} if you are under 21).</li>
<li><strong>Base rent:</strong> you always pay this part yourself: ${e2(H.basishuurEen)} for a single person and ${e2(H.basishuurMeer)} for larger households.</li>
<li><strong>Contribution per part of the rent:</strong> 100% of the rent between the base rent and ${e2(H.kwaliteitskortingsgrens)}, 65% between ${e2(H.kwaliteitskortingsgrens)} and the capping limit (${e2(H.aftoppingsgrensKlein)} for 1–2 people, ${e2(H.aftoppingsgrensGroot)} for 3 or more). Above the capping limit you get 40% if someone in the home has reached state pension age or if the home is adapted for a disability.</li>
<li><strong>Income reduction:</strong> if you earn more than ${euro(H.inkomensijkpuntEen)} (single) or ${euro(H.inkomensijkpuntMeer)} (larger household), ${Math.round(H.afbouwpercentageEen * 100)}% or ${Math.round(H.afbouwpercentageMeer * 100)}% of the difference per year is deducted.</li>
</ol>
<p>Example: you live alone, pay ${euro(710)} basic rent and earn ${euro(29000)} a year. Maximum rent allowance: ${e2(H.kwaliteitskortingsgrens - H.basishuurEen)} + 65% × ${e2(710 - H.kwaliteitskortingsgrens)} = ${e2(H.kwaliteitskortingsgrens - H.basishuurEen + 0.65 * (710 - H.kwaliteitskortingsgrens))}. Because of your income, ${e2((0.27 * (29000 - H.inkomensijkpuntEen)) / 12)} per month is deducted. You get about <strong>${euro(307)} per month</strong>.</p>
<p class="let-op"><strong>Housemates:</strong> does an adult child or a housemate live with you? Then their income and assets usually count too. For children under 23 living at home, part of their income is exempt.</p>
${checkLink}`,
    faq: [
      [`What is the maximum rent for rent allowance in ${JAAR}?`, `There is no maximum rent as a condition any more. From ${JAAR} you can get rent allowance even if your rent is above ${e2(H.maximaleHuurgrens)}; the calculation then uses ${e2(H.maximaleHuurgrens)}.`],
      [`What is the income limit for rent allowance in ${JAAR}?`, `There is no fixed limit. The higher your rent, the higher the income at which you still get rent allowance. With a rent of ${euro(700)}, the limit for a single person is about ${euro(maxInkomen(huurtoeslag, { kaleHuur: 700, personen: 1 }))}.`],
      ['Can I get rent allowance for a room?', 'Usually not. Rent allowance is only for a self-contained home with your own front door, kitchen and toilet. There are exceptions, for example group housing for older people or people with a disability.'],
      ['My landlord does not allow me to register at the address. What now?', 'Without registration at the address you cannot get rent allowance. Registering where you live is also a legal obligation. Your municipality or a tenants’ advice service (huurteam) can help.'],
    ],
  },

  // ───────────────────────────── CHILD BUDGET ─────────────────────────────
  {
    slug: '/en/child-budget/',
    taal: 'en',
    nl: '/kindgebonden-budget-berekenen/',
    kort: 'Child budget',
    title: `Child budget calculator ${JAAR} (kindgebonden budget): amounts and income limit`,
    description: `Calculate your Dutch child budget (kindgebonden budget) for ${JAAR}. Up to ${euro(K.bedragPerKind)} per child per year, more for children aged 12 and over, and ${euro(K.alleenstaandeOuderkop)} extra for single parents.`,
    h1: `Child budget calculator ${JAAR}`,
    intro: 'The child budget (kindgebonden budget) is a contribution towards the cost of children under 18. You get it on top of child benefit. Work out how much you get.',
    calc: 'kindgebondenBudget',
    body: () => `
<h2>Child budget amounts ${JAAR}</h2>
${tabel(['Situation', 'Maximum per year'], [
  ['Per child under 12', euro(K.bedragPerKind)],
  ['Per child aged 12 to 15', euro(K.bedragPerKind + K.extra12tot15)],
  ['Per child aged 16 or 17', euro(K.bedragPerKind + K.extra16tot17)],
  ['Extra for single parents', euro(K.alleenstaandeOuderkop)],
])}
<p>You get the maximum amount up to an income of ${euro(K.drempelinkomenAlleen)} (single parent) or ${euro(K.drempelinkomenPartner)} (with an allowance partner). Above that, ${pct(K.afbouwpercentage)} of the extra income is deducted.</p>

<h2>Child budget per month at your income</h2>
<p>Amounts per month for children under 12.</p>
${kgbTabel('en')}

<h2>Up to which income do you get child budget?</h2>
${kgbGrensTabel('en')}

<h2>Who can get child budget?</h2>
<ul>
<li>You receive Dutch child benefit (kinderbijslag) for your child, or your child is 16 or 17 and lives with you.</li>
<li>Your income and assets are not too high. In ${JAAR} your assets may not be above ${euro(K.vermogensgrensAlleen)} (single) or ${euro(K.vermogensgrensPartner)} (together).</li>
<li>You are Dutch, an EU, EEA or Swiss citizen, or you have a valid residence permit.</li>
</ul>
<p>Do you already get child benefit and healthcare allowance? Then you usually get the child budget automatically. Otherwise you apply in Mijn toeslagen. Does your child live outside the Netherlands? Then different amounts may apply; check <a href="https://www.toeslagen.nl" rel="noopener">toeslagen.nl</a>.</p>
${checkLink}`,
    faq: [
      [`How much child budget do I get per child in ${JAAR}?`, `Up to ${euro(K.bedragPerKind)} per year for a child under 12, up to ${euro(K.bedragPerKind + K.extra12tot15)} for children aged 12 to 15, and ${euro(K.bedragPerKind + K.extra16tot17)} for children aged 16 and 17.`],
      ['What is the single-parent supplement?', `Single parents get up to ${euro(K.alleenstaandeOuderkop)} a year extra on top of the regular child budget (alleenstaande-ouderkop).`],
      ['Does child maintenance count as income?', 'No, child maintenance you receive does not count. Partner maintenance does.'],
      ['Do I have to apply for child budget?', 'Often not: if you receive child benefit and healthcare allowance, you usually get it automatically. If you do not receive healthcare allowance, apply yourself in Mijn toeslagen.'],
    ],
  },

  // ───────────────────────────── CHILDCARE ALLOWANCE ─────────────────────────────
  {
    slug: '/en/childcare-allowance/',
    taal: 'en',
    nl: '/kinderopvangtoeslag-berekenen/',
    kort: 'Childcare allowance',
    title: `Childcare allowance calculator ${JAAR} (kinderopvangtoeslag): what do you pay?`,
    description: `Calculate your Dutch childcare allowance (kinderopvangtoeslag) for ${JAAR} and your net costs per month. Maximum hourly rate day care ${e2(O.maxUurprijs.dagopvang)}, out-of-school care ${e2(O.maxUurprijs.bso)}, childminder ${e2(O.maxUurprijs.gastouder)}. Up to 96% back.`,
    h1: `Childcare allowance calculator ${JAAR}`,
    intro: 'Do you work and does your child go to a day nursery, out-of-school care or a childminder? Then you get a large part of the costs back. See what childcare costs you after the allowance.',
    calc: 'kinderopvangtoeslag',
    body: () => `
<h2>Maximum hourly rate ${JAAR}</h2>
${tabel(['Type of childcare', 'Maximum hourly rate', 'At 96% contribution'], [
  ['Day care (kinderdagverblijf)', e2(O.maxUurprijs.dagopvang), e2(O.maxUurprijs.dagopvang * 0.96)],
  ['Out-of-school care (BSO)', e2(O.maxUurprijs.bso), e2(O.maxUurprijs.bso * 0.96)],
  ['Childminder (gastouder)', e2(O.maxUurprijs.gastouder), e2(O.maxUurprijs.gastouder * 0.96)],
])}
<p>Is your hourly rate higher than the maximum? Then you pay the difference entirely yourself. You get the allowance for up to ${O.maxUrenPerMaand} hours per child per month.</p>

<h2>Which percentage do you get back?</h2>
<p>Up to a joint assessment income of ${euro(O.inkomenMaximaalPercentage)} you get 96% of the maximum hourly rate. Above that, the percentage goes down. For the second and every next child it goes down more slowly.</p>
${tabel(['Joint income', 'First child', 'Second and next child'], [
  ...[O.inkomenMaximaalPercentage, 70000, 80000, 90000, 100000, 120000, 140000, 160000, 200000].map((i) => [
    `${i === O.inkomenMaximaalPercentage ? 'up to ' : ''}${euro(i)}`,
    pctKot(kotPercentage(i, true)),
    pctKot(kotPercentage(i, false)),
  ]),
  ['Highest incomes', pctKot(O.tabelEersteKind.at(-1)[1]), pctKot(O.tabelVolgendKind.at(-1)[1])],
])}
<p class="hint">The official table has 69 income brackets. Our calculator works between known points of that table, so the result can differ by about 1 percentage point. The ‘first child’ is the child with the highest childcare costs.</p>

<h2>Who can get childcare allowance?</h2>
<ul>
<li>You and your allowance partner both work (or follow a course or a route to work).</li>
<li>The childcare is listed in the national childcare register (Landelijk Register Kinderopvang, LRK).</li>
<li>You have a written agreement with the childcare provider and pay your own part by bank transfer.</li>
<li>There is no asset limit for childcare allowance.</li>
</ul>
<p class="let-op"><strong>Apply on time:</strong> apply within 3 months after the month in which childcare starts. Otherwise you miss out on allowance.</p>
${checkLink}`,
    faq: [
      [`How much childcare allowance do I get in ${JAAR}?`, `Up to a joint income of ${euro(O.inkomenMaximaalPercentage)} you get 96% of the maximum hourly rate. For day care that is ${e2(O.maxUurprijs.dagopvang * 0.96)} per hour.`],
      ['Is there an income limit for childcare allowance?', 'No. Even with a high income you get part of it back: at least 36.5% for the first child and 68.2% for the next children.'],
      ['Do both parents have to work?', 'As a rule, yes. The number of hours worked no longer matters, but you do have to work. If you stop working, you keep the right for 3 more months.'],
    ],
  },

  // ───────────────────────────── CHILD BENEFIT ─────────────────────────────
  {
    slug: '/en/child-benefit/',
    taal: 'en',
    nl: '/kinderbijslag-berekenen/',
    kort: 'Child benefit',
    title: `Child benefit ${JAAR} (kinderbijslag): amounts per quarter`,
    description: `Dutch child benefit (kinderbijslag) ${JAAR}: ${e2(B.perKwartaal.tot6)} (age 0–5), ${e2(B.perKwartaal.tot12)} (age 6–11) and ${e2(B.perKwartaal.tot18)} (age 12–17) per quarter. Calculate how much you get.`,
    h1: `Child benefit calculator ${JAAR}`,
    intro: 'The SVB pays child benefit (kinderbijslag) for every child under 18, whatever your income. Calculate how much you get per quarter and per year.',
    calc: 'kinderbijslag',
    body: () => `
<h2>Child benefit amounts ${JAAR}</h2>
${tabel(['Age of child', 'Per quarter (from 1 July)', 'Per quarter (before 1 July)'], [
  ['0 to 5 years', e2(B.perKwartaal.tot6), e2(B.perKwartaalEersteHelft.tot6)],
  ['6 to 11 years', e2(B.perKwartaal.tot12), e2(B.perKwartaalEersteHelft.tot12)],
  ['12 to 17 years', e2(B.perKwartaal.tot18), e2(B.perKwartaalEersteHelft.tot18)],
])}
<p>The SVB adjusts the amounts twice a year: on 1 January and 1 July. Our calculator uses the amounts from 1 July ${JAAR}.</p>
<h2>Who can get child benefit?</h2>
<ul>
<li>Your child is under 18 and lives with you, or you contribute substantially to the costs.</li>
<li>For children aged 16 and 17: they go to school or study, or do not earn too much.</li>
<li>You live or work in the Netherlands and are insured under Dutch social security.</li>
</ul>
<p class="let-op"><strong>Child living abroad?</strong> You may still get child benefit if you work in the Netherlands, but the amount can depend on the country where your child lives, and for some countries you get none. Check the rules on <a href="https://www.svb.nl/en/child-benefit" rel="noopener">svb.nl</a>.</p>
<h2>How to apply</h2>
<p>After your child is born in the Netherlands, the SVB usually sends you an application form automatically. Did you move here with children, or did you not get anything? Apply through <a href="https://www.svb.nl/en/child-benefit" rel="noopener">svb.nl</a>. Next to child benefit you may also be able to get the <a href="/en/child-budget/">child budget</a>.</p>
${checkLink}`,
    faq: [
      ['Does child benefit depend on my income?', 'No, everyone with children under 18 gets the same amount, whatever their income.'],
      ['When is child benefit paid?', 'After the end of each quarter: early January, April, July and October.'],
      ['Do I get more for my second child?', 'No, the amount only depends on the age of the child, not on the number of children.'],
    ],
  },

  // ───────────────────────────── ASSESSMENT INCOME ─────────────────────────────
  {
    slug: '/en/assessment-income/',
    taal: 'en',
    nl: '/toetsingsinkomen/',
    kort: 'Assessment income',
    title: `Assessment income for Dutch allowances (toetsingsinkomen) ${JAAR}`,
    description: 'What is your assessment income (toetsingsinkomen) and how do you work it out? Convert your gross monthly salary into the annual income Dienst Toeslagen uses.',
    h1: 'Assessment income calculator',
    intro: 'For every allowance, Dienst Toeslagen looks at your assessment income (toetsingsinkomen). Not sure what that is? Work it out here from your monthly salary.',
    calc: 'toetsingsinkomen',
    body: () => `
<h2>What is the assessment income?</h2>
<p>Your assessment income is usually your <strong>aggregate income</strong> (verzamelinkomen) from your Dutch tax return: income from work, benefits or pension (box 1), plus any income from a substantial interest (box 2) and from savings and investments (box 3). If you do not file a tax return, it is usually your gross annual salary including holiday pay, minus any deductible items.</p>
<h2>What counts and what does not?</h2>
${tabel(['Counts', 'Does not count'], [
  ['Salary, including holiday pay and a 13th month', 'Dutch student finance'],
  ['Benefits (WW, WIA, social assistance, AOW)', 'Child benefit and child budget'],
  ['Pension', 'Child maintenance'],
  ['Business profit', 'The allowances themselves'],
  ['Partner maintenance', 'Tax-free allowances from your employer'],
])}
<h2>Moved to the Netherlands this year?</h2>
<p>Allowances are calculated per calendar year. Fill in your expected income for the whole year. Income you earned abroad in the same year can count as well. Have you got the 30% ruling? Then the tax-free part of your salary usually does not count, but check this on toeslagen.nl because it depends on your situation.</p>
<h2>Where can I find my assessment income?</h2>
<ul>
<li>On your annual statement (jaaropgave) from your employer or benefits agency: look for ‘fiscaal loon’.</li>
<li>In your tax assessment: the aggregate income (verzamelinkomen).</li>
<li>In Mijn toeslagen: there you see which income Dienst Toeslagen currently uses.</li>
</ul>
<p class="let-op"><strong>Better to estimate a little too high than too low.</strong> If your income turns out higher than you reported, you have to pay back allowance. <a href="/en/repaying-allowances/">How to avoid that</a>.</p>`,
    faq: [
      ['Is the assessment income gross or net?', 'Gross: your income before wage tax is deducted, including holiday pay.'],
      ['Does my partner’s income count?', 'Yes, if you have an allowance partner, your incomes are added together. For rent allowance, the income of co-residents counts too.'],
    ],
  },

  // ───────────────────────────── REPAYING ─────────────────────────────
  {
    slug: '/en/repaying-allowances/',
    taal: 'en',
    nl: '/toeslag-terugbetalen/',
    kort: 'Avoid paying back',
    title: 'Paying back Dutch allowances? How to avoid it (and what to do if you must)',
    description: 'Why do people have to pay back Dutch allowances (toeslagen), and how do you avoid it? Tips for setting your advance correctly, what to do when you leave the Netherlands, and payment arrangements.',
    h1: 'How to avoid paying back allowances',
    intro: 'A demand to pay back hundreds or thousands of euros is a hard blow. These tips help you avoid it, especially if your situation changes often.',
    body: () => `
<h2>Why would you have to pay back?</h2>
<p>Your allowance is an <strong>advance payment</strong> (voorschot) based on an estimate. If the estimate turns out to be wrong, the amount is corrected after the year ends. The most common causes:</p>
<ul>
<li>Your income was higher than you reported (a pay rise, a bonus, a new job, finishing your studies).</li>
<li>You got an allowance partner, or your partnership ended.</li>
<li>A co-resident with their own income moved in (rent allowance).</li>
<li>Your assets on 1 January were above the limit. Savings abroad count too.</li>
<li>Your childcare hours or hourly rate changed.</li>
<li>You stopped working and were no longer required to have Dutch health insurance (international students).</li>
<li>You left the Netherlands but the allowances kept being paid.</li>
</ul>
<h2>5 tips to avoid paying back</h2>
<ol>
<li><strong>Report changes within 4 weeks</strong> in Mijn toeslagen or the Toeslagen app.</li>
<li><strong>Estimate your income a little too high.</strong> If you received too little, you get the rest later.</li>
<li><strong>Check your advance every January</strong>, when the new amounts start.</li>
<li><strong>Check your assets on 1 January</strong>, especially after an inheritance or selling a house.</li>
<li><strong>Recalculate with ToeslagBuddy</strong> whenever your situation changes.</li>
</ol>
<h2 id="leaving">Leaving the Netherlands?</h2>
<ul>
<li>Report your departure to your municipality and stop your allowances in Mijn toeslagen before you leave. Healthcare and rent allowance stop when you no longer live (or are insured) in the Netherlands.</li>
<li>Keep your DigiD and your address details up to date, or give a Dutch contact person an authorisation, so that the final calculation reaches you.</li>
<li>If you have to pay back after you have left, the Dutch authorities can still collect it, also abroad.</li>
</ul>
<h2>Do you still have to pay back?</h2>
<p>You usually get a payment arrangement of up to 24 months, which takes into account what you can afford. Can you not pay the amount? Ask for a personal payment arrangement. If you disagree with the calculation, you can object (bezwaar maken) within 6 weeks. Call the BelastingTelefoon on <a href="tel:08000543">0800 0543</a> (free from a Dutch phone) or ${BUITENLAND} from abroad; check the current number on belastingdienst.nl.</p>
<p>Money worries? Every municipality offers free debt help. The sooner you ask, the easier it is to solve.</p>`,
    faq: [
      ['How long do I have to pay back an allowance?', 'Usually you get a payment arrangement of 24 months. On a low income you can ask for a personal payment arrangement.'],
      ['Do I pay interest on money I have to pay back?', 'As a rule, no, as long as you stick to the payment arrangement.'],
      ['I am leaving the Netherlands. What should I do?', 'Stop your allowances in Mijn toeslagen, report your departure to your municipality, and make sure letters from Dienst Toeslagen can still reach you.'],
    ],
  },

  // ───────────────────────────── PRO ─────────────────────────────
  {
    slug: '/en/pro/',
    taal: 'en',
    nl: '/pro/',
    kort: 'For organisations',
    title: 'ToeslagBuddy Pro – allowances check for Dutch financial administrators and budget coaches',
    description: 'ToeslagBuddy Pro checks your whole client list for missed Dutch allowances and repayment risks. Client data stays on your own computer. The app itself is in Dutch.',
    h1: 'All clients checked for allowances at once',
    intro: 'For financial administrators (bewindvoerders), budget coaches and debt counsellors working with Dutch clients. This page is a short English summary. The app itself is in Dutch.',
    body: () => `
<p class="let-op"><strong>Please note:</strong> ToeslagBuddy Pro, its screens, reports and support are in Dutch, because it follows the Dutch rules and Dutch terms from Mijn toeslagen. The full description is on the ${nl('/pro/', 'Nederlandse Pro-pagina')}.</p>
<h2>What it does</h2>
<ul>
<li><strong>Not applied for:</strong> healthcare allowance, rent allowance and child budget a client is probably entitled to.</li>
<li><strong>Repayment risk:</strong> advance payments that are higher than the calculated entitlement, or where assets exclude the right.</li>
<li><strong>Advance too low:</strong> clients who receive too little each month.</li>
<li><strong>Assets close to the limit</strong> on the reference date of 1 January.</li>
<li><strong>Changes next year:</strong> a child turns 12, 16 or 18; a client turns 18 or 21.</li>
<li><strong>Municipal schemes:</strong> remission of local taxes, special assistance, individual income supplement and schemes for children.</li>
</ul>
<h2>Client data stays with you</h2>
<p>The check runs entirely in your browser. Client data does <strong>not</strong> reach our server: we only receive aggregated counts per organisation, without client numbers, names or amounts per client. Columns with names or a citizen service number (BSN) are removed automatically. Details (in Dutch): ${nl('/pro/beveiliging/', 'beveiligingsfactsheet')}.</p>
<h2>Prices</h2>
<ul>
<li><strong>Trial:</strong> 7 days free, all features, no payment details needed. It stops by itself and does not turn into a paid subscription.</li>
<li><strong>Office:</strong> € 1 per client per month, with a minimum of € 99 per month, cancellable monthly.</li>
<li><strong>Organisation:</strong> custom pricing for debt counselling services, municipalities and housing associations.</li>
</ul>
<p class="hint">Pro is only for organisations. All prices exclude VAT. Read the <a href="/en/terms/">summary of the terms</a>.</p>
<p class="hero-knoppen"><a class="knop" href="/pro/check/" hreflang="nl">View the demo (in Dutch)</a> <a class="knop-licht" href="/pro/aanmelden/" hreflang="nl">Start a free trial (in Dutch)</a> <a class="knop-licht" href="/en/contact/">Ask a question in English</a></p>`,
    faq: [
      ['Do we need a data processing agreement?', 'Not for client data, because it does not reach our server. We do process your account data (name, business email and organisation) as controller; see the privacy statement.'],
      ['Can we get support in English?', 'You can send us questions in English through the contact form. The app, reports and documentation are in Dutch.'],
    ],
  },
  {
    slug: '/en/terms/',
    taal: 'en',
    nl: '/pro/voorwaarden/',
    vertaling: false,
    kort: 'Pro terms (summary)',
    title: 'ToeslagBuddy Pro terms – English summary',
    description: 'A short English summary of the terms of ToeslagBuddy Pro: business use only, trial, subscription, cancellation, data, confidentiality and liability. Only the Dutch text is binding.',
    h1: 'ToeslagBuddy Pro terms: summary',
    intro: 'A summary for English-speaking readers. Only the Dutch text is legally binding.',
    body: voorwaardenSamenvatting,
  },

  // ───────────────────────────── PRIVACY / CONTACT ─────────────────────────────
  {
    slug: '/en/privacy/',
    taal: 'en',
    nl: '/privacy/',
    kort: 'Privacy',
    title: 'Privacy statement and cookies',
    description: 'Privacy statement of ToeslagBuddy: calculations stay on your device, no tracking cookies. Which data we do process, why, for how long and what your rights are. English translation; the Dutch version is binding.',
    h1: 'Privacy statement',
    intro: 'What you enter in the calculators stays on your own device. Below you can read exactly which data we do process, why and for how long.',
    body: privacyBodyEn,
  },
  {
    slug: '/en/contact/',
    taal: 'en',
    nl: '/contact/',
    kort: 'Contact',
    title: 'Contact',
    description: 'Ask a question, give a tip or report a mistake to ToeslagBuddy, in English or Dutch.',
    h1: 'Contact',
    intro: 'A question, a tip or found a mistake? Leave a message in English or Dutch. We usually reply within one working day.',
    body: () => `
${formulier('contact', 'Message via ToeslagBuddy (English)', [['naam', 'Name', 'text', true, 'name'], ['email', 'Email (so we can reply)', 'email', true, 'email'], ['bericht', 'Your message', 'textarea', true]], 'Send message')}
<p class="let-op"><strong>Please note:</strong> we cannot see your personal allowance file. For questions about your own allowance, call the BelastingTelefoon: <a href="tel:08000543">0800 0543</a> (free from a Dutch phone) or ${BUITENLAND} from abroad. Never send us your BSN or DigiD details.</p>
<p>You can also email <a href="mailto:info@toeslagbuddy.nl">info@toeslagbuddy.nl</a>. For privacy questions: <a href="mailto:privacy@toeslagbuddy.nl">privacy@toeslagbuddy.nl</a>.</p>`,
  },
];
