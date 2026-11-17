// Rekenhulpen van /familie/rekenhulp/…: leest het formulier, rekent met de
// kernen uit src/familie en toont de uitkomst met de berekening erbij.
// Is een regel niet (meer) bevestigd, dan rekenen we niet en verwijzen we door.
import { h, rauw, euro, getal, leesJson, icoon } from './familie-ui.js';
import { regelStatus } from './regels.js';
import { lageBijdrage, hogeBijdrage } from './wlz.js';
import { erfbelasting, overzicht, RELATIES } from './erfbelasting.js';
import { aftrek } from './zorgkosten.js';
import { vergelijk } from './zonnepanelen.js';

const data = leesJson('familie-regels', { regels: {}, bronnen: {} });
const R = data.regels;

const stappenTabel = (stappen, titel = 'Zo hebben we gerekend') => h`<details class="f-rekenstappen"><summary>${titel}</summary><table><tbody>${stappen.map((s) => h`<tr class="${s.totaal ? 'som' : ''}"><td>${s.tekst}</td><td>${s.bedrag < 0 ? '− ' : ''}${euro(Math.abs(s.bedrag))}</td></tr>`)}</tbody></table></details>`;
const band = (laag, hoog) => (laag < hoog ? `${euro(laag)} – ${euro(hoog)}` : euro(hoog));

function controleer(regel) {
  return h`<p class="f-kop">Even controleren</p><div class="f-controleer"><p style="margin:0"><strong>We kunnen deze bedragen op dit moment niet bevestigen.</strong> Daarom rekenen we er niet mee. Gebruik de rekenhulp van ${regel?.instantie || 'de instantie'} zelf.</p></div>${regel?.controleerBij ? h`<p><a class="knop" href="${regel.controleerBij}" rel="noopener">Naar ${regel.instantie}</a></p>` : ''}`;
}

