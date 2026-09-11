// @ts-check
/**
 * The typed delta-op engine (decision #14: "typed ops on stable IDs — NEVER
 * JSON-Patch paths/indexes, the Odoo lesson").
 *
 * Every op references blueprint nodes by their STABLE `id` only. Unknown op
 * types are rejected; ops referencing a missing id are rejected with a message
 * naming the op and the id. Ops never carry array indexes or JSON paths.
 *
 * Regions an op can touch:
 *   - fields     → `systemcolumns[]`                      (the field definitions)
 *   - list       → `listcolumns[]`                        (list-view placements)
 *   - details    → `uiConfig.profile.details[]`           (detail-surface placements)
 *   - kanbanCard → `uiConfig.kanbanCard.{header,body,footer}[]` (kanban card placements)
 *   - stages     → `uiConfig.statusList[]`                (statuses / pipeline stages)
 *   - tabs       → `uiConfig.profile.rightPanel.tabs[]`   (profile side tabs)
 *
 * A field is DEFINED in `systemcolumns` but only becomes VISIBLE on a surface
 * once a FieldPlacement node (same stable id, referencing the field's `col`) is
 * inserted into that surface's region. `addField` can do both at once via its
 * optional `placements`; `placeField` places an already-defined field.
 *
 * Op families (each op object also carries a stable `opId` — see promote):
 *   addField     { field: SystemColumn, after?: <systemcolumn id>, placements? }
 *                placements: { details?: { after? }, list?: { after? },
 *                              kanbanCard?: { region: 'header'|'body'|'footer', after? } }
 *                — inserts the field AND a convention-consistent FieldPlacement
 *                  into each named region (missing `after` target → error).
 *   placeField   { id: <systemcolumn id>, region, after? }   places an EXISTING field.
 *                region ∈ PLACEMENT_REGIONS.
 *   hideField    { id: <listcolumn id> }        removes the list placement; field stays defined
 *   setLabel     { id: <systemcolumn id>, label }
 *   setFieldProp { id: <systemcolumn id>, prop, value }   prop ∈ FIELD_PROP_ALLOWLIST
 *   addStage     { stage: StatusDef, after?: <status id> }
 *   removeStage  { id: <status id> }            SAFETY: does not check seed usage — see note below
 *   addTab       { tab: Tab, after?: <tab id> } bootstraps rightPanel if absent
 *   hideTab      { id: <tab id> }
 *   reorderTabs  { ids: <tab id[]> }            must be exactly the current tab-id set
 *
 * @typedef {{ opId: string, op: string, [k: string]: any }} Op
 * @typedef {{ touched?: string[], removed?: string[] }} OpEffect
 */

/** All recognised op type discriminators. */
export const OP_TYPES = /** @type {const} */ ([
  'addField', 'placeField', 'hideField', 'setLabel', 'setFieldProp',
  'addStage', 'removeStage', 'addTab', 'hideTab', 'reorderTabs',
]);

/**
 * The placement regions `placeField` / `addField.placements` may target. A
 * region string names an ordered array of FieldPlacement nodes in the blueprint.
 */
export const PLACEMENT_REGIONS = /** @type {const} */ ([
  'details', 'list', 'kanbanCard.header', 'kanbanCard.body', 'kanbanCard.footer',
]);

/**
 * Props `setFieldProp` may write — a safe allowlist. Anything else is rejected
 * so a delta can never smuggle in a structural change (`col`, `type`, `id`) or
 * an arbitrary key that would break the schema.
 */
export const FIELD_PROP_ALLOWLIST = /** @type {const} */ ([
  'required', 'listValues', 'append', 'min', 'max',
]);

// --- region accessors -------------------------------------------------------

const systemcolumns = (bp) => (bp.systemcolumns ??= []);
const listcolumns = (bp) => (bp.listcolumns ??= []);
const statusList = (bp) => ((bp.uiConfig ??= {}).statusList ??= []);
const tabsOf = (bp) => bp?.uiConfig?.profile?.rightPanel?.tabs ?? null;
const byId = (arr, id) => (arr ?? []).find((n) => n && n.id === id);

