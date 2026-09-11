import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ViewKind } from '../navigation';
import type { DataTableColumn } from '../data-display';
import type { KanbanCardProps } from '../data-display';
import type { ListRowProps } from '../data-display';
import type { NotificationCardProps } from '../widgets';
import type { LatLng, MapMarker, MapZone, MarkerKind, MarkerStatus } from '../map';
import type { MapWidgetStatusBadge } from '../map';

/**
 * FAMS V5 composition vocabulary — App → Module → View.
 *
 * An **App** is a branded shell with a hand-picked set of **Modules**. Each
 * module is one of a fixed menu of **module types**; a module exposes one or
 * more **Views** (visualisations of the same data). This file defines the
 * config types that let any app be assembled declaratively from the kit.
 */

export type IconType = LucideIcon | React.ComponentType<{ className?: string; size?: number }>;

/** The fixed menu of module types the kit ships. */
export type ModuleType =
  | 'entity'
  | 'pipeline'
  | 'dashboard'
  | 'live-monitoring'
  | 'reports'
  | 'inbox'
  | 'settings'
  | 'calendar'
  | 'forms';

/**
 * A tab in a module's top nav. For most modules a tab is a **View** (carries a
 * `kind`). For `dashboard`/`reports` modules a tab is a named **instance**
 * (one dashboard / one report) and carries its own `render`.
 */
export interface ModuleTab {
  id: string;
  /** View kind — drives the default tab icon + label (view-based modules). */
  kind?: ViewKind;
  /** Override label. */
  label?: string;
  /** Instance renderer (dashboard / report tabs). */
  render?: () => React.ReactNode;
  /** Reports Home catalog metadata — a one-line description of the report. */
  description?: React.ReactNode;
  /** Reports Home card icon (defaults to a chart glyph). */
  icon?: IconType;
  /** Reports Home grouping/category chip (e.g. "Operations", "Compliance"). */
  category?: string;
  /** A SYSTEM report (built-in) — shown with a SYSTEM tag and NOT deletable.
   *  Custom (user-created) reports omit this and can be deleted. */
  system?: boolean;
}

/* ── Reports: custom-report builder ──────────────────────────────────────── */

/** One selectable item in the advanced entity-select filter side sheet
 *  (assets, vehicles, sites, drivers — whatever the product configures). */
export interface ReportFilterEntity {
  id: string;
  label: React.ReactNode;
  /** Secondary line (e.g. category / plate). */
  meta?: React.ReactNode;
  /** Small chips shown on the row (e.g. "Zone 1"). */
  tags?: string[];
}
/** @deprecated alias kept for older code — use ReportFilterEntity. */
export type ReportFilterAsset = ReportFilterEntity;

/** One configurable filter in the custom-report builder. Domain-agnostic: a
 *  product declares the filters its report needs; the builder renders them. */
export type ReportFilterField =
  | { kind: 'date'; key: string; label: string; mode?: 'single' | 'range' }
  | { kind: 'multiSelect'; key: string; label: string; options: { value: string; label: string; severity?: 'normal' | 'warning' | 'critical' }[] }
  | { kind: 'entitySelect'; key: string; label: string; entityLabel?: string; items: ReportFilterEntity[] }
  | { kind: 'numberRange'; key: string; label: string; unit?: string; defaultValue?: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'text'; key: string; label: string; placeholder?: string };

/** Values a custom report is generated from, keyed by each filter field's `key`.
 *  multiSelect/entitySelect → string[]; date/numberRange/select/text → string. */
export type ReportBuilderValues = Record<string, string | string[] | undefined>;

/** A generated report result — a simple tabular projection. */
export interface ReportResult {
  columns: { key: string; label: React.ReactNode }[];
  rows: Record<string, React.ReactNode>[];
}

/** Config for the custom-report builder ("+ New Report") — fully config-driven. */
export interface ReportBuilderConfig {
  /** The filters this report exposes (rendered in the left panel, in order). */
  filters?: ReportFilterField[];
  /** Produce the result table from the chosen filter values (null → empty state). */
  generate?: (values: ReportBuilderValues) => ReportResult | null;
}

/** Reports module data — drives the "+ New Report" custom-report builder. */
export interface ReportsModuleData {
  newReport?: ReportBuilderConfig;
}

