import type { EntityConfig, EntityRecord, FieldPlacement } from '../sim/engine/types';

/**
 * B2 — Config-driven render bridge (the keystone).
 *
 * Turns a module's CONFIG (systemcolumns + uiConfig) + records into the design
 * system's view-model — columns, kanban cards, filter facets, detail surfaces —
 * **derived from field metadata, with no per-product React**. This is what makes
 * "a module is config, not code" true, and therefore what keeps every product
 * inside one coherent design.
 *
 * Output shapes mirror the reference app-shell's `EntityModuleData` /
 * `PipelineModuleData` (see `src/components/app-shell/types.ts`). They are
 * declared locally here so the bridge is self-contained + sandbox-verifiable;
 * on harvest (B1) these unify with the shell's exported types.
 *
 * Pure TS — no React, no DS imports. Behavior targets the demos (truemax kanban +
 * ticket detail, etc.) as acceptance criteria.
 */

/* ── View-model (mirrors the shell contracts) ───────────────────────────────── */

export interface Column {
  id: string;
  header: string;
  /** Key to read off a record. */
  accessorKey: string;
  /** Optional component name the shell should render the cell with. */
  component?: string;
  sortable?: boolean;
}

export interface Cell {
  col: string;
  label: string;
  value: unknown;
  pos?: 'left' | 'right';
  component?: string;
}

export interface CardModel {
  id: string;
  stageId: string;
  ticketId?: string;
  title?: string;
  /** Cover image URL, resolved from `kanbanCard.image.col` (empty → text-only card). */
  imageUrl?: string;
  /** Point location `[lat, lng]` for the hybrid map, from `uiConfig.map.lat/lngCol`. */
  location?: [number, number];
  /** Zone id for the hybrid map, from `uiConfig.map.zoneCol` (references a map zone). */
  zoneId?: string;
  /** Config-resolved cells, grouped as in the kanbanCard config. */
  header: Cell[];
  body: Cell[];
  footer: Cell[];
}

export interface FilterFacet {
  col: string;
  label: string;
  /** 'select' | 'boolean' | 'date' | 'reference' … derived from the field type. */
  type: string;
  /** Allowed values for select/status facets. */
  options?: string[];
}

export interface DetailModel {
  title: unknown;
  details: Cell[];
  sections: { name: string; fields: Cell[] }[];
  rightPanelTabs: { key: string; title: string; component?: string }[];
}

export interface EntityModuleData {
  columns: Column[];
  rows: EntityRecord[];
  filters: FilterFacet[];
  searchColumns: string[];
  toDetail: (record: EntityRecord) => DetailModel;
}

export interface PipelineStage {
  id: string;
  label: string;
  color?: string;
}

export interface MapZoneShape {
  id: string;
  points: [number, number][];
  color?: string;
  label?: string;
}