/**
 * Resolve a placement region string to its ordered FieldPlacement array. With
 * `{ create: true }` the region (and any missing parent structure) is
 * bootstrapped; otherwise a missing region returns null (read-only probe).
 * @param {Record<string, any>} bp
 * @param {string} region  one of PLACEMENT_REGIONS
 * @param {{ create?: boolean }} [opts]
 * @returns {any[] | null}
 */
export function placementRegion(bp, region, { create = false } = {}) {
  if (region === 'list') {
    if (create) return listcolumns(bp);
    return bp?.listcolumns ?? null;
  }
  const ui = create ? (bp.uiConfig ??= {}) : bp?.uiConfig;
  if (!ui) return null;
  if (region === 'details') {
    const prof = create ? (ui.profile ??= { title: {}, details: [], sections: [] }) : ui.profile;
    if (!prof) return null;
    return create ? (prof.details ??= []) : (prof.details ?? null);
  }
  if (region.startsWith('kanbanCard.')) {
    const sub = region.slice('kanbanCard.'.length);
    if (sub !== 'header' && sub !== 'body' && sub !== 'footer') return null;
    const kc = create ? (ui.kanbanCard ??= { header: [], body: [], footer: [] }) : ui.kanbanCard;
    if (!kc) return null;
    return create ? (kc[sub] ??= []) : (kc[sub] ?? null);
  }
  return null;
}

/**
 * The FieldPlacement node a placement op inserts for a field — convention:
 *   - list                  → { id, col, component: { name: 'TextView' } }
 *   - details / kanbanCard.* → { id, col, order: 1, pos: 'left' }
 * The node shares the field's stable id (one logical node across regions).
 */
function synthPlacement(region, field) {
  if (region === 'list') return { id: field.id, col: field.col, component: { name: 'TextView' } };
  return { id: field.id, col: field.col, order: 1, pos: 'left' };
}

/** Insert `node` into a region array after the `after` id (else append). */
function insertPlacement(arr, node, after) {
  const at = after ? arr.findIndex((n) => n && n.id === after) : arr.length - 1;
  arr.splice(at + 1, 0, node);
}

/**
 * Normalize an `addField.placements` object to a list of { region, after }.
 * @returns {{ region: string, after?: string }[]}
 */
export function normalizePlacements(placements) {
  if (!placements || typeof placements !== 'object') return [];
  const out = [];
  if (placements.details) out.push({ region: 'details', after: placements.details.after });
  if (placements.list) out.push({ region: 'list', after: placements.list.after });
  if (placements.kanbanCard) {
    out.push({ region: `kanbanCard.${placements.kanbanCard.region}`, after: placements.kanbanCard.after });
  }
  return out;
}

/**
 * Validate a single placement insert (region validity, `after` existence, and
 * that the field is not already placed there). `at` is the error-prefixer.
 * @returns {string[]}
 */
function validatePlacement(at, bp, region, after, fieldId) {
  const errs = [];
  if (!PLACEMENT_REGIONS.includes(region)) {
    errs.push(at(`unknown placement region "${region}" — expected one of [${PLACEMENT_REGIONS.join(', ')}]`));
    return errs;
  }
  const arr = placementRegion(bp, region, { create: false });
  if (after != null && !byId(arr, after)) {
    errs.push(at(`placement "after" references missing ${region} id "${after}"`));
  }
  if (fieldId != null && byId(arr, fieldId)) {
    errs.push(at(`field "${fieldId}" is already placed in ${region}`));
  }
  return errs;
}

/**
 * Validate one op against a blueprint (structure + stable-id existence).
 * Returns an array of human-readable error strings ([] when valid). Does NOT
 * mutate. Callers run this for every op before applying any (fail-closed).
 * @param {Op} op
 * @param {Record<string, any>} bp  blueprint AS IT STANDS before this op applies
 * @returns {string[]}
 */
