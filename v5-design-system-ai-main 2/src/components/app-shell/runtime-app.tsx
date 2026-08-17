import * as React from 'react';
import * as V5Icons from '../../icons';
import type { AppRuntime } from '../../runtime/composition';
import type { ModuleSpec } from '../../runtime/composition';
import { deriveDetail } from '../../runtime/config-render';
import type { EntityConfig, EntityRecord } from '../../sim/engine/types';
import { StateTransitionToolbar, PeoplePicker } from '../data-display';
import type { Person } from '../data-display';
import { bindEntityModuleData, bindPipelineModuleData, renderCell } from './config-bridge';
import type { CellRenderContext } from './config-bridge';
import { DetailSection, FieldGrid } from './record-detail';
import { EntityDetail } from './entity-detail';
import { TaskDetail, TaskSection } from './task-detail';
import { resolveRightPanelTab, RightPanelTabStrip } from './pipeline-right-panel';
import type { RightPanelTabDef } from './pipeline-right-panel';
import type { FormSchema, FormField, SteppedFormSchema } from './side-sheet';
import { FormSheet, SchemaForm } from './side-sheet';
import { Dashboard } from './dashboard';
import type { DashboardKpi } from './dashboard';
import { DashboardWidgetGrid } from './dashboard-widgets';
import type { DashboardWidget } from './dashboard-widgets';
import { ListView } from './view-renderers';
import type {
  AppConfig,
  ModuleConfig,
  ModuleTab,
  DetailDescriptor,
  IconType,
  ModuleType,
  PipelineCardModel,
  ShellActions,
  UserConfig,
  InboxModuleData,
  MonitoringModuleData,
  SettingsModuleData,
  CalendarModuleData,
  FormsModuleData,
} from './types';
import type { LatLng, MapMarker } from '../map';
import { MapWidget, LeafletMap } from '../map';

/**
 * B2/B3 — recipe runtime → AppShell config.
 *
 * `createRuntimeAppConfig` turns a bound `AppRuntime` (recipe + sim store +
 * rules) into the `AppConfig` the shell renders: every module's data flows
 * `runtime.list() → buildXModuleData → config-bridge → renderer`, and every
 * mutation (create / kanban move / stage transition) goes back through the
 * runtime — rule-enforced and persisted. No per-product React.
 */

export interface RuntimeAppOptions {
  /** Module config lookup — usually `store.getConfig(code)`. */
  configFor: (code: string) => EntityConfig | undefined;
  /** Called when the rules engine rejects a move (show a toast…). */
  onReject?: (message: string) => void;
  /** Force a host re-render after store mutations outside shell actions. */
  onMutate?: () => void;
  /** Resolve reference values (user/company ids) to display labels. */
  refLabel?: (col: string, value: unknown) => string;
  /** Shown in the shell's user menu. */
  user?: UserConfig;
  /**
   * People directory for `user`-reference fields (Owner / Assignee / Created By).
   * When provided, those detail fields render an editable PeoplePicker —
   * SingleReference → single-select, MultiReference → multi-select.
   */
  people?: Person[];
}

/* ── Detail surfaces (derived from uiConfig.profile via deriveDetail) ───────── */

function detailFields(
  cells: { col: string; label: string; value: unknown; component?: string }[],
  ctx: CellRenderContext,
) {
  return cells.map((cell) => ({
    label: cell.label,
    value: renderCell(cell, ctx),
  }));
}

/**
 * Pipeline (task) detail body — the Jira/ClickUp-style layout, in V5:
 * left/right dynamic data + a config-driven tabbed right panel (Timeline ·
 * Activity · Linked · Attachments). Its own component so the active-tab state
 * lives in a hook. Pure config → no per-product React.
 */
