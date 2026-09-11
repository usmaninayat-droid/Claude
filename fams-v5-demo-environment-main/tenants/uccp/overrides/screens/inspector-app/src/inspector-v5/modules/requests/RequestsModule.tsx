import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapViewHandle } from '@ds/components/map/types';
import { HybridView } from '../../shell/HybridView';
import { MapCanvas, priorityToDotColor, type CanvasMarkerInput } from '../../components/MapCanvas';
import { RequestsListPanel } from './RequestsListPanel';
import { IncidentDetailSheet } from './IncidentDetailSheet';
import { useIncidentMapScene } from '../plans/PlanMapScene';
import { useInspectorStore } from '../../data/store';

/**
 * RequestsModule — composes HybridView: RequestsListPanel + MapCanvas.
 *
 * USER REQUIREMENT: mirrors the Plan Monitoring "watch on map" UX
 * (`PlansModule`/`PlanMapScene`) for incidents that have `linkedDailyPlanIds`
 * — clicking that incident's card body (or its own dot marker) toggles a
 * live scene of its linked plan(s) on the map (tanker badge(s) + capsules +
 * discharge route + a red zone centered on the incident) instead of opening
 * the detail sheet; the eye button is the only way to open
 * `IncidentDetailSheet` for those. Incidents WITHOUT linked plans keep the
 * original behaviour unchanged: select + flyTo + auto-open the detail
 * sheet.
 */
export function RequestsModule() {
  const { incidents, plans, selectedIncidentId, selectIncident } = useInspectorStore();
  const mapRef = useRef<MapViewHandle>(null);
  const [detailsIncidentId, setDetailsIncidentId] = useState<string | null>(null);

  const watched = incidents.find((i) => i.id === selectedIncidentId) ?? null;
  const detailsIncident = incidents.find((i) => i.id === detailsIncidentId) ?? null;
  const scene = useIncidentMapScene(watched, plans);

  const baseMarkers: CanvasMarkerInput[] = incidents.map((incident) => ({
    id: incident.id,
    position: [incident.lat, incident.lng],
    dotColor: priorityToDotColor(incident.priority),
    label: incident.id,
    tooltip: incident.title,
  }));

  // Fly/fit the camera to the watched incident's linked-plan scene the
  // moment it's selected (mirrors PlansModule).
  useEffect(() => {
    if (scene) mapRef.current?.fitTo(scene.fitPoints, { padding: 80, maxZoom: 15 });
  }, [scene]);

  const handleToggleOrSelect = useCallback(
    (id: string) => {
      const incident = incidents.find((i) => i.id === id);
      if (!incident) return;
      if (incident.linkedDailyPlanIds.length > 0) {
        // Linked-plan incident — card body / marker click toggles the
        // map-watch scene only; the detail sheet never auto-opens.
        selectIncident(selectedIncidentId === id ? null : id);
      } else {
        // No linked plans — original behaviour: select + flyTo + open the
        // detail sheet.
        selectIncident(id);
        setDetailsIncidentId(id);
        mapRef.current?.flyTo([incident.lat, incident.lng]);
      }
    },
    [incidents, selectedIncidentId, selectIncident],
  );

  const handleMarkerSelect = useCallback(
    (id: string) => {
      if (scene) {
        // Clicking any marker within the active incident scene (tanker,
        // discharge, or the shared incident dot) just re-confirms the
        // already-watched incident and scrolls its row into view.
        const row = document.querySelector(`[data-incident-id="${selectedIncidentId}"]`);
        row?.scrollIntoView({ block: 'nearest' });
        return;
      }
      handleToggleOrSelect(id);
      const row = document.querySelector(`[data-incident-id="${id}"]`);
      row?.scrollIntoView({ block: 'nearest' });
    },
    [scene, selectedIncidentId, handleToggleOrSelect],
  );

  return (
    <>
      <HybridView
        list={
          <RequestsListPanel
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelect={handleToggleOrSelect}
            onViewDetails={setDetailsIncidentId}
          />
        }
        map={
          <MapCanvas
            ref={mapRef}
            markers={scene ? scene.markers : baseMarkers}
            zones={scene ? scene.zones : undefined}
            routes={scene ? scene.routes : undefined}
            selectedId={scene ? undefined : selectedIncidentId}
            onSelect={handleMarkerSelect}
          />
        }
      />

      {detailsIncident ? (
        <IncidentDetailSheet
          open={!!detailsIncident}
          onOpenChange={(open) => {
            if (!open) setDetailsIncidentId(null);
          }}
          incident={detailsIncident}
        />
      ) : null}
    </>
  );
}