/**
 * Imperative actions the shell exposes to module/detail/create renderers.
 * These are what make cross-module flows (CRM lead→deal conversion), pivot
 * navigation (lead→company detail), stage transitions, and live data mutation
 * possible from config code.
 */
export interface ShellActions {
  /** Open (or replace, by id) a detail tab in the detail side sheet. */
  openDetail: (detail: DetailDescriptor) => void;
  /** Close all open detail tabs (returns to the module view). */
  closeDetails: () => void;
  /**
   * Switch to another module in the active app — optionally landing on a
   * specific view tab and/or opening a detail there (cross-module actions).
   */
  openModule: (moduleId: string, opts?: { tabId?: string; detail?: DetailDescriptor }) => void;
  /** Open the active module's Create form sheet. */
  openCreate: () => void;
  /**
   * Re-render the shell after config-side data mutation. Demo configs keep
   * their entity arrays in module scope; mutate (replacing arrays, not
   * editing in place) then call refresh() so views resync.
   */
  refresh: () => void;
}

/** A detail surface (entity record / pipeline task) opened in the DetailSheet. */
export interface DetailDescriptor {
  id: string;
  label: React.ReactNode;
  category?: React.ReactNode;
  render: (actions: ShellActions) => React.ReactNode;
}

/** Context handed to a module renderer. */
export interface ModuleRenderContext {
  module: ModuleConfig;
  activeTab: ModuleTab;
  /** Open (or focus) a detail tab in the detail side sheet. */
  openDetail: (detail: DetailDescriptor) => void;
  /** Full shell action surface (cross-module nav, refresh, create…). */
  actions: ShellActions;
  /** Free-text search query from the toolbar (lower-cased downstream). */
  query?: string;
  /** Active filter values selected from the toolbar's filter popover (legacy). */
  filters?: string[];
  /** Per-facet selected values (facet col → selected values) from the dropdowns. */
  facetFilters?: Record<string, string[]>;
  /** Active sort from the toolbar Sort control. */
  sort?: ViewSort | null;
}

/** A facet the toolbar's Filter popover can build chips from. */
export interface FilterField<T = any> {
  /** Label shown in the popover (e.g. "Priority", "Status"). */
  label: string;
  /** Extract the facet value for a record. */
  get: (row: T) => string;
}

/** One selectable value in a facet dropdown (stored value + display label). */
export interface FacetOption {
  value: string;
  label: string;
}

/** A named facet → a toolbar dropdown that filters by one field's values. */
export interface Facet<T = any> {
  /** Field key this facet filters on. */
  col: string;
  /** Dropdown label (e.g. "Status", "Assignee"). */
  label: string;
  /** lucide icon name for the dropdown trigger. */
  icon?: string;
  /** Extract the comparable value(s) for a row/card (array for multi-ref fields). */
  get: (row: T) => string | string[];
  /** Selectable values (value → display label). */
  options: FacetOption[];
}

/** A column the toolbar's Sort control can order rows by. */
export interface SortField<T = any> {
  key: string;
  label: string;
  get: (row: T) => string | number;
}

/** Active sort from the toolbar Sort control. */
export interface ViewSort {
  key: string;
  dir: 'asc' | 'desc';
}

export type ModuleRenderer = (ctx: ModuleRenderContext) => React.ReactNode;

/** One module in an app's left rail. */
export interface ModuleConfig<TData = unknown> {
  id: string;
  type: ModuleType;
  label: string;
  /** Rail icon. Defaults to the module type's icon when omitted. */
  icon?: IconType;
  /** Top-nav tabs. Defaults to the module type's default views when omitted. */
  tabs?: ModuleTab[];
  /** Whether tabs are view-kinds or named instances (affects labelling). */
  tabKind?: 'view' | 'instance';
  defaultTabId?: string;
  /** Typed data consumed by the built-in renderer (see *ModuleData below). */
  data?: TData;
  /** Custom renderer; overrides the built-in module-type renderer entirely. */
  render?: ModuleRenderer;
  /**
   * Optional "Create New" surface, opened as a right FormSheet. Provide a
   * declarative `schema` (rendered by the built-in SchemaForm) and/or a custom
   * `render`. Presence of `create` makes the module's Create New button active.
   */
  create?: {
    schema?: import('./side-sheet').FormSchema;
    /** Multi-step create form (rendered by SteppedSchemaForm); takes precedence over `schema`. */
    steppedSchema?: import('./side-sheet').SteppedFormSchema;
    /** Receives the form values + shell actions (mutate data, then refresh()). */
    onSubmit?: (values: Record<string, string>, actions: ShellActions) => void;
    /** Full control — overrides schema. Receives a `close` callback + actions. */
    render?: (close: () => void, actions: ShellActions) => React.ReactNode;
  };
}