function PipelineDetailBody({
  ticketId,
  moduleLabel,
  title,
  status,
  detailsLeft,
  detailsRight,
  sections,
  tabs,
}: {
  ticketId: React.ReactNode;
  moduleLabel: React.ReactNode;
  title: React.ReactNode;
  status: React.ReactNode;
  detailsLeft: { label: React.ReactNode; value: React.ReactNode }[];
  detailsRight: { label: React.ReactNode; value: React.ReactNode }[];
  sections: React.ReactNode;
  tabs: RightPanelTabDef[];
}) {
  const [active, setActive] = React.useState(tabs[0]?.key ?? '');
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <TaskDetail
      ticketId={ticketId}
      moduleLabel={moduleLabel}
      title={title}
      status={status}
      details={{ left: detailsLeft, right: detailsRight }}
      timelineTitle={
        tabs.length > 1 ? (
          <RightPanelTabStrip tabs={tabs} active={current?.key ?? ''} onChange={setActive} />
        ) : (
          (tabs[0]?.title ?? 'Timeline')
        )
      }
      timeline={current ? current.render() : null}
    >
      {sections}
    </TaskDetail>
  );
}

/**
 * Detail-header status control: StateTransitionToolbar renders the current-stage
 * pill plus the transition buttons (one pill, never duplicated). A
 * transition whose target stage declares a `transitionForm` opens a side-sheet
 * form first; on submit the move applies (with the collected values). Stateful
 * so the form sheet can open/close without re-deriving the whole detail.
 */
function StatusTransitionControl({
  stage,
  transitions,
  onMove,
}: {
  stage: { key: string; label: string; color: string };
  transitions: { toStageId: string; actionLabel: string; form?: FormSchema }[];
  onMove: (toStageId: string, values?: Record<string, string>) => void;
}) {
  const [formFor, setFormFor] = React.useState<{ toStageId: string; form: FormSchema } | null>(null);
  return (
    <span className="flex items-center gap-2">
      {/* StateTransitionToolbar already renders the current-stage pill, so we do
          NOT render a separate StatePill here (that produced a duplicate pill on
          tickets that had available transitions). With no transitions it shows
          just the pill. */}
      <StateTransitionToolbar
        currentStage={{ id: stage.key, label: stage.label, color: stage.color }}
        transitions={transitions.map((t) => ({ toStageId: t.toStageId, actionLabel: t.actionLabel }))}
        onTransition={(toStageId) => {
          const t = transitions.find((x) => x.toStageId === toStageId);
          if (t?.form) setFormFor({ toStageId, form: t.form });
          else onMove(toStageId);
        }}
      />
      <FormSheet open={!!formFor} onOpenChange={(o) => { if (!o) setFormFor(null); }}>
        {formFor ? (
          <SchemaForm
            schema={formFor.form}
            onSubmit={(values) => { const to = formFor.toStageId; setFormFor(null); onMove(to, values); }}
            onCancel={() => setFormFor(null)}
          />
        ) : null}
      </FormSheet>
    </span>
  );
}

