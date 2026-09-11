// @ts-check
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { promoteOp, promoteModule } from '../lib/promote.mjs';
import { resolveAndWrite, resolveModule } from '../lib/resolve.mjs';
import { paths, listTenants } from '../lib/repo.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { makeRepo, readText, writeText, WIDGET_CORE } from './helpers.mjs';

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });
function repo() { const r = makeRepo(); cleanups.push(r.cleanup); return r.root; }

/** A second, delta-free tenant that licenses widget — proves inheritance. */
function addExtra(root) {
  writeText(paths.tenantManifest(root, 't_extra'), stableStringify({
    id: 't_extra', name: 'Extra Tenant', modules: ['widget'],
  }));
  resolveAndWrite(root, 't_extra', listTenants);
}

/** A minimal tenant-native module for the module-promotion test. */
const NATIVE_NOTES = {
  kind: 'entity', code: 't_delta/notes', name: 'Notes', uidPrefix: 'N',
  systemcolumns: [{ id: 'fld_title', col: 'title', name: 'Note', type: 'SmallText', required: true }],
  uiConfig: {
    statusList: [{ id: 'sts_open', key: 'open', label: 'Open', color: '#0072d6' }],
    profile: { title: { id: 'fld_title', col: 'title', pos: 'left' }, details: [], sections: [] },
    filters: [], search: { columns: ['title'] },
  },
  listcolumns: [{ id: 'fld_title', col: 'title', component: { name: 'TextView' } }],
};

describe('promote --op → fold a delta into core', () => {
  it('moves the field to core, drops the delta, keeps the tenant resolved 1:1, and other tenants inherit', () => {
    const root = repo();
    addExtra(root);

    const deltaBefore = readText(paths.resolvedBlueprint(root, 't_delta', 'widget'));
    const extraBefore = resolveModule(root, 't_extra', 'widget').blueprint;
    expect(extraBefore.systemcolumns.some((c) => c.id === 'fld_region')).toBe(false);

    promoteOp(root, 't_delta', 'op_add_region');

    // core now owns the field.
    const core = JSON.parse(readText(paths.coreModule(root, 'widget')));
    expect(core.systemcolumns.some((c) => c.id === 'fld_region')).toBe(true);
    // the delta is gone.
    expect(readText(paths.deltas(root, 't_delta', 'widget'))).not.toMatch(/op_add_region/);
    // t_delta renders 1:1 (blueprint byte-identical) — only provenance flips.
    expect(readText(paths.resolvedBlueprint(root, 't_delta', 'widget'))).toBe(deltaBefore);
    const prov = JSON.parse(readText(paths.resolvedProvenance(root, 't_delta', 'widget')));
    expect(prov.nodes.fld_region.source).toBe('core');
    // inheritance is visible: t_extra now carries the field too.
    expect(resolveModule(root, 't_extra', 'widget').blueprint.systemcolumns.some((c) => c.id === 'fld_region')).toBe(true);
  });

  it('refuses an unknown opId', () => {
    const root = repo();
    expect(() => promoteOp(root, 't_delta', 'op_nope')).toThrow(/no op "op_nope"/);
  });

  it('(minor a) refuses an AMBIGUOUS opId that appears in two modules (no alphabetical pick)', () => {
    const root = repo();
    // License a second module (clone of widget) and reuse an existing opId.
    writeText(paths.coreModule(root, 'gadget'), stableStringify({ ...WIDGET_CORE, code: 'test/gadget' }));
    const m = JSON.parse(readText(paths.tenantManifest(root, 't_delta')));
    m.modules = [...m.modules, 'gadget'];
    writeText(paths.tenantManifest(root, 't_delta'), stableStringify(m));
    writeText(paths.deltas(root, 't_delta', 'gadget'), stableStringify({
      module: 'gadget',
      ops: [{ opId: 'op_label_kind', op: 'setLabel', id: 'fld_kind', label: 'Dup' }],
    }));
    resolveAndWrite(root, 't_delta', listTenants);
    expect(() => promoteOp(root, 't_delta', 'op_label_kind')).toThrow(/ambiguous.*gadget, widget|gadget.*widget/);
  });
});

describe('promote --module → graduate a tenant-native module to core', () => {
  it('MOVES the module (no copy stays) and the tenant renders 1:1 via core + zero deltas', () => {
    const root = repo();
    // set up a tenant-native module, license it, resolve.
    writeText(paths.tenantModule(root, 't_delta', 'notes'), stableStringify(NATIVE_NOTES));
    const m = JSON.parse(readText(paths.tenantManifest(root, 't_delta')));
    m.modules = [...m.modules, 'notes'];
    writeText(paths.tenantManifest(root, 't_delta'), stableStringify(m));
    resolveAndWrite(root, 't_delta', listTenants);
    const notesBefore = readText(paths.resolvedBlueprint(root, 't_delta', 'notes'));
    const provBefore = JSON.parse(readText(paths.resolvedProvenance(root, 't_delta', 'notes')));
    expect(provBefore.base).toBe('tenant-native');

    promoteModule(root, 't_delta', 'notes');

    // MOVE: source gone, core present.
    expect(existsSync(paths.tenantModuleDir(root, 't_delta', 'notes'))).toBe(false);
    expect(existsSync(paths.coreModule(root, 'notes'))).toBe(true);
    // 1:1: blueprint byte-identical; provenance base flips to core.
    expect(readText(paths.resolvedBlueprint(root, 't_delta', 'notes'))).toBe(notesBefore);
    expect(JSON.parse(readText(paths.resolvedProvenance(root, 't_delta', 'notes'))).base).toBe('core');
  });

  it('refuses to overwrite an existing core module', () => {
    const root = repo();
    writeText(paths.tenantModule(root, 't_delta', 'widget'), stableStringify(NATIVE_NOTES));
    expect(() => promoteModule(root, 't_delta', 'widget')).toThrow(/core already has a module/);
  });
});
