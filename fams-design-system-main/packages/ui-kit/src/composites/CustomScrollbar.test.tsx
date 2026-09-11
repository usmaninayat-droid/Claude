import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { CustomScrollbar, type CustomScrollbarHandle } from './CustomScrollbar'

/** jsdom has no layout — fake the scroll metrics on the viewport element. */
function fakeScrollable(el: HTMLElement, { sh = 400, ch = 100, sw = 100, cw = 100 } = {}) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: sh })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: ch })
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: sw })
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: cw })
}

function viewportOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-slot="custom-scrollbar-viewport"]') as HTMLElement
}

describe('CustomScrollbar', () => {
  it('renders children inside a hidden-native-bar viewport and forwards the viewport ref', () => {
    const ref = createRef<CustomScrollbarHandle>()
    const { container, getByText } = render(
      <CustomScrollbar ref={ref}>
        <p>content</p>
      </CustomScrollbar>,
    )
    expect(getByText('content')).toBeInTheDocument()
    const viewport = viewportOf(container)
    expect(ref.current).toBe(viewport)
    expect(viewport.style.scrollbarWidth).toBe('none')
  })

  it('shows a vertical thumb only when the content overflows, sized from the metrics', () => {
    const { container } = render(
      <CustomScrollbar>
        <div>tall</div>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(container)
    // Not scrollable yet — no thumb.
    expect(container.querySelectorAll('[data-slot="custom-scrollbar"] .rounded-full').length).toBe(0)

    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    const thumbs = container.querySelectorAll('span.rounded-full')
    expect(thumbs.length).toBe(1)
  })

  it('hides the thumb affordance for an axis excluded via `axis`', () => {
    const { container } = render(
      <CustomScrollbar axis="horizontal">
        <div>tall</div>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    // Vertical overflow exists but the vertical thumb is suppressed.
    expect(container.querySelectorAll('span.rounded-full').length).toBe(0)
  })

  it('reveals thumbs on hover (desktop) and hides them on leave', () => {
    // The global test stub reports `matches: false` (touch model); this case
    // needs the desktop hover model.
    const orig = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    const { container } = render(
      <CustomScrollbar>
        <div>tall</div>
      </CustomScrollbar>,
    )
    const outer = container.querySelector('[data-slot="custom-scrollbar"]') as HTMLElement
    const viewport = viewportOf(container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    const thumbBox = container.querySelector('span.rounded-full')?.parentElement as HTMLElement
    expect(thumbBox.className).toContain('opacity-0')
    fireEvent.mouseEnter(outer)
    expect(thumbBox.className).toContain('opacity-100')
    fireEvent.mouseLeave(outer)
    expect(thumbBox.className).toContain('opacity-0')
    window.matchMedia = orig
  })

  it('applies a caller thumbClassName override', () => {
    const { container } = render(
      <CustomScrollbar thumbClassName="bg-transparent">
        <div>tall</div>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    expect(container.querySelector('span.rounded-full')?.className).toContain('bg-transparent')
  })

  it('drag on the thumb scrolls the viewport', () => {
    const { container } = render(
      <CustomScrollbar>
        <div>tall</div>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    const thumbBox = container.querySelector('span.rounded-full')?.parentElement as HTMLElement
    const setSpy = vi.fn()
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: setSpy,
    })
    fireEvent.pointerDown(thumbBox, { clientY: 10 })
    fireEvent.pointerMove(window, { clientY: 30 })
    expect(setSpy).toHaveBeenCalled()
    fireEvent.pointerUp(window)
  })
})

/*
 * FIX WAVE C-6 — H.69/H.70: the hover-revealed indicator needs a non-hover
 * fallback (focus-within, and permanently where there is no hover at all), a
 * NAMED thumb + track so "this scrolls" is inspectable rather than implied, and
 * an opt-in bottom fade while the content is not scrolled to the end.
 */
describe('CustomScrollbar — H.69/H.70 indicator fallbacks and bottom fade', () => {
  const scrollableRender = (props: Record<string, unknown> = {}) => {
    const view = render(
      <CustomScrollbar {...props}>
        <button type="button">inside</button>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(view.container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    return { ...view, viewport }
  }

  it('renders a NAMED thumb node for the scrolling axis (H.69)', () => {
    const { container } = scrollableRender()
    expect(container.querySelector('[data-slot="custom-scrollbar-thumb"][data-axis="v"]')).not.toBeNull()
  })

  it('renders the NAMED track only for surfaces that opted in via `keepVisible` (H1)', () => {
    const optedOut = scrollableRender()
    expect(optedOut.container.querySelector('[data-slot="custom-scrollbar-track"][data-axis="v"]')).toBeNull()
    const optedIn = scrollableRender({ keepVisible: true })
    expect(optedIn.container.querySelector('[data-slot="custom-scrollbar-track"][data-axis="v"]')).not.toBeNull()
  })

  it('shows the indicator on hover AND on focus-within (H.69)', () => {
    // Force the "real pointer" branch: jsdom's default `matchMedia` reports
    // no hover, which is the touch branch asserted in the next test.
    const original = window.matchMedia
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia
    try {
      const { container, getByRole } = scrollableRender()
      const root = container.querySelector('[data-slot="custom-scrollbar"]') as HTMLElement
      expect(root.getAttribute('data-scroll-indicator')).toBeNull()
      fireEvent.mouseEnter(root)
      expect(root.getAttribute('data-scroll-indicator')).toBe('true')
      fireEvent.mouseLeave(root)
      expect(root.getAttribute('data-scroll-indicator')).toBeNull()
      fireEvent.focus(getByRole('button', { name: 'inside' }))
      expect(root.getAttribute('data-scroll-indicator')).toBe('true')
    } finally {
      window.matchMedia = original
    }
  })

  it('draws the bottom fade while not scrolled to the end, and drops it at the end (H.70)', () => {
    const { container, viewport } = scrollableRender({ bottomFade: true })
    const fade = () => container.querySelector('[data-slot="custom-scrollbar-fade"]') as HTMLElement
    expect(fade()).not.toBeNull()
    expect(fade().getAttribute('data-visible')).toBe('true')
    viewport.scrollTop = 300
    fireEvent.scroll(viewport)
    expect(fade().getAttribute('data-visible')).toBeNull()
  })

  it('renders no fade unless the surface opts in', () => {
    const { container } = scrollableRender()
    expect(container.querySelector('[data-slot="custom-scrollbar-fade"]')).toBeNull()
  })
})

describe('CustomScrollbar — H.69 `keepVisible`', () => {
  it('shows the indicator with no hover, focus or scroll activity', () => {
    const { container } = render(
      <CustomScrollbar keepVisible>
        <div>tall</div>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    const root = container.querySelector('[data-slot="custom-scrollbar"]') as HTMLElement
    expect(root.getAttribute('data-scroll-indicator')).toBe('true')
    const thumb = container.querySelector('[data-slot="custom-scrollbar-thumb"]') as HTMLElement
    expect(thumb.className).toContain('opacity-100')
  })
})

/*
 * FIX WAVE C-7 — H1 regression pin. `keepVisible`/`bottomFade` are OPT-IN, and
 * the C-6 `shown` rewrite quietly changed every consumer that opted out of the
 * affordance instead (`NavRail` neutralises the THUMB with
 * `thumbClassName="bg-transparent"`; it cannot neutralise a second painted
 * track node, and on a coarse pointer the indicator became permanent). These
 * tests pin the opted-out contract so it cannot drift again.
 */
describe('CustomScrollbar — opted-out consumers keep the pre-H.69 behaviour (H1)', () => {
  const withHover = (canHover: boolean, fn: () => void) => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) =>
      ({
        matches: canHover,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia
    try {
      fn()
    } finally {
      window.matchMedia = original
    }
  }

  const renderScrollable = (props: Record<string, unknown> = {}) => {
    const view = render(
      <CustomScrollbar {...props}>
        <div>tall</div>
      </CustomScrollbar>,
    )
    const viewport = viewportOf(view.container)
    fakeScrollable(viewport, { sh: 400, ch: 100 })
    fireEvent.scroll(viewport)
    return { ...view, viewport }
  }

  it('paints NO track for a consumer that hid the thumb via `thumbClassName` (NavRail)', () => {
    // NavRail's exact opt-out: neutralise the thumb, pass neither new prop.
    const { container } = renderScrollable({ thumbClassName: 'bg-transparent' })
    expect(container.querySelector('[data-slot="custom-scrollbar-track"]')).toBeNull()
    const thumb = container.querySelector('[data-slot="custom-scrollbar-thumb"] span') as HTMLElement
    expect(thumb.className).toContain('bg-transparent')
  })

  it('keeps the coarse-pointer show-then-idle-hide cycle instead of showing permanently', () => {
    vi.useFakeTimers()
    try {
      withHover(false, () => {
        const { container, viewport } = renderScrollable()
        const root = container.querySelector('[data-slot="custom-scrollbar"]') as HTMLElement
        // Scroll activity reveals it...
        act(() => {
          fireEvent.scroll(viewport)
        })
        expect(root.getAttribute('data-scroll-indicator')).toBe('true')
        // ...and going idle hides it again. The C-6 `: true` branch made this
        // permanent for every consumer that never opted in.
        act(() => {
          vi.advanceTimersByTime(3000)
        })
        expect(root.getAttribute('data-scroll-indicator')).toBeNull()
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
