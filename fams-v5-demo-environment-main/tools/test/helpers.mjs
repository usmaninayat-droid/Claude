// @ts-check
/**
 * Test fixtures: build a throwaway repo from a SYNTHETIC blueprint so the tool
 * unit tests never depend on live pilot content (decision #14 — the engine is
 * proven against its own fixture, not whatever modules/tenants ship today).
 *
 * The fixture is a `widget` entity module + two tenants:
 *   - `t_base`  — licenses widget, ZERO deltas (proves inheritance on promote).
 *   - `t_delta` — a delta set exercising every op family (addField, setLabel,
 *     setFieldProp, hideField, addStage, addTab, reorderTabs, hideTab), so the
 *     resolve/provenance and check tests see all regions.
 */
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTenants, paths } from '../lib/repo.mjs';
import { resolveAndWrite } from '../lib/resolve.mjs';
import { stableStringify } from '../lib/blueprint.mjs';

const REAL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The canonical `widget` core module (minimal but valid — mirrors the shapes
 *  `validateBlueprint` accepts: systemcolumns / statusList / profile+tabs /
 *  filters / search / listcolumns). */
export const WIDGET_CORE = {
  kind: 'entity',
  code: 'test/widget',
  name: 'Widget',
  uidPrefix: 'W',
  systemcolumns: [
    { id: 'fld_title', col: 'title', name: 'Title', type: 'SmallText', required: true },
    { id: 'fld_kind', col: 'systemcol1', name: 'Kind', type: 'SmallText' },
    { id: 'fld_owner', col: 'systemcol2', name: 'Owner', type: 'Assignee' },
    { id: 'fld_cost', col: 'systemcol3', name: 'Cost', type: 'SmallText' },
  ],
  uiConfig: {
    statusList: [
      { id: 'sts_open', key: 'Open', label: 'Open', color: '#0072d6' },
      { id: 'sts_done', key: 'Done', label: 'Done', color: '#16a34a' },
    ],
    profile: {
      title: { id: 'fld_title', col: 'title', pos: 'left' },
      details: [
        { id: 'fld_kind', col: 'systemcol1', pos: 'left', order: 1 },
        { id: 'fld_owner', col: 'systemcol2', pos: 'right', order: 1, component: { name: 'AssigneeList' } },
        { id: 'fld_cost', col: 'systemcol3', pos: 'left', order: 2 },
      ],
      sections: [],
      overview: [
        { kind: 'gauge', title: 'Health', span: 4, value: 50 },
      ],
      rightPanel: {
        type: 'tab',
        tabs: [
          { id: 'tab_overview', key: 'overview', title: 'Overview', order: 1, component: { name: 'Overview' } },
        ],
      },
    },
    filters: [{ id: 'flt_kind', col: 'systemcol1', order: 1 }],
    search: { columns: ['title', 'systemcol1'] },
  },
  listcolumns: [
    { id: 'fld_title', col: 'title', component: { name: 'TextView' } },
    { id: 'fld_kind', col: 'systemcol1', component: { name: 'TextView' } },
    { id: 'fld_owner', col: 'systemcol2', component: { name: 'AssigneeList' } },
    { id: 'fld_cost', col: 'systemcol3', component: { name: 'TextView' } },
  ],
};

/** The `t_delta` ops — one of every op family, on widget stable ids. */
export const WIDGET_DELTAS = {
  module: 'widget',
  ops: [
    { opId: 'op_add_region', op: 'addField', after: 'fld_kind', field: { id: 'fld_region', col: 'systemcol4', name: 'Region', type: 'SmallText' } },
    { opId: 'op_label_kind', op: 'setLabel', id: 'fld_kind', label: 'Sector' },
    { opId: 'op_require_kind', op: 'setFieldProp', id: 'fld_kind', prop: 'required', value: true },
    { opId: 'op_hide_cost', op: 'hideField', id: 'fld_cost' },
    { opId: 'op_add_partner_stage', op: 'addStage', after: 'sts_open', stage: { id: 'sts_partner', key: 'Partner', label: 'Partner', color: '#f79009' } },
    { opId: 'op_add_activity_tab', op: 'addTab', after: 'tab_overview', tab: { id: 'tab_activity', key: 'activity', title: 'Activity', order: 2, component: { name: 'ActivityFeed' } } },
    { opId: 'op_add_files_tab', op: 'addTab', after: 'tab_activity', tab: { id: 'tab_files', key: 'files', title: 'Files', order: 3, component: { name: 'Attachments' } } },
    { opId: 'op_reorder_tabs', op: 'reorderTabs', ids: ['tab_files', 'tab_overview', 'tab_activity'] },
    { opId: 'op_hide_files_tab', op: 'hideTab', id: 'tab_files' },
  ],
};

/**
 * Materialize the synthetic fixture in a fresh temp dir and generate resolved/.
 * @fams/v5-composer still resolves via the real repo's node_modules (bare
 * import), so no node_modules copy is needed.
 */
export function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'v5demo-'));

  writeText(paths.coreModule(root, 'widget'), stableStringify(WIDGET_CORE));

  writeText(paths.tenantManifest(root, 't_base'), stableStringify({
    id: 't_base', name: 'Base Tenant', modules: ['widget'],
  }));

  writeText(paths.tenantManifest(root, 't_delta'), stableStringify({
    id: 't_delta', name: 'Delta Tenant', modules: ['widget'],
  }));
  writeText(paths.deltas(root, 't_delta', 'widget'), stableStringify(WIDGET_DELTAS));

  resolveAndWrite(root, null, listTenants);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

export function readText(file) {
  return readFileSync(file, 'utf8');
}
export function writeText(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}
export { REAL_ROOT };
