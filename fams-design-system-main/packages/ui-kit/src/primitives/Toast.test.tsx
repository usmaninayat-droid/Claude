import { afterEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { Toaster, ToasterHost, __resetToasterRegistry, toast } from './Toast'
import { installToastCloseReset, toastCloseResetCss } from './toast-close-reset'

afterEach(() => {
  __resetToasterRegistry()
})

/**
 * The guard that keeps `AppShell`'s default sink out of a consuming app's way.
 * It cannot be a DOM probe: sonner renders NOTHING until the first toast
 * exists, so `document.querySelector('[data-sonner-toaster]')` answers "no
 * toaster" for a document that has one (the docblock used to claim a probe the
 * code never performed — Phase 7 code review, finding 4).
 */
describe('ToasterHost — double-mount guard', () => {
  it('mounts when nothing else has', async () => {
    render(<ToasterHost />)
    act(() => {
      toast('Only sink')
    })
    expect(await screen.findAllByText('Only sink')).toHaveLength(1)
  })

  it('stands aside for a consumer’s own <Toaster />', async () => {
    render(
      <>
        <Toaster />
        <ToasterHost />
      </>,
    )
    act(() => {
      toast('Once')
    })
    expect(await screen.findAllByText('Once')).toHaveLength(1)
  })

  it('keeps a SECOND host from claiming — two shells in one tree', async () => {
    render(
      <>
        <ToasterHost />
        <ToasterHost />
      </>,
    )
    act(() => {
      toast('Still once')
    })
    expect(await screen.findAllByText('Still once')).toHaveLength(1)
  })

  /**
   * FAMS Desk vendors this design system as a git SUBTREE, so one bundle can
   * legitimately hold TWO module instances of `@fams/ui-kit`. Module-scoped
   * state does not span them; a `globalThis` + `Symbol.for` registry does.
   * A second module instance is simulated by re-reading the registry through
   * the interned key exactly as a fresh copy of the module would.
   */
  it('is reachable from a SECOND module instance (subtree vendoring)', () => {
    render(<ToasterHost />)
    const asSecondInstance = (globalThis as unknown as Record<symbol, { hostClaimed: boolean; mounted: number } | undefined>)[
      Symbol.for('@fams/ui-kit.toaster-registry')
    ]
    expect(asSecondInstance).toBeDefined()
    // A second copy of the module would see the claim and stand aside, which
    // a module-scoped `let` could never tell it.
    expect(asSecondInstance!.hostClaimed).toBe(true)
    expect(asSecondInstance!.mounted).toBe(1)
  })
})

/**
 * The shell mounts this for EVERY module, so it must sit where an app shell
 * cannot collide with page chrome. The round-3 visual and UX gates both
 * measured the toast landing on the map's zoom-out and `maximize-02` controls
 * (~x1540-1898 / y981-1055) and making them unclickable — a bottom-end toast
 * over a bottom-end floating control stack.
 */
describe('ToasterHost — position', () => {
  it('defaults to the top-end corner, clear of bottom-end map controls', async () => {
    render(<ToasterHost />)
    act(() => {
      toast('Placed')
    })
    await screen.findByText('Placed')
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-y-position', 'top')
  })

  it('lets a consumer override the position', async () => {
    render(<ToasterHost position="bottom-left" />)
    act(() => {
      toast('Moved')
    })
    await screen.findByText('Moved')
    const host = document.querySelector('[data-sonner-toaster]')
    expect(host).toHaveAttribute('data-y-position', 'bottom')
    expect(host).toHaveAttribute('data-x-position', 'left')
  })
})

/*
 * Round-5 visual V5 / UX N1: the dismiss control sat OUTSIDE the toast, at the
 * inline start, at 20x20 — because the `size-6` utility on
 * `toastOptions.classNames.closeButton` lost to sonner's unlayered vendor CSS.
 * The rules are asserted on the SHEET, because a class name in the markup is
 * exactly the evidence that misled the earlier round.
 */
describe('toast close-button reset sheet', () => {
  it('pins the dismiss inside the toast at the inline end, at 24x24', () => {
    const css = toastCloseResetCss()
    expect(css).toContain('inset-inline-end:0.5rem!important')
    expect(css).toContain('inset-inline-start:auto!important')
    expect(css).toContain('inline-size:1.5rem!important')
    expect(css).toContain('block-size:1.5rem!important')
    // Sonner's outward nudge and physical corner pin, neutralised.
    expect(css).toContain('transform:none!important')
    expect(css).toContain('left:auto!important')
    expect(css).toContain('right:auto!important')
    // No raw hex anywhere in the sheet — colours are token custom properties.
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('reserves the gutter only for toasts that actually carry a dismiss', () => {
    expect(toastCloseResetCss()).toContain(':has([data-close-button]){padding-inline-end:2.5rem!important}')
  })

  it('installs exactly one style element however many toasters mount', () => {
    installToastCloseReset()
    installToastCloseReset()
    expect(document.querySelectorAll('#fams-toast-close-reset')).toHaveLength(1)
  })
})
