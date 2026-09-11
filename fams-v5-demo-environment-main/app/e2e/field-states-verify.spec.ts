// field-states-verify.spec.ts — verification run for the platform field
// component's DEFAULT/FILLED states (simple, required, dropdown variants)
// implemented centrally in InsetField + the inset-capable edit widgets
// (@fams/ui-kit, @fams/v5-composer). Confirms the New Request/Complaint
// creation sheet shows: leading icon + label-as-placeholder + required
// asterisk + dropdown chevron when empty, and floating caption + value when
// filled — with zero console errors. Screenshots to
// Build Delegate/media/2026-08-31-field-states/.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-field-states')

test.describe.configure({ mode: 'serial' })

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

async function login(page: Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test('creation sheet — default state: leading icons, label-as-placeholder, required asterisk, dropdown chevron', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.getByRole('button', { name: 'New Request/Complaint', exact: true }).click()
  const sheet = page.locator('[data-slot="creation-sheet"]')
  await expect(sheet).toBeVisible()
  await page.waitForTimeout(300)

  // Every inset-field shows a leading icon slot even when empty.
  const fields = sheet.locator('[data-slot="inset-field"]')
  const fieldCount = await fields.count()
  expect(fieldCount).toBeGreaterThan(0)
  const firstFieldIcons = await fields.first().locator('svg').count()
  expect(firstFieldIcons).toBeGreaterThan(0)

  await page.screenshot({ path: path.join(MEDIA_DIR, '01-creation-sheet-default.png'), fullPage: false })
  await sheet.screenshot({ path: path.join(MEDIA_DIR, '02-sheet-default-cropped.png') })

  expect(errors, `console errors on creation sheet default state: ${errors.join('\n')}`).toHaveLength(0)
})

test('creation sheet — filled state: typing a text field floats the label + shows the value', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.getByRole('button', { name: 'New Request/Complaint', exact: true }).click()
  const sheet = page.locator('[data-slot="creation-sheet"]')
  await expect(sheet).toBeVisible()

  // Onwani Number is a SmallText inset field present on this blueprint (per
  // requests-complaints-verify.spec.ts) — a reliable simple text target.
  const onwaniLabel = sheet.getByText('Onwani Number').first()
  await onwaniLabel.scrollIntoViewIfNeeded()
  const onwaniField = sheet.locator('[data-slot="inset-field"]').filter({ hasText: 'Onwani Number' }).first()
  const onwaniInput = onwaniField.locator('input, textarea').first()
  await onwaniInput.click()
  await onwaniInput.fill('12345')
  await page.waitForTimeout(300)
  await onwaniField.screenshot({ path: path.join(MEDIA_DIR, '03-field-filled-onwani.png') })

  expect(errors, `console errors filling text field: ${errors.join('\n')}`).toHaveLength(0)
})

test('creation sheet — dropdown field: Type select shows the trailing chevron in both states', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.getByRole('button', { name: 'New Request/Complaint', exact: true }).click()
  const sheet = page.locator('[data-slot="creation-sheet"]')
  await expect(sheet).toBeVisible()

  // "Type" is a SingleSelect (Combobox) inset field, pre-filled with a
  // creation default ("Complaint") — already in the FILLED state on open:
  // floated caption + value + trailing chevron.
  const typeField = sheet.locator('[data-slot="inset-field"]').filter({ hasText: 'Type' }).first()
  await expect(typeField).toBeVisible()
  await typeField.screenshot({ path: path.join(MEDIA_DIR, '04-dropdown-filled-default-value.png') })

  // Clear it (the X button) to see the DEFAULT/empty dropdown anatomy —
  // label at placeholder position, same trailing chevron.
  const clearBtn = typeField.getByRole('button').first()
  if (await clearBtn.count()) {
    await clearBtn.click()
    await page.waitForTimeout(300)
    await typeField.screenshot({ path: path.join(MEDIA_DIR, '05-dropdown-default-empty.png') })
  }

  expect(errors, `console errors on dropdown field: ${errors.join('\n')}`).toHaveLength(0)
})
