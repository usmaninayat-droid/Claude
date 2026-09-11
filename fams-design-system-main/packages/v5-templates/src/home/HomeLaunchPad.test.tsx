import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react'
import { Gauge, Truck } from '@fams/ui-kit/icons'
import { HomeLaunchPad, type LaunchPadGroup } from './HomeLaunchPad'
import { usePinnedIds } from './usePinnedIds'
import { useAppSwitcherPreference, setAppSwitcherPreference } from './useAppSwitcherPreference'

const GROUPS: LaunchPadGroup[] = [
  {
    id: 'ccms',
    label: 'CCMS',
    modules: [
      { id: 'dash', label: 'Operational Dashboard', icon: <Gauge aria-hidden /> },
      { id: 'tickets', label: 'Ticketing' },
    ],
  },
  {
    id: 'telematics',
    label: 'Telematics',
    modules: [{ id: 'fleet', label: 'Fleet Management', icon: <Truck aria-hidden /> }],
  },
]

function renderPad(props: Partial<React.ComponentProps<typeof HomeLaunchPad>> = {}) {
  return render(
    <HomeLaunchPad
      groups={GROUPS}
      pinnedIds={['dash']}
      onTogglePin={() => {}}
      onOpen={() => {}}
      title="FAMS"
      {...props}
    />,
  )
}

describe('HomeLaunchPad', () => {
  it('renders header, favorites (pinned) and grouped module tiles', () => {
    renderPad({ onInbox: () => {}, inboxDot: true })
    expect(screen.getByText('FAMS')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    // Pinned "dash" renders twice: once in Favorites, once in its group.
    expect(screen.getAllByRole('button', { name: 'Open Operational Dashboard' })).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'CCMS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Telematics' })).toBeInTheDocument()
  })

  it('empty favorites shows the teaching empty state', () => {
    renderPad({ pinnedIds: [] })
    expect(screen.getByText('No favorites yet')).toBeInTheDocument()
  })

  it('search filters groups, hides favorites, and dead-ends politely', () => {
    renderPad()
    const input = screen.getByRole('textbox', { name: 'Search modules…' })
    fireEvent.change(input, { target: { value: 'fleet' } })
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Fleet Management' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Ticketing' })).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(screen.getByText(/No modules match/)).toBeInTheDocument()
    // Clear button restores.
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByText('Favorites')).toBeInTheDocument()
  })

  it('tile click opens, star toggles pin with aria-pressed', () => {
    const onOpen = vi.fn()
    const onTogglePin = vi.fn()
    renderPad({ onOpen, onTogglePin })
    fireEvent.click(screen.getByRole('button', { name: 'Open Ticketing' }))
    expect(onOpen).toHaveBeenCalledWith('tickets')
    const star = screen.getByRole('button', { name: 'Add Ticketing to favorites' })
    expect(star).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(star)
    expect(onTogglePin).toHaveBeenCalledWith('tickets')
  })

  it('the top bar carries the tenant lockup, inbox and minimize as page chrome', () => {
    const onMinimize = vi.fn()
    const { container } = renderPad({ onInbox: () => {}, inboxDot: true, onMinimize })
    const bar = container.querySelector('[data-slot="launch-pad-top-bar"]')
    expect(bar).not.toBeNull()
    // 60px tall with 40px side margins, and it is NOT inside the scroll area.
    expect(bar).toHaveClass('h-15', 'px-10')
    expect(bar).toContainElement(screen.getByRole('button', { name: 'Inbox' }))
    expect(bar).toContainElement(screen.getByRole('button', { name: 'Minimize to app switcher' }))
    expect(bar?.textContent).toContain('FAMS')
    fireEvent.click(screen.getByRole('button', { name: 'Minimize to app switcher' }))
    expect(onMinimize).toHaveBeenCalledOnce()
  })

  it('wavePattern renders a primary-tinted CSS mask from the supplied asset', () => {
    const { container } = renderPad({ wavePattern: '/assets/wave.svg' })
    const wave = container.querySelector('[data-slot="launch-pad-wave"]') as HTMLElement
    expect(wave).not.toBeNull()
    // Tint from the token, geometry from the asset — never a baked-in colour.
    expect(wave).toHaveClass('bg-primary', 'opacity-15')
    expect(wave.style.maskImage).toContain('/assets/wave.svg')
  })

  it('no wavePattern renders no wave at all', () => {
    const { container } = renderPad()
    expect(container.querySelector('[data-slot="launch-pad-wave"]')).toBeNull()
  })

  it('back button fires onBack', () => {
    const onBack = vi.fn()
    renderPad({ onBack })
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders the "Powered by" footer only when poweredBy is supplied', () => {
    const { container, rerender } = renderPad()
    expect(container.querySelector('[data-slot="launch-pad-powered-by"]')).toBeNull()
    rerender(
      <HomeLaunchPad
        groups={GROUPS}
        pinnedIds={['dash']}
        onTogglePin={() => {}}
        onOpen={() => {}}
        title="FAMS"
        poweredBy={<span>Acme</span>}
      />,
    )
    const footer = container.querySelector('[data-slot="launch-pad-powered-by"]')
    expect(footer).not.toBeNull()
    expect(footer?.textContent).toContain('Powered by')
    expect(screen.getByText('Acme')).toBeInTheDocument()
  })
})

