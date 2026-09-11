/**
 * Navigation + overlay orchestration. Holds the active rail route and an overlay
 * set (overlays can stack — e.g. the Report-Incident flow opens on top of the
 * New-Inspection flow when raising an observation). Screens trigger navigation
 * via `useNav()`; the overlays themselves are rendered here.
 */
import * as React from 'react';
import { ReportIncidentFlow } from '../flows/ReportIncident';
import { NewInspectionFlow } from '../flows/NewInspection';
import { IncidentDetailFlow } from '../flows/IncidentDetail';
import { InspectionDetailFlow } from '../flows/InspectionDetail';
import type { GeoPoint, KpiCategory, ServiceType } from '../data/types';

export type Route = 'home' | 'incidents' | 'inspections';

/** Options accepted by `openReportIncident` — a "full" flow (default) or the
 *  "detail-only" mode used when reporting from inside an in-progress inspection. */
export interface OpenReportIncidentOpts {
  sourceInspectionId?: string;
  mode?: 'full' | 'detail';
  presetCategory?: KpiCategory;
  zoneId?: string;
  /** The source inspection's ESP, so the incident is attributed to the right
   *  contractor when the zone is served by more than one. */
  espId?: string;
  location?: GeoPoint;
}

/** Task context used to prefill the New Inspection flow when launched from a
 *  Home / My Tasks card ("Start"). */
export interface NewInspectionTaskContext {
  taskId?: string;
  lotNo?: number;
  sectors?: string[];
  zoneId?: string;
  espId?: string;
  serviceType?: ServiceType;
}

interface NavValue {
  route: Route;
  setRoute: (r: Route) => void;
  openReportIncident: (opts?: OpenReportIncidentOpts) => void;
  openNewInspection: (task?: NewInspectionTaskContext) => void;
  openIncident: (id: string) => void;
  openInspection: (id: string) => void;
}

const NavCtx = React.createContext<NavValue | null>(null);

export function useNav(): NavValue {
  const v = React.useContext(NavCtx);
  if (!v) throw new Error('useNav must be used within <NavProvider>');
  return v;
}

interface Overlays {
  reportIncident?: OpenReportIncidentOpts;
  newInspection?: NewInspectionTaskContext | true;
  incidentDetail?: string;
  inspectionDetail?: string;
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = React.useState<Route>('home');
  const [ov, setOv] = React.useState<Overlays>({});

  const value = React.useMemo<NavValue>(() => ({
    route,
    setRoute,
    openReportIncident: (opts) => setOv((o) => ({ ...o, reportIncident: { ...opts } })),
    openNewInspection: (task) => setOv((o) => ({ ...o, newInspection: task ?? true })),
    openIncident: (id) => setOv((o) => ({ ...o, incidentDetail: id })),
    openInspection: (id) => setOv((o) => ({ ...o, inspectionDetail: id })),
  }), [route]);

  return (
    <NavCtx.Provider value={value}>
      {children}

      {/* Base-level overlays */}
      {ov.incidentDetail && (
        <IncidentDetailFlow incidentId={ov.incidentDetail} onClose={() => setOv((o) => ({ ...o, incidentDetail: undefined }))} />
      )}
      {ov.inspectionDetail && (
        <InspectionDetailFlow inspectionId={ov.inspectionDetail} onClose={() => setOv((o) => ({ ...o, inspectionDetail: undefined }))} />
      )}
      {ov.newInspection && (
        <NewInspectionFlow
          task={ov.newInspection === true ? undefined : ov.newInspection}
          onClose={() => setOv((o) => ({ ...o, newInspection: undefined }))}
          onReportIncident={(opts) => setOv((o) => ({ ...o, reportIncident: opts }))}
        />
      )}
      {/* Report-incident sits on top so it can stack over the inspection flow
          (rendered last → highest paint order / effectively higher z-index). */}
      {ov.reportIncident && (
        <ReportIncidentFlow
          sourceInspectionId={ov.reportIncident.sourceInspectionId}
          mode={ov.reportIncident.mode}
          presetCategory={ov.reportIncident.presetCategory}
          prefillZoneId={ov.reportIncident.zoneId}
          prefillEspId={ov.reportIncident.espId}
          prefillLocation={ov.reportIncident.location}
          onClose={() => setOv((o) => ({ ...o, reportIncident: undefined }))}
        />
      )}
    </NavCtx.Provider>
  );
}
