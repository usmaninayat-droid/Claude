/**
 * Axe fixture for the DemoConsole. Mirrors v5-templates' sweep: the matcher is
 * wired from `vitest-axe/dist/matchers.js` and `color-contrast` / `region` are
 * disabled (jsdom can't compute layout/contrast). The console is rendered OPEN
 * so the full-screen overlay (dialog, control groups) is axed.
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { DemoConsole } from './DemoConsole'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
}

expect.extend({ toHaveNoViolations })

const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

describe('DemoConsole — axe', () => {
  it('open console has no violations', async () => {
    const { baseElement } = render(
      <DemoConsole
        defaultOpen
        tenants={[
          { id: 'acme', label: 'Acme Corp' },
          { id: 'beta', label: 'Beta Industries' },
        ]}
        currentTenantId="acme"
        onSelectTenant={() => {}}
        personas={[
          { id: 'u_admin', label: 'Avery (Admin)', roles: ['admin'] },
          { id: 'u_disp', label: 'Dana (Dispatcher)', roles: ['dispatcher'] },
        ]}
        currentPersonaId="u_admin"
        onSelectPersona={() => {}}
        modules={[{ id: 'companies', label: 'Companies' }]}
        onNavigateModule={() => {}}
        onResetSeeds={() => {}}
        getShareLink={() => 'https://demo.test/'}
      />,
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
