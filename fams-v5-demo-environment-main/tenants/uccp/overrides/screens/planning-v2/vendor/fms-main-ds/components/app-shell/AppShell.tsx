import * as React from 'react';
// Shell chrome uses the REAL V5 icon set (src/icons/v5).
import {
  Inbox01 as Inbox,
  LifeBuoy01 as LifeBuoy,
  Settings01 as SettingsIcon,
  Browser as AppWindow,
} from '../../icons';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { SideNav, ModuleRail, TopNavModule, SettingsNav } from '../navigation';
import type { SideNavItem, ModuleRailItem, ModuleViewTab, ViewKind, SettingsNavSection } from '../navigation';
import { Logo } from '../basics';
import { UserMenu } from './user-menu';
import { DetailSheet, FormSheet, SchemaForm, SteppedSchemaForm } from './side-sheet';
import type { DetailSheetTab } from './side-sheet';
import { getModuleType, resolveModuleTabs } from './module-registry';
import { InboxView, ReportsHome, ReportsTopNav } from './view-renderers';
import { CustomReportBuilder } from './report-builder';
import { ModuleToolbar } from './module-toolbar';
import type { ReportsModuleData } from './types';
import type { AppConfig, ModuleConfig, ModuleTab, DetailDescriptor, EntityModuleData, PipelineModuleData, ShellActions, Facet, SortField, FacetOption, ViewSort } from './types';

const VIEW_LABEL: Record<ViewKind, string> = {
  hybrid: 'Hybrid View',
  list: 'List View',
  map: 'Map View',
  kanban: 'Kanban View',
  calendar: 'Calendar View',
  'grouped-list': 'Grouped List',
};

/** View kinds a user can add per module type (Truemax-style `+` add-view). */
const ADDABLE_VIEWS: Partial<Record<string, ViewKind[]>> = {
  pipeline: ['kanban', 'list', 'calendar', 'hybrid'],
  entity: ['list', 'grouped-list', 'map', 'hybrid'],
  'live-monitoring': ['hybrid', 'list', 'map'],
  calendar: ['calendar'],
};

/** Abstract, token-only preview of a view kind for the add-view picker. */
function ViewThumb({ kind }: { kind: ViewKind }) {
  const cell = 'rounded-sm bg-muted';
  const accent = <div className="absolute inset-y-2 left-2 w-1.5 rounded bg-primary" />;
  if (kind === 'kanban') {
    return (
      <div className="relative flex h-full gap-1.5 p-2 pl-5">
        {accent}
        {Array.from({ length: 4 }).map((_, c) => (
          <div key={c} className="flex flex-1 flex-col gap-1">
            {Array.from({ length: 4 }).map((_, r) => <div key={r} className={cn(cell, 'h-3')} />)}
          </div>
        ))}
      </div>
    );
  }
  if (kind === 'calendar') {
    return (
      <div className="relative grid h-full grid-cols-5 grid-rows-4 gap-1 p-2 pl-5">
        {accent}
        {Array.from({ length: 20 }).map((_, i) => <div key={i} className={cell} />)}
      </div>
    );
  }
  if (kind === 'hybrid' || kind === 'map') {
    return (
      <div className="relative flex h-full gap-1.5 p-2 pl-5">
        {accent}
        <div className="flex flex-1 flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={cn(cell, 'h-2')} />)}
        </div>
        <div className="flex-1 rounded bg-secondary/40" />
      </div>
    );
  }
  // list / grouped-list / default
  return (
    <div className="relative flex h-full flex-col gap-2 p-2 pl-5">
      {accent}
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className={cn(cell, 'h-2')} />)}
    </div>
  );
}

