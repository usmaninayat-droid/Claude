import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = '/Users/abusufean/_Development/FAMS/FAMS-Design-System-WIP/plan/overnight-2026-08-12/verify';
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));

// 1. Kanban view
await page.goto('http://localhost:6300/ticketing', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/kanban-current.png`, fullPage: true });

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

// checklist toggle interaction
try {
  const checklistItem = page.locator('text=/checklist/i').first();
  if (await checklistItem.count()) {
    // try to find a checkbox in a checklist region
    const checkbox = page.locator('[role="checkbox"]').first();
    if (await checkbox.count()) {
      await checkbox.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/detail-checklist-toggled.png`, fullPage: true });
    }
  }
} catch (e) { consoleErrors.push(`[checklist-toggle] ${e.message}`); }

fs.writeFileSync(`${OUT}/console-errors.txt`, consoleErrors.join('\n') || '(none)');

await browser.close();
console.log('DONE');
console.log(consoleErrors.join('\n') || '(no console errors)');
