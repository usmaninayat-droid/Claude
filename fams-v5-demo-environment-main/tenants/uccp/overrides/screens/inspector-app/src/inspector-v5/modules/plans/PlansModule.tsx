import { useCallback, useEffect, useRef, useState } from 'react';
import { HybridView } from '../../shell/HybridView';
import { MapCanvas, planStatusToDotColor, type CanvasMarkerInput } from '../../components/MapCanvas';
import type { MapViewHandle } from '@ds/components/map/types';
import { PlansListPanel } from './PlansListPanel';
import { PlanDetailSheet } from './PlanDetailSheet';
import { usePlanMapScene } from './PlanMapScene';
import { useInspectorStore } from '../../data/store';

/**
 * PlansModule — composes HybridView: PlansListPanel + MapCanvas.
 *
 * USER REQUIREMENT: selecting a plan card no longer opens the detail sheet —
 * instead the inspector "watches" the plan on the map (tanker + incident +
 * discharge route overlays, replicating the old flood-management demo's
 * task-monitoring map UX — see `PlanMapScene.tsx`). The card's eye button is
 * the only way to open the full `PlanDetailSheet` now; card-body click
 * toggles the map-watch scene (click again to clear it).
 */
export function PlansModule() {
  const { plans, incidents, selectedPlanId, selectPlan } = useInspectorStore();
  const mapRef = useRef<MapViewHandle>(null);
  const [detailsPlanId, setDetailsPlanId] = useState<string | null>(null);

  const watched = plans.find((p) => p.id === selectedPlanId) ?? null;
  const detailsPlan = plans.find((p) => p.id === detailsPlanId) ?? null;
  const scene = usePlanMapScene(watched, incidents);

  const baseMarkers: CanvasMarkerInput[] = plans.map((plan) => ({
    id: plan.id,
    position: [plan.lat, plan.lng],
    dotColor: planStatusToDotColor(plan.status),
    label: plan.id,
    tooltip: `${plan.tanker} — ${plan.driver}`,
  }));

  // Fly/fit the camera to the watched plan's scene the moment it's selected.
  useEffect(() => {
    if (scene) mapRef.current?.fitTo(scene.fitPoints, { padding: 80, maxZoom: 15 });
  }, [scene]);

  const handleToggleWatch = useCallback(
    (id: string) => {
      selectPlan(selectedPlanId === id ? null : id);
    },
    [selectPlan, selectedPlanId],
  );

  const handleMarkerSelect = useCallback(
    (id: string) => {
      // Marker ids on the base (unwatched) map are plain plan ids; scene
      // marker ids are `${planId}-tanker|incident|discharge` — either way,
      // clicking a plan's own pin toggles that plan's watch scene.
      const planId = id.includes('-') ? id.slice(0, id.lastIndexOf('-')) : id;
      const row = document.querySelector(`[data-plan-id="${planId}"]`);
      row?.scrollIntoView({ block: 'nearest' });
      handleToggleWatch(planId);
    },
    [handleToggleWatch],
  );

  return (
    <>
      <HybridView
        list={
          <PlansListPanel
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelect={handleToggleWatch}
            onViewDetails={setDetailsPlanId}
          />
        }
        map={
          <MapCanvas
            ref={mapRef}
            markers={scene ? scene.markers : baseMarkers}
            zones={scene ? scene.zones : undefined}
            routes={scene ? scene.routes : undefined}
            selectedId={scene ? undefined : selectedPlanId}
            onSelect={handleMarkerSelect}
          />
        }
      />

      {detailsPlan ? (
        <PlanDetailSheet
          open={!!detailsPlan}
          onOpenChange={(open) => {
            if (!open) setDetailsPlanId(null);
          }}
          plan={detailsPlan}
        />
      ) : null}
    </>
  );
}