/** Pipeline record detail — TaskDetail (left/right data + tabbed right panel). */
function pipelineDetail(
  runtime: AppRuntime,
  spec: ModuleSpec,
  config: EntityConfig,
  recordId: string,
  opts: RuntimeAppOptions,
): DetailDescriptor {
  const m = runtime.module(spec.id);
  const ctx: CellRenderContext = { config, refLabel: opts.refLabel, detail: true };
  const record = m.get(recordId);

  return {
    id: recordId,
    label: record?.title ?? recordId,
    category: config.name,
    render: (actions: ShellActions) => {
      const rec = m.get(recordId);
      if (!rec) return <div className="p-8 text-body-sm text-muted-foreground">Record not found.</div>;
      const dm = deriveDetail(config, rec);
      const stage = config.uiConfig.statusList.find((s) => s.key === rec.status);
      const stageLabel = (key: string) =>
        config.uiConfig.statusList.find((s) => s.key === key)?.label ?? key;
      const nextStages = m.transitions(recordId);

      const moveTo = (toStageId: string, values?: Record<string, string>) => {
        try {
          // Persist any transition-form values first (e.g. the Maintenance Report).
          if (values && Object.keys(values).length) m.update(recordId, values);
          // The board double-fires (onCardMove + back-compat onDropToColumn);
          // an already-applied move is a no-op, not a rules violation.
          if (m.get(recordId)?.status !== toStageId) m.move(recordId, toStageId);
        } catch (e) {
          opts.onReject?.(e instanceof Error ? e.message : String(e));
        }
        // Re-open the same detail tab so header/status reflect the new stage.
        actions.openDetail(pipelineDetail(runtime, spec, config, recordId, opts));
        actions.refresh();
        opts.onMutate?.();
      };

      // A `user`-reference field renders an editable PeoplePicker (Owner →
      // single, Assignee → multi); writes persist via the runtime and re-open
      // the detail so the header/avatars refresh. Other fields render normally.
      const userRefMode = (col: string): 'single' | 'multi' | null => {
        const def = config.systemcolumns.find((c) => c.col === col);
        if (def?.refModule !== 'user') return null;
        if (def.type === 'MultiReference') return 'multi';
        if (def.type === 'SingleReference') return 'single';
        return null;
      };
      const renderField = (cell: { col: string; label: string; value: unknown; component?: string }) => {
        const mode = userRefMode(cell.col);
        if (mode && opts.people?.length) {
          const raw = rec[cell.col];
          const value =
            mode === 'multi'
              ? Array.isArray(raw)
                ? raw.map(String)
                : raw != null && raw !== ''
                  ? [String(raw)]
                  : []
              : raw != null
                ? String(raw)
                : '';
          return {
            label: cell.label,
            value: (
              <PeoplePicker
                people={opts.people!}
                mode={mode}
                value={value}
                currentUserId={runtime.recipe.user?.id}
                label={cell.label}
                placeholder="Unassigned"
                onChange={(v) => {
                  m.update(recordId, { [cell.col]: v });
                  actions.openDetail(pipelineDetail(runtime, spec, config, recordId, opts));
                  actions.refresh();
                  opts.onMutate?.();
                }}
              />
            ),
          };
        }
        return { label: cell.label, value: renderCell(cell, ctx) };
      };

      // Left/right data split from the config's profile placements (pos).
      // Drop the `status` cell — the pipeline STAGE is already the header status
      // control (StateTransitionToolbar), so a "Stage" field in the grid duplicates it.
      const detailCells = dm.details.filter((c) => c.col !== 'status');
      const detailsLeft = detailCells.filter((c) => c.pos !== 'right').map(renderField);
      const detailsRight = detailCells.filter((c) => c.pos === 'right').map(renderField);

      // Config-driven right-panel tabs (default to a Timeline tab if none set).
      const tabDefs: { key: string; title: React.ReactNode; component?: string }[] =
        dm.rightPanelTabs.length ? dm.rightPanelTabs : [{ key: 'timeline', title: 'Timeline' }];
      const tabs: RightPanelTabDef[] = tabDefs.map((t) =>
        resolveRightPanelTab(t, { config, record: rec, refLabel: opts.refLabel }),
      );

      const configSections = dm.sections.map((s) => (
        <TaskSection key={s.name} title={s.name}>
          <FieldGrid columns={2} fields={detailFields(s.fields, ctx)} />
        </TaskSection>
      ));

      // Detail body extras (config-driven, data-backed): a Location map from
      // `uiConfig.map` and the record's Photo from `kanbanCard.image`.
      const extra: React.ReactNode[] = [];
      const mapCfg = config.uiConfig.map;
      const lat = mapCfg?.latCol ? Number(rec[mapCfg.latCol]) : NaN;
      const lng = mapCfg?.lngCol ? Number(rec[mapCfg.lngCol]) : NaN;
      const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
      const zoneId = mapCfg?.zoneCol ? rec[mapCfg.zoneCol] : undefined;
      const zone = zoneId ? mapCfg?.zones?.find((z) => z.id === zoneId) : undefined;
      if (mapCfg && (hasPoint || zone)) {
        const center = (hasPoint ? [lat, lng] : zone!.points[0]) as LatLng;
        extra.push(
          <TaskSection key="__location" title="Location">
            <div className="h-[220px] overflow-hidden rounded-lg">
              <MapWidget height="100%" showZoomControls={false} showFullscreen={false}>
                <LeafletMap
                  center={center}
                  zoom={14}
                  markers={hasPoint ? [{ id: String(rec.id), position: [lat, lng] as LatLng, kind: 'dot', label: String(dm.title ?? '') }] : []}
                  zones={zone ? ([zone] as never) : []}
                />
              </MapWidget>
            </div>
          </TaskSection>,
        );
      }
      const imgCol = config.uiConfig.kanbanCard?.image?.col;
      const photo = imgCol ? rec[imgCol] : undefined;
      if (photo) {
        extra.push(
          <TaskSection key="__photos" title="Photos">
            <img
              src={String(photo)}
              alt=""
              loading="lazy"
              className="w-full max-w-md rounded-lg border border-border object-cover"
              style={{ maxHeight: 240 }}
            />
          </TaskSection>,
        );
      }
      const allSections = [...configSections, ...extra];
      const sections = allSections.length ? allSections : null;

      return (
        <PipelineDetailBody
          ticketId={rec.uniqueidentifier ?? recordId}
          moduleLabel={spec.label ?? config.name}
          title={String(dm.title ?? rec.title ?? '')}
          status={
            stage ? (
              <StatusTransitionControl
                stage={{ key: stage.key, label: stage.label, color: stage.color }}
                transitions={nextStages.map((to) => ({
                  toStageId: to,
                  actionLabel: stageLabel(to).toUpperCase(),
                  form: config.uiConfig.statusList.find((s) => s.key === to)?.transitionForm as unknown as FormSchema | undefined,
                }))}
                onMove={moveTo}
              />
            ) : null
          }
          detailsLeft={detailsLeft}
          detailsRight={detailsRight}
          sections={sections}
          tabs={tabs}
        />
      );
    },
  };
}

