// Koppelt Nederlandse en Engelse pagina's. Een Engelse pagina noemt haar
// Nederlandse tegenhanger in `nl`. Is het een echte vertaling (niet
// `vertaling: false`), dan krijgen beide pagina's hreflang-links.
// De taalschakelaar (`wissel`) wijst naar de tegenhanger; heeft een
// Nederlandse pagina er geen, dan naar de Engelse samenvattingen op /en/.

export const EN_ZONDER_TEGENHANGER = '/en/#in-dutch';

export function koppel(alle) {
  const perNl = new Map();
  for (const p of alle) {
    p.taal = p.taal || 'nl';
    if (p.taal !== 'nl' && p.nl) perNl.set(p.nl, p);
  }
  for (const p of alle) {
    if (p.taal === 'nl') {
      const en = perNl.get(p.slug);
      p.wissel = en ? en.slug : p.slug.startsWith('/pro/') ? '/en/pro/' : EN_ZONDER_TEGENHANGER;
      if (en && en.vertaling !== false) p.hreflang = { nl: p.slug, en: en.slug };
    } else {
      p.wissel = p.nl || '/';
      if (p.nl && p.vertaling !== false) p.hreflang = { nl: p.nl, en: p.slug };
    }
  }
  return alle;
}
