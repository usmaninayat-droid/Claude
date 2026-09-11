import { describe, expect, it, afterEach } from 'vitest'
import { applyTenantTheme } from './theming'

afterEach(() => {
  document.documentElement.removeAttribute('data-tenant')
  document.documentElement.removeAttribute('style')
})

describe('applyTenantTheme', () => {
  it('sets data-tenant on <html>', () => {
    applyTenantTheme({ tenant: 'mm' })
    expect(document.documentElement.getAttribute('data-tenant')).toBe('mm')
  })

  it('applies runtimeVars as CSS custom properties (escape hatch)', () => {
    applyTenantTheme({
      tenant: 'acme',
      runtimeVars: { '--color-primary': '#123456', '--radius-md': '0.75rem' },
    })
    expect(document.documentElement.getAttribute('data-tenant')).toBe('acme')
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#123456')
    expect(document.documentElement.style.getPropertyValue('--radius-md')).toBe('0.75rem')
  })

  it('does NOT touch data-theme (light/dark axis is skeleton-kit\'s job)', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    applyTenantTheme({ tenant: 'mm' })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    document.documentElement.removeAttribute('data-theme')
  })
})
