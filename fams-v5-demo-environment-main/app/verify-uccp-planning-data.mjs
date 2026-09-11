import { chromium } from '@playwright/test';
import fs from 'node:fs';

const outDir = 'e2e-artifacts/2026-08-31-planning-uccp-data';
fs.mkdirSync(outDir, { recursive: true });

const FORBIDDEN = [
  'Bin Collection', 'Waste Type', 'UCCP', 'Onwani', 'Abu Dhabi', 'Musaffah', 'MBZ',
  'Al Reef Village', 'Capital Mall', 'Prestige Tower', 'Khalifa City', 'Mohamed Bin Zayed',
  'Al Ain, Yas', 'Beeah', 'BEIYING', 'Dawn Valley', 'Silver Lake', 'Al Dhafra', 'AD-CN-',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const vocabResults = [];
async function shot(name, url, wait = 2200) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
  const text = await page.evaluate(() => document.body.innerText);
  const hits = FORBIDDEN.filter((f) => text.includes(f));
  vocabResults.push({ name, hits });
  console.log(`${name}: ${hits.length ? 'FOUND ' + JSON.stringify(hits) : 'clean'}`);
}
async function controlsCloseup(name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${name}.png`, clip: { x: 1600 - 280, y: 1000 - 280, width: 280, height: 280 } });
}

// Directly against the vendored planning-v2 dev server (bypasses shell tab
// state) — same iframe src the shell builds (planning-v2-module.tsx).
await shot('01-sp-hybrid', 'http://localhost:6370/?embed=1&view=hybrid#/smart-planning');
await controlsCloseup('01b-sp-hybrid-controls-closeup');
await shot('02-sp-calendar', 'http://localhost:6370/?embed=1&view=calendar#/smart-planning');
await shot('03-sp-list', 'http://localhost:6370/?embed=1&view=list#/smart-planning');
await shot('04-pm-list', 'http://localhost:6370/?embed=1&view=list#/plan-monitoring');
await shot('05-pm-hybrid', 'http://localhost:6370/?embed=1&view=hybrid#/plan-monitoring');
await controlsCloseup('05b-pm-hybrid-controls-closeup');

// PM overview / detail sheet — open first row from list view
await page.goto('http://localhost:6370/?embed=1&view=list#/plan-monitoring', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const row = page.locator('table tbody tr').first();
if (await row.count()) {
  await row.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/06-pm-overview.png`, fullPage: false });
  const overviewText = await page.evaluate(() => document.body.innerText);
  vocabResults.push({ name: '06-pm-overview', hits: FORBIDDEN.filter((f) => overviewText.includes(f)) });
  console.log('06-pm-overview:', vocabResults.at(-1).hits.length ? 'FOUND' : 'clean');

  const dayCell = page.locator('text=Daily Instances').locator('xpath=following::*[text()="1"]').first();
  if (await dayCell.count()) {
    await dayCell.click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${outDir}/07-pm-detail-sheet.png`, fullPage: false });
    const detailText = await page.evaluate(() => document.body.innerText);
    vocabResults.push({ name: '07-pm-detail-sheet', hits: FORBIDDEN.filter((f) => detailText.includes(f)) });
    console.log('07-pm-detail-sheet:', vocabResults.at(-1).hits.length ? 'FOUND' : 'clean');
  }
}

fs.writeFileSync(`${outDir}/vocab-check.json`, JSON.stringify(vocabResults, null, 2));
fs.writeFileSync(`${outDir}/console-errors.json`, JSON.stringify(errors, null, 2));

console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 20)));
console.log('VOCAB:', JSON.stringify(vocabResults));
await browser.close();
