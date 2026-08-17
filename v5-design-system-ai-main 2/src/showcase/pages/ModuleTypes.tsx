import * as React from 'react';
import { listModuleTypes } from '../../components/app-shell';
import type { ModuleType } from '../../components/app-shell';

function Sec({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10">
      <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
      {desc && <p className="mb-6 mt-1 max-w-3xl text-body-sm text-muted-foreground">{desc}</p>}
      {!desc && <div className="mb-6" />}
      {children}
    </section>
  );
}

const DESCRIPTIONS: Record<ModuleType, { blurb: string; example: string }> = {
  entity: { blurb: 'Manages things — a list of trucks, bins, customers, assets. Full list, click into any record, edit, add new.', example: 'Assets · Companies · Bins' },
  pipeline: { blurb: 'Manages work moving through stages. Shown as a kanban board so you can drag work between stages and see what is stuck.', example: 'Maintenance work orders · Sales deals' },
  dashboard: { blurb: 'Shows summaries — KPI tiles, charts, performance metrics. Tabs represent different dashboards.', example: 'Operations · CEO Overview' },
  'live-monitoring': { blurb: 'Real-time activity on a map — every truck moving now, every alert firing. Used by control rooms.', example: 'Dispatch console' },
  reports: { blurb: 'Generates printable summaries — daily reports, compliance scorecards. Tabs represent different reports.', example: 'Asset lifecycle · Downtime' },
  inbox: { blurb: 'Notifications needing a human’s attention, collected across modules.', example: 'Approvals · Alerts' },
  settings: { blurb: 'Lets admins configure the app — team permissions, integrations, branding.', example: 'Team · Branding' },
  calendar: { blurb: 'Events on a month grid — scheduling and planning.', example: 'Service schedule' },
  forms: { blurb: 'Structured data-entry surfaces.', example: 'Inspection forms' },
  zones: { blurb: 'Geofences — a hierarchical zone list beside a coloured-polygon map. Toggle visibility, click a row to fly to it, filter by tags.', example: 'Site geo-zones · Delivery regions' },
  pois: { blurb: 'Point-of-interest register — a searchable, tag-filterable list of pinned locations beside a map.', example: 'Bus stops · Client sites · Depots' },
};

const CORE: ModuleType[] = ['entity', 'pipeline', 'dashboard', 'live-monitoring', 'reports', 'inbox', 'settings'];

export function ModuleTypes() {
  const all = listModuleTypes();
  const core = all.filter((m) => CORE.includes(m.type));
  const others = all.filter((m) => !CORE.includes(m.type));

  const renderCard = ({ type, def }: (typeof all)[number]) => {
    const Icon = def.icon;
    const meta = DESCRIPTIONS[type];
    return (
      <div key={type} className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon size={16} />
          </span>
          <span className="text-body-md font-semibold text-foreground">{def.label}</span>
        </div>
        <p className="mb-3 text-body-sm text-muted-foreground">{meta.blurb}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption uppercase tracking-wide text-muted-foreground">Views:</span>
          {def.defaultViews.length ? (
            def.defaultViews.map((v) => (
              <span key={v} className="rounded bg-muted px-1.5 py-0.5 text-caption font-medium text-foreground">{v}</span>
            ))
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-caption font-medium text-foreground">{def.tabKind === 'instance' ? 'instances' : '—'}</span>
          )}
        </div>
        <div className="mt-2 text-caption text-muted-foreground">e.g. {meta.example}</div>
      </div>
    );
  };

  return (
    <div>
      <Sec id="core" title="Core module types" desc="Seven types cover almost everything any business operation needs: a list of things, work flowing through stages, a dashboard, a live map, reports, notifications, settings.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{core.map(renderCard)}</div>
      </Sec>

      <Sec id="others" title="Additional types" desc="A handful of others exist for specific needs.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{others.map(renderCard)}</div>
      </Sec>
    </div>
  );
}