/** "Select preferred view" screen shown when adding a view tab via the top-nav `+`. */
function ViewPickerScreen({
  kinds,
  selected,
  onSelect,
  onCreate,
}: {
  kinds: ViewKind[];
  selected: ViewKind | null;
  onSelect: (k: ViewKind) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <h2 className="text-h5 font-semibold text-foreground">Select preferred view</h2>
      <div className="flex max-w-3xl flex-wrap justify-center gap-6">
        {kinds.map((k) => {
          const isSel = selected === k;
          return (
            <button key={k} type="button" onClick={() => onSelect(k)} className="group flex flex-col items-start gap-2 outline-none">
              <div
                className={cn(
                  'relative h-32 w-56 overflow-hidden rounded-xl border bg-card transition-shadow',
                  isSel ? 'border-primary ring-2 ring-primary/30' : 'border-border group-hover:shadow-sm',
                )}
              >
                <ViewThumb kind={k} />
                {isSel ? (
                  <span className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </div>
              <span className="text-body-sm font-medium text-foreground">{VIEW_LABEL[k]}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={!selected}
        className="rounded-lg border border-primary px-5 py-2 text-body-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/5 disabled:opacity-50"
      >
        Create View
      </button>
    </div>
  );
}

/** Module types that get the search / filter / create toolbar band. */
const TOOLBAR_TYPES = new Set(['entity', 'pipeline']);

/**
 * AppShell — the FAMS V5 composition root.
 *
 * Assembles a complete branded App from config: the blue **app rail** (apps +
 * collective inbox + support/settings/user), the white **module rail** (the
 * app's chosen modules), the **module top-nav** (views/instances as tabs) or
 * the **detail top-nav** (open entity/task tabs), and the active view rendered
 * via the module-type registry. Switch apps to swap the entire module set and
 * brand — the same kit composing wildly different apps.
 */
export interface AppShellProps {
  /** One or more apps. The blue rail shows one switch-icon per app. */
  apps: AppConfig[];
  /**
   * Platform / tenant brand mark shown at the TOP of the blue app rail
   * (constant across apps — distinct from the per-app switch tiles below).
   * Defaults to the FAMS logo.
   */
  logo?: React.ReactNode;
  initialAppId?: string;
  initialModuleId?: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  className?: string;
}


/** Per-module error boundary (T-057) — a runtime error inside ONE module's
 *  render must never blank the whole app (there was no boundary at all: any
 *  throw in a module component white-screened everything). Keyed by module id
 *  at the call site so switching modules retries a crashed one fresh. */
class ModuleErrorBoundary extends React.Component<
  { moduleLabel: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-elevation">
            <h2 className="text-h6 font-semibold text-foreground">Something went wrong in {this.props.moduleLabel}</h2>
            <p className="mt-2 text-body-sm text-muted-foreground">
              The rest of the platform is unaffected — switch modules or retry this one.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-body-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppShell({
  apps,
  logo,
  initialAppId,
  initialModuleId,
  onProfile,
  onSettings,
  onLogout,
  className,
}: AppShellProps) {
  const platformLogo = logo ?? (
    // White brand mark directly on the blue rail (no background tile) — the
    // colored FAMS icon is forced white via brightness-0 + invert.
    <div className="flex size-7 items-center justify-center">
      <Logo brand="fams" variant="icon" height={26} aria-label="FAMS" className="brightness-0 invert" />
    </div>
  );
  const [activeAppId, setActiveAppId] = React.useState<string | undefined>(
    initialAppId ?? apps[0]?.id
  );
  const activeApp = apps.find((a) => a.id === activeAppId) ?? apps[0];

  const [activeModuleId, setActiveModuleId] = React.useState<string | undefined>(
    initialModuleId ?? activeApp?.modules[0]?.id
  );
  const [activeTabByModule, setActiveTabByModule] = React.useState<Record<string, string>>({});
  const [viewOverrides, setViewOverrides] = React.useState<Record<string, ModuleTab[]>>({});
  // Add-view picker: the module id currently showing the "Select preferred view"
  // screen, plus the pending selection. Auto-hides when the active module changes.
  const [addViewFor, setAddViewFor] = React.useState<string | null>(null);
  const [pendingView, setPendingView] = React.useState<ViewKind | null>(null);
  const [queryByModule, setQueryByModule] = React.useState<Record<string, string>>({});
  const [filtersByModule, setFiltersByModule] = React.useState<Record<string, string[]>>({});
  const [facetFiltersByModule, setFacetFiltersByModule] = React.useState<
    Record<string, Record<string, string[]>>
  >({});
  const [sortByModule, setSortByModule] = React.useState<Record<string, ViewSort | null>>({});
  // Group-by state for the built-in pipeline List view (T-094 F2) — kept here
  // (not inside PipelineListView) so the control itself renders IN the shell's
  // one-row toolbar (facet-dropdown anatomy), matching Workforce's toolbarSlot
  // pill, instead of a bespoke native-<select> row inside the view. '' = none.
  const [groupColByModule, setGroupColByModule] = React.useState<Record<string, string>>({});
  const [inboxOpen, setInboxOpen] = React.useState(false);
  // Detail sheets persist PER MODULE: each module keeps its own stack of open
  // record tabs, the active tab, and whether the sheet is minimized. Minimize
  // hides the sheet but keeps the stack; Close-all clears it; switching modules
  // preserves each module's tabs.
  const [detailsByModule, setDetailsByModule] = React.useState<Record<string, DetailDescriptor[]>>({});
  const [activeDetailByModule, setActiveDetailByModule] = React.useState<Record<string, string | null>>({});
  const [minimizedByModule, setMinimizedByModule] = React.useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = React.useState(false);
  // Reports modules open report instances as top-nav tabs (like opened records);
  // the Home tab returns to the catalog. Per module: the opened report ids (tab
  // order) + which is active (null = Home landing).
  const [openReportsByModule, setOpenReportsByModule] = React.useState<Record<string, string[]>>({});
  const [activeReportByModule, setActiveReportByModule] = React.useState<Record<string, string | null>>({});
  // Custom reports created via "+ New Report" (open as builder tabs).
  const [customReportsByModule, setCustomReportsByModule] = React.useState<Record<string, { id: string; label: string }[]>>({});
  // Saved custom reports (persist in the catalog under "Saved"; deletable).
  const [savedReportsByModule, setSavedReportsByModule] = React.useState<Record<string, { id: string; label: string }[]>>({});
  const reportSeq = React.useRef(0);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [activeSettingsId, setActiveSettingsId] = React.useState<string | null>(null);
  // Monotonic counter for unique view-tab instance ids (never reused, so each
  // tab's per-tab toolbar state stays isolated even after other tabs close).
  const viewSeq = React.useRef(0);

  const modules = activeApp?.modules ?? [];
  const activeModule: ModuleConfig | undefined =
    modules.find((m) => m.id === activeModuleId) ?? modules[0];

  const baseTabs: ModuleTab[] = activeModule
    ? resolveModuleTabs(activeModule.type, activeModule.tabs)
    : [];
  const tabs: ModuleTab[] = (activeModule && viewOverrides[activeModule.id]) ?? baseTabs;
  const activeTabId =
    (activeModule && activeTabByModule[activeModule.id]) ??
    activeModule?.defaultTabId ??
    tabs[0]?.id;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Per-module detail-sheet state for the active module. A ref lets the memoized
  // handlers target whichever module is active when they fire (deep child
  // callbacks call openDetail without knowing the module).
  const dKey = activeModule?.id ?? '__none__';
  const activeModuleIdRef = React.useRef(dKey);
  activeModuleIdRef.current = dKey;
  const details = detailsByModule[dKey] ?? [];
  const activeDetailId = activeDetailByModule[dKey] ?? null;
  const detailsMinimized = minimizedByModule[dKey] ?? false;

  // Add a record tab to a module's stack (replacing by id so a re-open with
  // fresh data updates in place), select it, and un-minimize.
  const pushDetail = (key: string, d: DetailDescriptor) => {
    setDetailsByModule((prev) => {
      const cur = prev[key] ?? [];
      const next = cur.some((x) => x.id === d.id) ? cur.map((x) => (x.id === d.id ? d : x)) : [...cur, d];
      return { ...prev, [key]: next };
    });
    setActiveDetailByModule((prev) => ({ ...prev, [key]: d.id }));
    setMinimizedByModule((prev) => ({ ...prev, [key]: false }));
  };

  /* ── handlers ─────────────────────────────────────────────────────── */
  const switchApp = (id: string) => {
    setActiveAppId(id);
    const next = apps.find((a) => a.id === id);
    setActiveModuleId(next?.modules[0]?.id);
    setInboxOpen(false);
    setSettingsOpen(false);
    setCreateOpen(false);
  };

  const switchModule = (id: string) => {
    setActiveModuleId(id);
    setInboxOpen(false);
    setSettingsOpen(false);
    setCreateOpen(false);
  };

  const openDetail = React.useCallback((d: DetailDescriptor) => {
    pushDetail(activeModuleIdRef.current, d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeDetail = (id: string) => {
    const key = activeModuleIdRef.current;
    setDetailsByModule((prev) => {
      const next = (prev[key] ?? []).filter((x) => x.id !== id);
      setActiveDetailByModule((a) => ({
        ...a,
        [key]: a[key] === id ? next[next.length - 1]?.id ?? null : a[key],
      }));
      return { ...prev, [key]: next };
    });
  };

  // Close-all (red control) — clear the module's stack entirely.
  const closeDetails = React.useCallback(() => {
    const key = activeModuleIdRef.current;
    setDetailsByModule((prev) => ({ ...prev, [key]: [] }));
    setActiveDetailByModule((prev) => ({ ...prev, [key]: null }));
    setMinimizedByModule((prev) => ({ ...prev, [key]: false }));
  }, []);

  // Minimize (amber control / Esc) — hide the sheet but KEEP the module's tabs.
  const minimizeDetails = React.useCallback(() => {
    setMinimizedByModule((prev) => ({ ...prev, [activeModuleIdRef.current]: true }));
  }, []);

  // Opening Create minimizes the detail sheet (the two sheets don't stack) but
  // preserves the module's tabs so they're there when Create closes.
  const openCreate = React.useCallback(() => {
    setMinimizedByModule((prev) => ({ ...prev, [activeModuleIdRef.current]: true }));
    setCreateOpen(true);
  }, []);

  const openModule = React.useCallback(
    (moduleId: string, opts?: { tabId?: string; detail?: DetailDescriptor }) => {
      setActiveModuleId(moduleId);
      setInboxOpen(false);
      setCreateOpen(false);
      if (opts?.tabId) {
        const tabId = opts.tabId;
        setActiveTabByModule((prev) => ({ ...prev, [moduleId]: tabId }));
      }
      // A cross-module detail opens in (and persists on) the target module's
      // stack. Without a detail, the module keeps whatever tabs it already had.
      if (opts?.detail) pushDetail(moduleId, opts.detail);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  // Config code mutates its module-scoped arrays, then calls refresh() to resync.
  const [, refresh] = React.useReducer((x: number) => x + 1, 0);

  const shellActions: ShellActions = React.useMemo(
    () => ({ openDetail, closeDetails, openModule, openCreate, refresh }),
    [openDetail, closeDetails, openModule, openCreate]
  );

  const activeDetail = details.find((d) => d.id === activeDetailId) ?? null;

  if (!activeApp || !activeModule) {
    return <div className="p-8 text-body-sm text-muted-foreground">No app configured.</div>;
  }

  const mid = activeModule.id;
  // Query/filter state is PER VIEW TAB (each tab remembers its own toolbar
  // state, like the demos' tab system) — keyed module::tab.
  const tabKey = `${mid}::${activeTab?.id ?? 'default'}`;
  const query = queryByModule[tabKey] ?? '';
  const filters = filtersByModule[tabKey] ?? [];

  /* ── dynamic view tabs (add / close) ──────────────────────────────── */
  const setViews = (next: ModuleTab[]) =>
    setViewOverrides((prev) => ({ ...prev, [mid]: next }));

  // A module can hold ANY number of view tabs, including several of the SAME
  // kind — each is an independent instance with its own id, so its toolbar
  // (search + filters + facets + sort) is remembered per tab (keyed by tabKey)
  // and survives switching between tabs. Duplicate kinds are auto-numbered.
  const addView = (kind: ViewKind) => {
    const sameKind = tabs.filter((t) => t.kind === kind).length;
    const id = `${kind}-i${viewSeq.current++}`;
    const label = sameKind === 0 ? VIEW_LABEL[kind] : `${VIEW_LABEL[kind]} ${sameKind + 1}`;
    const tab: ModuleTab = { id, kind, label };
    setViews([...tabs, tab]);
    setActiveTabByModule((prev) => ({ ...prev, [mid]: id }));
  };

  const closeView = (id: string) => {
    if (tabs.length <= 1) return;
    const next = tabs.filter((t) => t.id !== id);
    setViews(next);
    if (activeTab?.id === id) {
      setActiveTabByModule((prev) => ({ ...prev, [mid]: next[0].id }));
    }
  };

  // The `+` picker offers EVERY view kind the module supports (not only the
  // not-yet-added ones), so the user can spin up another instance of a kind
  // they already have (e.g. a second Calendar filtered differently).
  const addableViews = ADDABLE_VIEWS[activeModule.type] ?? [];
  const canManageViews = (ADDABLE_VIEWS[activeModule.type]?.length ?? 0) > 0;

  /* ── toolbar: search + filter facet ───────────────────────────────── */
  const showToolbar = TOOLBAR_TYPES.has(activeModule.type) && !activeModule.hideToolbar;
  const facet = getFacet(activeModule);
  const toggleFilter = (value: string) =>
    setFiltersByModule((prev) => {
      const cur = prev[tabKey] ?? [];
      return { ...prev, [tabKey]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  const clearFilters = () => setFiltersByModule((prev) => ({ ...prev, [tabKey]: [] }));

  // Multi-facet dropdowns + sort (the Figma toolbar). Facets/sortFields are
  // supplied by the module data (config-bridge builds them from the recipe).
  const moduleData = activeModule.data as (EntityModuleData | PipelineModuleData) | undefined;
  const facets: Facet[] = moduleData?.facets ?? [];
  const sortFields: SortField[] = moduleData?.sortFields ?? [];
  const facetFilters = facetFiltersByModule[tabKey] ?? {};
  const sort = sortByModule[tabKey] ?? null;
  const toggleFacet = (col: string, value: string) =>
    setFacetFiltersByModule((prev) => {
      const cur = prev[tabKey] ?? {};
      const sel = cur[col] ?? [];
      const next = sel.includes(value) ? sel.filter((v) => v !== value) : [...sel, value];
      return { ...prev, [tabKey]: { ...cur, [col]: next } };
    });
  const clearAllFacets = () => setFacetFiltersByModule((prev) => ({ ...prev, [tabKey]: {} }));
  // Group-by (pipeline List view only) — columns to offer come straight off
  // the pipeline's own list columns, so every pipeline module gets this for
  // free with zero per-product config (T-094 F2).
  const pipelineGroupColumns =
    activeModule.type === 'pipeline' && activeTab?.kind === 'list'
      ? (moduleData as PipelineModuleData | undefined)?.columns
      : undefined;
  const groupByCol = groupColByModule[tabKey] ?? '';
  const setGroupByCol = (col: string) => setGroupColByModule((prev) => ({ ...prev, [tabKey]: col }));
  // Cycle a column: unsorted → asc → desc → unsorted.
  const cycleSort = (key: string) =>
    setSortByModule((prev) => {
      const cur = prev[tabKey] ?? null;
      const next: ViewSort | null =
        !cur || cur.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null;
      return { ...prev, [tabKey]: next };
    });

  // CSV export of the active view's columns + rows/cards.
  const exportCsv = () => {
    if (!moduleData) return;
    const cols = (moduleData as { columns?: { header: string; accessor?: (row: unknown) => unknown }[] }).columns ?? [];
    const rows: unknown[] =
      activeModule.type === 'pipeline'
        ? (moduleData as PipelineModuleData).cards
        : (moduleData as EntityModuleData).rows;
    if (!cols.length || !rows.length) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      cols.map((c) => esc(c.header)).join(','),
      ...rows.map((r) => cols.map((c) => esc(c.accessor ? c.accessor(r) : '')).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeModule.label ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── app rail ─────────────────────────────────────────────────────── */
  const appItems: SideNavItem[] = apps.map((a) => ({
    id: a.id,
    label: a.brand.name,
    icon: a.brand.icon ?? AppWindow,
    // In Settings/Inbox you're on an app-level surface, not inside the app —
    // so no app tile is "selected".
    active: a.id === activeApp.id && !inboxOpen && !settingsOpen,
    onClick: () => switchApp(a.id),
  }));

  const inboxItem: SideNavItem | null = activeApp.collectiveInbox
    ? {
        id: 'inbox',
        label: 'Inbox',
        icon: Inbox,
        notificationDot: activeApp.collectiveInbox.notificationDot,
        active: inboxOpen,
        onClick: () => {
          setInboxOpen((v) => !v);
          minimizeDetails(); // keep the module's tabs; just hide the sheet
        },
      }
    : null;

  const footerItems: SideNavItem[] = [
    { id: 'support', label: 'Support', icon: LifeBuoy },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      active: settingsOpen,
      onClick: activeApp.settings
        ? () => { setSettingsOpen(true); setInboxOpen(false); minimizeDetails(); }
        : onSettings,
    },
  ];

  /* ── settings nav (opt-in; replaces the module rail, no top nav) ─────── */
  const settingsCfg = activeApp.settings;
  const allSettingsItems = (settingsCfg?.sections ?? []).flatMap((s) => s.items);
  const activeSettingsItem =
    allSettingsItems.find((it) => it.id === activeSettingsId) ?? allSettingsItems[0];
  const settingsSections: SettingsNavSection[] = (settingsCfg?.sections ?? []).map((s) => ({
    label: s.label,
    items: s.items.map((it) => ({
      id: it.id,
      label: it.label,
      icon: it.icon,
      active: it.id === activeSettingsItem?.id,
      onClick: () => setActiveSettingsId(it.id),
    })),
  }));

  /* ── module rail ──────────────────────────────────────────────────── */
  const moduleItems: ModuleRailItem[] = modules.map((m) => ({
    id: m.id,
    label: m.label,
    icon: m.icon ?? getModuleType(m.type).icon,
    active: !inboxOpen && m.id === activeModule.id,
    onClick: () => switchModule(m.id),
  }));

  /* ── module top-nav tabs ──────────────────────────────────────────── */
  const instanceFallbackKind: ViewKind =
    activeModule.type === 'reports' ? 'grouped-list' : 'hybrid';
  const isInstanceTabs = activeModule.tabKind === 'instance';
  const viewTabs: ModuleViewTab[] = tabs.map((t) => ({
    id: t.id,
    kind: t.kind ?? instanceFallbackKind,
    label: t.label,
    active: t.id === activeTab?.id,
    onClick: () => { setAddViewFor(null); setActiveTabByModule((prev) => ({ ...prev, [activeModule.id]: t.id })); },
    onClose:
      canManageViews && !isInstanceTabs && tabs.length > 1 ? () => closeView(t.id) : undefined,
  }));

  const detailSheetTabs: DetailSheetTab[] = details.map((d) => ({
    id: d.id,
    label: d.label,
    category: d.category,
    icon: activeModule.icon ?? getModuleType(activeModule.type).icon,
  }));

  /* ── content ──────────────────────────────────────────────────────── */
  const def = getModuleType(activeModule.type);
  // T-064: modules that stack their own sheets under the shell DetailSheet
  // need to know when it closes (e.g. Pulse collapses its expanded raw-data
  // sheet). 0 = no visible detail (none open, or the sheet is minimized).
  const renderCtx = { module: activeModule, activeTab: activeTab!, openDetail, actions: shellActions, query, filters, facetFilters, sort, groupByCol, detailOpenCount: detailsMinimized ? 0 : details.length };

  // Reports module: open on the Home catalog; opening a report adds a top-nav
  // tab (like an opened record) and activates it. The Home tab returns to the
  // catalog; report tabs are closeable.
  const isReports = activeModule.type === 'reports';
  const reportsData = isReports ? (activeModule.data as ReportsModuleData | undefined) : undefined;
  const customReports = isReports ? customReportsByModule[mid] ?? [] : [];
  const savedReports = isReports ? savedReportsByModule[mid] ?? [] : [];
  // Save (or rename) a built report into the catalog under "Saved" + rename its tab.
  const saveReport = (id: string, name: string) => {
    setSavedReportsByModule((p) => {
      const cur = p[mid] ?? [];
      return { ...p, [mid]: cur.some((s) => s.id === id) ? cur.map((s) => (s.id === id ? { ...s, label: name } : s)) : [...cur, { id, label: name }] };
    });
    setCustomReportsByModule((p) => ({ ...p, [mid]: (p[mid] ?? []).map((c) => (c.id === id ? { ...c, label: name } : c)) }));
  };
  // System reports (module.tabs) + custom builder tabs (new + opened-saved).
  const reportTabs: ModuleTab[] = isReports
    ? [
        ...tabs,
        ...customReports.map((c) => ({
          id: c.id,
          label: c.label,
          render: () => <CustomReportBuilder config={reportsData?.newReport} initialName={c.label} onSave={(name) => saveReport(c.id, name)} />,
        })),
      ]
    : tabs;
  const openedReportIds = isReports ? openReportsByModule[mid] ?? [] : [];
  const activeReportId = isReports ? activeReportByModule[mid] ?? null : null;
  const newReport = () => {
    reportSeq.current += 1;
    const id = `custom-${reportSeq.current}`;
    setCustomReportsByModule((p) => ({ ...p, [mid]: [...(p[mid] ?? []), { id, label: 'Untitled Report' }] }));
    setOpenReportsByModule((p) => ({ ...p, [mid]: [...(p[mid] ?? []), id] }));
    setActiveReportByModule((p) => ({ ...p, [mid]: id }));
  };
  // Open a saved report — (re)create its builder tab and activate it.
  const openSavedReport = (id: string) => {
    const saved = savedReports.find((s) => s.id === id);
    setCustomReportsByModule((p) => {
      const cur = p[mid] ?? [];
      return cur.some((c) => c.id === id) ? p : { ...p, [mid]: [...cur, { id, label: saved?.label ?? 'Report' }] };
    });
    setOpenReportsByModule((p) => {
      const cur = p[mid] ?? [];
      return cur.includes(id) ? p : { ...p, [mid]: [...cur, id] };
    });
    setActiveReportByModule((p) => ({ ...p, [mid]: id }));
  };
  const deleteSavedReport = (id: string) =>
    setSavedReportsByModule((p) => ({ ...p, [mid]: (p[mid] ?? []).filter((s) => s.id !== id) }));
  const openReport = (id: string) => {
    setOpenReportsByModule((p) => {
      const cur = p[mid] ?? [];
      return { ...p, [mid]: cur.includes(id) ? cur : [...cur, id] };
    });
    setActiveReportByModule((p) => ({ ...p, [mid]: id }));
  };
  const closeReport = (id: string) => {
    const remaining = openedReportIds.filter((x) => x !== id);
    setOpenReportsByModule((p) => ({ ...p, [mid]: remaining }));
    setActiveReportByModule((p) =>
      p[mid] === id ? { ...p, [mid]: remaining[remaining.length - 1] ?? null } : p
    );
    // A closed (unsaved) custom report is discarded.
    if (id.startsWith('custom-')) {
      setCustomReportsByModule((p) => ({ ...p, [mid]: (p[mid] ?? []).filter((c) => c.id !== id) }));
    }
  };
  const activeReportTab = isReports ? reportTabs.find((t) => t.id === activeReportId) : undefined;

  const moduleContent = isReports
    ? activeReportId
      ? activeReportTab?.render?.() ?? (
          <div className="p-8 text-body-sm text-muted-foreground">Report not found.</div>
        )
      : <ReportsHome
          systemReports={tabs}
          savedReports={savedReports}
          onOpen={openReport}
          onOpenSaved={openSavedReport}
          onNewReport={reportsData?.allowNewReport === false ? undefined : newReport}
          showSaved={reportsData?.allowNewReport !== false}
          onDelete={deleteSavedReport}
          title={activeModule.label}
        />
    : activeModule.render
      ? activeModule.render(renderCtx)
      : def.render(renderCtx);

  /* ── create surface ───────────────────────────────────────────────── */
  const hasCreate = !!activeModule.create;
  const createContent = activeModule.create
    ? activeModule.create.render
      ? activeModule.create.render(() => setCreateOpen(false), shellActions)
      : activeModule.create.steppedSchema
        ? (
            <SteppedSchemaForm
              schema={activeModule.create.steppedSchema}
              onSubmit={(v) => { activeModule.create!.onSubmit?.(v, shellActions); setCreateOpen(false); }}
              onCancel={() => setCreateOpen(false)}
            />
          )
        : activeModule.create.schema
          ? (
              <SchemaForm
                schema={activeModule.create.schema}
                onSubmit={(v) => { activeModule.create!.onSubmit?.(v, shellActions); setCreateOpen(false); }}
                onCancel={() => setCreateOpen(false)}
              />
            )
          : null
    : null;

  return (
    <div
      className={cn('flex h-full w-full overflow-hidden bg-background text-foreground', className)}
      style={activeApp.brand.theme as React.CSSProperties}
    >
      <SideNav
        logo={platformLogo}
        apps={appItems}
        inboxItem={inboxItem}
        footerItems={footerItems}
        footerExtra={
          <UserMenu
            user={activeApp.user}
            onProfile={onProfile}
            onSettings={onSettings}
            onLogout={onLogout}
          />
        }
        moduleRail={
          settingsOpen && settingsCfg
            ? <SettingsNav title={settingsCfg.title ?? 'Settings'} sections={settingsSections} />
            : <ModuleRail items={moduleItems} />
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {settingsOpen && settingsCfg ? (
          // Settings has no module top nav — a breadcrumb bar + the rail are the chrome.
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center border-b border-border px-7 text-body-sm text-muted-foreground">
              <span>Settings</span>
              {activeSettingsItem ? (
                <>
                  <span className="px-1.5 text-muted-foreground/60">›</span>
                  <span className="font-medium text-foreground">{activeSettingsItem.label}</span>
                </>
              ) : null}
            </div>
            {/* key by item id so switching settings pages remounts fresh —
                two items sharing a component type won't bleed transient state. */}
            <div key={activeSettingsItem?.id ?? 'none'} className="min-h-0 flex-1 overflow-auto">
              {activeSettingsItem?.render?.() ?? (
                <div className="p-8">
                  <h1 className="text-h4 font-bold text-foreground">{activeSettingsItem?.label ?? 'Settings'}</h1>
                  <p className="mt-2 text-body-sm text-muted-foreground">Settings content goes here.</p>
                </div>
              )}
            </div>
          </div>
        ) : inboxOpen ? (
          activeApp.collectiveInbox?.data ? (
            // Preferred: the built-in cross-app Inbox surface (owns its header).
            <InboxView
              data={activeApp.collectiveInbox.data}
              className="min-h-0 flex-1"
              onNotificationClick={
                activeApp.collectiveInbox.onNotificationClick
                  ? (n) => activeApp.collectiveInbox!.onNotificationClick!(n, openModule)
                  : undefined
              }
            />
          ) : (
            <>
              <TopNavModule moduleName="Inbox" views={[]} />
              <div className="min-h-0 flex-1 overflow-auto">
                {activeApp.collectiveInbox?.render?.() ?? (
                  <div className="p-8 text-body-sm text-muted-foreground">No notifications.</div>
                )}
              </div>
            </>
          )
        ) : (
          <>
            {isReports ? (
              <ReportsTopNav
                homeLabel={activeModule.label}
                homeActive={!activeReportId}
                onHome={() => setActiveReportByModule((p) => ({ ...p, [mid]: null }))}
                tabs={openedReportIds.map((id) => ({
                  id,
                  label: reportTabs.find((t) => t.id === id)?.label ?? id,
                  active: id === activeReportId,
                  onSelect: () => setActiveReportByModule((p) => ({ ...p, [mid]: id })),
                  onClose: () => closeReport(id),
                }))}
              />
            ) : (
              <TopNavModule
                variant="segment"
                moduleName={activeModule.label}
                views={viewTabs}
                onAddView={
                  canManageViews && !isInstanceTabs && addableViews.length
                    ? () => { setPendingView(addableViews[0] ?? null); setAddViewFor(activeModule.id); }
                    : undefined
                }
              />
            )}
            {showToolbar ? (
              <ModuleToolbar
                query={query}
                onQuery={(v) => setQueryByModule((prev) => ({ ...prev, [tabKey]: v }))}
                facet={facet}
                filters={filters}
                onToggleFilter={toggleFilter}
                onClearFilters={clearFilters}
                facets={facets}
                facetFilters={facetFilters}
                onToggleFacet={toggleFacet}
                onClearAllFacets={clearAllFacets}
                sortFields={sortFields}
                sort={sort}
                onCycleSort={cycleSort}
                onExport={exportCsv}
                onCreate={hasCreate ? openCreate : undefined}
                groupByColumns={pipelineGroupColumns}
                groupByCol={groupByCol}
                onGroupByChange={setGroupByCol}
                slot={activeModule.toolbarSlot}
              />
            ) : null}
            <div className="min-h-0 flex-1 overflow-auto">
              {addViewFor === activeModule.id && addableViews.length ? (
                <ViewPickerScreen
                  kinds={addableViews}
                  selected={pendingView}
                  onSelect={setPendingView}
                  onCreate={() => { if (pendingView) addView(pendingView); setAddViewFor(null); }}
                />
              ) : (
                <ModuleErrorBoundary key={activeModule.id} moduleLabel={activeModule.label}>{moduleContent}</ModuleErrorBoundary>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail records — right side sheet overlaying the module. Open while the
          module has tabs and isn't minimized; Esc/overlay minimizes (keeps tabs). */}
      <DetailSheet
        open={details.length > 0 && !detailsMinimized}
        onOpenChange={(o) => { if (!o) minimizeDetails(); }}
        tabs={detailSheetTabs}
        activeId={activeDetailId ?? undefined}
        onTabClick={(id) => setActiveDetailByModule((prev) => ({ ...prev, [dKey]: id }))}
        onCloseTab={(id) => closeDetail(id)}
        onCloseAll={closeDetails}
        onMinimize={minimizeDetails}
        onAdd={hasCreate ? openCreate : undefined}
        {...(activeDetail?.width ? { width: activeDetail.width } : {})}
      >
        {activeDetail?.render(shellActions)}
      </DetailSheet>

      {/* Create / edit — focused right form sheet */}
      <FormSheet open={createOpen} onOpenChange={setCreateOpen}>
        {createContent}
      </FormSheet>
    </div>
  );
}

/* Facet for the Filter popover, derived from the active module's data. */
function getFacet(module: ModuleConfig): { label: string; values: string[] } | null {
  if (module.type === 'pipeline') {
    const d = module.data as PipelineModuleData | undefined;
    if (!d) return null;
    const get = d.filterField?.get ?? ((c: any) => String(c.priority ?? ''));
    const label = d.filterField?.label ?? 'Priority';
    const values = Array.from(new Set(d.cards.map(get).filter(Boolean)));
    return values.length ? { label, values } : null;
  }
  if (module.type === 'entity') {
    const d = module.data as EntityModuleData | undefined;
    if (!d?.filterField) return null;
    const values = Array.from(new Set(d.rows.map(d.filterField.get).filter(Boolean)));
    return values.length ? { label: d.filterField.label, values } : null;
  }
  return null;
}
