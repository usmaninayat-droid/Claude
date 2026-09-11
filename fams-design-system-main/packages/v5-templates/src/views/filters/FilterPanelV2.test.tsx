import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { FilterFacet, FiltersPanelConfig } from '@fams/v5-composer'
import { FilterPanelV2, appliedCount } from './FilterPanelV2'
import { useFilterSession } from './use-filter-session'
import { multiFacet, panelFacets, statusFacet } from './fixtures'

function Harness({
  facets = [multiFacet, statusFacet],
  initial = {},
  panelConfig,
  onClearAll,
  onClose,
}: {
  facets?: FilterFacet[]
  initial?: Record<string, unknown>
  panelConfig?: FiltersPanelConfig
  onClearAll?: () => void
  onClose?: () => void
}) {
  const session = useFilterSession('mod:view')
  const [value, setValue] = useState<Record<string, unknown>>(initial)
  const [open, setOpen] = useState(true)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return (
    <div>
      <button type="button" ref={triggerRef} onClick={() => setOpen(true)}>
        Filters
      </button>
      <FilterPanelV2
        facets={facets}
        value={value}
        session={session}
        panelConfig={panelConfig}
        open={open}
        announceDelayMs={0}
        triggerRef={triggerRef}
        onChange={(col, next) => setValue((v) => ({ ...v, [col]: next }))}
        onClearAll={() => {
          setValue({})
          onClearAll?.()
        }}
        onClose={() => {
          setOpen(false)
          onClose?.()
        }}
      />
    </div>
  )
}

const panel = () => screen.getByRole('dialog')
const liveRegion = () => screen.getByRole('status')

describe('appliedCount', () => {
  it('counts only facets holding a non-empty value', () => {
    expect(appliedCount(panelFacets, {})).toBe(0)
    expect(appliedCount(panelFacets, { group: [], state: ['s1'], mode: '' })).toBe(1)
    expect(appliedCount(panelFacets, { group: ['g1'], mode: 'm1', window: { from: new Date() } })).toBe(3)
  })
})

describe('FilterPanelV2 — chrome and roles (D-4/I.73)', () => {
  it('is a non-modal dialog labelled by the configured title', () => {
    render(<Harness panelConfig={{ title: 'Panel Title' }} />)
    expect(panel()).toHaveAttribute('aria-modal', 'false')
    expect(panel()).toHaveAccessibleName('Panel Title')
  })

  it('defaults the title and the 448px width, clamped to the viewport (J.94)', () => {
    render(<Harness />)
    expect(panel()).toHaveAccessibleName('All Filters')
    expect(panel().style.width).toBe('448px')
    expect(panel().style.maxWidth).toBe('calc(100vw - 32px)')
  })

  it('honours an authored width/height', () => {
    const { baseElement } = render(<Harness panelConfig={{ width: 400, height: 500 }} />)
    expect(panel().style.width).toBe('400px')
    const region = baseElement.querySelector<HTMLElement>('[data-slot="filter-panel-scroll-region"]')!
    expect(region.style.getPropertyValue('--filter-panel-max-h')).toBe('min(500px, calc(100vh - 64px))')
  })

  it('renders one field per facet, each an aria-labelled group (I.85)', () => {
    render(<Harness facets={panelFacets} />)
    const groups = within(panel()).getAllByRole('group')
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(panelFacets.map((f) => f.label))
  })
})

