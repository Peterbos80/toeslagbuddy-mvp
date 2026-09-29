// Scripts voor elke pagina: mobiel menu, voorlezen en meten van partnerklikken.

// Mobiel menu
const knop = document.querySelector('.menu-knop');
const menu = document.getElementById('hoofdmenu');
if (knop && menu) {
  knop.addEventListener('click', () => {
    const open = knop.getAttribute('aria-expanded') === 'true';
    knop.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('open', !open);
  });
}

// Voorlezen (Web Speech API) – helpt mensen die moeite hebben met lezen
const lees = document.querySelector('.voorlees');
if (lees && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
  lees.hidden = false;
  lees.addEventListener('click', () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      lees.setAttribute('aria-pressed', 'false');
      lees.textContent = '🔊 Lees voor';
      return;
    }
    const delen = [...document.querySelectorAll('main h1, main .intro, main .uitkomst, main .inhoud > h2, main .inhoud > p, main .inhoud > ul li')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.innerText.trim())
      .filter(Boolean);
    const u = new SpeechSynthesisUtterance(delen.join('. '));
    u.lang = 'nl-NL';
    u.rate = 0.95;
    const stem = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('nl'));
    if (stem) u.voice = stem;
    u.onend = () => {
      lees.setAttribute('aria-pressed', 'false');
      lees.textContent = '🔊 Lees voor';
    };
    speechSynthesis.speak(u);
    lees.setAttribute('aria-pressed', 'true');
    lees.textContent = '⏹ Stop met voorlezen';
  });
}

// Partnerklikken meten (Plausible / GoatCounter), zonder cookies
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[rel~="sponsored"]');
  if (!a) return;
  const naam = (a.closest('.partner')?.querySelector('h4')?.textContent || a.hostname).trim();
  try {
    if (window.plausible) window.plausible('Partnerklik', { props: { partner: naam, pagina: location.pathname } });
    if (window.goatcounter?.count) window.goatcounter.count({ path: `partner-${naam}`, title: 'Partnerklik', event: true });
  } catch {
    /* meten mag de link nooit blokkeren */
  }
});

// Onthullen bij scrollen: secties schuiven zacht in beeld
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(
    (items) => items.forEach((it) => it.isIntersecting && (it.target.classList.add('zichtbaar'), io.unobserve(it.target))),
    { rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('.inhoud > h2, .kaarten, .inhoud > .tabel-scroll, .faq details, .nieuws-lijst li, .hulp, .prijs').forEach((el) => {
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add('onthul');
      io.observe(el);
    }
  });
}

// Welkomstvideo van Buddy op de homepage
const intro = document.querySelector('[data-intro]');
if (intro) import('./persona.js').then((m) => m.introSpeler(intro));
