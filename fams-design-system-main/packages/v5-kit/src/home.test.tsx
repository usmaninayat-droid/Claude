import { describe, expect, it } from 'vitest'
import type { FamsModule } from '@fams/skeleton-kit'
import { buildLaunchCatalog } from './home'

function mkModule(id: string, label: string, path: string): FamsModule {
  return { id, navEntry: { label, path }, routes: () => Promise.resolve({} as never) }
}

const MODULES = [
  mkModule('assets', 'Assets', '/assets'),
  mkModule('workforce', 'Workforce', '/workforce'),
  mkModule('ticketing', 'Ticketing', '/ticketing'),
]

describe('buildLaunchCatalog', () => {
  it('groups modules by application, skipping unresolved ids, with token accents per group', () => {
    const { groups, entries } = buildLaunchCatalog(MODULES, [
      { id: 'fleet', name: 'Fleet', modules: ['assets', 'workforce', 'not-licensed'] },
      { id: 'support', name: 'Support', modules: ['ticketing'] },
      { id: 'empty', name: 'Empty', modules: ['ghost'] },
    ])
    expect(groups.map((g) => g.id)).toEqual(['fleet', 'support']) // 'empty' dropped
    expect(groups[0].modules.map((m) => m.id)).toEqual(['assets', 'workforce'])
    expect(entries).toHaveLength(3)
    // Accents cycle the token palette per application index — always var() tokens.
    expect(groups[0].modules[0].accentColor).toBe('var(--color-chart-1)')
    expect(groups[1].modules[0].accentColor).toBe('var(--color-chart-2)')
    expect(entries.find((e) => e.id === 'ticketing')?.path).toBe('/ticketing')
    expect(entries.find((e) => e.id === 'ticketing')?.appLabel).toBe('Support')
  })

  it('falls back to one implicit group spanning every module when no applications exist', () => {
    const { groups } = buildLaunchCatalog(MODULES, [], 'Acme')
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Acme')
    expect(groups[0].modules).toHaveLength(3)
  })
})