export interface PipelineModuleData {
  stages: PipelineStage[];
  cards: CardModel[];
  columns: Column[];
  filters: FilterFacet[];
  searchColumns: string[];
  toDetail: (record: EntityRecord) => DetailModel;
  onCardMove?: (cardId: string, toStageId: string) => void;
  /** Hybrid-map config (from `uiConfig.map`). */
  mapCenter?: [number, number];
  mapZones?: MapZoneShape[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function fieldName(config: EntityConfig, col: string): string {
  return config.systemcolumns.find((c) => c.col === col)?.name ?? col;
}

function resolveCell(config: EntityConfig, record: EntityRecord, p: FieldPlacement): Cell {
  return {
    col: p.col,
    label: p.name ?? fieldName(config, p.col),
    value: record[p.col],
    pos: p.pos,
    component: p.component?.name,
  };
}

/** Columns from listcolumns (preferred) or, failing that, the systemcolumns. */
export function deriveColumns(config: EntityConfig): Column[] {
  const source: FieldPlacement[] =
    config.listcolumns.length > 0
      ? config.listcolumns
      : config.systemcolumns.map((c) => ({ col: c.col }));
  return source.map((c) => ({
    id: c.col,
    header: fieldName(config, c.col),
    accessorKey: c.col,
    component: c.component?.name,
    sortable: true,
  }));
}

/** A kanban card, fully derived from the kanbanCard config + the record. */
export function deriveCard(config: EntityConfig, record: EntityRecord): CardModel {
  const kc = config.uiConfig.kanbanCard;
  const group = (ps?: FieldPlacement[]) => (ps ?? []).map((p) => resolveCell(config, record, p));
  const imageVal = kc?.image ? record[kc.image.col] : undefined;
  const mp = config.uiConfig.map;
  const lat = mp?.latCol != null ? Number(record[mp.latCol]) : NaN;
  const lng = mp?.lngCol != null ? Number(record[mp.lngCol]) : NaN;
  const zoneVal = mp?.zoneCol != null ? record[mp.zoneCol] : undefined;
  return {
    id: record.id,
    stageId: (record.status as string) ?? '',
    ticketId: record.uniqueidentifier,
    title: record.title,
    imageUrl: imageVal != null && imageVal !== '' ? String(imageVal) : undefined,
    location: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined,
    zoneId: zoneVal != null && zoneVal !== '' ? String(zoneVal) : undefined,
    header: group(kc?.header),
    body: group(kc?.body),
    footer: group(kc?.footer),
  };
}

/** Filter facets from uiConfig.filters, typed from the field metadata. */
export function deriveFilters(config: EntityConfig): FilterFacet[] {
  const statusKeys = config.uiConfig.statusList.map((s) => s.key);
  return (config.uiConfig.filters ?? []).map((f) => {
    const def = config.systemcolumns.find((c) => c.col === f.col);
    const type = f.boolean ? 'boolean' : f.col === 'status' ? 'select' : def?.type ?? 'text';
    const options =
      f.col === 'status'
        ? statusKeys
        : def?.listValues ?? undefined;
    return { col: f.col, label: f.name ?? def?.name ?? f.col, type, options };
  });
}

/** The detail surface, derived from uiConfig.profile. */
export function deriveDetail(config: EntityConfig, record: EntityRecord): DetailModel {
  const p = config.uiConfig.profile;
  if (!p) {
    return { title: record.title, details: [], sections: [], rightPanelTabs: [] };
  }
  return {
    title: record[p.title.col],
    details: p.details.map((d) => resolveCell(config, record, d)),
    sections: p.sections.map((s) => ({
      name: s.name,
      fields: s.fields.map((f) => resolveCell(config, record, f)),
    })),
    rightPanelTabs: (p.rightPanel?.tabs ?? []).map((t) => ({
      key: t.key,
      title: t.title,
      component: t.component?.name,
    })),
  };
}

/* ── Module-data builders (what the shell renderers consume) ────────────────── */

export function buildEntityModuleData(
  config: EntityConfig,
  records: EntityRecord[],
): EntityModuleData {
  return {
    columns: deriveColumns(config),
    rows: records,
    filters: deriveFilters(config),
    searchColumns: config.uiConfig.search?.columns ?? ['title'],
    toDetail: (r) => deriveDetail(config, r),
  };
}

export function buildPipelineModuleData(
  config: EntityConfig,
  records: EntityRecord[],
  opts?: { onCardMove?: (cardId: string, toStageId: string) => void },
): PipelineModuleData {
  return {
    stages: config.uiConfig.statusList.map((s) => ({ id: s.key, label: s.label, color: s.color })),
    cards: records.map((r) => deriveCard(config, r)),
    columns: deriveColumns(config),
    filters: deriveFilters(config),
    searchColumns: config.uiConfig.search?.columns ?? ['title'],
    toDetail: (r) => deriveDetail(config, r),
    onCardMove: opts?.onCardMove,
    mapCenter: config.uiConfig.map?.center,
    mapZones: config.uiConfig.map?.zones,
  };
}
