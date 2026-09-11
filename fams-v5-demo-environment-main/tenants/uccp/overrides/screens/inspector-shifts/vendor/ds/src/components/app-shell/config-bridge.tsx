import * as React from 'react';
import type { EntityConfig, EntityRecord } from '../../sim/engine/types';
import {
  buildEntityModuleData,
  buildPipelineModuleData,
} from '../../runtime/config-render';
import type {
  Cell,
  Column as BridgeColumn,
  CardModel,
  FilterFacet,
} from '../../runtime/config-render';
import type { DataTableColumn } from '../data-display';
import { StatePill } from '../data-display';
import { EventIcon } from '../../icons';
import type {
  EntityModuleData as ShellEntityModuleData,
  PipelineModuleData as ShellPipelineModuleData,
  PipelineCardModel,
  DetailDescriptor,
  FilterField,
  Facet,
  FacetOption,
  SortField,
} from './types';

/**
 * B2 — config-render ⇄ app-shell unification.
 *
 * `src/runtime/config-render.ts` derives a PURE view-model (columns, cards,
 * facets, detail) from a module's EntityConfig + records — no React. This file
 * is the other half of the seam: it converts that view-model into the shell's
 * typed data contracts (`app-shell/types.ts`), resolving config `component`
 * names (TextView, StatusList, AssigneeList, DateView, PenaltyAmount,
 * SeverityBadge, LinkView…) to design-system renderings.
 *
 * The shell renderers therefore consume `buildEntityModuleData` /
 * `buildPipelineModuleData` for ANY module — a module stays config, not code.
 *
 * `rows` / `cards` are exposed as getters that re-read the (RBAC-filtered)
 * live list on every render, matching the shell's refresh() model.
 */

/* ── Cell rendering — config component names → DS nodes ─────────────────────── */

const text = (v: unknown) => (v == null || v === '' ? '—' : String(v));

/** Format a numeric value as a localized amount (PenaltyAmount / Currency). */
function formatAmount(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : text(v);
}

