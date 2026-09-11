// Dual-mode screenshot assertion — phase 4 §2.
//
// Local-snapshot mode (default, VRT_URL unset): identical to the existing
// visual.spec.ts — Playwright's own `toHaveScreenshot`, OS-specific baselines
// gitignored under `e2e/**/*-snapshots/` until Linux baselines are generated
// on the CI OS (see .gitignore's note; unchanged by this task).
//
// VRT mode (VRT_URL set): every screenshot uploads to a self-hosted Visual
// Regression Tracker instance (infra/vrt/, `@visual-regression-tracker/
// agent-playwright`, Apache-2.0 — verified against a real local VRT stack
// while wiring this) instead of comparing to a local baseline file. A brand
// new test name has no baseline yet — VRT's own, intended workflow (not a
// bug): a human Accepts it once in the VRT UI, which becomes the baseline
// for every future run. `enableSoftAssert` is on so a missing/first-run
// baseline logs instead of failing the whole suite — the designer's
// Accept/Reject queue is the gate, not a hard CI failure on day one of a new
// route. See infra/vrt/README.md for the full accept/reject flow and the
// deterministic-fonts (Docker) note for CI.
import { expect, type Locator, type Page } from '@playwright/test'
import { PlaywrightVisualRegressionTracker } from '@visual-regression-tracker/agent-playwright'

export const VRT_URL = process.env.VRT_URL

let tracker: PlaywrightVisualRegressionTracker | undefined
let starting: Promise<unknown> | undefined

/**
 * VRT builds are per-process state (the SDK's build id is private, in-memory
 * — there's no documented way to attach multiple Playwright workers to one
 * build). Keep this suite single-worker whenever VRT_URL is set (see
 * playwright.config.ts) so exactly one build is created for the whole run.
 */
async function ensureStarted(): Promise<PlaywrightVisualRegressionTracker> {
  if (!VRT_URL) throw new Error('ensureStarted() called without VRT_URL set')
  if (!tracker) {
    tracker = new PlaywrightVisualRegressionTracker('chromium', {
      apiUrl: VRT_URL,
      apiKey: process.env.VRT_APIKEY ?? '',
      project: process.env.VRT_PROJECT ?? 'fams-showcase',
      branchName: process.env.VRT_BRANCHNAME ?? 'local',
      ciBuildId: process.env.VRT_CIBUILDID,
      enableSoftAssert: true,
    })
  }
  starting ??= tracker.start()
  await starting
  return tracker
}

/** Call once from a top-level `test.afterAll` per spec file when VRT_URL is set. */
export async function stopVrt(): Promise<void> {
  if (tracker) await tracker.stop()
}

/**
 * Screenshot assertion — local baseline compare, or VRT upload, chosen by
 * whether VRT_URL is set. `name` is the stable snapshot/test-run name
 * (no `.png` suffix — added locally, not needed for VRT).
 */
export async function assertScreenshot(target: Page | Locator, name: string): Promise<void> {
  if (VRT_URL) {
    const t = await ensureStarted()
    if ('goto' in target) {
      await t.trackPage(target, name)
    } else {
      await t.trackElementHandle(target, name)
    }
    return
  }
  await expect(target).toHaveScreenshot(`${name}.png`)
}
