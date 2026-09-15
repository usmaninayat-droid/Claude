// Visual + interaction gate: 1920×1080 captures of the Contract Management
// screen inside the running demo app, walking the wizard end to end and
// collecting every console/page error on the way.
//   cd <workspace-root> && node plan/run-2026-09-16-contract-management/shoot.mjs
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const require = createRequire(path.join(root, 'fams-v5-demo-environment-main', 'app', 'package.json'))
const { chromium } = require('@playwright/test')

const base = process.env.APP || 'http://localhost:6300'
const out = path.join(here, 'qa'); mkdirSync(out, { recursive: true })
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message.slice(0, 200)))

await page.goto(`${base}/contract-management?tenant=iwmp&persona=u_admin`, { waitUntil: 'load', timeout: 90000 })
const fr = page.frameLocator('iframe[title="Contract Management"]')
try {
  await fr.locator('.card').first().waitFor({ timeout: 60000 })
} catch (e) {
  await shot(page, 'debug-timeout')
  console.log(JSON.stringify({ failedAt: 'list cards', url: page.url(), frames: page.frames().map(f => f.url()), errors }, null, 1))
  await browser.close(); process.exit(1)
}
await page.waitForTimeout(800)
await shot(page, 'list')

// interaction: search narrows the grid, filter button exists, card opens detail, back returns
await fr.locator('#cmSearch').fill('Yas')
const afterSearch = await fr.locator('.card').count()
await fr.locator('#cmSearch').fill('')
await fr.locator('.card').first().click(); await fr.locator('#dtWrap .dt-card').first().waitFor()
await shot(page, 'detail')
await fr.locator('#dtBack').click(); await fr.locator('.card').first().waitFor()

// wizard walk
await fr.locator('#cmCreate').click()
await fr.locator('.wz-panel').waitFor(); await page.waitForTimeout(500)
await shot(page, 'basic')
const stepLabels = await fr.locator('.st-l').allTextContents()
await fr.locator('#wzNext').click(); await fr.locator('#mapFrame').waitFor(); await page.waitForTimeout(1500)
await shot(page, 'zone')
const names = ['vehicles', 'equipment', 'workforce', 'bins', 'service', 'kpi', 'attachments', 'summary']
for (const n of names) {
  await fr.locator('#wzNext').click(); await page.waitForTimeout(400)
  await shot(page, `step-${n}`)
}
// picker on vehicles: go back to step 3, open Add New, pick two, add
await fr.locator('.step[data-i="2"]').click(); await page.waitForTimeout(300)
await fr.locator('[data-pkopen="vehicles"]').click(); await fr.locator('#wzPicker').waitFor()
await fr.locator('[data-oid="compactor"]').click(); await fr.locator('[data-oid="hook1"]').click()
await shot(page, 'picker-vehicles')
await fr.locator('#pkAdd').click(); await page.waitForTimeout(300)
const cfgCards = await fr.locator('.wz-cfg').count()
await shot(page, 'config-vehicles')
// remaining pickers: equipment (search + 20px icons), workforce (search + person icon), bins (title only)
const pickers = { equipment: 'rideon', workforce: 'supervisor', bins: 'b3' }
for (const [key, first] of Object.entries(pickers)) {
  await fr.locator('#wzNext').click(); await page.waitForTimeout(500)
  await fr.locator(`[data-pkopen="${key}"]`).click(); await fr.locator('#wzPicker').waitFor()
  await fr.locator(`[data-oid="${first}"]`).click(); await page.waitForTimeout(200)
  await shot(page, `picker-${key}`)
  await fr.locator('#pkAdd').click(); await page.waitForTimeout(300)
  await shot(page, `config-${key}`)
}
await fr.locator('#wzClose').click()

console.log(JSON.stringify({ afterSearch, stepLabels, cfgCards, errors }, null, 1))
await browser.close()
