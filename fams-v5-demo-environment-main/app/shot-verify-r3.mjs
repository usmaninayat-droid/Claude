import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = '/Users/abusufean/_Development/FAMS/FAMS-Design-System-WIP/plan/overnight-2026-08-12/verify/round3';
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text()}`); });
page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (r) => consoleErrors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push(`[http${r.status()}] ${r.url()}`); });

// (a) Kanban view
await page.goto('http://localhost:6300/ticketing', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/kanban-current.png`, fullPage: true });

// (b) TKT-04 detail page
try {
  const card = page.locator('[data-slot="kanban-card"]', { hasText: 'TKT-04' }).first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/detail-current.png`, fullPage: true });
  } else {
    consoleErrors.push('[detail] TKT-04 card not found');
  }
} catch (e) { consoleErrors.push(`[detail-open] ${e.message}`); }

fs.writeFileSync(`${OUT}/console-errors.txt`, consoleErrors.join('\n') || '(none)');
await browser.close();
console.log('DONE');
console.log(consoleErrors.join('\n') || '(no console errors)');
