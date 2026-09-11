import { describe, expect, it, vi } from 'vitest'
import type { FamsModule } from '@fams/skeleton-kit'
import { resolveLandingPath } from './landing'

const modules = [
  { id: 'operations-center', navEntry: { label: 'Ops', path: '/operations-center' }, routes: vi.fn() },
  { id: 'assets', navEntry: { label: 'Assets', path: '/assets' }, routes: vi.fn() },
] as unknown as FamsModule[]

describe('resolveLandingPath', () => {
  it('returns undefined when landingModule is unset (index keeps rendering Home)', () => {
    expect(resolveLandingPath(undefined, modules)).toBeUndefined()
  })

  it('resolves "first" to the first ordered module route', () => {
    expect(resolveLandingPath('first', modules)).toBe('/operations-center')
  })

  it('resolves an explicit module id to that module route', () => {
    expect(resolveLandingPath('assets', modules)).toBe('/assets')
  })

  it('falls back to Home with a console warning for an unknown module id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveLandingPath('nope', modules)).toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'))
    warn.mockRestore()
  })

  it('falls back to Home with a warning when "first" has no modules to point at', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveLandingPath('first', [])).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