export function validateOp(op, bp) {
  const errs = [];
  const at = (msg) => `${op && op.op ? op.op : '<no-op>'}${op && op.opId ? ` (${op.opId})` : ''}: ${msg}`;

  if (!op || typeof op !== 'object') return ['op is not an object'];
  if (typeof op.opId !== 'string' || !op.opId) errs.push(at('missing string "opId"'));
  if (!OP_TYPES.includes(op.op)) return [at(`unknown op type "${op.op}"`)];

  switch (op.op) {
    case 'addField': {
      if (!op.field || typeof op.field !== 'object') { errs.push(at('missing "field" object')); break; }
      for (const k of ['id', 'col', 'name', 'type']) {
        if (typeof op.field[k] !== 'string') errs.push(at(`field.${k} must be a string`));
      }
      if (op.field.id && byId(systemcolumns(bp), op.field.id)) errs.push(at(`field id "${op.field.id}" already exists`));
      if (op.after != null && !byId(systemcolumns(bp), op.after)) errs.push(at(`"after" references missing field id "${op.after}"`));
      if (op.placements != null) {
        if (typeof op.placements !== 'object') { errs.push(at('"placements" must be an object')); break; }
        if (op.placements.kanbanCard && !['header', 'body', 'footer'].includes(op.placements.kanbanCard.region)) {
          errs.push(at(`placements.kanbanCard.region must be one of [header, body, footer]`));
        }
        for (const { region, after } of normalizePlacements(op.placements)) {
          // The field is being added, so it is not yet placed anywhere — pass a
          // null fieldId to skip the "already placed" check.
          errs.push(...validatePlacement(at, bp, region, after, null));
        }
      }
      break;
    }
    case 'placeField': {
      if (typeof op.id !== 'string') { errs.push(at('missing "id"')); break; }
      if (!byId(systemcolumns(bp), op.id)) errs.push(at(`references missing field id "${op.id}"`));
      if (typeof op.region !== 'string' || !PLACEMENT_REGIONS.includes(op.region)) {
        errs.push(at(`"region" must be one of [${PLACEMENT_REGIONS.join(', ')}]`));
        break;
      }
      errs.push(...validatePlacement(at, bp, op.region, op.after, op.id));
      break;
    }
    case 'hideField': {
      if (typeof op.id !== 'string') { errs.push(at('missing "id"')); break; }
      if (!byId(listcolumns(bp), op.id)) errs.push(at(`references missing list-column id "${op.id}"`));
      break;
    }
    case 'setLabel': {
      if (typeof op.id !== 'string') { errs.push(at('missing "id"')); break; }
      if (typeof op.label !== 'string') errs.push(at('missing string "label"'));
      if (!byId(systemcolumns(bp), op.id)) errs.push(at(`references missing field id "${op.id}"`));
      break;
    }
    case 'setFieldProp': {
      if (typeof op.id !== 'string') { errs.push(at('missing "id"')); break; }
      if (!FIELD_PROP_ALLOWLIST.includes(op.prop)) errs.push(at(`prop "${op.prop}" not in allowlist [${FIELD_PROP_ALLOWLIST.join(', ')}]`));
      if (!('value' in op)) errs.push(at('missing "value"'));
      if (!byId(systemcolumns(bp), op.id)) errs.push(at(`references missing field id "${op.id}"`));
      break;
    }
    case 'addStage': {
      if (!op.stage || typeof op.stage !== 'object') { errs.push(at('missing "stage" object')); break; }
      for (const k of ['id', 'key', 'label', 'color']) {
        if (typeof op.stage[k] !== 'string') errs.push(at(`stage.${k} must be a string`));
      }
      if (op.stage.id && byId(statusList(bp), op.stage.id)) errs.push(at(`stage id "${op.stage.id}" already exists`));
      if (op.after != null && !byId(statusList(bp), op.after)) errs.push(at(`"after" references missing stage id "${op.after}"`));
      break;
    }
    case 'removeStage': {
      if (typeof op.id !== 'string') { errs.push(at('missing "id"')); break; }
      if (!byId(statusList(bp), op.id)) errs.push(at(`references missing stage id "${op.id}"`));
      break;
    }
    case 'addTab': {
      if (!op.tab || typeof op.tab !== 'object') { errs.push(at('missing "tab" object')); break; }
      for (const k of ['id', 'key', 'title', 'order']) {
        if (op.tab[k] == null) errs.push(at(`tab.${k} is required`));
      }
      if (!op.tab.component || typeof op.tab.component.name !== 'string') errs.push(at('tab.component.name is required'));
      const tabs = tabsOf(bp);
      if (tabs && op.tab.id && byId(tabs, op.tab.id)) errs.push(at(`tab id "${op.tab.id}" already exists`));
      if (op.after != null && !(tabs && byId(tabs, op.after))) errs.push(at(`"after" references missing tab id "${op.after}"`));
      break;
    }
    case 'hideTab': {
      if (typeof op.id !== 'string') { errs.push(at('missing "id"')); break; }
      const tabs = tabsOf(bp);
      if (!tabs || !byId(tabs, op.id)) errs.push(at(`references missing tab id "${op.id}"`));
      break;
    }
    case 'reorderTabs': {
      const tabs = tabsOf(bp);
      if (!Array.isArray(op.ids)) { errs.push(at('missing "ids" array')); break; }
      if (!tabs) { errs.push(at('module has no profile tabs to reorder')); break; }
      const have = new Set(tabs.map((t) => t.id));
      const want = new Set(op.ids);
      if (have.size !== want.size || [...want].some((id) => !have.has(id)) || op.ids.length !== tabs.length) {
        errs.push(at(`"ids" must be exactly the current tab set {${[...have].join(', ')}}`));
      }
      break;
    }
  }
  return errs;
}

