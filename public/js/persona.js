// Geanimeerde uitleg-speler: een getekende persona legt de uitkomst uit,
// met Nederlandse stem (Web Speech API) en ondertitels. Alles gebeurt in de
// browser; er gaan geen gegevens naar buiten.
import { kiesPersona, maakScript, voorSpraak, PERSONAS } from './uitleg.js';

const minderBeweging = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const kanSpreken = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// ── Avatars (SVG) ────────────────────────────────────────────────────
function haar(stijl, kleur) {
  switch (stijl) {
    case 'lang':
      return `<path d="M52 88c0-34 22-54 48-54s48 20 48 54v58c-10 8-20 10-26 10V96c-14-4-30-12-40-24-6 12-14 20-22 24v60c-6 0-10-2-8-12z" fill="${kleur}"/>`;
    case 'staart':
      return `<path d="M54 90c0-34 20-54 46-54s46 20 46 50c-14-2-34-10-46-24-10 14-28 24-46 28z" fill="${kleur}"/><path d="M142 70c18 6 24 30 14 52-4-14-10-24-20-30z" fill="${kleur}"/>`;
    case 'bob':
      return `<path d="M50 96c0-38 22-60 50-60s50 22 50 60v24c-6 4-12 4-16 0V92c-16-2-34-8-44-20-8 12-24 18-36 20v28c-4 4-10 4-14 0z" fill="${kleur}"/>`;
    case 'kaal':
      return `<path d="M56 96c0-8 2-14 4-18 2 10 4 20 4 30zM144 96c0-8-2-14-4-18-2 10-4 20-4 30z" fill="${kleur}"/>`;
    default:
      return `<path d="M56 88c0-32 20-50 44-50s44 18 44 50c-8-6-16-18-22-22-12 8-34 12-52 10-6 4-10 8-14 12z" fill="${kleur}"/>`;
  }
}

export function avatarSvg(p) {
  const u = p.uiterlijk;
  const id = `g-${p.id}`;
  if (u.soort === 'mascotte') {
    return `<svg class="avatar" viewBox="0 0 200 220" role="img" aria-label="${p.naam}, ${p.rol}">
<defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="${u.accent}"/></radialGradient></defs>
<circle class="avatar-bg" cx="100" cy="110" r="96" fill="#e3f3ed"/>
<g class="lijf">
<circle cx="100" cy="112" r="70" fill="url(#${id})" stroke="#c98a12" stroke-width="6"/>
<circle cx="100" cy="112" r="56" fill="none" stroke="#fff3c4" stroke-width="3" stroke-dasharray="4 7"/>
<g class="ogen"><ellipse cx="78" cy="102" rx="8" ry="10" fill="#1d2521"/><ellipse cx="122" cy="102" rx="8" ry="10" fill="#1d2521"/><circle cx="81" cy="98" r="3" fill="#fff"/><circle cx="125" cy="98" r="3" fill="#fff"/></g>
<circle cx="66" cy="124" r="8" fill="#f59e0b" opacity=".45"/><circle cx="134" cy="124" r="8" fill="#f59e0b" opacity=".45"/>
<path class="mond-dicht" d="M84 128q16 14 32 0" stroke="#1d2521" stroke-width="5" fill="none" stroke-linecap="round"/>
<ellipse class="mond-open" cx="100" cy="132" rx="12" ry="9" fill="#7a2e1d"/>
<g class="hand"><circle cx="168" cy="80" r="14" fill="${u.kleur}"/><path d="M160 92l-14 16" stroke="${u.kleur}" stroke-width="10" stroke-linecap="round"/></g>
</g></svg>`;
  }
  return `<svg class="avatar" viewBox="0 0 200 220" role="img" aria-label="${p.naam}, ${p.leeftijd} jaar, ${p.rol}">
<circle class="avatar-bg" cx="100" cy="110" r="96" fill="#e3f3ed"/>
<g class="lijf">
${u.haarstijl === 'lang' ? haar('lang', u.haar) : ''}
<path d="M30 220c4-44 32-64 70-64s66 20 70 64z" fill="${u.shirt}"/>
<rect x="88" y="134" width="24" height="26" rx="10" fill="${u.huid}"/>
<ellipse cx="100" cy="98" rx="46" ry="52" fill="${u.huid}"/>
<ellipse cx="54" cy="102" rx="7" ry="11" fill="${u.huid}"/><ellipse cx="146" cy="102" rx="7" ry="11" fill="${u.huid}"/>
${u.haarstijl === 'lang' ? '' : haar(u.haarstijl, u.haar)}
${u.baard ? `<path d="M62 112c4 30 20 40 38 40s34-10 38-40c-8 12-20 16-38 16s-30-4-38-16z" fill="${u.haar}" opacity=".9"/>` : ''}
<path d="M72 84q10-6 20 0M108 84q10-6 20 0" stroke="${u.haarstijl === 'kaal' ? '#9ca3af' : u.haar}" stroke-width="4" fill="none" stroke-linecap="round"/>
<g class="ogen"><ellipse cx="82" cy="98" rx="5.5" ry="7" fill="#1d2521"/><ellipse cx="118" cy="98" rx="5.5" ry="7" fill="#1d2521"/><circle cx="84" cy="95" r="2" fill="#fff"/><circle cx="120" cy="95" r="2" fill="#fff"/></g>
${u.bril ? '<g fill="none" stroke="#1d2521" stroke-width="3"><circle cx="82" cy="98" r="14"/><circle cx="118" cy="98" r="14"/><path d="M96 98h8"/></g>' : ''}
<circle cx="70" cy="116" r="7" fill="#f43f5e" opacity=".18"/><circle cx="130" cy="116" r="7" fill="#f43f5e" opacity=".18"/>
<path class="mond-dicht" d="M86 124q14 12 28 0" stroke="#7a2e1d" stroke-width="4" fill="none" stroke-linecap="round"/>
<ellipse class="mond-open" cx="100" cy="127" rx="10" ry="7" fill="#7a2e1d"/>
<g class="hand"><circle cx="172" cy="118" r="13" fill="${u.huid}"/><path d="M160 214l8-84" stroke="${u.shirt}" stroke-width="18" stroke-linecap="round"/></g>
</g></svg>`;
}

