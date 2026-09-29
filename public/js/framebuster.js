// Tegen clickjacking op Pro- en beheerpagina's. GitHub Pages kan geen
// X-Frame-Options- of frame-ancestors-header sturen, en een CSP in een
// <meta> ondersteunt frame-ancestors niet. Daarom: staat deze pagina in een
// frame van een andere site, dan verbergen we alles en breken we eruit.
// Gewoon script (geen module), zodat het direct in <head> draait.
(function () {
  var inFrame;
  try {
    inFrame = window.top !== window.self;
  } catch (e) {
    inFrame = true;
  }
  if (!inFrame) return;
  document.documentElement.style.display = 'none';
  try {
    window.top.location.replace(window.self.location.href);
  } catch (e) {
    /* geblokkeerd (sandbox of browser): de pagina blijft verborgen */
  }
})();
