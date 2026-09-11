import { chromium } from '@playwright/test';
import fs from 'node:fs';

const outDir = 'e2e-artifacts/2026-08-31-planning-v2';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:6310/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.getByLabel('Email').fill('admin.uccp@fams.com');
await page.locator('#login-password').fill('Fams@123');
await page.getByRole('button', { name: 'Login' }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/00-post-login.png` });

await page.goto('http://localhost:6310/smart-planning', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/05-smart-planning-uccp-data.png`, fullPage: false });

await page.goto('http://localhost:6310/plan-monitoring', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/06-plan-monitoring-uccp-data.png`, fullPage: false });

console.log('CONSOLE_ERRORS:', JSON.stringify(errors.slice(0, 20)));
await browser.close();