export interface BrandConfig {
  name: string;
  /** Logo node shown at the top of the blue app rail (28×28) and in headers. */
  logo?: React.ReactNode;
  /** App-rail switch icon. */
  icon?: IconType;
  /**
   * Per-app token overrides applied as inline CSS variables on the shell root
   * (local tenant theming — does not touch global `:root`). e.g.
   * `{ '--primary': '#22C882', '--sidebar': '#22C882' }`.
   */
  theme?: Record<string, string>;
}

export interface UserConfig {
  name: string;
  email?: string;
  role?: string;
  avatarFallback?: string;
  avatarSrc?: string;
}

/** One settings page — a nav item (icon + label) + its content panel. */
export interface AppSettingsItem {
  id: string;
  label: string;
  icon?: IconType;
  /** The settings page body (rendered in the content area, no top nav). */
  render?: () => React.ReactNode;
}

/** A labelled group of settings pages in the settings nav. */
export interface AppSettingsSection {
  label?: string;
  items: AppSettingsItem[];
}

export interface AppConfig {
  id: string;
  brand: BrandConfig;
  modules: ModuleConfig[];
  /**
   * Collective inbox across every app (opened from the blue app-rail Inbox).
   * Provide `data` to render the built-in cross-app InboxView (preferred), or
   * `render` for a fully custom surface. `data` wins when both are set.
   */
  collectiveInbox?: {
    notificationDot?: boolean;
    data?: InboxModuleData;
    render?: () => React.ReactNode;
  };
  user?: UserConfig;
  /**
   * Optional Settings experience. When present, the blue-rail Settings gear opens
   * a dedicated `SettingsNav` (replacing the module rail) with no top nav — Figma
   * DS V2 `730:271`. Omit to fall back to the host `onSettings` callback.
   */
  settings?: { title?: React.ReactNode; sections: AppSettingsSection[] };
}

/* ════════════════════════════════════════════════════════════════════════
   Built-in data contracts — what the default module-type renderers consume.
   A config either provides `data` in these shapes, or supplies `render`.
   ════════════════════════════════════════════════════════════════════════ */

/** Entity module — a list of things (trucks, bins, customers…). */
export interface EntityModuleData<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId?: (row: T, index: number) => string;
  /** Build a detail surface when a row is clicked. */
  toDetail?: (row: T) => DetailDescriptor;
  /** Render a row as a ListRow (used by the `grouped-list` view). */
  toListItem?: (row: T) => ListRowProps & { id: string };
  /** Optional geo data (enables `map` / `hybrid` views). */
  map?: { center: LatLng; markers: MapMarker[] };
  /** Fields the toolbar search matches against (defaults to all column text). */
  searchText?: (row: T) => string;
  /** Facet for the toolbar Filter popover (legacy single-facet). */
  filterField?: FilterField<T>;
  /** Named facets → toolbar dropdowns (Status, Assignee…). */
  facets?: Facet<T>[];
  /** Columns the toolbar Sort control can order by. */
  sortFields?: SortField<T>[];
}

export interface PipelineCardModel extends Omit<KanbanCardProps, 'id'> {
  id: string;
  stageId: string;
  /** Point location for the hybrid map (omit if the card links to a zone instead). */
  location?: LatLng;
  /** Zone id for the hybrid map (references one of `PipelineModuleData.mapZones`). */
  zoneId?: string;
}

