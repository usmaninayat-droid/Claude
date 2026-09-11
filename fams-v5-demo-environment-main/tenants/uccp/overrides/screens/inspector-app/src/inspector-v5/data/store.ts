import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { INCIDENTS } from './incidents';
import { DAILY_PLANS } from './plans';
import type { DailyPlan, Incident, IncidentStatus, Shift } from './types';

export type ActiveModule = 'dashboard' | 'requests' | 'plans' | 'profile';

interface TankerDispatchInput {
  tankers: { tanker: string; driver: string }[];
  shift: Shift;
  plannedStart: string;
  plannedEnd: string;
  blackSpotZone: string;
}

interface InspectorStoreValue {
  incidents: Incident[];
  plans: DailyPlan[];
  selectedIncidentId: string | null;
  selectedPlanId: string | null;
  activeModule: ActiveModule;
  selectIncident: (id: string | null) => void;
  selectPlan: (id: string | null) => void;
  setActiveModule: (module: ActiveModule) => void;
  advanceStatus: (id: string, next: IncidentStatus) => void;
  dispatchTankers: (incidentId: string, input: TankerDispatchInput) => string[];
}

const InspectorStoreContext = createContext<InspectorStoreValue | null>(null);

let planCounter = 9000;

export function InspectorStoreProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(INCIDENTS);
  const [plans, setPlans] = useState<DailyPlan[]>(DAILY_PLANS);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeModule, setActiveModuleState] = useState<ActiveModule>('dashboard');

  const selectIncident = useCallback((id: string | null) => setSelectedIncidentId(id), []);
  const selectPlan = useCallback((id: string | null) => setSelectedPlanId(id), []);
  const setActiveModule = useCallback((module: ActiveModule) => setActiveModuleState(module), []);

  const advanceStatus = useCallback((id: string, next: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? { ...inc, status: next, lastUpdated: new Date().toISOString(), reopened: next === 'reopened' }
          : inc
      )
    );
  }, []);

  const dispatchTankers = useCallback((incidentId: string, input: TankerDispatchInput): string[] => {
    const incident = incidents.find((i) => i.id === incidentId);
    if (!incident) return [];

    const createdIds: string[] = [];
    const newPlans: DailyPlan[] = input.tankers.map(({ tanker, driver }) => {
      planCounter += 1;
      const id = `FPL-${planCounter}`;
      createdIds.push(id);
      return {
        id,
        title: `${input.blackSpotZone} Dispatch`,
        sourcePlan: 'Incident Dispatch',
        blackSpotZone: input.blackSpotZone,
        zone: incident.zone,
        tanker,
        driver,
        inspector: incident.assignedInspector,
        shift: input.shift,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        status: 'Scheduled',
        stopsCompleted: 0,
        stopsTotal: 1,
        compliancePct: 0,
        waterCollectedL: 0,
        lat: incident.lat,
        lng: incident.lng,
        sourceRequestId: incidentId,
        planDate: new Date().toISOString().slice(0, 10),
      };
    });

    setPlans((prev) => [...prev, ...newPlans]);
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'tanker-assigned',
              tankerAssigned: input.tankers[0]?.tanker ?? inc.tankerAssigned,
              tankerCount: input.tankers.length,
              lastUpdated: new Date().toISOString(),
              linkedDailyPlanIds: [...inc.linkedDailyPlanIds, ...createdIds],
            }
          : inc
      )
    );

    return createdIds;
  }, [incidents]);

  const value = useMemo<InspectorStoreValue>(
    () => ({
      incidents,
      plans,
      selectedIncidentId,
      selectedPlanId,
      activeModule,
      selectIncident,
      selectPlan,
      setActiveModule,
      advanceStatus,
      dispatchTankers,
    }),
    [incidents, plans, selectedIncidentId, selectedPlanId, activeModule, selectIncident, selectPlan, setActiveModule, advanceStatus, dispatchTankers]
  );

  return React.createElement(InspectorStoreContext.Provider, { value }, children);
}

export function useInspectorStore(): InspectorStoreValue {
  const ctx = useContext(InspectorStoreContext);
  if (!ctx) throw new Error('useInspectorStore must be used within InspectorStoreProvider');
  return ctx;
}
