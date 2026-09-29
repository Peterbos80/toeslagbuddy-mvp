// Voorlezen alleen met stemmen die op het apparaat zelf draaien (localService).
// Netwerkstemmen (zoals de 'Google'-stemmen in Chrome) kunnen de voorgelezen
// tekst, met persoonlijke bedragen, naar een server sturen. Die gebruiken we niet.

/** Kiest een lokale stem voor de taal ('nl-NL' of 'nl'), of null als er geen is. */
export function kiesLokaleStem(voices, lang = 'nl-NL') {
  const taal = String(lang).toLowerCase().replace('_', '-');
  const basis = taal.split('-')[0];
  const lokaal = [...(voices || [])].filter((v) => v && v.localService === true && typeof v.lang === 'string');
  const code = (v) => v.lang.toLowerCase().replace('_', '-');
  return lokaal.find((v) => code(v) === taal) || lokaal.find((v) => code(v).split('-')[0] === basis) || null;
}

const heeftSpraak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** De lokale stem in deze browser, of null (dan geen voorleesknop en geen geluid). */
export function lokaleStem(lang = 'nl-NL') {
  if (!heeftSpraak()) return null;
  try {
    return kiesLokaleStem(window.speechSynthesis.getVoices(), lang);
  } catch {
    return null;
  }
}

/** Roept terug zodra de stemmen (opnieuw) geladen zijn; Chrome laadt ze later. */
export function bijStemmen(terug) {
  if (!heeftSpraak()) return;
  terug();
  try {
    window.speechSynthesis.addEventListener('voiceschanged', terug);
  } catch {
    /* oude browsers: alleen de eerste controle */
  }
}