/** Entity record detail — identity panel + tabbed body. */
function entityDetail(
  runtime: AppRuntime,
  spec: ModuleSpec,
  config: EntityConfig,
  recordId: string,
  opts: RuntimeAppOptions,
): DetailDescriptor {
  const m = runtime.module(spec.id);
  const ctx: CellRenderContext = { config, refLabel: opts.refLabel, detail: true };
  const record = m.get(recordId);

  return {
    id: recordId,
    label: record?.title ?? recordId,
    category: config.name,
    render: () => {
      const rec = m.get(recordId);
      if (!rec) return <div className="p-8 text-body-sm text-muted-foreground">Record not found.</div>;
      const dm = deriveDetail(config, rec);
      // Without a profile config, fall back to the list columns as info rows.
      const info = dm.details.length
        ? detailFields(dm.details, ctx)
        : config.listcolumns
            .filter((c) => c.col !== 'title' && c.col !== 'uniqueidentifier')
            .map((c) => ({
              label: config.systemcolumns.find((sc) => sc.col === c.col)?.name ?? c.col,
              value: renderCell({ col: c.col, label: c.col, value: rec[c.col], component: c.component?.name }, ctx),
            }));
      // Canonical entity profile: a status chip overlaid on the hero (from the
      // record status + statusList color) and an optional hero image (a
      // `profile.image` col, else the kanban card image) — both derived from
      // existing config, so products without them are unchanged.
      const statusList = (config.uiConfig.statusList ?? []) as { key: string; label: string; color?: string }[];
      const st = statusList.find((s) => s.key === rec.status);
      const statusOverlay = st ? (
        <span
          className="rounded-[4px] px-2 py-0.5 text-caption font-bold uppercase tracking-wide text-white"
          style={{ background: st.color ?? 'var(--primary)' }}
        >
          {st.label}
        </span>
      ) : undefined;
      const prof = config.uiConfig.profile as
        | { image?: { col: string }; category?: { col: string }; tags?: { col: string } }
        | undefined;
      const imgCol = prof?.image?.col ?? config.uiConfig.kanbanCard?.image?.col;
      const image = imgCol ? (rec[imgCol] as string | undefined) : undefined;
      // Identity-rail category chip + tag pills, both opt-in via `profile.category`
      // / `profile.tags` (a col holding a string or string[]); unset → nothing renders.
      const catVal = prof?.category?.col ? rec[prof.category.col] : undefined;
      const categoryBadge = catVal ? (
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-primary">
          {String(catVal)}
        </span>
      ) : undefined;
      const tagsRaw = prof?.tags?.col ? rec[prof.tags.col] : undefined;
      const tags = (
        Array.isArray(tagsRaw)
          ? tagsRaw
          : typeof tagsRaw === 'string' && tagsRaw
            ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
            : []
      ).map((t, i) => ({ id: `tag-${i}`, label: String(t) }));
      return (
        <EntityDetail
          name={String(dm.title ?? rec.title ?? '')}
          entityId={rec.uniqueidentifier}
          avatarFallback={String(rec.title ?? '?').charAt(0).toUpperCase()}
          image={image}
          categoryBadge={categoryBadge}
          tags={tags}
          statusOverlay={statusOverlay}
          info={info}
          tabs={[
            // Overview tab — declarative dashboard widgets (KPIs · charts · maps)
            // from `profile.overview`, when the config provides them.
            ...(((config.uiConfig.profile?.overview as DashboardWidget[] | undefined)?.length)
              ? [{
                  id: 'overview',
                  label: 'Overview',
                  render: () => (
                    <DashboardWidgetGrid widgets={config.uiConfig.profile!.overview as DashboardWidget[]} />
                  ),
                }]
              : []),
            {
              id: 'details',
              label: 'Details',
              render: () =>
                dm.sections.length ? (
                  <div className="flex flex-col gap-4">
                    {dm.sections.map((s) => (
                      <DetailSection key={s.name} title={s.name}>
                        <FieldGrid columns={2} fields={detailFields(s.fields, ctx)} />
                      </DetailSection>
                    ))}
                  </div>
                ) : (
                  <FieldGrid columns={2} fields={info} />
                ),
            },
          ]}
        />
      );
    },
  };
}

