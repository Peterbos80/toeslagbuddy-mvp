// Terugval voor productpagina's die hun prijs pas met JavaScript tonen:
// Playwright (staat al als devDependency in CI). Alleen als DEALS_HEADLESS=aan,
// alleen na toestemming van robots.txt (via de ophaler) en heel traag.
let browser = null;

export async function gerenderdeHtml(url, { ophaler, timeout = 20000 } = {}) {
  const r = await ophaler.robots(new URL(url).origin);
  const { magOphalen } = await import('../robots.js');
  if (!magOphalen(r, url)) return null;
  if (!browser) {
    const { chromium } = await import('playwright');
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  }
  const { USER_AGENT } = await import('../robots.js');
  const ctx = await browser.newContext({ userAgent: USER_AGENT });
  try {
    const p = await ctx.newPage();
    // Geen afbeeldingen, lettertypen of video: sneller en minder belasting
    await p.route('**/*', (route) => (['image', 'font', 'media'].includes(route.request().resourceType()) ? route.abort() : route.continue()));
    const antwoord = await p.goto(url, { waitUntil: 'networkidle', timeout });
    if (!antwoord || [401, 403, 429].includes(antwoord.status())) return null;
    return await p.content();
  } catch {
    return null;
  } finally {
    await ctx.close();
  }
}

export async function sluitBrowser() {
  if (browser) await browser.close();
  browser = null;
}
