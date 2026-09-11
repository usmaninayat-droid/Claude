import { useEffect, useRef, useState } from 'react'
import { TerraDraw, TerraDrawCircleMode, TerraDrawPolygonMode, TerraDrawSelectMode, type HexColor } from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import type maplibregl from 'maplibre-gl'
import type { Feature, Polygon } from 'geojson'
import { resolveZoneDrawColor } from './layers'

/**
 * draw.ts — TerraDraw geofence wiring, kept in its own file per the brief (a
 * distinct third-party integration surface from the deck.gl layers). Behind
 * the `editable` prop: `MapPanel` mounts a `TerraDraw` instance bound to the
 * MapLibre map via `TerraDrawMapLibreGLAdapter`, offering `select` (edit
 * existing shapes) / `polygon` / `circle` modes, and reports completed and
 * in-progress edits up as plain GeoJSON (`onZoneDrawn`/`onZoneChanged`) —
 * TerraDraw's own store/store format never leaks into MapPanel's prop API.
 */

export type DrawMode = 'select' | 'polygon' | 'circle'

export interface UseGeofenceDrawOptions {
  /** Draw/edit is off (and any live TerraDraw instance torn down) unless `true`. */
  editable: boolean
  /** The underlying MapLibre map instance (from `react-map-gl`'s `MapRef.getMap()`),
   *  or `null` before the map has loaded — the hook waits for it. */
  map: maplibregl.Map | null
  /** Draw stroke/fill color — business data, resolved via `resolveZoneDrawColor`. */
  color?: string
  onZoneDrawn?: (geojson: Feature<Polygon>) => void
  onZoneChanged?: (geojson: Feature<Polygon>) => void
}

export interface UseGeofenceDrawResult {
  mode: DrawMode
  setDrawMode: (mode: DrawMode) => void
  clear: () => void
}

const SELECT_FLAGS = {
  polygon: { feature: { draggable: true, coordinates: { draggable: true, deletable: true, midpoints: true } } },
  circle: { feature: { draggable: true, coordinates: { draggable: true } } },
} as const

export function useGeofenceDraw({ editable, map, color, onZoneDrawn, onZoneChanged }: UseGeofenceDrawOptions): UseGeofenceDrawResult {
  const drawRef = useRef<InstanceType<typeof TerraDraw> | null>(null)
  const [mode, setMode] = useState<DrawMode>('select')

  useEffect(() => {
    if (!editable || !map) return
    // `resolveZoneDrawColor` always resolves to a `#rrggbb` literal (every
    // `core.tokens.json` color value is hex) — TerraDraw's `HexColor` is a
    // `#${string}` template type plain `string` can't auto-narrow to.
    const styleHex = resolveZoneDrawColor(color) as HexColor
    const shapeStyles = {
      fillColor: styleHex,
      fillOpacity: 0.18,
      outlineColor: styleHex,
      outlineWidth: 2,
      outlineOpacity: 1,
    }

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawSelectMode({ flags: SELECT_FLAGS }),
        new TerraDrawPolygonMode({ styles: shapeStyles }),
        new TerraDrawCircleMode({ styles: shapeStyles }),
      ],
    })

    const emit = (id: string | number, report?: (f: Feature<Polygon>) => void) => {
      const feature = draw.getSnapshotFeature(id)
      if (feature && feature.geometry.type === 'Polygon') report?.(feature as unknown as Feature<Polygon>)
    }
    const onFinish = (id: string | number) => emit(id, onZoneDrawn)
    const onChange = (ids: (string | number)[], type: string) => {
      if (type !== 'update') return
      ids.forEach((id) => emit(id, onZoneChanged))
    }

    draw.on('finish', onFinish)
    draw.on('change', onChange)
    draw.start()
    draw.setMode('select')
    drawRef.current = draw

    return () => {
      draw.off('finish', onFinish)
      draw.off('change', onChange)
      draw.stop()
      drawRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks intentionally excluded (re-wiring on every render identity change would tear down mid-draw)
  }, [editable, map, color])

  return {
    mode,
    setDrawMode: (next) => {
      drawRef.current?.setMode(next)
      setMode(next)
    },
    clear: () => drawRef.current?.clear(),
  }
}