/**
 * Apply one op to a blueprint IN PLACE. The op MUST already have passed
 * validateOp against this same blueprint state. Returns which node ids were
 * touched (added/modified) or removed, for provenance bookkeeping.
 * @param {Record<string, any>} bp
 * @param {Op} op
 * @returns {OpEffect}
 */
export function applyOp(bp, op) {
  switch (op.op) {
    case 'addField': {
      const cols = systemcolumns(bp);
      const at = op.after ? cols.findIndex((c) => c.id === op.after) : cols.length - 1;
      cols.splice(at + 1, 0, structuredClone(op.field));
      // Optional placements: insert a FieldPlacement node into each named region.
      // The placement shares the field's stable id (one logical node), so
      // provenance still attributes the whole node to this op via touched.
      for (const { region, after } of normalizePlacements(op.placements)) {
        const arr = placementRegion(bp, region, { create: true });
        insertPlacement(arr, synthPlacement(region, op.field), after);
      }
      return { touched: [op.field.id] };
    }
    case 'placeField': {
      const field = byId(systemcolumns(bp), op.id);
      const arr = placementRegion(bp, op.region, { create: true });
      insertPlacement(arr, synthPlacement(op.region, field), op.after);
      return { touched: [op.id] };
    }
    case 'hideField': {
      const cols = listcolumns(bp);
      const i = cols.findIndex((c) => c.id === op.id);
      if (i >= 0) cols.splice(i, 1);
      return { touched: [op.id] };
    }
    case 'setLabel': {
      byId(systemcolumns(bp), op.id).name = op.label;
      return { touched: [op.id] };
    }
    case 'setFieldProp': {
      const col = byId(systemcolumns(bp), op.id);
      if (op.value === null) delete col[op.prop];
      else col[op.prop] = structuredClone(op.value);
      return { touched: [op.id] };
    }
    case 'addStage': {
      const list = statusList(bp);
      const at = op.after ? list.findIndex((s) => s.id === op.after) : list.length - 1;
      list.splice(at + 1, 0, structuredClone(op.stage));
      return { touched: [op.stage.id] };
    }
    case 'removeStage': {
      const list = statusList(bp);
      const i = list.findIndex((s) => s.id === op.id);
      if (i >= 0) list.splice(i, 1);
      return { removed: [op.id] };
    }
    case 'addTab': {
      const profile = ((bp.uiConfig ??= {}).profile ??= { title: {}, details: [], sections: [] });
      if (!profile.rightPanel) profile.rightPanel = { type: 'tab', tabs: [] };
      const tabs = profile.rightPanel.tabs;
      const at = op.after ? tabs.findIndex((t) => t.id === op.after) : tabs.length - 1;
      tabs.splice(at + 1, 0, structuredClone(op.tab));
      return { touched: [op.tab.id] };
    }
    case 'hideTab': {
      const tabs = tabsOf(bp);
      const i = tabs.findIndex((t) => t.id === op.id);
      if (i >= 0) tabs.splice(i, 1);
      return { removed: [op.id] };
    }
    case 'reorderTabs': {
      const rp = bp.uiConfig.profile.rightPanel;
      const map = new Map(rp.tabs.map((t) => [t.id, t]));
      rp.tabs = op.ids.map((id) => map.get(id));
      return { touched: [...op.ids] };
    }
    default:
      throw new Error(`applyOp: unknown op type "${op.op}" (validateOp should have caught this)`);
  }
}
