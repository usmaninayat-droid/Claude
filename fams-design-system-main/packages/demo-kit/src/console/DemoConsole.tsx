import { useCallback, useEffect, useId, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useHoverReveal } from './useHoverReveal'

/**
 * DemoConsole — the demo environment's control surface (founder's UX, decision
 * #18). CORE-tier: product-agnostic, zero v5 vocabulary. Every control is wired
 * by the APP through props/callbacks; this component owns only the UX (hover
 * reveal, overlay, keyboard/esc, clipboard feedback), never any data.
 *
 * UX contract:
 *  - a thin hot zone (~8px, a spacing token) hugs the top edge; a pointer near
 *    it progressively reveals a slim handle (opacity transition on motion
 *    tokens);
 *  - clicking the handle OR focusing the always-present visually-hidden trigger
 *    (keyboard path) opens a full-screen, token-styled, backdrop-blurred grid
 *    console; Esc (or the scrim / close button) closes it;
 *  - controls: tenant switcher, persona switcher (shows roles), module jump,
 *    seed reset (two-step confirm), copy-share-link (component copies + toasts).
 *
 * The overlay is a `@base-ui/react` `Dialog` (Root/Portal/Popup, decision #7):
 * `Dialog.Popup`'s default focus behavior gives a real Tab/Shift-Tab trap and
 * restores focus on close, so `aria-modal="true"` is now truthful. `open`
 * stays our own React state; `Dialog.Root` is controlled, Escape/outside-press
 * route back through `onOpenChange` → `closeConsole`.
 *
 * 100% tokens (passes lint-tokens — colors/radii via Tailwind theme classes;
 * motion + stacking via `var(--token)` inline styles). RTL-safe: logical
 * properties only. React is a real peer for this subpath (`@fams/demo-kit/
 * console`); the core store barrel stays React-free.
 */

/** A generic switchable option. No product vocabulary. */
export interface DemoConsoleOption {
  id: string
  label: string
}

/** A persona option — a login identity with its display roles. */
export interface DemoConsolePersona extends DemoConsoleOption {
  /** Role names shown under the persona (informational). */
  roles?: string[]
}

export interface DemoConsoleProps {
  /** Tenant switcher: options + the current selection + change callback. */
  tenants: DemoConsoleOption[]
  currentTenantId: string
  onSelectTenant: (id: string) => void
  /** Persona switcher: options (with roles) + current + change callback. */
  personas: DemoConsolePersona[]
  currentPersonaId: string | null
  onSelectPersona: (id: string) => void
  /** Module jump list + navigate callback. */
  modules: DemoConsoleOption[]
  onNavigateModule: (id: string) => void
  /** Seed reset: the console shows a confirm step, then calls this. */
  onResetSeeds: () => void
  /**
   * Copy-share-link: returns the URL to copy. The console writes it to the
   * clipboard and shows transient feedback — the app only supplies the URL.
   */
  getShareLink: () => string
  /** Console title (default "Demo console"). */
  title?: string
  /** Start open — for the showcase / tests. */
  defaultOpen?: boolean
}

const MOTION = {
  transitionProperty: 'opacity',
  transitionDuration: 'var(--duration-fast)',
  transitionTimingFunction: 'var(--ease-standard)',
} as const