/* ── Create surface (recipe CreateSpec → SchemaForm + runtime.create) ───────── */

function createSurface(
  runtime: AppRuntime,
  spec: ModuleSpec,
  config: EntityConfig,
  opts: RuntimeAppOptions,
): ModuleConfig['create'] | undefined {
  if (!spec.create?.fields?.length) return undefined;
  const m = runtime.module(spec.id);

  const fields: FormField[] = spec.create.fields.map((f) => {
    const def = config.systemcolumns.find((c) => c.col === f.id);
    const isEnum = f.type === 'enum' || (def?.listValues?.length ?? 0) > 0;
    return {
      key: f.id,
      label: f.label,
      required: f.required,
      type: isEnum ? 'select' : f.type === 'date' ? 'date' : 'text',
      options: isEnum
        ? (def?.listValues ?? []).map((v) => ({ label: v, value: v }))
        : undefined,
      span: 2,
    };
  });

  const title = `New ${config.name.replace(/s$/, '')}`;
  const schema: FormSchema = { title, submitLabel: 'Create', fields };

  // Stepped create: group the fields into steps by id when the recipe declares them.
  const byId = new Map(fields.map((f) => [f.key, f]));
  const steppedSchema: SteppedFormSchema | undefined = spec.create.steps?.length
    ? {
        title,
        submitLabel: 'Create',
        steps: spec.create.steps.map((s) => ({
          id: s.id,
          title: s.title,
          fields: s.fields.map((id) => byId.get(id)).filter(Boolean) as FormField[],
        })),
      }
    : undefined;

  return {
    schema,
    steppedSchema,
    onSubmit: (values, actions) => {
      const patch: Partial<EntityRecord> =
        spec.create?.map?.(values) ?? (values as Partial<EntityRecord>);
      // Pipelines start in the first configured stage.
      if (config.uiConfig.statusList.length && patch.status == null) {
        patch.status = config.uiConfig.statusList[0].key;
      }
      m.create(patch);
      actions.refresh();
      opts.onMutate?.();
    },
  };
}

/* ── JSON config shapes for the non-record module types ─────────────────────── */
/* These are what a recipe carries INLINE under a module's `config` key — pure
 * JSON, interpreted here. A module stays config, not bespoke React. */

export interface DashboardModuleJson {
  tabs: {
    id: string;
    title: string;
    dateLabel?: string;
    ranges?: string[];
    kpis?: (Pick<DashboardKpi, 'trend'> & {
      label: string;
      value: string;
      unit?: string;
      trendValue?: string;
      description?: string;
    })[];
    /** Declarative chart/map widgets rendered in a 12-col grid below the KPIs. */
    widgets?: DashboardWidget[];
  }[];
}

