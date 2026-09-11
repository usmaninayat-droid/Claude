import { type ReactNode } from 'react'
import { Layers, RotateCw, Eye, EyeOff } from '../../icons'
import { cn } from '../../lib/cn'
import {
  MapControlGroup,
  MapIconButton,
  MapLayersControl,
  MapSearchControl,
  MapZoomControl,
  findUnavailableTool,
  type MapBasemapStyle,
  type MapPlace,
  type MapUnavailableTool,
} from './MapControls'
import {
  MarkerPin05Icon,
  Pin01Icon,
  SearchRefractionIcon,
  TrafficLightsIcon,
  ZonesIcon,
} from './map-glyphs'

/**
 * MapContainer — the reusable, engine-agnostic map chrome shell from the Live
 * Monitoring Figma. It lays out the full-bleed map surface plus the four corner
 * control clusters (per the spec §1):
 *
 *   top-start   : `search-refraction` · `pin-01` · `refresh-cw-01`
 *   top-end     : layers (style switcher) · `traffic-lights` · `marker-pin-05`
 *                 (POI) · `zones`
 *   bottom-start: Hide/Show markers (`eye-off`)
 *   bottom-end  : Zoom +/− pill · Fullscreen
 *
 * The top-end glyphs are the Untitled-UI marks the Figma names, not lucide
 * near-misses — round 1 shipped a traffic CONE, a bank and a pin-with-person
 * (visual finding #22), and `pin-01` as a blue location marker instead of a
 * grey thumbtack (#41). See `map-glyphs.tsx`.
 *
 * The map engine (MapLibre/Mapbox) and the marker layer are supplied by the
 * caller as `children` (the map canvas) — this component only owns the chrome so
 * any map module reuses the exact same control layout, radius, and shadow tokens.
 *
 * Every control is opt-in: pass a handler to render its tile, omit it to hide it.
 * `active` flags tint the relevant tile primary (e.g. Layers on by default).
 */

export interface MapControlConfig {
  /** Render + wire the control. Omit a handler to hide that control. */
  onSearch?: () => void
  /**
   * Place-search source (invoker decision 2 / SPEC 3.18). When supplied, the
   * top-start search tile becomes a `MapSearchControl` combobox over these
   * places instead of a bare button. ALWAYS caller-supplied — the design
   * system ships no gazetteer and does no geocoding.
   */
  places?: MapPlace[]
  onPlaceSelect?: (place: MapPlace) => void
  onDropPin?: () => void
  onRecenter?: () => void
  /**
   * Basemap styles for the layers control (SPEC 3.19 / interaction 19b). With
   * two or more the tile becomes a STYLE SWITCHER; `onToggleLayers` remains
   * for callers that still want the binary control.
   */
  basemapStyles?: MapBasemapStyle[]
  activeBasemapStyleId?: string
  onBasemapStyleChange?: (id: string) => void
  onToggleLayers?: () => void
  layersActive?: boolean
  onToggleTraffic?: () => void
  trafficActive?: boolean
  /** POI tool (`marker-pin-05`). */
  onTogglePoi?: () => void
  poiActive?: boolean
  onToggleGeofence?: () => void
  geofenceActive?: boolean
  onToggleMarkers?: () => void
  /** True when markers are currently hidden (flips the eye icon + active tint). */
  markersHidden?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFullscreen?: () => void
  /**
   * Tools that render and stay interactive but have no data source in THIS
   * deployment (invoker decision 1 / SPEC 3.19). Activating one does not
   * toggle — `onUnavailableTool` fires with the caller's message so the app
   * raises its own toast. Match by tool id: `search` · `pin` · `refresh` ·
   * `layers` · `traffic` · `poi` · `zones` · `markers`.
   */
  unavailableTools?: MapUnavailableTool[]
  onUnavailableTool?: (tool: string, message: string) => void
}

export interface MapContainerProps {
  /** The map canvas / engine element (e.g. a react-map-gl <Map> or a div). */
  children: ReactNode
  /** Which controls to render + their handlers. */
  controls?: MapControlConfig
  /** Extra overlay content (popups already positioned by the engine, etc.). */
  overlay?: ReactNode
  className?: string
}