// ── Speler ───────────────────────────────────────────────────────────
function maakSpeler(root, persona, regels, { titel = 'Jouw persoonlijke uitleg' } = {}) {
  if (kanSpreken()) speechSynthesis.cancel();
  const duur = Math.round(regels.join(' ').length / 14);
  root.innerHTML = `<div class="speler" data-persona="${persona.id}">
  <div class="speler-scherm">
    <div class="speler-avatar">${avatarSvg(persona)}</div>
    <div class="speler-ballon" aria-live="off"><p class="speler-titel">${titel}</p><p class="speler-tekst">${persona.intro}</p></div>
    <button type="button" class="speler-start" data-start><span aria-hidden="true">▶</span>Bekijk uitleg<small>± ${duur} sec</small></button>
  </div>
  <div class="speler-balk">
    <button type="button" class="speler-knop" data-afspelen aria-label="Afspelen">▶</button>
    <button type="button" class="speler-knop" data-volgende aria-label="Volgende zin">⏭</button>
    <div class="speler-voortgang" aria-hidden="true"><i></i></div>
    <span class="speler-teller">0/${regels.length}</span>
    ${kanSpreken() ? '<button type="button" class="speler-knop" data-geluid aria-pressed="true" aria-label="Geluid aan">🔊</button>' : ''}
  </div>
  <p class="speler-label">${persona.naam}${persona.leeftijd ? ` (${persona.leeftijd})` : ''} is een digitale, fictieve persona. De uitleg wordt op je eigen apparaat gemaakt; er gaan geen gegevens naar buiten.</p>
  <details class="speler-tekstversie"><summary>Lees de uitleg als tekst</summary><ol>${regels.map((r) => `<li>${r}</li>`).join('')}</ol></details>
</div>`;

  const s = root.querySelector('.speler');
  const svg = s.querySelector('.avatar');
  const tekst = s.querySelector('.speler-tekst');
  const afspelen = s.querySelector('[data-afspelen]');
  const teller = s.querySelector('.speler-teller');
  const balk = s.querySelector('.speler-voortgang i');
  const geluidKnop = s.querySelector('[data-geluid]');
  let geluid = !!geluidKnop;
  let i = -1;
  let speelt = false;
  let timer = null;
  let typTimer = null;

  const stopAlles = () => {
    clearTimeout(timer);
    clearInterval(typTimer);
    if (kanSpreken()) speechSynthesis.cancel();
    svg.classList.remove('praat');
  };

  const typ = (zin) => {
    clearInterval(typTimer);
    if (minderBeweging()) {
      tekst.textContent = zin;
      return;
    }
    let n = 0;
    tekst.textContent = '';
    typTimer = setInterval(() => {
      n += 2;
      tekst.textContent = zin.slice(0, n);
      if (n >= zin.length) clearInterval(typTimer);
    }, 28);
  };

  const toon = (k) => {
    stopAlles();
    i = k;
    if (i >= regels.length) {
      speelt = false;
      s.classList.remove('speelt');
      s.classList.add('klaar');
      afspelen.textContent = '↻';
      afspelen.setAttribute('aria-label', 'Opnieuw afspelen');
      return;
    }
    const zin = regels[i];
    teller.textContent = `${i + 1}/${regels.length}`;
    balk.style.width = `${((i + 1) / regels.length) * 100}%`;
    typ(zin);
    svg.classList.add('praat');
    const volgende = () => {
      svg.classList.remove('praat');
      if (speelt) timer = setTimeout(() => toon(i + 1), 450);
    };
    if (geluid && kanSpreken()) {
      const u = new SpeechSynthesisUtterance(voorSpraak(zin));
      u.lang = 'nl-NL';
      u.rate = 1;
      u.pitch = persona.id === 'henk' ? 0.85 : persona.id === 'sanne' || persona.id === 'ilse' ? 1.15 : 1;
      const stem = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('nl'));
      if (stem) u.voice = stem;
      u.onend = volgende;
      u.onerror = () => {
        timer = setTimeout(volgende, Math.max(2200, zin.length * 55));
      };
      speechSynthesis.speak(u);
    } else {
      timer = setTimeout(volgende, Math.max(2200, zin.length * 55));
    }
  };

  const start = () => {
    speelt = true;
    s.classList.add('speelt');
    s.classList.remove('klaar');
    afspelen.textContent = '⏸';
    afspelen.setAttribute('aria-label', 'Pauzeren');
    toon(i < 0 || i >= regels.length ? 0 : i);
    try {
      window.plausible && window.plausible('Uitleg bekeken', { props: { persona: persona.id } });
    } catch {
      /* meten mag nooit de speler breken */
    }
  };
  const pauze = () => {
    speelt = false;
    stopAlles();
    s.classList.remove('speelt');
    afspelen.textContent = '▶';
    afspelen.setAttribute('aria-label', 'Afspelen');
  };

  s.querySelector('[data-start]').addEventListener('click', start);
  afspelen.addEventListener('click', () => (speelt ? pauze() : start()));
  s.querySelector('[data-volgende]').addEventListener('click', () => {
    if (!speelt) {
      speelt = true;
      s.classList.add('speelt');
      afspelen.textContent = '⏸';
    }
    toon(Math.min(regels.length, i + 1));
  });
  geluidKnop?.addEventListener('click', () => {
    geluid = !geluid;
    geluidKnop.textContent = geluid ? '🔊' : '🔇';
    geluidKnop.setAttribute('aria-pressed', String(geluid));
    geluidKnop.setAttribute('aria-label', geluid ? 'Geluid aan' : 'Geluid uit');
    if (speelt) toon(i);
  });
  return s;
}

/** Uitleg bij een berekening */
export function uitlegBijResultaat(root, calc, invoer, uitkomst) {
  const { persona, regels } = maakScript(calc, invoer, uitkomst);
  return maakSpeler(root, persona, regels);
}

/** Korte introductie door Buddy (homepage) */
export function introSpeler(root) {
  const b = PERSONAS.buddy;
  return maakSpeler(
    root,
    { ...b, intro: 'Hoi, ik ben Buddy! Ik help je om geen geld te laten liggen.' },
    [
      'Hoi, ik ben Buddy! Ik help je om geen geld te laten liggen.',
      'Veel mensen hebben recht op zorgtoeslag, huurtoeslag of geld voor hun kinderen, maar vragen het nooit aan.',
      'Beantwoord hieronder vier korte vragen. Je hoeft niet in te loggen en je gegevens blijven op je eigen telefoon.',
      'Daarna leg ik, of een van mijn collega’s, je uitkomst persoonlijk uit. Succes!',
    ],
    { titel: 'Welkom bij ToeslagBuddy' },
  );
}

export { kiesPersona };