/** Single-letter avatar circle (AssigneeList / AssigneeSelector, avatarOnly). */
function AvatarDot({ label }: { label: string }) {
  if (!label) return <span className="text-body-sm text-muted-foreground">—</span>;
  return (
    <span
      className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
      title={label}
      aria-label={label}
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

/** Avatar circle + name (component "AssigneeTag") — for user refs inside a detail
 *  SECTION FieldGrid, where AvatarDot alone (avatar-only) hides the name. */
function AvatarNameTag({ label }: { label: string }) {
  if (!label) return <span className="text-body-sm text-muted-foreground">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <AvatarDot label={label} />
      <span className="truncate text-body-sm text-foreground">{label}</span>
    </span>
  );
}

export interface CellRenderContext {
  config: EntityConfig;
  /** Resolve a reference value (e.g. a user/company id) to a display label. */
  refLabel?: (col: string, value: unknown) => string;
}

/* ── Token-based palettes (no raw hex — coherence law #1) ───────────────────── */

/**
 * Priority/severity chip colors, keyed by lowercased value. Aligned to the
 * Pipeline V5 design: Low → success green, Medium → warning amber, High → error
 * red, Critical → deep error red (a step darker than High so the two are
 * distinguishable). Token-only — uses the success/warning/error scale tokens.
 */
export const PRIORITY_CONFIG: Record<string, { bg: string; text: string; flagFill: string; flagStroke: string }> = {
  critical: { bg: 'color-mix(in srgb, var(--error-700) 14%, transparent)', text: 'var(--error-700)', flagFill: 'var(--error-700)', flagStroke: 'var(--error-700)' },
  high: { bg: 'color-mix(in srgb, var(--destructive) 14%, transparent)', text: 'var(--destructive)', flagFill: 'var(--destructive)', flagStroke: 'var(--destructive)' },
  medium: { bg: 'color-mix(in srgb, var(--warning-500) 18%, transparent)', text: 'var(--warning-500)', flagFill: 'var(--warning-500)', flagStroke: 'var(--warning-500)' },
  low: { bg: 'color-mix(in srgb, var(--success-500) 16%, transparent)', text: 'var(--success-500)', flagFill: 'var(--success-500)', flagStroke: 'var(--success-500)' },
};
export function priorityConfigFor(value: unknown) {
  return PRIORITY_CONFIG[String(value).toLowerCase()] ?? PRIORITY_CONFIG.low;
}

/**
 * Type/category chip colors. Unlike priority, the value set is open (PREVENTIVE,
 * NEW, EXPANSION, …) and varies per product, so a colour is picked deterministically
 * from the value — the same value always reads as the same soft-fill chip. Token-only
 * (no raw hex): a categorical chart/accent token at 14% fill with the token as text.
 */
const TYPE_PALETTE = ['var(--chart-3)', 'var(--chart-2)', 'var(--info)', 'var(--chart-4)', 'var(--chart-1)', 'var(--chart-5)'];
export function enumConfigFor(value: unknown): { bg: string; text: string } {
  const key = String(value);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const c = TYPE_PALETTE[h % TYPE_PALETTE.length];
  return { bg: `color-mix(in srgb, ${c} 14%, transparent)`, text: c };
}

/**
 * Decorative avatar palette — the categorical chart tokens. A person's color is
 * picked deterministically from their id so the same person is always the same
 * color, and assignee/owner read as two distinct circles on a card.
 */
const AVATAR_PALETTE = ['var(--chart-3)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)'];
function avatarColorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/** Leading metadata icon (lucide name) derived from the field type, or none. */
function metadataIconFor(type: string | undefined): string | undefined {
  switch (type) {
    case 'SingleReference':
    case 'MultiReference': return 'Building2';
    case 'Currency': return 'Banknote';
    case 'Number': return 'Hash';
    case 'MultiSelect':
    case 'tags': return 'Tag';
    case 'Date':
    case 'DateTime': return 'Calendar';
    default: return undefined;
  }
}

function Chip({ children, bg, color }: { children: React.ReactNode; bg?: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-caption font-semibold"
      style={{ background: bg ?? 'var(--secondary)', color: color ?? 'var(--secondary-foreground)' }}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-caption tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--muted)" strokeWidth="3" />
        <circle
          cx="12" cy="12" r={r} fill="none" stroke="var(--primary)" strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="text-caption tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

/** Field TYPE → default renderer when a placement names no component. */
function fieldType(ctx: CellRenderContext, col: string): string | undefined {
  return ctx.config.systemcolumns.find((c) => c.col === col)?.type;
}
function defaultComponentForType(type: string | undefined, col: string): string {
  if (col === 'status') return 'StatusList';
  if (/priorit|severit/i.test(col)) return 'PriorityFlag';
  switch (type) {
    case 'Currency': return 'Currency';
    case 'Date':
    case 'DateTime': return 'DateView';
    case 'Boolean': return 'BooleanChip';
    case 'SingleSelect': return 'EnumChip';
    case 'MultiSelect':
    case 'tags': return 'TagChips';
    case 'SingleReference': return 'LinkView';
    case 'MultiReference': return 'AssigneeList';
    case 'Number': return 'NumberView';
    default: return 'TextView';
  }
}

/**
 * Render one config-resolved cell value. The component is either named
 * explicitly in config OR **derived from the field's TYPE** — the dynamic-card
 * contract: a placement picks WHICH field and WHERE; the field type picks HOW
 * it renders (pill / flag / progress / chips / avatar / money / date / text).
 */
export function renderCellValue(
  componentName: string | undefined,
  col: string,
  value: unknown,
  ctx: CellRenderContext,
): React.ReactNode {
  const label = ctx.refLabel ? ctx.refLabel(col, value) : text(value);
  const empty = value == null || value === '';
  const name = componentName ?? defaultComponentForType(fieldType(ctx, col), col);
  switch (name) {
    case 'StatusList': {
      const stage = ctx.config.uiConfig.statusList.find((s) => s.key === value);
      return stage ? <StatePill label={stage.label} bg={stage.color} size="sm" /> : <span>{text(value)}</span>;
    }
    case 'PriorityFlag': {
      if (empty) return <span>—</span>;
      const pc = priorityConfigFor(value);
      return (
        <Chip bg={pc.bg} color={pc.text}>
          <svg width="9" height="10" viewBox="0 0 10 11" aria-hidden style={{ stroke: pc.flagStroke, fill: pc.flagFill }}>
            <path d="M1 1v9.5M1 1.2h6.2l-1.6 2 1.6 2H1" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="uppercase">{label}</span>
        </Chip>
      );
    }
    case 'SeverityBadge':
    case 'EnumChip':
      return empty ? <span>—</span> : <Chip>{label}</Chip>;
    case 'BooleanChip': {
      const on = value === true || value === 'true' || value === 'Yes' || value === 1;
      return (
        <Chip
          bg={on ? 'color-mix(in srgb, var(--success) 16%, transparent)' : 'var(--muted)'}
          color={on ? 'var(--success)' : 'var(--muted-foreground)'}
        >
          {on ? 'Yes' : 'No'}
        </Chip>
      );
    }
    case 'TagChips': {
      const arr = Array.isArray(value) ? value : empty ? [] : String(value).split(',').map((s) => s.trim());
      return arr.length ? (
        <span className="inline-flex flex-wrap gap-1">{arr.map((t, i) => <Chip key={i}>{String(t)}</Chip>)}</span>
      ) : (
        <span>—</span>
      );
    }
    case 'ProgressBar':
      return <ProgressBar value={Number(value) || 0} />;
    case 'ProgressRing':
      return <ProgressRing value={Number(value) || 0} />;
    case 'StageProgress':
    case 'StageProgressRing': {
      // Progress computed from the record's position in the pipeline's stages —
      // every pipeline gets a progress indicator with no extra data field.
      const list = ctx.config.uiConfig.statusList ?? [];
      const idx = list.findIndex((s) => s.key === value);
      const pct = list.length && idx >= 0 ? Math.round(((idx + 1) / list.length) * 100) : 0;
      return name === 'StageProgressRing' ? <ProgressRing value={pct} /> : <ProgressBar value={pct} />;
    }
    case 'EventIcon':
      // Event glyph (line variant) + label — for event-typed cells in cards/lists.
      return empty ? (
        <span>—</span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <EventIcon name={String(value)} variant="line" size={16} />
          <span>{label}</span>
        </span>
      );
    case 'AssigneeList':
    case 'AssigneeSelector':
      return <AvatarDot label={empty ? '' : label} />;
    case 'AssigneeTag':
      // Avatar + name — use for a user ref inside a section (where avatar-only hides the name).
      return <AvatarNameTag label={empty ? '' : label} />;
    case 'Currency':
    case 'PenaltyAmount':
      return <span className="font-medium tabular-nums">{formatAmount(value)}</span>;
    case 'NumberView':
      return <span className="tabular-nums">{text(value)}</span>;
    case 'LinkView':
      return <span className="font-medium text-primary">{label}</span>;
    case 'DateView':
    case 'PreviewTextArea':
    case 'TextView':
    default:
      return <span>{label}</span>;
  }
}

/** Render a bridge `Cell` (label already resolved by config-render). */
export function renderCell(cell: Cell, ctx: CellRenderContext): React.ReactNode {
  return renderCellValue(cell.component, cell.col, cell.value, ctx);
}

/* ── Columns: bridge Column[] → DataTableColumn[] ───────────────────────────── */

export function toShellColumns<T>(
  columns: BridgeColumn[],
  ctx: CellRenderContext,
  /** Read the underlying record for a row (rows may be records or cards). */
  recordOf: (row: T) => EntityRecord | undefined,
): DataTableColumn<T>[] {
  return columns.map((c) => ({
    id: c.id,
    header: c.header,
    sortable: c.sortable,
    accessor: (row: T) => recordOf(row)?.[c.accessorKey],
    cell: (row: T) => {
      const rec = recordOf(row);
      return renderCellValue(c.component, c.accessorKey, rec?.[c.accessorKey], ctx);
    },
  }));
}

/* ── Cards: bridge CardModel → shell PipelineCardModel ──────────────────────── */

export function toShellCard(card: CardModel, ctx: CellRenderContext): PipelineCardModel {
  const refType = ['SingleReference', 'MultiReference'];
  // Detect the special slots by component name OR by the field's TYPE, so the
  // card is dynamic — a recipe needn't name a component for these to work.
  const isPriority = (c: Cell) =>
    c.component === 'PriorityFlag' || c.component === 'SeverityBadge' || /priorit|severit/i.test(c.col);
  const isAssignee = (c: Cell) =>
    c.component === 'AssigneeList' || c.component === 'AssigneeSelector' || refType.includes(fieldType(ctx, c.col) ?? '');
  const isDate = (c: Cell) =>
    c.component === 'DateView' || ['Date', 'DateTime'].includes(fieldType(ctx, c.col) ?? '');

  const priorityCell = card.header.find(isPriority) ?? card.body.find(isPriority);
  const assigneeCell = card.footer.find(isAssignee) ?? card.body.find(isAssignee);
  const dateCell = card.footer.find(isDate);

  // A single-select enum that isn't status/priority is the card's "type" chip
  // (PREVENTIVE, NEW, …) — surfaced as the header type badge like the demos,
  // not flattened into a body row. Detected by type so a recipe needn't name it.
  const isType = (c: Cell) =>
    c !== priorityCell &&
    c.col !== 'status' &&
    !isPriority(c) &&
    (c.component === 'EnumChip' || fieldType(ctx, c.col) === 'SingleSelect');
  const typeCell = card.header.find(isType) ?? card.body.find(isType);
  const typeValue =
    typeCell?.value != null && typeCell.value !== '' ? String(typeCell.value) : undefined;

  const assigneeLabel =
    assigneeCell?.value != null && assigneeCell.value !== ''
      ? ctx.refLabel
        ? ctx.refLabel(assigneeCell.col, assigneeCell.value)
        : String(assigneeCell.value)
      : '';

  const priorityValue =
    priorityCell?.value != null && priorityCell.value !== '' ? String(priorityCell.value) : undefined;

  // Every footer person-reference cell becomes an avatar (e.g. assignee + owner),
  // each a distinct color keyed off its id, rendered as an overlapping stack.
  const avatars = card.footer
    .filter(isAssignee)
    .flatMap((c) => {
      // Multi-reference (e.g. Assignee) holds an array → one avatar per person.
      const vals = Array.isArray(c.value) ? c.value : c.value != null && c.value !== '' ? [c.value] : [];
      return vals.map((val) => {
        const label = ctx.refLabel ? ctx.refLabel(c.col, val) : String(val);
        return label ? { letter: label.charAt(0).toUpperCase(), color: avatarColorFor(String(val)) } : null;
      });
    })
    .filter((a): a is { letter: string; color: string } => a !== null);

  return {
    id: card.id,
    stageId: card.stageId,
    ticketId: card.ticketId,
    title: card.title,
    imageUrl: card.imageUrl,
    location: card.location,
    zoneId: card.zoneId,
    priority: priorityValue,
    priorityConfig: priorityValue ? priorityConfigFor(priorityValue) : undefined,
    type: typeValue,
    typeConfig: typeValue ? enumConfigFor(typeValue) : undefined,
    // Body fields render via their type-derived component (chips / progress /
    // money / pills / text) — not flattened to strings. Priority + type cells are
    // lifted into the header badges, so they're excluded here.
    metadataFields: card.body
      .filter((cell) => cell !== priorityCell && cell !== typeCell && cell.value != null && cell.value !== '')
      .map((cell) => ({ icon: metadataIconFor(fieldType(ctx, cell.col)), value: renderCell(cell, ctx) })),
    avatars: avatars.length ? avatars : undefined,
    assignedAvatar: assigneeLabel
      ? { letter: assigneeLabel.charAt(0).toUpperCase(), color: avatarColorFor(String(assigneeCell?.value ?? '')) }
      : null,
    isUnassigned: !assigneeLabel && avatars.length === 0,
    dateLabel: dateCell?.value != null ? String(dateCell.value) : undefined,
  };
}

/* ── Filter facets → the shell's single toolbar facet ───────────────────────── */

function toFilterField<T>(
  facets: FilterFacet[],
  get: (row: T, col: string) => string,
): FilterField<T> | undefined {
  // The toolbar exposes one facet; prefer the first non-status one (status is
  // already visible as kanban columns / a list column).
  const facet = facets.find((f) => f.col !== 'status') ?? facets[0];
  if (!facet) return undefined;
  return { label: facet.label, get: (row: T) => get(row, facet.col) };
}

/**
 * Icon + selectable options for a facet dropdown, derived from the field type:
 * status → stage labels, references (owner/assignee) → distinct ids labelled via
 * refLabel, enums → their listValues, else the facet's own derived values.
 */
function facetMeta(
  config: EntityConfig,
  f: FilterFacet,
  records: EntityRecord[],
  refLabel: ((col: string, value: unknown) => string) | undefined,
): { icon: string; options: FacetOption[] } {
  const def = config.systemcolumns.find((c) => c.col === f.col);
  if (f.col === 'status') {
    return { icon: 'Folder', options: config.uiConfig.statusList.map((s) => ({ value: s.key, label: s.label })) };
  }
  if (def?.type === 'SingleReference' || def?.type === 'MultiReference') {
    const seen = new Map<string, string>();
    for (const r of records) {
      const raw = r[f.col];
      const ids = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [];
      for (const id of ids) {
        const v = String(id);
        if (v) seen.set(v, refLabel ? refLabel(f.col, v) : v);
      }
    }
    return { icon: 'User', options: [...seen].map(([value, label]) => ({ value, label })) };
  }
  if (def?.listValues?.length) {
    const icon = /priorit|severit/i.test(def.name ?? f.col) ? 'Flag' : 'Tag';
    return { icon, options: def.listValues.map((v) => ({ value: v, label: v })) };
  }
  return { icon: 'Tag', options: (f.options ?? []).map((v) => ({ value: v, label: v })) };
}

/* ── Module-data bindings (what a recipe module hands the shell) ────────────── */

/**
 * Stable-identity getter: re-derives only when `version()` changes. The shell's
 * renderers sync local state on `data.cards`/`data.rows` IDENTITY (useEffect
 * deps), so returning a fresh array on every access would loop their effects.
 */
function versioned<T>(version: (() => number) | undefined, build: () => T): () => T {
  if (!version) return build; // no counter → always live (caller manages identity)
  let cached: { v: number; value: T } | null = null;
  return () => {
    const v = version();
    if (!cached || cached.v !== v) cached = { v, value: build() };
    return cached.value;
  };
}

export interface BindEntityOptions {
  config: EntityConfig;
  /** Live, RBAC-filtered record list — re-read whenever `version` changes. */
  list: () => EntityRecord[];
  /** Store mutation counter (`store.version`) — drives derived-data caching. */
  version?: () => number;
  toDetail?: (record: EntityRecord) => DetailDescriptor;
  refLabel?: (col: string, value: unknown) => string;
}

/** Entity module: config + live records → the shell's EntityModuleData. */
export function bindEntityModuleData(opts: BindEntityOptions): ShellEntityModuleData<EntityRecord> {
  const ctx: CellRenderContext = { config: opts.config, refLabel: opts.refLabel };
  // Columns / facets / search derive from config alone — records not needed.
  const shape = buildEntityModuleData(opts.config, []);
  const rows = versioned(opts.version, () => opts.list());
  return {
    columns: toShellColumns<EntityRecord>(shape.columns, ctx, (row) => row),
    get rows() {
      return rows();
    },
    getRowId: (row) => row.id,
    toDetail: opts.toDetail,
    searchText: (row) => shape.searchColumns.map((c) => String(row[c] ?? '')).join(' '),
    filterField: toFilterField<EntityRecord>(shape.filters, (row, col) => String(row[col] ?? '')),
    facets: shape.filters.map((f): Facet<EntityRecord> => {
      const { icon, options } = facetMeta(opts.config, f, rows(), opts.refLabel);
      return {
        col: f.col,
        label: f.label,
        icon,
        options,
        get: (row) => {
          const v = row[f.col];
          return Array.isArray(v) ? v.map(String) : String(v ?? '');
        },
      };
    }),
    sortFields: shape.columns.map((c): SortField<EntityRecord> => ({
      key: c.accessorKey,
      label: c.header,
      get: (row) => {
        const v = row[c.accessorKey];
        return typeof v === 'number' ? v : String(v ?? '');
      },
    })),
  };
}

export interface BindPipelineOptions {
  config: EntityConfig;
  /** Live, RBAC-filtered record list — re-read whenever `version` changes. */
  list: () => EntityRecord[];
  /** Store mutation counter (`store.version`) — drives derived-data caching. */
  version?: () => number;
  /** Read one record by id (list/detail cells resolve through this). */
  get: (id: string) => EntityRecord | undefined;
  /** Rule-enforced move — reject by toasting + refreshing, not throwing. */
  onCardMove?: (cardId: string, toStageId: string) => void;
  /** Stages a card may legally move to NOW (from the rule engine), for drag highlighting. */
  allowedStages?: (cardId: string) => string[];
  toDetail?: (card: PipelineCardModel) => DetailDescriptor;
  refLabel?: (col: string, value: unknown) => string;
}

/** Pipeline module: config + live records → the shell's PipelineModuleData. */
export function bindPipelineModuleData(opts: BindPipelineOptions): ShellPipelineModuleData {
  const ctx: CellRenderContext = { config: opts.config, refLabel: opts.refLabel };
  const shape = buildPipelineModuleData(opts.config, []);
  const cards = versioned(opts.version, () =>
    buildPipelineModuleData(opts.config, opts.list()).cards.map((c) => toShellCard(c, ctx)),
  );
  return {
    stages: shape.stages,
    get cards() {
      return cards();
    },
    mapCenter: shape.mapCenter,
    mapZones: shape.mapZones,
    columns: toShellColumns<PipelineCardModel>(shape.columns, ctx, (card) => opts.get(card.id)),
    toDetail: opts.toDetail,
    onCardMove: opts.onCardMove,
    allowedStages: opts.allowedStages,
    filterField: toFilterField<PipelineCardModel>(
      shape.filters.filter((f) => f.col !== 'status'),
      (card, col) => String(opts.get(card.id)?.[col] ?? ''),
    ),
    facets: shape.filters.map((f): Facet<PipelineCardModel> => {
      const { icon, options } = facetMeta(opts.config, f, opts.list(), opts.refLabel);
      return {
        col: f.col,
        label: f.label,
        icon,
        options,
        get: (card) => {
          if (f.col === 'status') return String(card.stageId ?? '');
          const v = opts.get(card.id)?.[f.col];
          return Array.isArray(v) ? v.map(String) : String(v ?? '');
        },
      };
    }),
    sortFields: shape.columns.map((c): SortField<PipelineCardModel> => ({
      key: c.accessorKey,
      label: c.header,
      get: (card) => {
        if (c.accessorKey === 'uniqueidentifier') return String(card.ticketId ?? '');
        const v = opts.get(card.id)?.[c.accessorKey];
        return typeof v === 'number' ? v : String(v ?? '');
      },
    })),
  };
}
