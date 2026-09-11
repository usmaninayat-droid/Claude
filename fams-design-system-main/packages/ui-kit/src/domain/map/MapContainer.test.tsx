import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { MapContainer } from './MapContainer'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

// `MapContainer` never imports maplibre-gl (or any map engine) itself — the
// map canvas is supplied by the caller as `children`, so a plain placeholder
// is a realistic, engine-agnostic fixture (same approach as the a11y sweep).

describe('MapContainer', () => {
  it('renders the caller-supplied map canvas as children', () => {
    render(
      <MapContainer>
        <div data-testid="map-canvas" />
      </MapContainer>,
    )
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
  })

  it('renders no control clusters when no controls are configured (empty state)', () => {
    render(
      <MapContainer>
        <div />
      </MapContainer>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the overlay content when given', () => {
    render(
      <MapContainer overlay={<div data-testid="popup">Vehicle popup</div>}>
        <div />
      </MapContainer>,
    )
    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })

  it('renders only the configured top-start controls and fires their callbacks', () => {
    const onSearch = vi.fn()
    const onDropPin = vi.fn()
    const onRecenter = vi.fn()
    render(
      <MapContainer controls={{ onSearch, onDropPin, onRecenter }}>
        <div />
      </MapContainer>,
    )
    screen.getByRole('button', { name: 'Search the map' }).click()
    screen.getByRole('button', { name: 'Drop a pin' }).click()
    screen.getByRole('button', { name: 'Recenter' }).click()
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onDropPin).toHaveBeenCalledTimes(1)
    expect(onRecenter).toHaveBeenCalledTimes(1)
    // top-end / bottom clusters weren't configured — absent entirely.
    expect(screen.queryByRole('button', { name: 'Layers' })).not.toBeInTheDocument()
  })

  it('renders only the configured top-end controls, reflecting active tint, and fires their callbacks', () => {
    const onToggleLayers = vi.fn()
    const onToggleTraffic = vi.fn()
    const onToggleGeofence = vi.fn()
    render(
      <MapContainer
        controls={{ onToggleLayers, layersActive: true, onToggleTraffic, onToggleGeofence }}
      >
        <div />
      </MapContainer>,
    )
    const layers = screen.getByRole('button', { name: 'Layers' })
    expect(layers).toHaveAttribute('aria-pressed', 'true')
    layers.click()
    screen.getByRole('button', { name: 'Traffic' }).click()
    screen.getByRole('button', { name: 'Geofences' }).click()
    expect(onToggleLayers).toHaveBeenCalledTimes(1)
    expect(onToggleTraffic).toHaveBeenCalledTimes(1)
    expect(onToggleGeofence).toHaveBeenCalledTimes(1)
  })

  it('toggles the markers visibility control between Hide and Show, firing its callback', () => {
    const onToggleMarkers = vi.fn()
    const { rerender } = render(
      <MapContainer controls={{ onToggleMarkers, markersHidden: false }}>
        <div />
      </MapContainer>,
    )
    const hideButton = screen.getByRole('button', { name: 'Hide markers' })
    hideButton.click()
    expect(onToggleMarkers).toHaveBeenCalledTimes(1)

    rerender(
      <MapContainer controls={{ onToggleMarkers, markersHidden: true }}>
        <div />
      </MapContainer>,
    )
    expect(screen.getByRole('button', { name: 'Show markers' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders the zoom + fullscreen cluster and fires each callback', () => {
    const onZoomIn = vi.fn()
    const onZoomOut = vi.fn()
    const onFullscreen = vi.fn()
    render(
      <MapContainer controls={{ onZoomIn, onZoomOut, onFullscreen }}>
        <div />
      </MapContainer>,
    )
    screen.getByRole('button', { name: 'Zoom in' }).click()
    screen.getByRole('button', { name: 'Zoom out' }).click()
    screen.getByRole('button', { name: 'Fullscreen' }).click()
    expect(onZoomIn).toHaveBeenCalledTimes(1)
    expect(onZoomOut).toHaveBeenCalledTimes(1)
    expect(onFullscreen).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations with every control cluster populated (fully populated state)', async () => {
    render(
      <MapContainer
        controls={{
          onSearch: () => {},
          onDropPin: () => {},
          onRecenter: () => {},
          onToggleLayers: () => {},
          layersActive: true,
          onToggleTraffic: () => {},
          onToggleGeofence: () => {},
          onToggleMarkers: () => {},
          onZoomIn: () => {},
          onZoomOut: () => {},
          onFullscreen: () => {},
        }}
        overlay={<div>Vehicle popup</div>}
      >
        <div aria-label="Map canvas placeholder" role="img" />
      </MapContainer>,
    )
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  /* Round-1 visual #22 / #41 + invoker decisions 1 & 2. */
  it('routes an unavailable tool to onUnavailableTool instead of toggling it', () => {
    const onToggleTraffic = vi.fn()
    const onUnavailableTool = vi.fn()
    render(
      <MapContainer
        controls={{
          onToggleTraffic,
          unavailableTools: [{ tool: 'traffic', message: 'Traffic is not wired up here.' }],
          onUnavailableTool,
        }}
      >
        <div />
      </MapContainer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Traffic' }))
    expect(onToggleTraffic).not.toHaveBeenCalled()
    expect(onUnavailableTool).toHaveBeenCalledWith('traffic', 'Traffic is not wired up here.')
  })

  it('turns the search tile into a place combobox when the caller supplies places', () => {
    const onPlaceSelect = vi.fn()
    render(
      <MapContainer
        controls={{
          places: [{ id: 'p1', name: 'North Depot', position: [55.1, 25.1] }],
          onPlaceSelect,
        }}
      >
        <div />
      </MapContainer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Search map' }))
    fireEvent.click(screen.getByRole('option', { name: /North Depot/ }))
    expect(onPlaceSelect).toHaveBeenCalledWith({ id: 'p1', name: 'North Depot', position: [55.1, 25.1] })
  })

  it('turns the layers tile into a style switcher when basemap styles are supplied', () => {
    const onBasemapStyleChange = vi.fn()
    render(
      <MapContainer
        controls={{
          basemapStyles: [
            { id: 'a', label: 'Muted' },
            { id: 'b', label: 'Bright' },
          ],
          activeBasemapStyleId: 'a',
          onBasemapStyleChange,
        }}
      >
        <div />
      </MapContainer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Map layers' }))
    fireEvent.click(screen.getByRole('option', { name: /Bright/ }))
    expect(onBasemapStyleChange).toHaveBeenCalledWith('b')
  })

  it('renders the POI tool alongside zones on the top-end stack', () => {
    render(
      <MapContainer controls={{ onTogglePoi: vi.fn(), onToggleGeofence: vi.fn() }}>
        <div />
      </MapContainer>,
    )
    expect(screen.getByRole('button', { name: 'Points of interest' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Geofences' })).toBeInTheDocument()
  })
})
