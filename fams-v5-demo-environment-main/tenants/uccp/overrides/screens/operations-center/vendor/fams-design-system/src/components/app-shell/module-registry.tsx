import * as React from 'react';
// Module-type rail icons come from the REAL V5 icon set (src/icons/v5).
import {
  Cube01 as Boxes,
  Columns03 as KanbanSquare,
  LayoutGrid01 as LayoutDashboard,
  Signal01 as Radio,
  File02 as FileText,
  Inbox01 as Inbox,
  Settings01 as Settings,
  Calendar,
  Clipboard as ClipboardList,
} from '../../icons';
import type { ViewKind } from '../navigation';
import type {
  IconType,
  ModuleType,
  ModuleTab,
  ModuleRenderContext,
  ModuleRenderer,
  EntityModuleData,
  PipelineModuleData,
  MonitoringModuleData,
  InboxModuleData,
  CalendarModuleData,
} from './types';
import {
  ListView,
  GroupedListView,
  KanbanView,
  PipelineListView,
  PipelineCalendarView,
  PipelineHybridView,
  MapView,
  HybridView,
  InboxView,
  CalendarView,
  SettingsView,
  FormsView,
  PlaceholderView,
} from './view-renderers';
import { LiveMonitoringView } from './live-monitoring-view';
import type { SettingsModuleData, FormsModuleData } from './types';

/**
 * Module-type registry — the fixed menu of module types the kit ships. Each
 * type declares its rail icon, its default Views, how its tabs are labelled
 * (view-kinds vs named instances), and a built-in renderer. A ModuleConfig may
 * override any of these (custom icon / tabs / `render`).
 */

export interface ModuleTypeDef {
  icon: IconType;
  /** Default view-kinds offered as tabs (empty for instance modules). */
  defaultViews: ViewKind[];
  /** Are tabs view-kinds or named instances? */
  tabKind: 'view' | 'instance';
  /** Human label for the module type (used in docs / fallbacks). */
  label: string;
  /** Built-in renderer used when the module has no custom `render`. */
  render: ModuleRenderer;
}

const VIEW_FALLBACK = (ctx: ModuleRenderContext) => (
  <PlaceholderView
    title={`${ctx.module.label} — ${ctx.activeTab.label ?? ctx.activeTab.kind ?? 'view'}`}
    hint="This view has no built-in renderer for this module type yet."
  />
);

const REGISTRY: Record<ModuleType, ModuleTypeDef> = {
  entity: {
    icon: Boxes,
    defaultViews: ['list'],
    tabKind: 'view',
    label: 'Entity',
    render: (ctx) => {
      const data = ctx.module.data as EntityModuleData;
      switch (ctx.activeTab.kind) {
        case 'grouped-list':
          return <GroupedListView data={data} onOpenDetail={ctx.openDetail} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
        case 'map':
          return data.map ? (
            <MapView data={data.map} onOpenDetail={ctx.openDetail} />
          ) : (
            VIEW_FALLBACK(ctx)
          );
        case 'hybrid':
          return <HybridView data={data} onOpenDetail={ctx.openDetail} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
        case 'list':
        default:
          return <ListView data={data} onOpenDetail={ctx.openDetail} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
      }
    },
  },

  pipeline: {
    icon: KanbanSquare,
    defaultViews: ['kanban', 'list'],
    tabKind: 'view',
    label: 'Pipeline',
    render: (ctx) => {
      const data = ctx.module.data as PipelineModuleData;
      switch (ctx.activeTab.kind) {
        case 'list':
          return <PipelineListView data={data} onOpenDetail={ctx.openDetail} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
        case 'calendar':
          return <PipelineCalendarView data={data} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
        case 'hybrid':
          return <PipelineHybridView data={data} onOpenDetail={ctx.openDetail} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
        case 'kanban':
        default:
          return <KanbanView data={data} onOpenDetail={ctx.openDetail} query={ctx.query} filters={ctx.filters} facetFilters={ctx.facetFilters} sort={ctx.sort} />;
      }
    },
  },

  dashboard: {
    icon: LayoutDashboard,
    defaultViews: [],
    tabKind: 'instance',
    label: 'Dashboard',
    render: (ctx) =>
      ctx.activeTab.render ? (
        ctx.activeTab.render()
      ) : (
        <PlaceholderView title={ctx.module.label} hint="No dashboard configured." />
      ),
  },

  'live-monitoring': {
    icon: Radio,
    defaultViews: ['map'],
    tabKind: 'view',
    label: 'Live Monitoring',
    render: (ctx) => {
      const data = ctx.module.data as MonitoringModuleData;
      return <LiveMonitoringView data={data} onOpenDetail={ctx.openDetail} />;
    },
  },

  reports: {
    icon: FileText,
    defaultViews: [],
    tabKind: 'instance',
    label: 'Reports',
    render: (ctx) =>
      ctx.activeTab.render ? (
        ctx.activeTab.render()
      ) : (
        <PlaceholderView title={ctx.module.label} hint="No report configured." />
      ),
  },

  inbox: {
    icon: Inbox,
    defaultViews: ['list'],
    tabKind: 'view',
    label: 'Inbox',
    render: (ctx) => <InboxView data={ctx.module.data as InboxModuleData} />,
  },

  settings: {
    icon: Settings,
    defaultViews: [],
    tabKind: 'view',
    label: 'Settings',
    render: (ctx) =>
      ctx.module.data ? (
        <SettingsView data={ctx.module.data as SettingsModuleData} />
      ) : (
        <PlaceholderView
          title={`${ctx.module.label}`}
          hint="Admin configuration — provide SettingsModuleData to render sections."
        />
      ),
  },

  calendar: {
    icon: Calendar,
    defaultViews: ['calendar'],
    tabKind: 'view',
    label: 'Calendar',
    render: (ctx) => <CalendarView data={ctx.module.data as CalendarModuleData} />,
  },

  forms: {
    icon: ClipboardList,
    defaultViews: [],
    tabKind: 'view',
    label: 'Forms',
    render: (ctx) =>
      ctx.module.data ? (
        <FormsView data={ctx.module.data as FormsModuleData} actions={ctx.actions} />
      ) : (
        <PlaceholderView title={ctx.module.label} hint="Provide FormsModuleData to render a SchemaForm page." />
      ),
  },
};

/** Look up a module-type definition. */
export function getModuleType(type: ModuleType): ModuleTypeDef {
  return REGISTRY[type];
}

/** Override / register a module-type definition (apps may customise built-ins). */
export function registerModuleType(type: ModuleType, def: Partial<ModuleTypeDef>): void {
  REGISTRY[type] = { ...REGISTRY[type], ...def };
}

/** All module types with their definitions (used by docs). */
export function listModuleTypes(): { type: ModuleType; def: ModuleTypeDef }[] {
  return (Object.keys(REGISTRY) as ModuleType[]).map((type) => ({ type, def: REGISTRY[type] }));
}

const VIEW_LABEL: Record<ViewKind, string> = {
  hybrid: 'Hybrid View',
  list: 'List View',
  map: 'Map View',
  kanban: 'Kanban View',
  calendar: 'Calendar View',
  'grouped-list': 'Grouped List',
};

/** Resolve the effective tabs for a module (explicit tabs, or type defaults). */
export function resolveModuleTabs(
  type: ModuleType,
  explicit?: ModuleTab[]
): ModuleTab[] {
  if (explicit && explicit.length) return explicit;
  const def = REGISTRY[type];
  return def.defaultViews.map((kind) => ({
    id: kind,
    kind,
    label: VIEW_LABEL[kind],
  }));
}
