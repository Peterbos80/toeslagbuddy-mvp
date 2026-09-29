// Instellingen van de site, door build.js als JSON in de pagina gezet
// (<script type="application/json" id="tb-config">). Geen inline script,
// zodat een strikte Content-Security-Policy mogelijk is.
function lees() {
  try {
    return JSON.parse(document.getElementById('tb-config')?.textContent || '{}');
  } catch {
    return {};
  }
}
export const CONFIG = lees();
