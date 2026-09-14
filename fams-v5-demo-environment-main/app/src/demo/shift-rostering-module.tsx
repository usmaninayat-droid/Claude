import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'

/**
 * IWMP Shift Rostering (IWMP-SCOPE-ROSTER-V01) — the iwmp tenant's override for
 * the `shift-rostering` module. The screen is the Tadweer Manpower Rostering
 * planning-view prototype (Figma bHPl5hXlBDrwgTY8ycV3IX), a self-contained
 * static page that already speaks the design system's tokens
 * (v5/tokens/theme.css + tadweer.theme.css). It is served as a static asset
 * from this override screen's Vite `public/` and embedded here via <iframe>,
 * the same isolation route the uccp screens use.
 *
 * The prototype ships its own left rails; in embed mode (`?embed=1`) it hides
 * them so the host `V5AppShell` chrome is the only chrome, and its own
 * "Planning View" top bar acts as the module header. This is the base the team
 * will adapt the new rostering requirements onto.
 */

export interface ShiftRosteringDeps {
  /** The signed-in persona's display name (reserved for when the screen becomes interactive). */
  actor?: string
}

const SCREEN_PATH = '/screens/shift-rostering/shift-rostering.html'

// Same-origin in BOTH dev and prod: the host app serves this static screen at
// `/screens/shift-rostering/...` — in dev via the `serve-roster-screen` Vite
// middleware (see app/vite.config.ts), in prod from the built assets. This
// removes the old dependency on a SECOND dev server (:6395), which was the
// cause of the roster "failing to load" whenever that server wasn't running.
function iframeSrc(): string {
  const q = new URLSearchParams({ embed: '1', tenant: 'iwmp' })
  const theme = document.documentElement.getAttribute('data-theme')
  if (theme) q.set('theme', theme)
  return `${SCREEN_PATH}?${q}`
}

function ShiftRosteringPage(_deps: ShiftRosteringDeps) {
  return (
    <div className="h-full">
      <iframe
        title="Shift Rostering"
        src={iframeSrc()}
        style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}

export function makeShiftRosteringRoute(path: string, deps: ShiftRosteringDeps): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: () => <ShiftRosteringPage {...deps} /> }))
}
