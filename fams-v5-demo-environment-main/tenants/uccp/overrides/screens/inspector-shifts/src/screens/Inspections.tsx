/**
 * Inspections screen — tablet landscape, fills content area.
 * List view: DataTable with 8 columns. Kanban view: 3 columns by status.
 * Row / card click → useNav().openInspection(id).
 */
import * as React from 'react';
import {
  Tabs, TabsList, TabsTrigger, Input, Badge,
} from '@ds/components/primitives';
import {
  DataTable, KanbanBoard, KanbanColumn, KanbanCard,
} from '@ds/components/data-display';
import * as Icons from '@ds/icons';
import { useIims } from '@/store/store';
import { useNav } from '@/app/nav';
import {
  InspectionStatusPill, InspectionResultPill, AvatarChip,
  formatDate, formatDateTime,
} from '@/lib/ui';
import type { Inspection } from '@/data/types';
import { INSPECTION_STATUS } from '@/data/status';

/* ----------------------------- helpers ---------------------------------- */
function timeTakenLabel(mins?: number): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* =============================== screen ================================= */
export function Inspections() {
  const s = useIims();
  const nav = useNav();
  const [tab, setTab] = React.useState<'list' | 'kanban'>('list');
  const [search, setSearch] = React.useState('');

  const all = s.data.inspections;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((ins) => {
      const zone = s.zone(ins.zoneId)?.name ?? '';
      const insp = s.inspector(ins.inspectorId)?.name ?? '';
      return (
        ins.title.toLowerCase().includes(q) ||
        ins.id.toLowerCase().includes(q) ||
        zone.toLowerCase().includes(q) ||
        insp.toLowerCase().includes(q)
      );
    });
  }, [all, search, s]);

  /* ---- scheduled / ongoing / completed groups for kanban ---- */
  const scheduled = filtered.filter((i) => i.status === 'scheduled' || i.status === 'overdue');
  const ongoing = filtered.filter((i) => i.status === 'ongoing');
  const completed = filtered.filter((i) => i.status === 'completed');

  /* ---- DataTable column definitions ---- */
  const columns = React.useMemo(() => [
    {
      id: 'title',
      header: 'Inspection Title',
      cell: (row: Inspection) => (
        <span className="font-medium text-foreground">{row.title}</span>
      ),
      width: '220px',
    },
    {
      id: 'observations',
      header: 'Observations',
      cell: (row: Inspection) => (
        <span className="flex items-center gap-1.5 text-body-sm">
          {row.observationIncidentIds.length > 0 && (
            <Icons.AlertTriangle size={14} className="text-[var(--status-warning)]" />
          )}
          <span className={row.observationIncidentIds.length > 0 ? 'font-semibold text-[var(--status-warning)]' : 'text-muted-foreground'}>
            {row.observationIncidentIds.length}
          </span>
        </span>
      ),
      width: '110px',
    },
    {
      id: 'zone',
      header: 'Zone',
      cell: (row: Inspection) => {
        const zone = s.zone(row.zoneId);
        return (
          <span className="flex items-center gap-1 text-body-sm">
            <Icons.MarkerPin01 size={13} className="shrink-0 text-muted-foreground" />
            <span>{zone?.name ?? '—'}</span>
          </span>
        );
      },
      width: '150px',
    },
    {
      id: 'scheduled',
      header: 'Scheduled',
      cell: (row: Inspection) => (
        <span className="text-body-sm text-muted-foreground">
          {formatDate(row.scheduledFor)}
        </span>
      ),
      width: '130px',
    },
    {
      id: 'timeTaken',
      header: 'Time Taken',
      cell: (row: Inspection) => (
        <span className="text-body-sm tabular-nums text-muted-foreground">
          {timeTakenLabel(row.timeTakenMins)}
        </span>
      ),
      width: '100px',
    },
    {
      id: 'inspector',
      header: 'Inspector',
      cell: (row: Inspection) => {
        const insp = s.inspector(row.inspectorId);
        if (!insp) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="flex items-center gap-2">
            <AvatarChip name={insp.name} color={insp.avatarColor} size={26} />
            <span className="text-body-sm">{insp.name}</span>
          </span>
        );
      },
      width: '180px',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: Inspection) => <InspectionStatusPill status={row.status} size="sm" />,
      width: '120px',
    },
    {
      id: 'result',
      header: 'Result',
      cell: (row: Inspection) =>
        row.result ? <InspectionResultPill result={row.result} size="sm" /> : (
          <span className="text-caption text-muted-foreground">—</span>
        ),
      width: '140px',
    },
  ], [s]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* -------- header bar -------- */}
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <Icons.ClipboardCheck size={20} className="text-primary" />
          <h1 className="text-h5 font-semibold text-foreground">Inspections</h1>
          <Badge variant="secondary" size="sm" className="ml-1 tabular-nums">
            {filtered.length}
          </Badge>
        </div>

        <div className="relative ml-auto w-72">
          <Icons.SearchMd size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inspections…"
            className="pl-9"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'list' | 'kanban')}>
          <TabsList>
            <TabsTrigger value="list">
              <Icons.List size={15} className="mr-1.5" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <Icons.LayoutAlt02 size={15} className="mr-1.5" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* -------- content -------- */}
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'list' ? (
          /* ======= LIST VIEW ======= */
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(r) => r.id}
            onRowClick={(r) => nav.openInspection(r.id)}
            emptyState={
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Icons.ClipboardCheck size={36} className="opacity-30" />
                <p className="text-body-sm">No inspections found.</p>
              </div>
            }
          />
        ) : (
          /* ======= KANBAN VIEW ======= */
          <KanbanBoard className="h-full p-4">
            <KanbanColumn
              id="scheduled"
              label="Scheduled"
              count={scheduled.length}
              color={INSPECTION_STATUS.scheduled.color}
            >
              {scheduled.map((ins) => (
                <InspectionKanbanCard
                  key={ins.id}
                  inspection={ins}
                  onClick={() => nav.openInspection(ins.id)}
                  s={s}
                />
              ))}
              {scheduled.length === 0 && <EmptyKanbanCol label="No scheduled inspections" />}
            </KanbanColumn>

            <KanbanColumn
              id="ongoing"
              label="Ongoing"
              count={ongoing.length}
              color={INSPECTION_STATUS.ongoing.color}
            >
              {ongoing.map((ins) => (
                <InspectionKanbanCard
                  key={ins.id}
                  inspection={ins}
                  onClick={() => nav.openInspection(ins.id)}
                  s={s}
                />
              ))}
              {ongoing.length === 0 && <EmptyKanbanCol label="No ongoing inspections" />}
            </KanbanColumn>

            <KanbanColumn
              id="completed"
              label="Completed"
              count={completed.length}
              color={INSPECTION_STATUS.completed.color}
            >
              {completed.map((ins) => (
                <InspectionKanbanCard
                  key={ins.id}
                  inspection={ins}
                  onClick={() => nav.openInspection(ins.id)}
                  s={s}
                />
              ))}
              {completed.length === 0 && <EmptyKanbanCol label="No completed inspections" />}
            </KanbanColumn>
          </KanbanBoard>
        )}
      </div>
    </div>
  );
}

