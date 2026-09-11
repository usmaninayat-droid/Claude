// timeline-tab-verify.spec.ts — ad-hoc verification for the 2026-09-01
// incident-detail Timeline tab redesign (sticky bottom composer, connected
// system-event rail, centered date pills, uppercase actors, tonal severity
// token). Screenshots to Build Delegate/media/2026-09-01-timeline/.
// Run with SHOT=before|after.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-timeline')
const TAG = process.env.SHOT ?? 'after'

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
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test('timeline tab — sticky composer, connected rail, date pills', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await page.locator('table tbody tr').first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(500)
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await page.waitForTimeout(400)

  const panel = page.locator('[data-slot="task-detail-panel"]')
  await expect(panel).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-01-timeline-page.png`) })
  await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-02-timeline-panel.png`) })

  if (TAG !== 'after') {
    expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
    return
  }

  const composer = panel.locator('[data-slot="activity-feed-composer"]')
  const scroll = panel.locator('[data-slot="activity-feed-scroll"]')
  await expect(composer).toBeVisible()
  await expect(scroll).toBeVisible()

  // 1. Composer anatomy: textarea + inline paperclip + solid primary send tile.
  await expect(panel.getByPlaceholder('Write a comment here…')).toBeVisible()
  await expect(composer.getByRole('button', { name: 'Attach a file' })).toBeVisible()
  const send = composer.getByRole('button', { name: 'Send' })
  await expect(send).toBeVisible()
  await expect(send).toBeEnabled()

  // 2. System events: circled icons on a connected rail, uppercase actors,
  //    right-aligned timestamps, bold value + tonal severity token.
  expect(await panel.locator('[data-slot="activity-feed-icon"]').count()).toBeGreaterThan(1)
  expect(await panel.locator('[data-slot="activity-feed-rail"]').count()).toBeGreaterThan(0)
  await expect(panel.locator('[data-slot="activity-log-severity"]').first()).toBeVisible()
  await expect(panel.locator('[data-slot="activity-log-value"]').first()).toBeVisible()
  // Creation event carries the intake source.
  await expect(panel.getByText(/logged this request via/i).first()).toBeVisible()

  // 3. Date separator pills group the feed by day.
  expect(await panel.locator('[data-slot="activity-feed-date-pill"]').count()).toBeGreaterThan(0)

  // 4. Comments: avatar + uppercase name + mention token + accent border.
  expect(await panel.locator('[data-slot="activity-mention"]').count()).toBeGreaterThan(0)

  // 5. Posting appends at the bottom (oldest-first order) and keeps the
  //    composer exactly where it was. Enough posts to overflow the pane.
  const before = await composer.boundingBox()
  const textarea = panel.getByPlaceholder('Write a comment here…')
  for (let i = 1; i <= 8; i += 1) {
    await textarea.fill(`@KhalidAl-Mansoori crew update ${i} — pumps repositioned at the Corniche outfall.`)
    await send.click()
    await page.waitForTimeout(120)
  }
  await expect(panel.getByText(/crew update 8/)).toBeVisible()
  const afterPost = await composer.boundingBox()
  expect(Math.round(afterPost!.y)).toBe(Math.round(before!.y))
  await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-05-after-post.png`) })

  // 6. The composer stays pinned while the (now overflowing) timeline scrolls.
  const scrollable = await scroll.evaluate((el) => el.scrollHeight > el.clientHeight + 4)
  expect(scrollable, 'timeline entry list must be its own scroll region').toBe(true)
  await scroll.evaluate((el) => {
    el.scrollTop = 0
  })
  await page.waitForTimeout(200)
  const topOffset = await scroll.evaluate((el) => el.scrollTop)
  await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-03-scrolled-top.png`) })
  const afterTop = await composer.boundingBox()
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await page.waitForTimeout(200)
  const bottomOffset = await scroll.evaluate((el) => el.scrollTop)
  await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-04-scrolled-bottom.png`) })
  const afterBottom = await composer.boundingBox()
  // The list really moved…
  expect(bottomOffset).toBeGreaterThan(topOffset + 40)
  // …while the composer box is identical at both scroll extremes.
  expect(Math.round(afterTop!.y)).toBe(Math.round(before!.y))
  expect(Math.round(afterBottom!.y)).toBe(Math.round(before!.y))
  // …and it sits at the bottom of the panel body, below the scroll region.
  const panelBox = (await panel.boundingBox())!
  expect(panelBox.y + panelBox.height - (afterBottom!.y + afterBottom!.height)).toBeLessThan(40)

  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