const REKEN = {
  wlz(f) {
    const regel = R['wlz-2026'];
    const inkomen = getal(f.verzamelinkomen);
    if (inkomen === null) return { fout: 'Vul het verzamelinkomen in.', veld: 'verzamelinkomen' };
    const invoer = { verzamelinkomen: inkomen, vermogen: getal(f.vermogen) || 0, partner: f.partner === 'ja', aow: f.aow === 'ja', mpt: f.zorg === 'mpt', belasting: getal(f.belasting) || 0, arbeid: getal(f.arbeid) || 0 };
    const laag = lageBijdrage(regel, invoer);
    const instelling = f.zorg === 'instelling';
    const hoog = instelling ? hogeBijdrage(regel, invoer) : null;
    const zonderBelasting = instelling && getal(f.belasting) === null;
    return {
      html: h`<p class="f-kop">${instelling ? 'Eerste 4 maanden: lage eigen bijdrage' : 'Lage eigen bijdrage'}</p>
<p class="f-groot">${band(laag.perMaandLaagst, laag.perMaand)} <small>per maand</small></p>
${laag.opMinimum ? h`<p>Dat is het minimum van ${euro(laag.minimum)}.</p>` : laag.opMaximum ? h`<p>Dat is het maximum van ${euro(laag.maximum)}.</p>` : ''}
${stappenTabel(laag.stappen, 'Zo is de lage bijdrage berekend')}
${hoog ? h`<p class="f-kop" style="margin-top:28px">Daarna meestal: hoge eigen bijdrage</p>
<p class="f-groot">${zonderBelasting ? 'hoogstens ' : ''}${band(hoog.perMaandLaagst, hoog.perMaand)} <small>per maand</small></p>
${zonderBelasting ? h`<p>Je hebt de belasting leeg gelaten. De echte bijdrage is lager: vul de belasting in voor een preciezer bedrag.</p>` : hoog.opMaximum ? h`<p>Dat is het maximum van ${euro(hoog.maximum)}.</p>` : ''}
${stappenTabel([...hoog.stappen, { tekst: 'Gedeeld door 12 (maximaal ' + euro(hoog.maximum) + ')', bedrag: hoog.perMaand, totaal: true }], 'Zo is de hoge bijdrage berekend')}` : ''}
${laag.compensatieMax ? h`<p class="f-klein">Waarom een bandbreedte? Met AOW en vermogen trekt het CAK nog een compensatie af van maximaal ${euro(laag.compensatieMax, 0)} per jaar. Hoeveel precies, staat op de beschikking.</p>` : ''}
<p class="f-klein">Indicatie voor ${regel.jaar}, berekend met inkomen en vermogen van ${regel.peiljaar}. Het CAK stelt de bijdrage vast.</p>
<p class="f-knoppen"><a class="knop-licht" href="${regel.controleerBij}" rel="noopener">Controleer bij het CAK</a><a class="knop-licht" href="/familie/app/">Bewaar in de regelkamer</a></p>`,
    };
  },

  erfbelasting(f) {
    const regel = R['erfbelasting-2026'];
    if (f.wijze === 'los') {
      const bedrag = getal(f.bedrag);
      if (bedrag === null) return { fout: 'Vul in wat de erfgenaam krijgt.', veld: 'bedrag' };
      const r = erfbelasting(regel, { waarde: bedrag, relatie: f.relatie });
      return {
        html: h`<p class="f-kop">Erfbelasting</p><p class="f-groot">${euro(r.belasting, 0)}</p>
<p>${r.belasting ? `Van ${euro(r.krijgt, 0)} blijft ${euro(r.netto, 0)} over.` : 'Het bedrag blijft onder de vrijstelling. Er is geen erfbelasting verschuldigd.'}</p>
${stappenTabel([{ tekst: 'Erfdeel', bedrag: r.krijgt }, { tekst: `Vrijstelling (${RELATIES[r.relatie].naam.toLowerCase()})`, bedrag: -r.vrijstelling }, { tekst: 'Belast bedrag', bedrag: r.belast, totaal: true }, ...r.schijven.filter((s) => s.over).map((s) => ({ tekst: `${Math.round(s.percentage * 100)}% over ${euro(s.over, 0)}`, bedrag: s.belasting })), { tekst: 'Erfbelasting (afgerond)', bedrag: r.belasting, totaal: true }])}
<p class="f-klein">Indicatie met de bedragen van ${regel.jaar}.</p>`,
      };
    }
    const nal = getal(f.nalatenschap);
    if (nal === null) return { fout: 'Vul de waarde van de erfenis in.', veld: 'nalatenschap' };
    const kinderen = Math.floor(getal(f.kinderen) || 0);
    const o = overzicht(regel, { nalatenschap: nal, partner: f.partner === 'ja', kinderen });
    if (o.anders) return { html: h`<p class="f-kop">Zonder partner en kinderen</p><p>Dan erven andere familieleden, zoals ouders, broers en zussen. Wie precies, hangt af van de familie. Reken per persoon met de keuze 'Wat één erfgenaam betaalt', of vraag een notaris.</p>` };
    return {
      html: h`<p class="f-kop">Erfbelasting samen</p><p class="f-groot">${euro(o.totaalBelasting, 0)}</p>
<p>${o.delen} erfgenamen, elk ${euro(o.perDeel, 0)}.</p>
<div class="tabel-scroll" tabindex="0" role="region" aria-label="Verdeling per erfgenaam"><table class="f-tabel"><thead><tr><th>Wie</th><th class="getal">Erft</th><th class="getal">Vrijstelling</th><th class="getal">Erfbelasting</th></tr></thead><tbody>
${o.erfgenamen.map((e) => h`<tr><td><strong>${e.wie[0].toUpperCase() + e.wie.slice(1)}</strong><br><span class="f-klein">${e.toelichting}</span></td><td class="getal">${euro(e.deel, 0)}</td><td class="getal">${euro(e.vrijstelling, 0)}</td><td class="getal">${euro(e.belasting, 0)}</td></tr>`)}
</tbody></table></div>
${f.partner === 'ja' && kinderen ? h`<p class="f-klein">De partner schiet de erfbelasting van de kinderen voor. Bij de wettelijke verdeling kan de Belastingdienst de delen anders waarderen dan hier; dit is een indicatie.</p>` : ''}
<p class="f-knoppen"><a class="knop-licht" href="${regel.controleerBij}" rel="noopener">Controleer bij de Belastingdienst</a></p>`,
    };
  },

  zorgkosten(f) {
    const regel = R['zorgkosten-2026'];
    const inkomen = getal(f.drempelinkomen);
    if (inkomen === null) return { fout: 'Vul het drempelinkomen in.', veld: 'drempelinkomen' };
    const r = aftrek(regel, { drempelinkomen: inkomen, partner: f.partner === 'ja', aow: f.aow === 'ja', kostenMetVerhoging: getal(f.kostenMetVerhoging) || 0, kostenZonderVerhoging: getal(f.kostenZonderVerhoging) || 0 });
    return {
      html: h`<p class="f-kop">Aftrek zorgkosten ${regel.jaar}</p><p class="f-groot">${euro(r.aftrek, 0)}</p>
<p>${r.haaltDrempel ? `Je komt boven de drempel van ${euro(r.drempel, 0)}. Dit bedrag gaat van het inkomen af; wat het aan belasting scheelt, hangt af van het tarief.` : r.kosten ? `De kosten blijven onder de drempel van ${euro(r.drempel, 0)}. Er is dit jaar geen aftrek.` : `De drempel is ${euro(r.drempel, 0)}. Vul de kosten in om te zien of je erboven komt.`}</p>
${stappenTabel([{ tekst: 'Zorgkosten', bedrag: r.kosten }, ...(r.verhoging ? [{ tekst: `Verhoging van ${Math.round(r.percentage * 100)}%`, bedrag: r.verhoging }] : []), { tekst: 'Samen', bedrag: r.totaal, totaal: true }, { tekst: 'Drempel', bedrag: -r.drempel }, { tekst: 'Aftrek (afgerond)', bedrag: r.aftrek, totaal: true }])}
<p class="f-klein">Indicatie. Niet alle zorgkosten tellen mee; bewaar bonnen en nota's.</p>`,
    };
  },

  zonnepanelen(f) {
    const regel = R.salderen;
    for (const [veld, naam] of [['opwek', 'de opwek'], ['verbruik', 'het verbruik'], ['zelfverbruik', 'het eigen gebruik'], ['tariefAllIn', 'de stroomprijs'], ['tariefKaal', 'de kale leveringsprijs']]) if (getal(f[veld]) === null) return { fout: `Vul ${naam} in.`, veld };
    const r = vergelijk(regel, { opwek: getal(f.opwek), verbruik: getal(f.verbruik), zelfverbruik: getal(f.zelfverbruik), tariefAllIn: getal(f.tariefAllIn), tariefKaal: getal(f.tariefKaal), vergoeding: f.vergoeding === '' ? '' : getal(f.vergoeding), terugleverkosten: getal(f.terugleverkosten) || 0 });
    return {
      html: h`<p class="f-kop">Verschil per jaar vanaf 2027</p><p class="f-groot">${r.verschil >= 0 ? '+ ' : '− '}${euro(Math.abs(r.verschil), 0)} <small>${r.verschil >= 0 ? 'duurder' : 'goedkoper'}</small></p>
<table class="f-tabel"><tbody><tr><td>Stroomkosten nu, met salderen</td><td class="getal">${euro(r.metSalderen, 0)}</td></tr><tr><td>Stroomkosten vanaf 2027, zonder salderen</td><td class="getal">${euro(r.zonderSalderen, 0)}</td></tr><tr><td>Teruglevering per jaar</td><td class="getal">${Math.round(r.teruglevering).toLocaleString('nl-NL')} kWh</td></tr><tr><td>Vergoeding waarmee is gerekend</td><td class="getal">${euro(r.vergoeding, 3)} per kWh</td></tr></tbody></table>
${r.onderMinimum ? h`<div class="f-controleer"><p style="margin:0">De vergoeding die je invulde is lager dan het wettelijke minimum van ${euro(r.minimumVergoeding, 3)} per kWh (50% van de kale leveringsprijs). Controleer het contract.</p></div>` : ''}
<p><strong>Elke kWh die je zelf gebruikt in plaats van teruglevert, scheelt ${euro(r.winstPerKwhZelf)}.</strong> Was en droog dus overdag als dat kan.</p>
<p class="f-klein">Berekend met de cijfers die je zelf invulde. Vaste leveringskosten en netbeheerkosten veranderen niet door salderen en tellen niet mee.</p>`,
    };
  },

  wmo(f) {
    const regel = R['wmo-2026'];
    const tarief = regel.bedragen.abonnementstarief.waarde;
    const vrij = f.wlz === 'ja' ? 'Je ouder betaalt al een eigen bijdrage voor langdurige zorg. Dan komt er geen bijdrage voor de Wmo bij.' : f.partner === 'ja' && f.beideAow === 'nee' ? 'Minstens één van beiden heeft de AOW-leeftijd nog niet. Dan betaal je geen eigen bijdrage.' : null;
    const p = regel.plan.bedragen;
    const inkomen = getal(f.inkomen);
    const alleen = f.partner !== 'ja';
    let plan = '';
    if (inkomen !== null) {
      const onder = inkomen <= (alleen ? p.grensAlleen.waarde : p.grensMeer.waarde);
      const boven = inkomen >= (alleen ? p.maxVanafAlleen.waarde : p.maxVanafMeer.waarde);
      plan = h`<p class="f-kop" style="margin-top:28px">Als het plan doorgaat</p><p>${onder ? `Bij dit inkomen: ongeveer ${euro(p.minimum.waarde)} per maand (het minimum).` : boven ? `Bij dit inkomen: ongeveer ${euro(p.maximum.waarde, 0)} per maand (het maximum).` : `Bij dit inkomen: een bedrag tussen ${euro(p.minimum.waarde)} en ${euro(p.maximum.waarde, 0)} per maand. Hoe het precies oploopt, staat nog niet vast.`} Vermogen telt in het plan ook mee.</p><p class="f-klein">Dit is een voorstel. De ingangsdatum is uitgesteld en beide Kamers moeten nog instemmen.</p>`;
    }
    return { html: h`<p class="f-kop">Eigen bijdrage Wmo in ${regel.jaar}</p><p class="f-groot">${euro(vrij ? 0 : tarief)} <small>per maand</small></p><p>${vrij || 'Een vast bedrag per maand, hoeveel hulp je ook krijgt. Sommige gemeenten vragen geen bijdrage bij een laag inkomen: vraag het na.'}</p>${plan}` };
  },
};

