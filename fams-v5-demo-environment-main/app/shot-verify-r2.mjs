import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = '/Users/abusufean/_Development/FAMS/FAMS-Design-System-WIP/plan/overnight-2026-08-12/verify/round2';
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (r) => consoleErrors.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push(`[http${r.status()}] ${r.url()}`); });

// 1. Kanban view
await page.goto('http://localhost:6300/ticketing', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/kanban-current.png`, fullPage: true });

// rail zoom region check happens offline via crop later

// interact: filter dropdown
try {
  const filterBtn = page.getByRole('button', { name: /filter/i }).first();
  if (await filterBtn.count()) {
    await filterBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/kanban-filter-open.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
} catch (e) { consoleErrors.push(`[interact-filter] ${e.message}`); }

// interact: sort dropdown
try {
  const sortBtn = page.getByRole('button', { name: /sort/i }).first();
  if (await sortBtn.count()) {
    await sortBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/kanban-sort-open.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
} catch (e) { consoleErrors.push(`[interact-sort] ${e.message}`); }

// interact: assignee dropdown
try {
  const assigneeBtn = page.getByRole('button', { name: /assignee/i }).first();
  if (await assigneeBtn.count()) {
    await assigneeBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/kanban-assignee-open.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
} catch (e) { consoleErrors.push(`[interact-assignee] ${e.message}`); }

// 2. List view
try {
  const listTab = page.getByRole('tab', { name: /list/i });
  if (await listTab.count()) {
    await listTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/list-current.png`, fullPage: true });
  }
} catch (e) { consoleErrors.push(`[list-view] ${e.message}`); }

// back to kanban to open detail
try {
  const kanbanTab = page.getByRole('tab', { name: /kanban/i });
  if (await kanbanTab.count()) {
    await kanbanTab.click();
    await page.waitForTimeout(800);
  }
} catch (e) { consoleErrors.push(`[back-to-kanban] ${e.message}`); }

// 3. Open TKT-04 detail
try {
  const card = page.locator('[data-slot="kanban-card"]', { hasText: 'TKT-04' }).first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/detail-current.png`, fullPage: true });
  } else {
    consoleErrors.push('[detail] TKT-04 card not found on kanban board');
  }
} catch (e) { consoleErrors.push(`[detail-open] ${e.message}`); }

// tabs: Activity / Timeline / Messaging
for (const tabName of ['Activity', 'Timeline', 'Messaging']) {
  try {
    const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/detail-tab-${tabName.toLowerCase()}.png`, fullPage: true });
    } else {
      consoleErrors.push(`[tab-missing] ${tabName} tab not found`);
    }
  } catch (e) { consoleErrors.push(`[tab-${tabName}] ${e.message}`); }
}

// right-panel collapse toggle
try {
  const collapseBtn = page.locator('button:has(svg.lucide-chevrons-right), button[aria-label*="collapse" i]').first();
  if (await collapseBtn.count()) {
    await collapseBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/detail-panel-collapsed.png`, fullPage: true });
    // toggle back
    const expandBtn = page.locator('button:has(svg.lucide-chevrons-left), button[aria-label*="expand" i]').first();
    if (await expandBtn.count()) {
      await expandBtn.click();
      await page.waitForTimeout(400);
    }
  } else {
    consoleErrors.push('[collapse-missing] no chevrons-right collapse button found via lucide class selector; trying icon-based fallback');
  }
} catch (e) { consoleErrors.push(`[collapse-toggle] ${e.message}`); }

// go to Activity tab (has checklist) and test checklist toggle interaction
try {
  const activityTab = page.getByRole('tab', { name: /activity/i });
  if (await activityTab.count()) {
    await activityTab.click();
    await page.waitForTimeout(600);
  }
  const checkbox = page.locator('[role="checkbox"]').first();
  if (await checkbox.count()) {
    const beforeChecked = await checkbox.getAttribute('aria-checked');
    const beforeDisabled = await checkbox.getAttribute('disabled');
    await page.screenshot({ path: `${OUT}/detail-checklist-before.png`, fullPage: true });
    await checkbox.click({ timeout: 5000 });
    await page.waitForTimeout(400);
    const afterChecked = await checkbox.getAttribute('aria-checked');
    await page.screenshot({ path: `${OUT}/detail-checklist-after.png`, fullPage: true });
    consoleErrors.push(`[checklist-state] before(disabled=${beforeDisabled}, checked=${beforeChecked}) after(checked=${afterChecked})`);
  } else {
    consoleErrors.push('[checklist-missing] no [role="checkbox"] found');
  }
} catch (e) { consoleErrors.push(`[checklist-toggle] ${e.message}`); }

fs.writeFileSync(`${OUT}/console-errors.txt`, consoleErrors.join('\n') || '(none)');

await browser.close();
console.log('DONE');
console.log(consoleErrors.join('\n') || '(no console errors)');
