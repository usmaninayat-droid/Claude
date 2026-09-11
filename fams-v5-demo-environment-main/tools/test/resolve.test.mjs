// @ts-check
import { describe, it, expect, afterEach } from 'vitest';
import { resolveModule, resolveAndWrite } from '../lib/resolve.mjs';
import { paths, listTenants } from '../lib/repo.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { makeRepo, readText } from './helpers.mjs';

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });
function repo() { const r = makeRepo(); cleanups.push(r.cleanup); return r.root; }

describe('resolve — determinism', () => {
  it('produces byte-identical output on re-run', () => {
    const root = repo();
    const before = readText(paths.resolvedBlueprint(root, 't_delta', 'widget'));
    const beforeProv = readText(paths.resolvedProvenance(root, 't_delta', 'widget'));
    resolveAndWrite(root, null, listTenants);
    expect(readText(paths.resolvedBlueprint(root, 't_delta', 'widget'))).toBe(before);
    expect(readText(paths.resolvedProvenance(root, 't_delta', 'widget'))).toBe(beforeProv);
  });

  it('in-memory resolve matches the written bytes', () => {
    const root = repo();
    const { blueprint } = resolveModule(root, 't_delta', 'widget');
    expect(stableStringify(blueprint)).toBe(readText(paths.resolvedBlueprint(root, 't_delta', 'widget')));
  });
});

describe('resolve — provenance', () => {
  it('marks base nodes core and delta-touched nodes delta (with opId)', () => {
    const root = repo();
    const { provenance } = resolveModule(root, 't_delta', 'widget');
    expect(provenance.base).toBe('core');
    expect(provenance.nodes.fld_title).toEqual({ source: 'core' });
    // added by addField
    expect(provenance.nodes.fld_region).toMatchObject({ source: 'delta', op: 'addField', opId: 'op_add_region' });
    // added by addStage
    expect(provenance.nodes.sts_partner).toMatchObject({ source: 'delta', op: 'addStage' });
    // modified by setFieldProp
    expect(provenance.nodes.fld_kind).toMatchObject({ source: 'delta' });
    // removed by hideTab → absent from provenance
    expect(provenance.nodes.tab_files).toBeUndefined();
  });

  it('applies the delta effects to the blueprint', () => {
    const root = repo();
    const { blueprint } = resolveModule(root, 't_delta', 'widget');
    expect(blueprint.systemcolumns.find((c) => c.id === 'fld_kind').name).toBe('Sector');
    expect(blueprint.systemcolumns.some((c) => c.id === 'fld_region')).toBe(true);
    expect(blueprint.listcolumns.some((c) => c.id === 'fld_cost')).toBe(false); // hidden
    expect(blueprint.uiConfig.statusList.some((s) => s.id === 'sts_partner')).toBe(true);
    expect(blueprint.$schema).toBeUndefined();
  });
});
