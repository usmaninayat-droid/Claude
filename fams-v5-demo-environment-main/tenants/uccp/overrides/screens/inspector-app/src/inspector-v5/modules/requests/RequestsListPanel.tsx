import { useMemo, useState } from 'react';
import { ListPanelHeader } from '../../shell/ListPanelHeader';
import { IncidentCard } from './IncidentCard';
import { INCIDENT_STATUS_META, INCIDENT_PIPELINE } from '../../data/status';
import type { Incident } from '../../data/types';

export interface RequestsListPanelProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  /** Card-body click — toggles the map-watch scene for a linked-plan
   *  incident, or selects (+ opens details) a plain one. */
  onSelect: (id: string) => void;
  /** Eye-icon click — opens the full IncidentDetailSheet for that incident. */
  onViewDetails: (id: string) => void;
}

/**
 * RequestsListPanel — 1:1 rebuild of the FAMS V5 web hybrid list panel:
 * full toolbar (search/filter/download/create + sort/group/assignee +
 * Sync With Map) above a status-grouped, scrollable IncidentCard list with
 * uppercase group headers ordered by the incident pipeline.
 */
export function RequestsListPanel({ incidents, selectedIncidentId, onSelect, onViewDetails }: RequestsListPanelProps) {
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [syncWithMap, setSyncWithMap] = useState(false);

  const assigneeOptions = useMemo(() => {
    const names = Array.from(new Set(incidents.map((i) => i.assignedInspector).filter(Boolean)));
    return names.sort().map((name) => ({ value: name, label: name }));
  }, [incidents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      if (q) {
        const haystack = `${incident.title} ${incident.id} ${incident.location}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (assignee && incident.assignedInspector !== assignee) return false;
      return true;
    });
  }, [incidents, search, assignee]);

  const grouped = useMemo(() => {
    const byStatus = new Map<string, Incident[]>();
    for (const status of INCIDENT_PIPELINE) byStatus.set(status, []);
    for (const incident of filtered) {
      if (!byStatus.has(incident.status)) byStatus.set(incident.status, []);
      byStatus.get(incident.status)!.push(incident);
    }
    return Array.from(byStatus.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <ListPanelHeader
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Requests & Complaints"
        assigneeOptions={assigneeOptions}
        assigneeValue={assignee}
        onAssigneeChange={setAssignee}
        syncWithMap={syncWithMap}
        onSyncWithMapChange={setSyncWithMap}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-3 fams-hide-scrollbar">
        {grouped.map(([status, items]) => (
          <div key={status} className="flex flex-col gap-3">
            <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {INCIDENT_STATUS_META[status as keyof typeof INCIDENT_STATUS_META]?.label ?? status}
            </div>
            <div className="flex flex-col gap-3">
              {items.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  selected={incident.id === selectedIncidentId}
                  watching={incident.id === selectedIncidentId}
                  onClick={() => onSelect(incident.id)}
                  onViewDetails={() => onViewDetails(incident.id)}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-body-sm text-muted-foreground">
            No matching requests.
          </div>
        ) : null}
      </div>
    </div>
  );
}
