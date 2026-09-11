import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ModuleBlueprint, RendererRegistry } from '@fams/v5-composer'
import { ComposerModuleView } from './composer-route'

function renderWithClient(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { qc, ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) }
}

const dealsBlueprint: ModuleBlueprint = {
  id: 'deals',
  type: 'entity',
  label: 'Deals Board',
  views: ['list'],
  dataSource: { code: 'deals' },
}

describe('ComposerModuleView — composer blueprint wiring', () => {
  it('renders a skeleton placeholder while the blueprint query is pending', () => {
    // A promise that never resolves keeps the query in `isPending` state for
    // the duration of the assertion — proving the pending branch no longer
    // blank-flashes (`return null`) but renders a token-styled loading state.
    const getBlueprint = vi.fn().mockReturnValue(new Promise(() => {}))
    renderWithClient(
      <ComposerModuleView
        blueprintRef="crm/deals"
        tenant="crm"
        blueprintSource={{ getBlueprint }}
      />,
    )

    const pending = document.querySelector('[data-slot="composer-route-pending"]')!
    expect(pending).toBeInTheDocument()
    // The first paint reserves the module surface's real geometry rather
    // than showing one lone block over a blank page (UX MUST D.17/F.27c).
    expect(pending).toHaveAttribute('aria-busy', 'true')
    expect(pending).toHaveAttribute('role', 'status')
    expect(pending.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(5)
  })

  /**
   * P1-2 — the pending skeleton must MATCH the module's view kind. The
   * previous version painted the cockpit's 6-up KPI strip, `2fr_3fr` split and
   * 2-up band for every blueprint module, so a list or kanban module flashed a
   * layout that never arrived.
   */
  describe('pending skeleton shape (P1-2)', () => {
    const renderPending = (shape?: 'neutral' | 'list' | 'kanban' | 'split' | 'dashboard') => {
      renderWithClient(
        <ComposerModuleView
          blueprintRef="crm/deals"
          tenant="crm"
          blueprintSource={{ getBlueprint: vi.fn().mockReturnValue(new Promise(() => {})) }}
          pendingShape={shape}
        />,
      )
      return document.querySelector('[data-slot="composer-route-pending"]')!
    }

    it('defaults to the NEUTRAL single-body frame — no KPI strip, no split, no map pane', () => {
      const pending = renderPending()
      expect(pending).toHaveAttribute('data-shape', 'neutral')
      expect(pending.querySelector('[data-slot="composer-pending-neutral"]')).not.toBeNull()
      expect(pending.querySelector('[data-slot="composer-pending-metrics"]')).toBeNull()
      expect(pending.querySelector('[data-slot="composer-pending-split"]')).toBeNull()
    })

    it('paints a row-shaped body and NO KPI strip for a list module', () => {
      const pending = renderPending('list')
      expect(pending.querySelector('[data-slot="composer-pending-list"]')).not.toBeNull()
      expect(pending.querySelector('[data-slot="composer-pending-metrics"]')).toBeNull()
      expect(pending.querySelector('[data-slot="composer-pending-split"]')).toBeNull()
    })

    it('paints columns and NO KPI strip for a kanban module', () => {
      const pending = renderPending('kanban')
      expect(pending.querySelector('[data-slot="composer-pending-kanban"]')).not.toBeNull()
      expect(pending.querySelector('[data-slot="composer-pending-metrics"]')).toBeNull()
    })

    it('keeps the KPI strip + two-pane split for the cockpit-shaped (hybrid) module', () => {
      const pending = renderPending('split')
      expect(pending.querySelector('[data-slot="composer-pending-metrics"]')).not.toBeNull()
      expect(pending.querySelector('[data-slot="composer-pending-split"]')).not.toBeNull()
    })
  })

  it('resolves the blueprint via blueprintSource and renders ComposedModule', async () => {
    const getBlueprint = vi.fn().mockResolvedValue(dealsBlueprint)
    renderWithClient(
      <ComposerModuleView
        blueprintRef="crm/deals"
        tenant="crm"
        blueprintSource={{ getBlueprint }}
      />,
    )

    // ComposedModule with no renderer wired falls back to a labelled placeholder
    // — proving the resolved blueprint reached the composer.
    await waitFor(() => expect(screen.getByText('Deals Board')).toBeInTheDocument())
    expect(getBlueprint).toHaveBeenCalledWith('crm/deals')
  })

  it('renders through an app-supplied renderer when one matches the template ref', async () => {
    const getBlueprint = vi.fn().mockResolvedValue(dealsBlueprint)
    // 'entity' module type's grid template ref is 'ListView' in the registry;
    // supply a renderer for it and assert it wins over the placeholder.
    const renderers: RendererRegistry = {
      ListView: (ctx) => <div data-testid="rendered">rendered:{ctx.module.label}</div>,
    }
    renderWithClient(
      <ComposerModuleView
        blueprintRef="crm/deals"
        tenant="crm"
        blueprintSource={{ getBlueprint }}
        composer={{ renderers }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('rendered')).toHaveTextContent('rendered:Deals Board'))
  })

  it('passes the composer.createData adapter through to the renderer', async () => {
    const getBlueprint = vi.fn().mockResolvedValue(dealsBlueprint)
    const rows = [{ id: 'r1' }]
    const renderers: RendererRegistry = {
      ListView: (ctx) => <div data-testid="rows">{ctx.data.list().length}</div>,
    }
    renderWithClient(
      <ComposerModuleView
        blueprintRef="crm/deals"
        tenant="crm"
        blueprintSource={{ getBlueprint }}
        composer={{ renderers, createData: () => ({ list: () => rows, get: () => undefined }) }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('rows')).toHaveTextContent('1'))
  })
})
