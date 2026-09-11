import type { DataTableColumn } from '../../components/data-display';
import type {
  PipelineModuleData,
  PipelineCardModel,
  EntityModuleData,
  DetailDescriptor,
  FilterField,
  ShellActions,
} from '../../components/app-shell';
import { EntityStore } from '../engine/entity-store';
import type { EntityRecord, PipelineRules, UserContext } from '../engine/types';
import { allowedTransitions, isTaskVisible } from '../engine/rules';

/**
 * Sim → DS bridge.
 *
 * Projects faithful EAV records from the sim `EntityStore` into the design
 * system's `PipelineModuleData` / `EntityModuleData` shapes, so the existing
 * AppShell renderers drive live, persisted, rule-governed data instead of
 * static arrays.
 *
 * Integration model (matches the DS): `refresh` is a force re-render and
 * renderers read `module.data` each render — so `cards` / `rows` are exposed as
 * GETTERS that read the store live. Mutations go through the store (persisted
 * to localStorage) and are rule-enforced; the next render reflects them.
 */

/* ── Pipeline ───────────────────────────────────────────────────────────────── */

export interface SimPipelineOptions<TCard extends PipelineCardModel> {
  store: EntityStore;
  /** Entity code backing this pipeline (e.g. "crm/deals"). */
  code: string;
  rules: PipelineRules;
  /** Current user — drives RBAC row visibility + transition permission. */
  getUser: () => UserContext;
  stages: PipelineModuleData['stages'];
  /** Project a stored EAV record into a kanban card. */
  toCard: (record: EntityRecord) => TCard;
  columns?: DataTableColumn<PipelineCardModel>[];
  toDetail?: (card: PipelineCardModel) => DetailDescriptor;
  searchText?: (card: PipelineCardModel) => string;
  filterField?: FilterField<PipelineCardModel>;
  /** Called when a drag is rejected by the rules engine (e.g. show a toast). */
  onReject?: (message: string) => void;
}

export function createSimPipelineData<TCard extends PipelineCardModel>(
  opts: SimPipelineOptions<TCard>,
): PipelineModuleData {
  const { store, code, rules, getUser, toCard } = opts;

  const visibleCards = (): TCard[] => {
    const user = getUser();
    const { records } = store.list(code);
    return records.filter((r) => isTaskVisible(rules, user, r)).map(toCard);
  };

  return {
    stages: opts.stages,
    get cards() {
      return visibleCards();
    },
    columns: opts.columns,
    toDetail: opts.toDetail,
    searchText: opts.searchText,
    filterField: opts.filterField,
    onCardMove: (cardId: string, toStageId: string) => {
      const user = getUser();
      const task = store.read(code, cardId);
      if (!task) return;
      // Faithful to backend: reject transitions the role isn't permitted.
      if (!allowedTransitions(rules, user, task).includes(toStageId)) {
        opts.onReject?.(
          `Transition ${task.status} → ${toStageId} not permitted for [${user.roles.join(', ')}]`,
        );
        return;
      }
      store.update(code, cardId, { status: toStageId });
    },
  };
}

/* ── Entity ─────────────────────────────────────────────────────────────────── */

export interface SimEntityOptions<T> {
  store: EntityStore;
  code: string;
  columns: DataTableColumn<T>[];
  /** Project a stored EAV record into the typed row the columns expect. */
  toRow: (record: EntityRecord) => T;
  getRowId?: (row: T, index: number) => string;
  toDetail?: (row: T) => DetailDescriptor;
  searchText?: (row: T) => string;
  filterField?: FilterField<T>;
}

export function createSimEntityData<T>(opts: SimEntityOptions<T>): EntityModuleData<T> {
  const { store, code, toRow } = opts;
  return {
    columns: opts.columns,
    get rows() {
      return store.list(code).records.map(toRow);
    },
    getRowId: opts.getRowId,
    toDetail: opts.toDetail,
    searchText: opts.searchText,
    filterField: opts.filterField,
  };
}

/* ── Create-form submit helper ──────────────────────────────────────────────── */

/**
 * Build a `ModuleConfig.create.onSubmit` that writes a new record to the sim
 * store (persisted) then forces a re-render. `mapValues` turns raw form values
 * into the EAV record shape (systemcol mapping + status).
 */
export function simCreateSubmit(
  store: EntityStore,
  code: string,
  mapValues: (values: Record<string, string>) => Partial<EntityRecord>,
): (values: Record<string, string>, actions: ShellActions) => void {
  return (values, actions) => {
    store.create(code, mapValues(values));
    actions.refresh();
  };
}
