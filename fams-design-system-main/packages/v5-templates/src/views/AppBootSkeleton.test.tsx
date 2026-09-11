import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { LiveMapViewProps } from '../map/LiveMapView'
import { AppBootSkeleton } from './AppBootSkeleton'
import { cockpitConfig } from './cockpit/cockpit-fixtures'

// Stub the heavy map entry (same mechanism as CockpitView.test.tsx). The point
// of the cockpit-delegation assertions below is that NO map is mounted in the
// loading state at all, so this stub is a tripwire, not a fixture.
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => (
    <div data-testid="fake-live-map">{props.vehicles.length}</div>
  ),
}))

/**
 * AppBootSkeleton — the FIRST FRAME of a v5 app, painted before the router,
 * the mock API or the tenant bootstrap have resolved. Two branches:
 *  - no `config` → the generic frame with a neutral body;
 *  - a `config` carrying a `cockpit` block → the body is delegated to
 *    `CockpitView` in its `loading` state, which is what keeps the skeleton at
 *    LOADED DIMENSIONS (UX MUSTs D.17 / F.27c) instead of a guess that drifts.
 */
describe('AppBootSkeleton', () => {
  describe('generic frame (no config)', () => {
    it('paints the app-shell frame as a polite busy status', () => {
      const { container } = render(<AppBootSkeleton />)
      const root = container.querySelector('[data-slot="app-boot-skeleton"]')!
      expect(root).not.toBeNull()
      expect(root).toHaveAttribute('role', 'status')
      expect(root).toHaveAttribute('aria-busy', 'true')
      expect(root).toHaveAttribute('aria-label', 'Loading')
    })

    it('renders the NEUTRAL body — no cockpit KPI strip, no map', () => {
      const { container, queryByTestId } = render(<AppBootSkeleton />)
      expect(container.querySelectorAll('[data-slot="cockpit-kpi-skeleton"]')).toHaveLength(0)
      expect(container.querySelector('[data-slot="cockpit-view"]')).toBeNull()
      expect(queryByTestId('fake-live-map')).toBeNull()
      expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    })

    it('reserves the rail column, the 48px top bar and the 64px module header', () => {
      const { container } = render(<AppBootSkeleton />)
      const html = container.innerHTML
      // Registration with the loaded shell: NavRail's 46px hover footprint,
      // TopNav's h-12, and the module header + view tabs row's h-16.
      expect(html).toContain('w-11.5')
      expect(html).toContain('h-12')
      expect(html).toContain('h-16')
    })

    it('applies a caller className to the root', () => {
      const { container } = render(<AppBootSkeleton className="custom-frame" />)
      expect(container.querySelector('[data-slot="app-boot-skeleton"]')).toHaveClass('custom-frame')
    })
  })

  describe('branded loader frame (brandLoaderSrc set)', () => {
    it('renders a full-bleed, non-interactive iframe instead of the skeleton bars', () => {
      const { container, queryByTestId } = render(
        <AppBootSkeleton brandLoaderSrc="/branding/qatar-mme-logo-animation.html" />,
      )
      const iframe = container.querySelector('[data-slot="app-boot-brand-loader"]')
      expect(iframe).not.toBeNull()
      expect(iframe).toHaveAttribute('src', '/branding/qatar-mme-logo-animation.html')
      expect(iframe).toHaveAttribute('title', 'Loading')
      expect(iframe).toHaveAttribute('aria-busy', 'true')
      expect(iframe).toHaveAttribute('tabIndex', '-1')
      expect(iframe).toHaveClass('h-full', 'w-full', 'border-0')
      // No skeleton bars, no cockpit, no map — the iframe is the whole frame.
      expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
      expect(container.querySelector('[data-slot="cockpit-view"]')).toBeNull()
      expect(queryByTestId('fake-live-map')).toBeNull()
    })

    it('still announces a single busy status on the root', () => {
      const { container } = render(<AppBootSkeleton brandLoaderSrc="/branding/x.html" />)
      const root = container.querySelector('[data-slot="app-boot-skeleton"]')!
      expect(root).toHaveAttribute('role', 'status')
      expect(root).toHaveAttribute('aria-busy', 'true')
      expect(root).toHaveAttribute('aria-label', 'Loading')
    })

    it('ignores config when brandLoaderSrc is set — no cockpit delegation', () => {
      const { container } = render(
        <AppBootSkeleton config={cockpitConfig} brandLoaderSrc="/branding/x.html" />,
      )
      expect(container.querySelector('[data-slot="cockpit-view"]')).toBeNull()
      expect(container.querySelector('[data-slot="app-boot-brand-loader"]')).not.toBeNull()
    })
  })

  describe('cockpit-aware frame (config with a cockpit block)', () => {
    it('delegates the body to CockpitView in its loading state', () => {
      const { container } = render(<AppBootSkeleton config={cockpitConfig} />)
      expect(container.querySelector('[data-slot="cockpit-view"]')).not.toBeNull()
      expect(
        container.querySelectorAll('[data-slot="cockpit-kpi-skeleton"]').length,
      ).toBeGreaterThan(0)
    })

    it('mounts NO map while loading (one live GL context per page, perf rule 3)', () => {
      const { queryByTestId } = render(<AppBootSkeleton config={cockpitConfig} />)
      expect(queryByTestId('fake-live-map')).toBeNull()
    })

    it('keeps the single outer busy status — the frame owns the announcement', () => {
      const { container } = render(<AppBootSkeleton config={cockpitConfig} />)
      const root = container.querySelector('[data-slot="app-boot-skeleton"]')!
      expect(root).toHaveAttribute('aria-busy', 'true')
      expect(root).toHaveAttribute('aria-label', 'Loading')
    })
  })
})
