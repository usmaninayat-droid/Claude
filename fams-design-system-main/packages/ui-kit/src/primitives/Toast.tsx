import { useEffect, useState } from 'react'
import { Toaster as SonnerToaster, toast, type ToasterProps } from 'sonner'
import { cn } from '../lib/cn'
// Moves sonner's dismiss control inside the toast, inline-end, at 24x24 — see
// that file for why this has to be an injected sheet and not a class.
import { installToastCloseReset } from './toast-close-reset'

installToastCloseReset()

/**
 * Toast — mount exactly one `<Toaster />` at the app root (inside `AppShell`
 * or higher). Trigger toasts from anywhere via the re-exported `toast()`
 * function — it does not need the component in scope. `dir="auto"` reads
 * the ancestor's `dir` attribute, so RTL works without extra wiring.
 */
/* Live `<Toaster />` registry. Sonner renders NOTHING until a toast exists,
   so the DOM cannot answer "is a sink already mounted?" — a probe for
   `[data-sonner-toaster]` finds an empty document and always says no. This
   registry can answer it, and `ToasterHost` reads it to stay out of a
   consuming app's way.

   Why `globalThis` + `Symbol.for` rather than module-scoped `let`s: FAMS Desk
   vendors this design system as a git SUBTREE, so one bundle can legitimately
   contain TWO module instances of `@fams/ui-kit`. Module-scoped state does not
   span them — each instance would see an empty registry, both would claim, and
   every toast would render twice (Phase 7 code review, finding 4). A
   `Symbol.for` key is interned per realm, so every instance in the page
   resolves the same record. */
interface ToasterRegistry {
  /** Number of live `<Toaster />` elements, ours or a consumer's. */
  mounted: number
  /** Whether a `ToasterHost` has already claimed the default-sink role. */
  hostClaimed: boolean
}
const TOASTER_REGISTRY = Symbol.for('@fams/ui-kit.toaster-registry')
/** `globalThis` seen as a symbol-keyed bag — `Symbol.for` yields a plain
 *  `symbol`, not a `unique symbol`, so a symbol index signature is how it is
 *  typed without lying about the global's shape. */
type ToasterRegistrySlot = { [key: symbol]: ToasterRegistry | undefined }
function toasterRegistry(): ToasterRegistry {
  const slot = globalThis as unknown as ToasterRegistrySlot
  const existing = slot[TOASTER_REGISTRY]
  if (existing) return existing
  const created: ToasterRegistry = { mounted: 0, hostClaimed: false }
  slot[TOASTER_REGISTRY] = created
  return created
}

/** Test seam: drops the shared registry so a suite can assert first-mount
 *  behaviour without leaking claims between cases. Not part of the app path. */
export function __resetToasterRegistry(): void {
  const slot = globalThis as unknown as ToasterRegistrySlot
  slot[TOASTER_REGISTRY] = undefined
}

export function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  useEffect(() => {
    const registry = toasterRegistry()
    registry.mounted += 1
    return () => {
      registry.mounted -= 1
    }
  }, [])
  return (
    <SonnerToaster
      dir="auto"
      className={cn('toaster group', className)}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: cn(
            'group toast rounded-md border border-border bg-card text-card-foreground shadow-elevation',
            'group-[.toaster]:gap-3',
            /*
             * Round-4 UX finding N4: a toast is a NOTIFICATION, not a surface,
             * and this one parked over a 40×40 map tool — `elementFromPoint`
             * at the tile's centre returned the toast's `<li>`, so the control
             * was un-clickable for the toast's whole life. Figma places the
             * toast exactly there (495:62893), so the placement stays and the
             * THEFT goes: the toast body is pointer-transparent and only its
             * own controls take the pointer. Trade-off, stated plainly:
             * sonner's hover-to-pause no longer applies to the body — the
             * close button below is the deliberate replacement.
             */
            'pointer-events-none',
          ),
          title: 'text-sm font-semibold text-foreground',
          description: 'text-sm text-muted-foreground',
          actionButton:
            'pointer-events-auto rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground',
          cancelButton:
            'pointer-events-auto rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground',
          /*
           * Always reachable, even though the body is pointer-transparent.
           *
           * The GEOMETRY (24x24, inside the card, inline-end) is NOT here: a
           * package-authored utility loses to sonner's unlayered vendor CSS no
           * matter how specific it is, which is why the `size-6` on this line
           * measured 20x20 live for a whole round. It now comes from
           * `toast-close-reset.ts`. These classes are the colour/pointer
           * layer only, and the injected sheet is the load-bearing half.
           */
          closeButton: 'pointer-events-auto size-6 text-muted-foreground',
          error: 'group-[.toaster]:border-destructive/50',
          success: 'group-[.toaster]:border-success/50',
          warning: 'group-[.toaster]:border-warning/50',
          info: 'group-[.toaster]:border-primary/50',
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

/**
 * ToasterHost — the DEFAULT toast sink, mounted by `AppShell` so every app
 * built on the shell has somewhere for `toast()` to land without wiring
 * anything (round-2 interaction 19d: the map's "unavailable tool" toast was
 * raised correctly and swallowed, because no consumer had mounted a
 * `<Toaster />`).
 *
 * Double-mount guard: an app that renders its OWN `<Toaster />` — with its own
 * position, duration or theme — must keep winning, and two sonner toasters
 * render every toast twice. So this host mounts only when the shared
 * `toasterRegistry()` reports no live toaster and no other host has claimed.
 * The registry lives on `globalThis` under an interned symbol precisely so the
 * guard survives FAMS Desk's subtree vendoring (see the registry above); a DOM
 * probe cannot be used because sonner renders nothing at all until the first
 * toast exists. Children commit — and run their effects — before an ancestor's,
 * so a consumer's toaster anywhere INSIDE the shell has already registered by
 * the time this runs. A consumer that mounts its toaster as a LATER SIBLING of
 * `AppShell` should pass `toaster={false}`.
 *
 * Position: `top-right`, not sonner's `bottom-right` default. (Sonner's
 * positions are PHYSICAL — an RTL app that wants the mirrored corner passes
 * `position="top-left"`; there is no logical form to use.) Maps, and other
 * full-bleed surfaces, park a
 * floating control stack in the bottom-end corner — the round-3 gates measured
 * the toast landing on top of the map's zoom-out and fullscreen buttons and
 * making them unclickable. The shell mounts this for EVERY module, so it has
 * to sit where an app shell cannot collide with page chrome. Overridable:
 * every prop here (including `position`) is a default that the caller's own
 * props replace, and `AppShell` forwards them via `toaster={{ … }}`.
 *
 * `closeButton` defaults ON (round-4 UX finding N4): the shell's toasts carried
 * no dismiss control at all, so a toast overlapping page chrome could only be
 * waited out. Pass `closeButton={false}` to restore sonner's default.
 */
export function ToasterHost({ position = 'top-right', closeButton = true, ...props }: ToasterProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const registry = toasterRegistry()
    if (registry.mounted > 0 || registry.hostClaimed) return undefined
    registry.hostClaimed = true
    setMounted(true)
    return () => {
      registry.hostClaimed = false
    }
  }, [])
  if (!mounted) return null
  return <Toaster position={position} closeButton={closeButton} {...props} />
}

ToasterHost.displayName = 'ToasterHost'

export { toast }