export interface ReportsModuleJson {
  /** Each report tab is a saved table view over an entity code. */
  tabs: { id: string; title: string; code: string }[];
}

export interface MonitoringModuleJson {
  center: LatLng;
  badge?: { label: string; variant?: 'neutral' | 'destructive' | 'warning' | 'success' | 'info' };
  markers: {
    id: string;
    position: LatLng;
    status?: MapMarker['status'];
    tooltip?: string;
  }[];
}

export interface InboxModuleJson {
  /** Map a record's column onto the notification description (default: status label). */
  descriptionCol?: string;
  /** Statuses rendered as unread. */
  unreadStatuses?: string[];
  severityByStatus?: Record<string, 'info' | 'success' | 'warning' | 'error'>;
}

export interface FormsModuleJson {
  title?: string;
  description?: string;
  successTitle?: string;
  successHint?: string;
  schema: {
    title?: string;
    submitLabel?: string;
    fields: {
      key: string;
      label: string;
      type?: string;
      required?: boolean;
      options?: { label: string; value: string }[];
      span?: 1 | 2;
    }[];
  };
}

/* ── Non-record module-type mappings (config JSON → renderer data) ──────────── */

function dashboardModule(base: ModuleConfig, cfg: DashboardModuleJson): ModuleConfig {
  const tabs: ModuleTab[] = cfg.tabs.map((t) => ({
    id: t.id,
    label: t.title,
    render: () => (
      <Dashboard dateLabel={t.dateLabel} ranges={t.ranges} kpis={t.kpis as DashboardKpi[]}>
        <DashboardWidgetGrid widgets={t.widgets ?? []} />
      </Dashboard>
    ),
  }));
  return { ...base, tabKind: 'instance', tabs };
}

function reportsModule(
  base: ModuleConfig,
  cfg: ReportsModuleJson,
  runtime: AppRuntime,
  opts: RuntimeAppOptions,
): ModuleConfig {
  const tabs: ModuleTab[] = cfg.tabs.map((t) => {
    const config = opts.configFor(t.code);
    return {
      id: t.id,
      label: t.title,
      render: () => {
        if (!config) return null;
        const data = bindEntityModuleData({
          config,
          list: () => runtime.store.list(t.code).records,
          version: () => runtime.store.version,
          refLabel: opts.refLabel,
        });
        return <ListView data={data} />;
      },
    };
  });
  return { ...base, tabKind: 'instance', tabs };
}

function monitoringData(cfg: MonitoringModuleJson): MonitoringModuleData {
  return {
    center: cfg.center,
    statusBadge: cfg.badge,
    markers: cfg.markers.map((m) => ({
      id: m.id,
      position: m.position,
      status: m.status,
      tooltip: m.tooltip,
    })),
  };
}

function inboxData(
  runtime: AppRuntime,
  spec: ModuleSpec,
  config: EntityConfig | undefined,
  cfg: InboxModuleJson,
): InboxModuleData {
  const m = runtime.module(spec.id);
  const statusLabel = (key: unknown) =>
    config?.uiConfig.statusList.find((s) => s.key === key)?.label ?? String(key ?? '');
  return {
    get notifications() {
      return m.list().map((r) => ({
        id: r.id,
        title: r.title ?? r.uniqueidentifier ?? r.id,
        description: cfg.descriptionCol
          ? String(r[cfg.descriptionCol] ?? '')
          : `${config?.name ?? spec.label} · ${statusLabel(r.status)}`,
        timestamp: r.uniqueidentifier,
        unread: cfg.unreadStatuses?.includes(String(r.status)) ?? false,
        severity: cfg.severityByStatus?.[String(r.status)],
        avatarFallback: String(r.title ?? '?').charAt(0).toUpperCase(),
      }));
    },
  };
}

