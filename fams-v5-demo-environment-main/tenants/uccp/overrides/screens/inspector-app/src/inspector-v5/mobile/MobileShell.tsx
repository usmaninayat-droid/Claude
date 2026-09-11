import { useInspectorStore } from '../data/store';
import { priorityToDotColor, planStatusToDotColor } from '../components/MapCanvas';
import {
  IncidentMobileListCard,
  IncidentMobilePeekCard,
  IncidentMobileOverview,
  PlanMobileListCard,
  PlanMobilePeekCard,
  PlanMobileOverview,
} from './MobileRecordViews';
import { RequestsDetailsTab } from '../modules/requests/detail/DetailsTab';
import { RequestsTimelineTab } from '../modules/requests/detail/TimelineTab';
import { RequestsRelatedTasksTab } from '../modules/requests/detail/RelatedTasksTab';
import { PlansDetailsTab } from '../modules/plans/detail/DetailsTab';
import { PlansTimelineTab } from '../modules/plans/detail/TimelineTab';
import { PlansRelatedTasksTab } from '../modules/plans/detail/RelatedTasksTab';
import { BottomNav } from './BottomNav';
import { MobileHybridModule } from './MobileHybridModule';
import { DashboardModule } from '../modules/dashboard/DashboardModule';
import { ProfileModule } from './ProfileModule';
import { usePlanMapScene, useIncidentMapScene } from '../modules/plans/PlanMapScene';
import type { Incident, DailyPlan } from '../data/types';

/** MobileShell — 100dvh app shell for the mobile Inspector experience.
 *  Renders the active module (dashboard, or requests/plans via the shared
 *  MobileHybridModule) above a fixed BottomNav. */
export function MobileShell() {
  const {
    activeModule,
    setActiveModule,
    incidents,
    plans,
    selectedIncidentId,
    selectedPlanId,
    selectIncident,
    selectPlan,
  } = useInspectorStore();

  // Watched-plan live scene (tanker/incident/discharge overlays) — shown
  // behind the mobile Plan Monitoring list/peek sheets whenever a plan is
  // tapped, same overlay as the tablet PlansModule (see PlanMapScene.tsx).
  const watchedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const planScene = usePlanMapScene(watchedPlan, incidents);

  // Watched-incident live scene — same overlay, but for a tapped incident's
  // linked plan(s) (see RequestsModule.tsx for the tablet equivalent). Null
  // for incidents without `linkedDailyPlanIds`, so the sheet-collapse
  // behaviour + plain dot markers stay unchanged for those.
  const watchedIncident = incidents.find((i) => i.id === selectedIncidentId) ?? null;
  const incidentScene = useIncidentMapScene(watchedIncident, plans);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', background: 'var(--card)', overflow: 'hidden' }}>
      {activeModule === 'dashboard' ? (
        <div className="fams-hide-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <DashboardModule isMobile />
        </div>
      ) : activeModule === 'profile' ? (
        <div className="fams-hide-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <ProfileModule />
        </div>
      ) : activeModule === 'requests' ? (
        <MobileHybridModule<Incident>
          title="Requests & Complaints"
          items={incidents}
          getId={(incident) => incident.id}
          getItemTitle={(incident) => incident.title}
          getCenter={(incident) => [incident.lat, incident.lng]}
          markers={
            incidentScene
              ? incidentScene.markers
              : incidents.map((incident) => ({
                  id: incident.id,
                  position: [incident.lat, incident.lng] as [number, number],
                  dotColor: priorityToDotColor(incident.priority),
                }))
          }
          zones={incidentScene?.zones}
          routes={incidentScene?.routes}
          selectedId={selectedIncidentId}
          onSelectItem={selectIncident}
          getSearchText={(incident) =>
            [incident.id, incident.title, incident.location, incident.zone, incident.source, incident.onwani].join(' ')
          }
          searchPlaceholder="Search requests"
          emptyTitle="No open requests"
          emptySubtitle="All clear in your area."
          renderListCard={(incident, selected, onTap) => (
            <IncidentMobileListCard incident={incident} selected={selected} onClick={onTap} />
          )}
          renderPeek={(incident, ctx) => (
            <IncidentMobilePeekCard
              incident={incident}
              onExpand={ctx.onExpand}
              onClose={ctx.onClose}
              dragProps={ctx.dragProps}
            />
          )}
          renderOverview={(incident, ctx) => (
            <IncidentMobileOverview incident={incident} onViewFull={ctx.onViewFull} />
          )}
          renderDetails={(incident) => <RequestsDetailsTab incident={incident} variant="mobile" />}
          renderTimeline={(incident) => <RequestsTimelineTab incident={incident} />}
          renderRelatedTasks={(incident) => <RequestsRelatedTasksTab incident={incident} />}
        />
      ) : (
        <MobileHybridModule<DailyPlan>
          title="Plan Monitoring"
          items={plans}
          getId={(plan) => plan.id}
          getItemTitle={(plan) => plan.title}
          getCenter={(plan) => [plan.lat, plan.lng]}
          markers={
            planScene
              ? planScene.markers
              : plans.map((plan) => ({
                  id: plan.id,
                  position: [plan.lat, plan.lng] as [number, number],
                  dotColor: planStatusToDotColor(plan.status),
                }))
          }
          zones={planScene?.zones}
          routes={planScene?.routes}
          selectedId={selectedPlanId}
          onSelectItem={selectPlan}
          getSearchText={(plan) =>
            [plan.id, plan.title, plan.tanker, plan.driver, plan.zone, plan.blackSpotZone, plan.shift].join(' ')
          }
          searchPlaceholder="Search plans"
          emptyTitle="No plans today"
          emptySubtitle="Scheduled runs will appear here."
          renderListCard={(plan, selected, onTap) => (
            <PlanMobileListCard plan={plan} selected={selected} onClick={onTap} />
          )}
          renderPeek={(plan, ctx) => (
            <PlanMobilePeekCard plan={plan} onExpand={ctx.onExpand} onClose={ctx.onClose} dragProps={ctx.dragProps} />
          )}
          renderOverview={(plan, ctx) => <PlanMobileOverview plan={plan} onViewFull={ctx.onViewFull} />}
          renderDetails={(plan) => <PlansDetailsTab plan={plan} variant="mobile" />}
          renderTimeline={(plan) => <PlansTimelineTab plan={plan} />}
          renderRelatedTasks={(plan) => <PlansRelatedTasksTab plan={plan} />}
        />
      )}
      <BottomNav activeModule={activeModule} onSelect={setActiveModule} />
    </div>
  );
}
