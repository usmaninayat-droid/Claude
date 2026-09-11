import { describe, it, expect, beforeEach } from 'vitest'
import { bootstrapTheme, setTheme, getTheme, toggleTheme, resolveInitialTheme } from './theming'

const html = () => document.documentElement

beforeEach(() => {
  window.localStorage.clear()
  html().removeAttribute('data-theme')
  html().removeAttribute('data-tenant')
})

describe('theming bootstrap (jsdom)', () => {
  it('sets explicit data-theme and default data-tenant on <html>', () => {
    bootstrapTheme()
    expect(html().getAttribute('data-theme')).toBe('light') // matchMedia stub → light
    expect(html().getAttribute('data-tenant')).toBe('fams')
  })

  it('applies a configured tenant', () => {
    bootstrapTheme({ tenant: 'iwmp' })
    expect(html().getAttribute('data-tenant')).toBe('iwmp')
  })

  it('honours an explicit defaultTheme', () => {
    bootstrapTheme({ defaultTheme: 'dark' })
    expect(html().getAttribute('data-theme')).toBe('dark')
    expect(getTheme()).toBe('dark')
  })

  it('setTheme writes the attribute and persists to localStorage', () => {
    bootstrapTheme()
    setTheme('dark')
    expect(html().getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('fams-theme')).toBe('dark')
  })

  it('toggleTheme flips between light and dark', () => {
    bootstrapTheme({ defaultTheme: 'light' })
    toggleTheme()
    expect(getTheme()).toBe('dark')
    toggleTheme()
    expect(getTheme()).toBe('light')
  })
})

describe('resolveInitialTheme precedence', () => {
  it('prefers a stored choice over the OS preference', () => {
    window.localStorage.setItem('fams-theme', 'dark')
    expect(resolveInitialTheme()).toBe('dark')
  })

  it('falls back to prefers-color-scheme when nothing is stored', () => {
    const original = globalThis.matchMedia
    globalThis.matchMedia = ((q: string) => ({ matches: true, media: q })) as unknown as typeof matchMedia
    try {
      expect(resolveInitialTheme()).toBe('dark')
    } finally {
      globalThis.matchMedia = original
    }
  })

  it('an explicit default wins over everything', () => {
    window.localStorage.setItem('fams-theme', 'dark')
    expect(resolveInitialTheme('light')).toBe('light')
  })
})

describe('defaultThemeMode axis', () => {
  it('stored choice + mode "force" (default): defaultTheme wins', () => {
    window.localStorage.setItem('fams-theme', 'dark')
    expect(resolveInitialTheme('light')).toBe('light')
    expect(resolveInitialTheme('light', 'force')).toBe('light')
  })

  it('stored choice + mode "respect-stored": stored choice wins', () => {
    window.localStorage.setItem('fams-theme', 'dark')
    expect(resolveInitialTheme('light', 'respect-stored')).toBe('dark')
  })

  it('no stored choice: defaultTheme wins in both modes', () => {
    expect(resolveInitialTheme('dark', 'force')).toBe('dark')
    expect(resolveInitialTheme('dark', 'respect-stored')).toBe('dark')
  })

  it('bootstrapTheme defaults to "force" (today\'s behavior, unchanged)', () => {
    window.localStorage.setItem('fams-theme', 'dark')
    bootstrapTheme({ defaultTheme: 'light' })
    expect(getTheme()).toBe('light')
    expect(html().getAttribute('data-theme')).toBe('light')
  })

  it('bootstrapTheme with mode "respect-stored" honours the stored choice over defaultTheme', () => {
    window.localStorage.setItem('fams-theme', 'dark')
    bootstrapTheme({ defaultTheme: 'light', defaultThemeMode: 'respect-stored' })
    expect(getTheme()).toBe('dark')
    expect(html().getAttribute('data-theme')).toBe('dark')
  })

  it('bootstrapTheme with mode "respect-stored" and no stored choice falls back to defaultTheme', () => {
    bootstrapTheme({ defaultTheme: 'dark', defaultThemeMode: 'respect-stored' })
    expect(getTheme()).toBe('dark')
  })
})