/** Pipeline module — work moving through stages (kanban). */
export interface PipelineModuleData {
  stages: {
    id: string;
    label: string;
    /** Accent color — drives the column top-border. */
    color?: string;
    /** Column background tint (defaults to a faint wash of `color`). */
    tint?: string;
    /** Count-badge bg / text (default derived from `color`). */
    counterBg?: string;
    counterText?: string;
  }[];
  cards: PipelineCardModel[];
  /** Columns for the `list` view of the same pipeline. */
  columns?: DataTableColumn<PipelineCardModel>[];
  toDetail?: (card: PipelineCardModel) => DetailDescriptor;
  /**
   * Called when a card is dragged to another stage. Mutate your cards array
   * (replace it) here so the move persists beyond the view's local state.
   */
  onCardMove?: (cardId: string, toStageId: string) => void;
  /** Stages a card may legally move to NOW (rule engine) — drives drag highlight/block. */
  allowedStages?: (cardId: string) => string[];
  /** Hybrid-map: default map center + the zones cards can link to. */
  mapCenter?: LatLng;
  mapZones?: MapZone[];
  /** Text the toolbar search matches (defaults to title + ticketId + metadata). */
  searchText?: (card: PipelineCardModel) => string;
  /** Facet for the Filter popover (legacy single-facet, defaults to `priority`). */
  filterField?: FilterField<PipelineCardModel>;
  /** Named facets → toolbar dropdowns (Status, Assignee…). */
  facets?: Facet<PipelineCardModel>[];
  /** Columns the toolbar Sort control can order by. */
  sortFields?: SortField<PipelineCardModel>[];
}

/** Tab buckets the cross-app Inbox can filter by (besides Unread / All). */
export type InboxCategory = 'reminder' | 'assigned' | 'mention' | 'critical';

/**
 * One Inbox notification. The cross-app Inbox surface (the app-rail Inbox, not a
 * module) renders these grouped by date, filtered by tab. Extends the simpler
 * `NotificationCardProps` so existing data still works; the extra fields drive
 * the richer row (source tag, module chip, severity flag, due chip, leading
 * icon) and the tab filters.
 */
export interface InboxNotification extends NotificationCardProps {
  id: string;
  /** Leading icon style: alert (bell) · system (activity) · mention (avatar). */
  kind?: 'alert' | 'system' | 'mention';
  /** App/portal source tag shown as a `#` chip (e.g. "FM-882"). */
  sourceTag?: string;
  /** Originating module/system chip (e.g. "CCMS", "IIMS"). */
  module?: string;
  /** Optional custom module-chip icon (defaults to a layers glyph). */
  moduleIcon?: React.ReactNode;
  /** Severity flag badge — Critical (red) / Minor (green). */
  priority?: 'Critical' | 'Minor';
  /** Due/reminder chip (orange clock), e.g. "Today". */
  dueLabel?: React.ReactNode;
  /** Date bucket header this row sits under (e.g. "Today", "12 APR 2026"). */
  dateGroup?: string;
  /** Which filter tabs this row belongs to (besides Unread/All). */
  categories?: InboxCategory[];
}

/**
 * Inbox module data — the cross-app notification feed. Rendered by the built-in
 * `InboxView` with Unread/All/Reminders/Assigned/@Mentions/Critical tabs, date
 * grouping, search, and a Clear All / per-row Clear. Lives in the blue app nav
 * (`AppConfig.collectiveInbox`), not the left module rail.
 */
export interface InboxModuleData {
  notifications: InboxNotification[];
  /** Header title (defaults to "Inbox"). */
  title?: React.ReactNode;
  /**
   * Show the one-time "Enable desktop notifications" prompt when the browser
   * permission is still undecided (default true). Dismissal is remembered.
   */
  desktopPrompt?: boolean;
}