describe('usePinnedIds', () => {
  beforeEach(() => {
    // jsdom in this package has no persistent localStorage stub — supply one.
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    })
  })

  it('starts from defaults, toggles newest-first, persists', () => {
    const { result } = renderHook(() => usePinnedIds('t.pins', ['a']))
    expect(result.current[0]).toEqual(['a'])
    act(() => result.current[1]('b'))
    expect(result.current[0]).toEqual(['b', 'a'])
    act(() => result.current[1]('a'))
    expect(result.current[0]).toEqual(['b'])
    expect(JSON.parse(window.localStorage.getItem('t.pins') as string)).toEqual(['b'])
  })

  it('rehydrates from storage over defaults; malformed storage falls back', () => {
    window.localStorage.setItem('t.pins', JSON.stringify(['x']))
    const { result } = renderHook(() => usePinnedIds('t.pins', ['a']))
    expect(result.current[0]).toEqual(['x'])
    window.localStorage.setItem('t.bad', '{nope')
    const { result: r2 } = renderHook(() => usePinnedIds('t.bad', ['a']))
    expect(r2.current[0]).toEqual(['a'])
  })
})

describe('useAppSwitcherPreference', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    })
  })

  it('defaults to page — the app row opens the launch pad until told otherwise', () => {
    const { result } = renderHook(() => useAppSwitcherPreference('t.switcher'))
    expect(result.current[0]).toBe('page')
  })

  it('records the choice and rehydrates it', () => {
    const { result } = renderHook(() => useAppSwitcherPreference('t.switcher'))
    act(() => result.current[1]('popup'))
    expect(result.current[0]).toBe('popup')
    expect(window.localStorage.getItem('t.switcher')).toBe('popup')
    const { result: reader } = renderHook(() => useAppSwitcherPreference('t.switcher'))
    expect(reader.current[0]).toBe('popup')
  })

  it('an out-of-band write reaches every mounted consumer of that key', () => {
    const { result: a } = renderHook(() => useAppSwitcherPreference('t.switcher'))
    const { result: b } = renderHook(() => useAppSwitcherPreference('t.switcher'))
    act(() => setAppSwitcherPreference('t.switcher', 'popup'))
    expect(a.current[0]).toBe('popup')
    expect(b.current[0]).toBe('popup')
  })

  it('keys are independent, so tenants never share the choice', () => {
    const { result: iwmp } = renderHook(() => useAppSwitcherPreference('fams.iwmp.app-switcher-mode'))
    const { result: ead } = renderHook(() => useAppSwitcherPreference('fams.ead.app-switcher-mode'))
    act(() => iwmp.current[1]('popup'))
    expect(iwmp.current[0]).toBe('popup')
    expect(ead.current[0]).toBe('page')
  })

  it('malformed storage falls back to the default', () => {
    window.localStorage.setItem('t.bad', 'sideways')
    const { result } = renderHook(() => useAppSwitcherPreference('t.bad'))
    expect(result.current[0]).toBe('page')
  })
})
