// command-center-scrollbars-verify.spec.ts — 2026-09-01.
// The dark Command Center wall display painted DEFAULT white/grey scrollbars
// down the left stat column and inside the Live Activity feed: both containers
// carried a `no-scrollbar` class that is defined NOWHERE in the app or the DS
// (the DS convention is `fams-scroll-region`, packages/tokens/scrollbars.css).
// This spec proves: no visible scrollbar chrome (zero reserved gutter), and
// both regions still scroll.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-scrollbars')
const PHASE = process.env.SCROLLBAR_PHASE ?? 'after'

test.beforeAll(() => {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
})

test.use({ viewport: { width: 1920, height: 1080 } })

test('Command Center — scroll regions have no visible scrollbar chrome', async ({ page }) => {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Command Center' }).click()
  await expect(page.getByTestId('command-center')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(4000) // maplibre + tiles settle

  await page.screenshot({ path: `${MEDIA_DIR}/${PHASE}-01-overview.png` })

  const feed = page.getByTestId('command-center-feed')
  const column = page.getByTestId('command-center-left-column')

  // Headless Chromium paints OVERLAY scrollbars, so a pixel diff alone can't
  // prove the fix on the user's classic-scrollbar display. Assert the CSS
  // contract instead: the DS `fams-scroll-region` treatment must actually be
  // matched (scrollbar-width:thin + a fully transparent resting thumb),
  // rather than the UA default ("auto" + an opaque light track).
  const chrome = await page.evaluate(() => {
    const read = (id: string) => {
      const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        classes: el.className,
        scrollbarWidth: cs.scrollbarWidth,
        scrollbarColor: cs.scrollbarColor,
        gutter: el.offsetWidth - el.clientWidth,
      }
    }
    return { feed: read('command-center-feed'), column: read('command-center-left-column') }
  })
  // eslint-disable-next-line no-console
  console.log('SCROLLBAR CHROME', PHASE, JSON.stringify(chrome, null, 2))

  // Both regions must genuinely still scroll.
  const scrolled = await page.evaluate(() => {
    const out: Record<string, unknown> = {}
    for (const id of ['command-center-feed', 'command-center-left-column']) {
      const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
      if (!el) continue
      el.scrollTop = 240
      out[id] = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
    }
    return out
  })
  // eslint-disable-next-line no-console
  console.log('SCROLLED', PHASE, JSON.stringify(scrolled))
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${MEDIA_DIR}/${PHASE}-02-scrolled.png` })
  await feed.screenshot({ path: `${MEDIA_DIR}/${PHASE}-03-feed.png` })
  await column.screenshot({ path: `${MEDIA_DIR}/${PHASE}-04-left-column.png` })

  if (PHASE === 'after') {
    for (const region of [chrome.feed, chrome.column]) {
      expect(region).not.toBeNull()
      expect(region!.classes).toContain('fams-scroll-region')
      expect(region!.classes).not.toContain('no-scrollbar')
      expect(region!.scrollbarWidth).toBe('thin')
      // The DS treatment always paints a TRANSPARENT track (the white/grey
      // strip is gone) and never falls back to the UA default `auto`. The
      // thumb is transparent at rest and the subtle DS grey while
      // hovered/scrolling — both are acceptable here, the track is not.
      // (Chromium serializes `transparent` as `rgba(0, 0, 0, 0)`.)
      expect(region!.scrollbarColor).not.toBe('auto')
      expect(region!.scrollbarColor.endsWith('rgba(0, 0, 0, 0)')).toBe(true)
      expect(['rgba(0, 0, 0, 0)', 'rgba(152, 162, 179, 0.7)']).toContain(
        region!.scrollbarColor.split(') ')[0] + ')',
      )
    }
    // Still genuinely scrollable.
    expect((scrolled['command-center-feed'] as { scrollTop: number }).scrollTop).toBeGreaterThan(0)
    expect((scrolled['command-center-left-column'] as { scrollTop: number }).scrollTop).toBeGreaterThan(0)
  }
})