document.querySelectorAll('[data-rekenhulp]').forEach((blok) => {
  const soort = blok.dataset.rekenhulp;
  const form = blok.querySelector('form');
  const uit = blok.querySelector('[data-uitkomst]');
  const regelId = { wlz: 'wlz-2026', erfbelasting: 'erfbelasting-2026', zorgkosten: 'zorgkosten-2026', zonnepanelen: 'salderen', wmo: 'wmo-2026' }[soort];

  // Delen van het formulier tonen of verbergen (data-toon="waarde" hoort bij een keuze)
  const schakel = () => {
    const f = Object.fromEntries(new FormData(form));
    const gekozen = new Set([f.zorg, f.wijze, soort === 'wmo' ? f.partner : null].filter(Boolean));
    form.querySelectorAll('[data-toon]').forEach((d) => (d.hidden = !gekozen.has(d.dataset.toon)));
  };
  form.addEventListener('change', schakel);
  schakel();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.querySelectorAll('.veld-fout').forEach((x) => x.remove());
    form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    const f = Object.fromEntries(new FormData(form));
    let r;
    if (regelStatus(R[regelId]) !== 'bevestigd') r = { html: controleer(R[regelId]) };
    else r = REKEN[soort](f);
    if (r.fout) {
      const veld = form.elements[r.veld];
      if (veld) {
        veld.setAttribute('aria-invalid', 'true');
        const p = document.createElement('p');
        p.className = 'veld-fout';
        p.id = `fout-${r.veld}`;
        p.textContent = r.fout;
        veld.closest('.f-veld').append(p);
        veld.setAttribute('aria-describedby', p.id);
        veld.focus();
      }
      return;
    }
    uit.removeAttribute('data-leeg');
    uit.innerHTML = String(r.html);
    uit.classList.remove('resultaat-nieuw');
    if (window.matchMedia('(max-width: 979px)').matches) uit.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
