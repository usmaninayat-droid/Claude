/**
 * Incidents screen — Kanban + List view of all incidents.
 * Tablet landscape, fills the content area with internal scroll.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import {
  Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Badge,
} from '@ds/components/primitives';
import { DataTable, type DataTableColumn, KanbanBoard, KanbanColumn, KanbanCard } from '@ds/components/data-display';
import { useIims } from '@/store/store';
import { useNav } from '@/app/nav';
import {
  IncidentStatusPill, SeverityPill, AvatarChip,
  formatDate, slaLabel,
} from '@/lib/ui';
import {
  INCIDENT_STATUS,
  INCIDENT_STATUS_ORDER,
  SEVERITY,
} from '@/data/status';
import type { Incident, IncidentStatus } from '@/data/types';

/* ──────────────────────────────────────────────────────────────────────────
   Kanban Card
   ────────────────────────────────────────────────────────────────────────── */
function IncidentCard({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const s = useIims();
  const zone = s.zone(incident.zoneId);
  const esp = s.esp(incident.espId);
  const reporter = s.inspector(incident.reportedByInspectorId);
  const sla = slaLabel(incident.slaDueAt, s.now);
  const sev = SEVERITY[incident.severity];

  const avatars = [
    esp && { letter: esp.name[0].toUpperCase(), color: esp.avatarColor },
    reporter && { letter: reporter.name[0].toUpperCase(), color: reporter.avatarColor },
  ].filter(Boolean) as { letter: string; color: string }[];

  return (
    <KanbanCard
      onClick={onClick}
      className="cursor-pointer"
      ticketId={incident.id.replace('INC-2026-', '#')}
      priority={sev.label}
      priorityConfig={{
        bg: `color-mix(in srgb, ${sev.color} 14%, transparent)`,
        text: sev.color, flagFill: sev.color, flagStroke: sev.color,
      }}
      type={incident.zeroTolerance ? 'Zero Tolerance' : incident.category}
      typeConfig={incident.zeroTolerance
        ? { bg: 'color-mix(in srgb, var(--status-error) 14%, transparent)', text: 'var(--status-error)' }
        : { bg: 'var(--secondary)', text: 'var(--secondary-foreground)' }}
      title={incident.title}
      metadataFields={[
        { icon: 'MapPin', value: zone?.name ?? '—' },
        { icon: 'Tag', value: incident.category },
      ]}
      avatars={avatars}
      dateLabel={sla.text}
      isOverdue={sla.overdue}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Kanban Column
   ────────────────────────────────────────────────────────────────────────── */
function IncidentColumn({
  status,
  incidents,
  onCardClick,
}: {
  status: IncidentStatus;
  incidents: Incident[];
  onCardClick: (id: string) => void;
}) {
  const meta = INCIDENT_STATUS[status];

  return (
    <KanbanColumn id={status} label={meta.label} count={incidents.length} color={meta.color} variant="board">
      {incidents.length === 0 ? (
        <p className="py-4 text-center text-caption text-muted-foreground">No incidents</p>
      ) : (
        incidents.map((inc) => (
          <IncidentCard key={inc.id} incident={inc} onClick={() => onCardClick(inc.id)} />
        ))
      )}
    </KanbanColumn>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   List columns
   ────────────────────────────────────────────────────────────────────────── */
function buildListColumns(s: ReturnType<typeof useIims>): DataTableColumn<Incident>[] {
  return [
    {
      id: 'id',
      header: 'ID',
      accessor: (r) => r.id,
      width: '130px',
      sortable: true,
    },
    {
      id: 'title',
      header: 'Title',
      accessor: (r) => r.title,
      sortable: true,
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (r) => r.category,
      width: '160px',
      sortable: true,
    },
    {
      id: 'zone',
      header: 'Zone',
      accessor: (r) => s.zone(r.zoneId)?.name ?? r.zoneId,
      width: '140px',
      sortable: true,
    },
    {
      id: 'esp',
      header: 'ESP',
      width: '160px',
      cell: (r) => {
        const esp = s.esp(r.espId);
        if (!esp) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <AvatarChip name={esp.name} color={esp.avatarColor} size={22} />
            <span className="text-body-sm truncate">{esp.name}</span>
          </div>
        );
      },
    },
    {
      id: 'severity',
      header: 'Severity',
      width: '110px',
      cell: (r) => <SeverityPill severity={r.severity} size="sm" />,
    },
    {
      id: 'status',
      header: 'Status',
      width: '200px',
      cell: (r) => <IncidentStatusPill status={r.status} size="sm" />,
    },
    {
      id: 'slaDueAt',
      header: 'SLA Due',
      width: '130px',
      sortable: true,
      cell: (r) => {
        const sla = slaLabel(r.slaDueAt, s.now);
        return (
          <span className={sla.overdue ? 'text-[var(--status-error)] font-medium' : 'text-foreground'}>
            {sla.text}
          </span>
        );
      },
    },
    {
      id: 'reportedAt',
      header: 'Reported',
      width: '120px',
      accessor: (r) => formatDate(r.reportedAt),
      sortable: true,
    },
  ];
}

/* ──────────────────────────────────────────────────────────────────────────
   Main Screen
   ────────────────────────────────────────────────────────────────────────── */
export function Incidents() {
  const s = useIims();
  const nav = useNav();

  const [view, setView] = React.useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = React.useState('');
  const [zoneFilter, setZoneFilter] = React.useState<string>('all');
  const [severityFilter, setSeverityFilter] = React.useState<string>('all');

  const allIncidents = s.data.incidents;

  /* Derived zone list for filter */
  const zoneOptions = React.useMemo(() => {
    const ids = Array.from(new Set(allIncidents.map((i) => i.zoneId)));
    return ids.map((id) => ({ id, name: s.zone(id)?.name ?? id }));
  }, [allIncidents, s]);

  /* Filtered incidents */
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return allIncidents.filter((inc) => {
      if (zoneFilter !== 'all' && inc.zoneId !== zoneFilter) return false;
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
      if (q) {
        const zone = s.zone(inc.zoneId);
        const esp = s.esp(inc.espId);
        const haystack = [inc.id, inc.title, inc.category, zone?.name, esp?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allIncidents, zoneFilter, severityFilter, search, s]);

  /* Group by status for kanban */
  const byStatus = React.useMemo(() => {
    const map: Record<IncidentStatus, Incident[]> = {
      awaiting_rectification: [],
      rectification_submitted: [],
      escalated: [],
      awaiting_esp_re_rectification: [],
      re_rectification_submitted: [],
      closed: [],
      invalid: [],
    };
    for (const inc of filtered) map[inc.status].push(inc);
    return map;
  }, [filtered]);

  const listColumns = React.useMemo(() => buildListColumns(s), [s]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
        {/* Title + count */}
        <h1 className="text-h5 font-semibold text-foreground whitespace-nowrap">Incidents</h1>
        <Badge variant="secondary" size="sm">{allIncidents.length}</Badge>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-56">
          <Icons.SearchMd size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-body-sm"
            placeholder="Search incidents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Zone filter */}
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="h-8 w-40 text-body-sm">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zoneOptions.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Severity filter */}
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 w-36 text-body-sm">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
          <TabsList className="h-8">
            <TabsTrigger value="kanban" className="flex items-center gap-1.5 px-3 text-body-sm">
              <Icons.LayoutAlt01 size={14} />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1.5 px-3 text-body-sm">
              <Icons.List size={14} />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {view === 'kanban' ? (
          <KanbanBoard className="h-full p-4">
            {INCIDENT_STATUS_ORDER.map((status) => (
              <IncidentColumn
                key={status}
                status={status}
                incidents={byStatus[status]}
                onCardClick={(id) => nav.openIncident(id)}
              />
            ))}
          </KanbanBoard>
        ) : (
          /* List view */
          <div className="h-full overflow-auto p-4">
            <DataTable<Incident>
              columns={listColumns}
              data={filtered}
              getRowId={(r) => r.id}
              onRowClick={(r) => nav.openIncident(r.id)}
              stickyHeader
              emptyState={
                <div className="py-12 text-center text-body-sm text-muted-foreground">
                  No incidents match the current filters.
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