export function DemoConsole({
  tenants,
  currentTenantId,
  onSelectTenant,
  personas,
  currentPersonaId,
  onSelectPersona,
  modules,
  onNavigateModule,
  onResetSeeds,
  getShareLink,
  title = 'Demo console',
  defaultOpen = false,
}: DemoConsoleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [confirmReset, setConfirmReset] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const reveal = useHoverReveal()
  const labelId = useId()

  const openConsole = useCallback(() => {
    setOpen(true)
    reveal.hide()
  }, [reveal])

  const closeConsole = useCallback(() => {
    setOpen(false)
    setConfirmReset(false)
  }, [])

  // `Dialog.Root` is controlled: React state stays the source of truth, but
  // Base UI drives the close reasons (Escape key, outside press) it owns —
  // opening still goes through `openConsole` from our own trigger/handle.
  const onDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) closeConsole()
    },
    [closeConsole],
  )

  // Transient feedback auto-clears.
  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 2200)
    return () => clearTimeout(t)
  }, [feedback])

  const copyShareLink = useCallback(async () => {
    const url = getShareLink()
    try {
      await navigator.clipboard?.writeText(url)
      setFeedback('Share link copied to clipboard')
    } catch {
      setFeedback(`Copy this link: ${url}`)
    }
  }, [getShareLink])

  const resetSeeds = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    onResetSeeds()
    setConfirmReset(false)
    setFeedback('Seed data reset')
  }, [confirmReset, onResetSeeds])

  return (
    <>
      {/* Keyboard path: an always-present, visually-hidden focusable trigger. */}
      <button
        type="button"
        onClick={openConsole}
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:z-50 focus:m-2 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        style={{ zIndex: 'var(--z-tooltip)' }}
      >
        Open {title}
      </button>

      {/* Hot zone + handle. Pointer near the top edge reveals the handle. */}
      {!open && (
        <div
          data-demo-console-rail=""
          // `pointer-events-none`: the rail observes the pointer, it must never
          // swallow a click meant for the page underneath (see `useHoverReveal`).
          className="pointer-events-none fixed inset-inline-0 top-0 flex justify-center"
          style={{ zIndex: 'var(--z-tooltip)' }}
          onPointerEnter={reveal.onPointerEnter}
          onPointerLeave={reveal.onPointerLeave}
        >
          {/* ~8px hot zone (h-2 spacing token), full width. Marker only — the
              reveal is driven by a window `pointermove`, so this element stays
              hit-test-transparent like the rest of the rail. */}
          <div data-demo-console-hotzone="" className="absolute inset-inline-0 top-0 h-2" aria-hidden="true" />
          <button
            type="button"
            aria-hidden={!reveal.revealed}
            tabIndex={-1}
            onClick={openConsole}
            data-demo-console-handle=""
            data-revealed={reveal.revealed ? 'true' : 'false'}
            // Clickable ONLY while actually visible: an `opacity: 0`,
            // `aria-hidden` button that still eats pointer events is a bug, not
            // an affordance.
            className={`${reveal.revealed ? 'pointer-events-auto' : 'pointer-events-none'} mt-0 select-none rounded-b-sm border border-t-0 border-border bg-card px-4 py-1 text-caption font-medium text-muted-foreground shadow-sm`}
            style={{ ...MOTION, opacity: reveal.revealed ? 1 : 0 }}
          >
            {title}
          </button>
        </div>
      )}

      {/* Full-screen grid overlay console — a Base UI Dialog so the trap +
          restore-on-close come from the primitive, not a hand-rolled one. */}
      <Dialog.Root open={open} onOpenChange={onDialogOpenChange}>
        <Dialog.Portal>
          <div
            data-demo-console-scrim=""
            className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-background/80 p-section backdrop-blur-sm"
            style={{ zIndex: 'var(--z-modal)' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeConsole()
            }}
          >
            <Dialog.Popup
              aria-modal="true"
              aria-labelledby={labelId}
              data-demo-console-panel=""
              className="mt-8 w-full max-w-3xl rounded-md border border-border bg-card p-section text-card-foreground shadow-lg outline-none"
            >
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 id={labelId} className="text-h4 font-semibold">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={closeConsole}
                  aria-label="Close demo console"
                  className="rounded-sm border border-border bg-background px-3 py-1 text-caption text-muted-foreground"
                >
                  Esc
                </button>
              </header>

              {feedback && (
                <p
                  role="status"
                  data-demo-console-feedback=""
                  className="mb-4 rounded-sm border border-border bg-background px-3 py-2 text-caption text-foreground"
                >
                  {feedback}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Tenant switcher */}
                <section aria-labelledby={`${labelId}-tenant`} className="rounded-sm border border-border p-4">
                  <h3 id={`${labelId}-tenant`} className="mb-2 text-caption font-semibold uppercase text-muted-foreground">
                    Tenant
                  </h3>
                  <div role="radiogroup" aria-labelledby={`${labelId}-tenant`} className="flex flex-col gap-1">
                    {tenants.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={t.id === currentTenantId}
                        onClick={() => onSelectTenant(t.id)}
                        className={
                          'rounded-sm border px-3 py-2 text-start text-body ' +
                          (t.id === currentTenantId
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground')
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Persona switcher */}
                <section aria-labelledby={`${labelId}-persona`} className="rounded-sm border border-border p-4">
                  <h3 id={`${labelId}-persona`} className="mb-2 text-caption font-semibold uppercase text-muted-foreground">
                    Persona
                  </h3>
                  <div role="radiogroup" aria-labelledby={`${labelId}-persona`} className="flex flex-col gap-1">
                    {personas.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={p.id === currentPersonaId}
                        onClick={() => onSelectPersona(p.id)}
                        className={
                          'rounded-sm border px-3 py-2 text-start ' +
                          (p.id === currentPersonaId
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground')
                        }
                      >
                        <span className="block text-body">{p.label}</span>
                        {p.roles && p.roles.length > 0 && (
                          <span className="block text-caption opacity-80">{p.roles.join(', ')}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Module jump */}
                <section aria-labelledby={`${labelId}-modules`} className="rounded-sm border border-border p-4">
                  <h3 id={`${labelId}-modules`} className="mb-2 text-caption font-semibold uppercase text-muted-foreground">
                    Jump to module
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {modules.length === 0 && <span className="text-caption text-muted-foreground">No modules</span>}
                    {modules.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onNavigateModule(m.id)
                          closeConsole()
                        }}
                        className="rounded-sm border border-border bg-background px-3 py-2 text-body text-foreground"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Actions: reset + share */}
                <section aria-labelledby={`${labelId}-actions`} className="rounded-sm border border-border p-4">
                  <h3 id={`${labelId}-actions`} className="mb-2 text-caption font-semibold uppercase text-muted-foreground">
                    Actions
                  </h3>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={resetSeeds}
                      className={
                        'rounded-sm border px-3 py-2 text-start text-body ' +
                        (confirmReset
                          ? 'border-destructive bg-destructive text-destructive-foreground'
                          : 'border-border bg-background text-foreground')
                      }
                    >
                      {confirmReset ? 'Confirm reset — click again' : 'Reset seed data'}
                    </button>
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="rounded-sm border border-border bg-background px-3 py-2 text-start text-body text-foreground"
                    >
                      Copy share link
                    </button>
                  </div>
                </section>
              </div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

DemoConsole.displayName = 'DemoConsole'