export function MapContainer({
  children,
  controls = {},
  overlay,
  className,
}: MapContainerProps) {
  const {
    onSearch,
    places,
    onPlaceSelect,
    onDropPin,
    onRecenter,
    basemapStyles,
    activeBasemapStyleId,
    onBasemapStyleChange,
    onToggleLayers,
    layersActive = false,
    onToggleTraffic,
    trafficActive = false,
    onTogglePoi,
    poiActive = false,
    onToggleGeofence,
    geofenceActive = false,
    onToggleMarkers,
    markersHidden = false,
    onZoomIn,
    onZoomOut,
    onFullscreen,
    unavailableTools,
    onUnavailableTool,
  } = controls

  /** `undefined` when the tool is available in this deployment. */
  const unavailable = (tool: string) => findUnavailableTool(unavailableTools, tool)?.message
  const report = (tool: string) => (message: string) => onUnavailableTool?.(tool, message)

  const searchAsCombobox = Boolean(places || onPlaceSelect)
  const layersAsSwitcher = Boolean(basemapStyles && basemapStyles.length > 0)
  const hasTopStart = onSearch || searchAsCombobox || onDropPin || onRecenter
  const hasTopEnd =
    onToggleLayers || layersAsSwitcher || onToggleTraffic || onTogglePoi || onToggleGeofence
  const hasBottomEnd = onZoomIn || onZoomOut || onFullscreen

  return (
    <div className={cn('relative h-full w-full', className)}>
      {children}

      {/* Corner control chrome (overlay, click-through where empty). */}
      <div className="pointer-events-none absolute inset-0">
        {hasTopStart ? (
          <div className="pointer-events-auto absolute start-4 top-4">
            <MapControlGroup>
              {searchAsCombobox ? (
                <MapSearchControl
                  places={places}
                  onPlaceSelect={onPlaceSelect}
                  onOpenChange={(open) => {
                    if (open) onSearch?.()
                  }}
                  unavailableMessage={unavailable('search')}
                  onUnavailable={report('search')}
                />
              ) : onSearch ? (
                <MapIconButton
                  label="Search the map"
                  onClick={onSearch}
                  unavailableMessage={unavailable('search')}
                  onUnavailable={report('search')}
                >
                  <SearchRefractionIcon />
                </MapIconButton>
              ) : null}
              {onDropPin ? (
                <MapIconButton
                  label="Drop a pin"
                  onClick={onDropPin}
                  unavailableMessage={unavailable('pin')}
                  onUnavailable={report('pin')}
                >
                  {/* `pin-01` is a grey THUMBTACK, not a location marker (#41). */}
                  <Pin01Icon />
                </MapIconButton>
              ) : null}
              {onRecenter ? (
                <MapIconButton
                  label="Recenter"
                  onClick={onRecenter}
                  unavailableMessage={unavailable('refresh')}
                  onUnavailable={report('refresh')}
                >
                  <RotateCw />
                </MapIconButton>
              ) : null}
            </MapControlGroup>
          </div>
        ) : null}

        {hasTopEnd ? (
          <div className="pointer-events-auto absolute end-4 top-4">
            <MapControlGroup>
              {layersAsSwitcher ? (
                <MapLayersControl
                  styles={basemapStyles ?? []}
                  activeStyleId={activeBasemapStyleId}
                  onStyleChange={onBasemapStyleChange}
                  unavailableMessage={unavailable('layers')}
                  onUnavailable={report('layers')}
                />
              ) : onToggleLayers ? (
                <MapIconButton
                  label="Layers"
                  active={layersActive}
                  onClick={onToggleLayers}
                  unavailableMessage={unavailable('layers')}
                  onUnavailable={report('layers')}
                >
                  <Layers />
                </MapIconButton>
              ) : null}
              {onToggleTraffic ? (
                <MapIconButton
                  label="Traffic"
                  active={trafficActive}
                  onClick={onToggleTraffic}
                  unavailableMessage={unavailable('traffic')}
                  onUnavailable={report('traffic')}
                >
                  <TrafficLightsIcon />
                </MapIconButton>
              ) : null}
              {onTogglePoi ? (
                <MapIconButton
                  label="Points of interest"
                  active={poiActive}
                  onClick={onTogglePoi}
                  unavailableMessage={unavailable('poi')}
                  onUnavailable={report('poi')}
                >
                  <MarkerPin05Icon />
                </MapIconButton>
              ) : null}
              {onToggleGeofence ? (
                <MapIconButton
                  label="Geofences"
                  active={geofenceActive}
                  onClick={onToggleGeofence}
                  unavailableMessage={unavailable('zones')}
                  onUnavailable={report('zones')}
                >
                  <ZonesIcon />
                </MapIconButton>
              ) : null}
            </MapControlGroup>
          </div>
        ) : null}

        {onToggleMarkers ? (
          <div className="pointer-events-auto absolute bottom-4 start-4">
            <MapIconButton
              label={markersHidden ? 'Show markers' : 'Hide markers'}
              active={markersHidden}
              onClick={onToggleMarkers}
              unavailableMessage={unavailable('markers')}
              onUnavailable={report('markers')}
            >
              {markersHidden ? <Eye /> : <EyeOff />}
            </MapIconButton>
          </div>
        ) : null}

        {hasBottomEnd ? (
          <div className="pointer-events-auto absolute bottom-4 end-4">
            <MapZoomControl
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onFullscreen={onFullscreen}
            />
          </div>
        ) : null}

        {overlay ? <div className="pointer-events-auto">{overlay}</div> : null}
      </div>
    </div>
  )
}