function formsModule(
  base: ModuleConfig,
  cfg: FormsModuleJson,
  runtime: AppRuntime,
  spec: ModuleSpec,
  opts: RuntimeAppOptions,
): ModuleConfig {
  const data: FormsModuleData = {
    title: cfg.title,
    description: cfg.description,
    successTitle: cfg.successTitle,
    successHint: cfg.successHint,
    schema: cfg.schema as FormsModuleData['schema'],
    onSubmit: spec.dataSource
      ? (values, actions) => {
          runtime.module(spec.id).create(values as Partial<EntityRecord>);
          actions.refresh();
          opts.onMutate?.();
        }
      : undefined,
  };
  return { ...base, data };
}

/* ── Modules + app config ───────────────────────────────────────────────────── */

function resolveIcon(name?: string): IconType | undefined {
  if (!name) return undefined;
  const icon = (V5Icons as Record<string, unknown>)[name];
  return typeof icon === 'function' ? (icon as IconType) : undefined;
}

function runtimeModule(
  runtime: AppRuntime,
  spec: ModuleSpec,
  opts: RuntimeAppOptions,
): ModuleConfig {
  const base: ModuleConfig = {
    id: spec.id,
    type: spec.type as ModuleType,
    label: spec.label,
    icon: resolveIcon(spec.icon),
    tabs: spec.views?.map((kind) => ({ id: kind, kind })),
  };

  const code = spec.dataSource?.code;
  const config = code ? opts.configFor(code) : undefined;
  const inline = spec.config;

  switch (spec.type) {
    case 'dashboard':
      return inline ? dashboardModule(base, inline as DashboardModuleJson) : base;
    case 'reports':
      return inline ? reportsModule(base, inline as ReportsModuleJson, runtime, opts) : base;
    case 'live-monitoring':
      return inline ? { ...base, data: monitoringData(inline as MonitoringModuleJson) } : base;
    case 'inbox':
      return code
        ? { ...base, data: inboxData(runtime, spec, config, (inline ?? {}) as InboxModuleJson) }
        : base;
    case 'settings':
      return inline ? { ...base, data: inline as SettingsModuleData } : base;
    case 'calendar':
      return inline ? { ...base, data: inline as CalendarModuleData } : base;
    case 'forms':
      return inline ? formsModule(base, inline as FormsModuleJson, runtime, spec, opts) : base;
  }

  if (!config) return base; // unbound entity/pipeline or unknown type

  const m = runtime.module(spec.id);

  if (spec.type === 'pipeline') {
    return {
      ...base,
      data: bindPipelineModuleData({
        config,
        list: () => m.list(),
        get: (id) => m.get(id),
        version: () => runtime.store.version,
        refLabel: opts.refLabel,
        onCardMove: (cardId, toStageId) => {
          try {
            // The board double-fires (onCardMove + back-compat onDropToColumn);
            // an already-applied move is a no-op, not a rules violation.
            if (m.get(cardId)?.status !== toStageId) m.move(cardId, toStageId);
          } catch (e) {
            opts.onReject?.(e instanceof Error ? e.message : String(e));
          }
          opts.onMutate?.();
        },
        // Legal next stages from the rule engine — drives drag highlight/block.
        allowedStages: (cardId) => m.transitions(cardId),
        toDetail: (card: PipelineCardModel) =>
          pipelineDetail(runtime, spec, config, card.id, opts),
      }),
      create: createSurface(runtime, spec, config, opts),
    };
  }

  if (spec.type === 'entity') {
    return {
      ...base,
      data: bindEntityModuleData({
        config,
        list: () => m.list(),
        version: () => runtime.store.version,
        refLabel: opts.refLabel,
        toDetail: (record) => entityDetail(runtime, spec, config, record.id, opts),
      }),
      create: createSurface(runtime, spec, config, opts),
    };
  }

  return base;
}

/**
 * The B3 mount: recipe runtime → a complete AppConfig for `<AppShell apps={[…]}>`.
 * Brand theme is token overrides only (coherence law #5).
 */
export function createRuntimeAppConfig(runtime: AppRuntime, opts: RuntimeAppOptions): AppConfig {
  const { recipe } = runtime;
  return {
    id: recipe.id,
    brand: {
      name: recipe.brand.name,
      theme: recipe.brand.theme,
    },
    user: opts.user,
    modules: recipe.modules.map((spec) => runtimeModule(runtime, spec, opts)),
  };
}
