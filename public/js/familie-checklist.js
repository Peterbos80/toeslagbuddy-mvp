// Checklist na een overlijden: afvinken, voortgang en printen. De vinkjes
// blijven op dit apparaat (localStorage); er gaat niets naar een server.
const SLEUTEL = 'tb-familie-checklist-v1';
const blok = document.querySelector('[data-checklist]');
if (blok) {
  let gedaan = {};
  try {
    gedaan = JSON.parse(localStorage.getItem(SLEUTEL) || '{}') || {};
  } catch {
    gedaan = {};
  }
  const vinkjes = [...blok.querySelectorAll('input[data-stap]')];
  const toon = () => {
    const klaar = vinkjes.filter((v) => v.checked).length;
    blok.querySelector('[data-check-tekst]').textContent = `${klaar} van ${vinkjes.length} gedaan`;
    blok.querySelector('[data-check-balk]').style.width = `${(klaar / vinkjes.length) * 100}%`;
  };
  for (const v of vinkjes) {
    v.checked = !!gedaan[v.dataset.stap];
    v.addEventListener('change', () => {
      gedaan[v.dataset.stap] = v.checked;
      try {
        localStorage.setItem(SLEUTEL, JSON.stringify(gedaan));
      } catch {
        /* privémodus: dan onthouden we het niet */
      }
      toon();
    });
  }
  blok.querySelector('[data-check-print]')?.addEventListener('click', () => window.print());
  toon();
}
