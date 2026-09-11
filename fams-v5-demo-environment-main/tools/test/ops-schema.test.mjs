// @ts-check
/**
 * Real JSON-Schema validation of ops files against
 * tools/schemas/OpsFile.schema.json (Task I1 — the schema used to be
 * documentation-only; nothing loaded or ran it). See tools/lib/ops-schema.mjs.
 */
import { describe, it, expect } from 'vitest';
import { validateOpsFileSchema } from '../lib/ops-schema.mjs';
import { WIDGET_DELTAS } from './helpers.mjs';

describe('validateOpsFileSchema', () => {
  it('a valid ops file (one of every op family) passes with no errors', () => {
    expect(validateOpsFileSchema(WIDGET_DELTAS)).toEqual([]);
  });

  it('accepts every real committed tenant ops file (documents the schema is not merely aspirational)', async () => {
    const { readFileSync, readdirSync, existsSync } = await import('node:fs');
    const { join, dirname, relative } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
    // Discovered, not hardcoded: a hardcoded list rots the moment a tenant
    // delta is renamed or dropped (it did — tenants/iwmp/deltas/asset.ops.json
    // was removed in 0a8d7fb and this test kept asserting it).
    const tenantsDir = join(root, 'tenants');
    const files = [];
    for (const tenant of readdirSync(tenantsDir)) {
      const deltas = join(tenantsDir, tenant, 'deltas');
      if (!existsSync(deltas)) continue;
      for (const name of readdirSync(deltas)) {
        if (name.endsWith('.ops.json')) files.push(join(deltas, name));
      }
    }
    expect(files.length, 'no committed ops files found to validate').toBeGreaterThan(0);
    for (const f of files) {
      const doc = JSON.parse(readFileSync(f, 'utf8'));
      expect(validateOpsFileSchema(doc), relative(root, f)).toEqual([]);
    }
  });

  it('rejects a top-level additionalProperty (e.g. a mistyped key)', () => {
    const errs = validateOpsFileSchema({ module: 'widget', ops: [], notAField: true });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join('\n')).toMatch(/additional properties.*"notAField"/i);
  });

  it('rejects a missing required top-level property ("module")', () => {
    const errs = validateOpsFileSchema({ ops: [] });
    expect(errs.join('\n')).toMatch(/must have required property 'module'/);
  });

  it('rejects an op missing its op-type-specific required field (hideField needs "id")', () => {
    const errs = validateOpsFileSchema({ module: 'widget', ops: [{ opId: 'op_1', op: 'hideField' }] });
    expect(errs.join('\n')).toMatch(/\/ops\/0.*required property 'id'/);
  });

  it('rejects an unknown op enum value', () => {
    const errs = validateOpsFileSchema({ module: 'widget', ops: [{ opId: 'op_1', op: 'teleport' }] });
    expect(errs.join('\n')).toMatch(/\/ops\/0\/op: must be equal to one of the allowed values/);
  });

  it('rejects a typo in a nested Placements key (e.g. "detail" instead of "details")', () => {
    const errs = validateOpsFileSchema({
      module: 'widget',
      ops: [{
        opId: 'op_1',
        op: 'addField',
        field: { id: 'fld_new', col: 'systemcol9', name: 'New', type: 'SmallText' },
        placements: { detail: { after: 'fld_title' } },
      }],
    });
    expect(errs.join('\n')).toMatch(/\/ops\/0\/placements.*additional properties.*"detail"/i);
  });

  it('does not surface Ajv\'s redundant if/then wrapper noise', () => {
    const errs = validateOpsFileSchema({ module: 'widget', ops: [{ opId: 'op_1', op: 'hideField' }] });
    expect(errs.some((e) => /must match "then" schema/.test(e))).toBe(false);
  });
});
