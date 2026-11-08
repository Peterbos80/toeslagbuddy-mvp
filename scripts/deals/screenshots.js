// Schermafbeeldingen van DealBuddy voor docs/screenshots (na `node build.js`):
//   node scripts/deals/screenshots.js
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { start } from '../../test/e2e/helpers.js';
import { ROOT } from './opslag.js';

const UIT = join(ROOT, 'docs/screenshots');
mkdirSync(UIT, { recursive: true });
const s = await start();
const fouten = [];
const paginas = [
  ['deals', '/deals/'],
  ['deals-product', '/deals/p/eau-de-parfum-bloesem-50-ml/'],
  ['deals-vluchten', '/deals/vluchten/'],
];
for (const breedte of [390, 1280]) {
  for (const schema of ['light', 'dark']) {
    const ctx = await s.browser.newContext({ viewport: { width: breedte, height: 900 }, colorScheme: schema, reducedMotion: 'reduce' });
    for (const [naam, pad] of paginas) {
      if (schema === 'dark' && breedte === 390) continue;
      const p = await ctx.newPage();
      p.on('pageerror', (e) => fouten.push(`${pad}: ${e.message}`));
      p.on('console', (m) => m.type() === 'error' && fouten.push(`${pad}: ${m.text()}`));
      await p.goto(s.basis + pad);
      await p.waitForTimeout(400);
      const achtervoegsel = schema === 'dark' ? '-donker' : '';
      await p.screenshot({ path: join(UIT, `${naam}-${breedte}${achtervoegsel}.png`), fullPage: breedte === 1280 && schema === 'light' });
      if (naam === 'deals-product') {
        // Grafiek met tooltip
        const g = p.locator('[data-pg-teken] svg');
        await p.locator('[data-pg]').scrollIntoViewIfNeeded();
        const box = await g.boundingBox();
        await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await p.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5, { steps: 5 });
        await p.waitForTimeout(150);
        await p.locator('[data-pg]').screenshot({ path: join(UIT, `deals-grafiek${breedte === 390 ? '-390' : ''}${achtervoegsel}.png`) });
      }
      await p.close();
    }
    await ctx.close();
  }
}
await s.stop();
console.log(fouten.length ? fouten.join('\n') : '✓ geen fouten in de console');