/* ========================= kanban card ================================== */
function InspectionKanbanCard({
  inspection: ins, onClick, s,
}: {
  inspection: Inspection;
  onClick: () => void;
  s: ReturnType<typeof useIims>;
}) {
  const zone = s.zone(ins.zoneId);
  const insp = s.inspector(ins.inspectorId);
  const overdue = ins.status === 'overdue';

  return (
    <KanbanCard onClick={onClick} className={overdue ? 'border-[var(--status-error)] border' : undefined}>
      {/* ID + type chip */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-muted-foreground">{ins.id}</span>
        <span className="flex items-center gap-1">
          {overdue && (
            <Icons.AlertTriangle size={12} className="text-[var(--status-error)]" />
          )}
          {ins.type === 'adhoc' ? (
            <Badge variant="secondary" size="xs">Ad-hoc</Badge>
          ) : (
            <Badge variant="info" size="xs">Planned</Badge>
          )}
        </span>
      </div>

      {/* Title */}
      <p className="mb-2 line-clamp-2 text-body-sm font-semibold text-foreground leading-snug">
        {ins.title}
      </p>

      {/* Zone */}
      {zone && (
        <div className="mb-1 flex items-center gap-1 text-body-xs text-muted-foreground">
          <Icons.MarkerPin01 size={11} className="shrink-0" />
          <span>{zone.name}</span>
        </div>
      )}

      {/* Scheduled date */}
      <div className="mb-3 flex items-center gap-1 text-body-xs text-muted-foreground">
        <Icons.Calendar size={11} className="shrink-0" />
        <span>{formatDateTime(ins.scheduledFor)}</span>
      </div>

      {/* Footer: inspector avatar + result (if completed) */}
      <div className="flex items-center justify-between">
        {insp ? (
          <AvatarChip name={insp.name} color={insp.avatarColor} size={24} />
        ) : (
          <span />
        )}
        {ins.result && <InspectionResultPill result={ins.result} size="sm" />}
        {ins.scorePct != null && !ins.result && (
          <span className="text-caption text-muted-foreground">{ins.scorePct}%</span>
        )}
      </div>
    </KanbanCard>
  );
}

function EmptyKanbanCol({ label }: { label: string }) {
  return (
    <p className="py-4 text-center text-body-xs text-muted-foreground">{label}</p>
  );
}