describe('FilterPanelV2 — bounded body (E.34/H.69/H.70)', () => {
  it('bounds the body to min(660px, 100vh - 64px) and keeps the header OUTSIDE the scroller', () => {
    const { baseElement } = render(<Harness />)
    const region = baseElement.querySelector<HTMLElement>('[data-slot="filter-panel-scroll-region"]')!
    expect(region.style.getPropertyValue('--filter-panel-max-h')).toBe('min(660px, calc(100vh - 64px))')
    const header = baseElement.querySelector('[data-slot="filter-panel-header"]')!
    expect(region.contains(header)).toBe(false)
    expect(baseElement.querySelector('[data-slot="custom-scrollbar"]')!.contains(header)).toBe(false)
  })

  it('reveals the scrollbar while focus is inside the scroller (H.69 non-hover fallback)', () => {
    const { baseElement } = render(<Harness />)
    const region = baseElement.querySelector<HTMLElement>('[data-slot="filter-panel-scroll-region"]')!
    expect(region.dataset.scrollbarVisible).toBeUndefined()
    fireEvent.focus(within(panel()).getAllByRole('combobox')[0])
    expect(region.dataset.scrollbarVisible).toBe('true')
  })

  it('renders a bottom fade element that is transparent when there is nothing below (H.70)', () => {
    const { baseElement } = render(<Harness />)
    const fade = baseElement.querySelector<HTMLElement>('[data-slot="filter-panel-fade"]')!
    expect(fade.style.opacity).toBe('0')
  })
})

describe('FilterPanelV2 — live region (I.75/I.76)', () => {
  it('announces the applied count and the cleared state', () => {
    render(<Harness />)
    expect(liveRegion()).toHaveTextContent('')
    fireEvent.click(within(panel()).getAllByRole('combobox')[0])
    fireEvent.click(screen.getByRole('option', { name: /Group One/ }))
    expect(liveRegion()).toHaveTextContent('1 filter applied')
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(liveRegion()).toHaveTextContent('Filters cleared')
  })

  it('is polite, not assertive', () => {
    render(<Harness />)
    expect(liveRegion()).toHaveAttribute('aria-live', 'polite')
  })
})

describe('FilterPanelV2 — Clear all (R-11/G.63/G.66)', () => {
  it('is aria-disabled and inert on a clean panel', () => {
    const onClearAll = vi.fn()
    render(<Harness onClearAll={onClearAll} />)
    const clear = screen.getByRole('button', { name: 'Clear all' })
    expect(clear).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(clear)
    expect(onClearAll).not.toHaveBeenCalled()
  })

  it('clears every applied value once something is set', () => {
    const onClearAll = vi.fn()
    render(<Harness initial={{ group: ['g1'] }} onClearAll={onClearAll} />)
    const clear = screen.getByRole('button', { name: 'Clear all' })
    expect(clear).not.toHaveAttribute('aria-disabled')
    fireEvent.click(clear)
    expect(onClearAll).toHaveBeenCalledTimes(1)
    expect(panel().dataset.applied).toBe('0')
  })

  it('never renders an Apply/Confirm — the panel is live-apply only (G.63)', () => {
    render(<Harness facets={panelFacets} />)
    expect(screen.queryByRole('button', { name: /^(Apply|Confirm|Done)$/ })).toBeNull()
  })

  it('can be hidden by config', () => {
    render(<Harness panelConfig={{ clearAll: false }} />)
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull()
  })
})

describe('FilterPanelV2 — layer scope and focus (A.2–A.5/D-3)', () => {
  it('moves focus into the panel on open (A.2)', () => {
    render(<Harness />)
    expect(panel().contains(document.activeElement)).toBe(true)
  })

  it('Escape closes the panel and restores focus to the trigger', () => {
    render(<Harness />)
    fireEvent.keyDown(panel(), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filters' }))
  })

  it('Escape with a field dropdown open closes ONLY the dropdown (never two layers)', () => {
    render(<Harness />)
    fireEvent.click(within(panel()).getAllByRole('combobox')[0])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('an outside click closes the panel; a click inside it does not', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.pointerDown(screen.getByRole('heading', { name: 'All Filters' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('a click inside a portalled field dropdown is not an outside click (E.38)', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(within(panel()).getAllByRole('combobox')[0])
    fireEvent.pointerDown(screen.getByRole('option', { name: /Group One/ }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('the ✕ closes the panel', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