/** One tracked thing on the live-monitoring map + fleet list. */
export interface MonitoringEntity {
  id: string;
  position: LatLng;
  status: MarkerStatus;
  /** Human status label (e.g. "Moving", "Discharging"). */
  statusLabel?: string;
  /** Marker visual — vehicle / plant / site / dot. Default 'vehicle'. */
  kind?: MarkerKind;
  /**
   * Asset glyph name (e.g. "car", "workforce", "bin"). When set, the map pin
   * renders as the DS V2 AssetMarker (state-coloured pin + this dynamic glyph).
   */
  assetType?: string;
  /** Pulsing live ring + top z-index. */
  live?: boolean;
  /** Heading 0–360 for the vehicle direction tick. */
  heading?: number;
  /** Map label above the pin. */
  mapLabel?: string;
  /** Left list-row text. */
  title: string;
  subtitle?: React.ReactNode;
  /** Right-aligned list-row metric (e.g. "60 km/h"). */
  metric?: React.ReactNode;
  metricSub?: React.ReactNode;
  avatarFallback?: string;
  tooltip?: string;
  /** "Activity Overview" mini-stats in the fleet row (EAD: alerts · links · km). */
  alerts?: number;
  connections?: number;
  distanceKm?: number;
  /** Relative "status since" line in the popup header (e.g. "2 min"). */
  since?: React.ReactNode;
  /** Summary header for the popup Trips tab. */
  tripSummary?: { distance?: React.ReactNode; trips?: React.ReactNode; duration?: React.ReactNode };
  /** Telemetry grid in the on-map popup (Overview). */
  telemetry?: { label: React.ReactNode; value: React.ReactNode }[];
  /** Optional event rows in the popup (Critical Events tab). */
  events?: { id: string; title: React.ReactNode; meta?: React.ReactNode; severity?: 'info' | 'warning' | 'error' }[];
  /** Optional trip rows in the popup (Trips tab). */
  trips?: {
    id: string;
    time?: React.ReactNode;
    destination?: React.ReactNode;
    distance?: React.ReactNode;
    duration?: React.ReactNode;
    label?: React.ReactNode;
  }[];
  /** Optional device rows in the popup (Devices tab). */
  devices?: { id: string; name: React.ReactNode; meta?: React.ReactNode }[];
  /** Drill from the popup into the standard EntityDetail. */
  toDetail?: () => DetailDescriptor;
}

/** A route drawn on the live-monitoring map (origin → destination). */
export interface MonitoringRoute {
  id: string;
  /** Ordered points; a straight polyline is drawn through them. */
  points: LatLng[];
  color?: string;
  dashed?: boolean;
  /** Swap the straight line for real OSRM road geometry when it resolves. */
  osrm?: boolean;
  /** Continuously animate this marker id along the route geometry. */
  animateMarkerId?: string;
}

/** Live-monitoring module — real-time activity on a map + fleet list. */
export interface MonitoringModuleData {
  center: LatLng;
  zoom?: number;
  /** Preferred: rich entities that drive both the fleet list and the map. */
  entities?: MonitoringEntity[];
  /** Legacy fallback: plain markers (normalised into entities internally). */
  markers?: MapMarker[];
  routes?: MonitoringRoute[];
  /** Left-panel list title (e.g. "Vehicles"). */
  listTitle?: React.ReactNode;
  /** Center "live" badge with optional ETA / looping countdown. */
  liveBadge?: { label: React.ReactNode; eta?: React.ReactNode; countdownFromSec?: number };
  /** Status legend (bottom-left). */
  legend?: { label: React.ReactNode; color: string; count?: number }[];
  /** @deprecated legacy single-badge — superseded by `liveBadge`. */
  statusBadge?: MapWidgetStatusBadge;
  /** @deprecated legacy drill — entities now carry `toDetail`. */
  onMarkerDetail?: (id: string) => DetailDescriptor | undefined;
}

/** One row in a settings section. */
export type SettingsItem =
  | { kind: 'field'; label: string; value: React.ReactNode }
  | { kind: 'toggle'; label: string; description?: string; defaultOn?: boolean }
  | {
      kind: 'action';
      label: string;
      description?: string;
      actionLabel: string;
      onAction?: () => void;
      destructive?: boolean;
    };

/** Settings module — admin configuration sections. */
export interface SettingsModuleData {
  sections: {
    id: string;
    title: string;
    description?: string;
    items: SettingsItem[];
  }[];
}

/** Forms module — a full-page structured data-entry form. */
export interface FormsModuleData {
  title?: string;
  description?: string;
  schema: import('./side-sheet').FormSchema;
  /** Receives values + shell actions (mutate data, cross-module nav…). */
  onSubmit?: (values: Record<string, string>, actions: ShellActions) => void;
  /** Confirmation copy after submit (defaults provided). */
  successTitle?: string;
  successHint?: string;
}

/** Calendar module — events on a month grid. */
export interface CalendarModuleData {
  monthLabel: string;
  /** 1-based weekday the month starts on (0 = Sun … 6 = Sat). */
  startWeekday?: number;
  daysInMonth: number;
  today?: number;
  events: { day: number; label: string; color?: string }[];
}
