// @ts-check
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listTenants, paths } from '../lib/repo.mjs';
import { resolveAndWrite } from '../lib/resolve.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { checkSeedIntegrity } from '../lib/seeds.mjs';
import { runCheck } from '../lib/check.mjs';
import { WIDGET_CORE, writeText } from './helpers.mjs';

/**
 * A two-module fixture that exercises references: `vehicle` (code fleet/vehicle)
 * points at `driver` (code hr/driver) via a SingleReference, and at a
 * device/tracker via a MultiReference that NO module registers (inert).
 */
function moduleWith(code, uidPrefix, extraCols = []) {
  const bp = JSON.parse(JSON.stringify(WIDGET_CORE));
  bp.code = code;
  bp.uidPrefix = uidPrefix;
  bp.systemcolumns.push(...extraCols);
  return bp;
}

const VEHICLE = moduleWith('fleet/vehicle', 'VEH', [
  { id: 'fld_driver', col: 'systemcol4', name: 'Driver', type: 'SingleReference', refModule: 'Entity', entityType: 'hr/driver' },
  { id: 'fld_sensors', col: 'systemcol5', name: 'Sensors', type: 'MultiReference', refModule: 'Entity', entityType: 'device/tracker' },
]);
const DRIVER = moduleWith('hr/driver', 'DRV');

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });

/** Build a fixture repo; `vehicleSeed` lets a test control the reference values. */
function makeSeedRepo(vehicleSeed) {
  const root = mkdtempSync(join(tmpdir(), 'v5seed-'));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  writeText(paths.coreModule(root, 'vehicle'), stableStringify(VEHICLE));
  writeText(paths.coreModule(root, 'driver'), stableStringify(DRIVER));
  writeText(paths.tenantManifest(root, 't'), stableStringify({
    id: 't', name: 'T', modules: ['vehicle', 'driver'],
  }));
  writeText(paths.tenantSeed(root, 't', 'driver'), stableStringify([
    { id: 'DRV-01', title: 'A' }, { id: 'DRV-02', title: 'B' },
  ]));
  writeText(paths.tenantSeed(root, 't', 'vehicle'), stableStringify(vehicleSeed));
  resolveAndWrite(root, null, listTenants);
  return root;
}

describe('seed-integrity — reference resolution', () => {
  it('passes when every reference resolves to a seeded record', () => {
    const root = makeSeedRepo([
      { id: 'VEH-01', title: 'Truck', systemcol4: 'DRV-01', systemcol5: ['dev_1'] },
    ]);
    const { errors } = checkSeedIntegrity(root);
    expect(errors).toEqual([]);
  });

  it('FAILS (dangling) when a registered-type reference points at a missing id', () => {
    const root = makeSeedRepo([
      { id: 'VEH-01', title: 'Truck', systemcol4: 'DRV-99', systemcol5: [] },
    ]);
    const { errors } = checkSeedIntegrity(root);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/fleet\/vehicle#VEH-01\.systemcol4 → hr\/driver#DRV-99 \(missing\)/);
  });

  it('WARNS (never silent) for an inert reference to an unregistered entityType', () => {
    const root = makeSeedRepo([
      { id: 'VEH-01', title: 'Truck', systemcol4: 'DRV-01', systemcol5: ['dev_missing'] },
    ]);
    const { errors, warnings } = checkSeedIntegrity(root);
    expect(errors).toEqual([]); // device/tracker is inert — the dangling device id is NOT a failure
    expect(warnings.some((w) => /device\/tracker/.test(w) && /INERT/.test(w))).toBe(true);
  });

  it('treats empty / null reference cells as "no reference" (not dangling)', () => {
    const root = makeSeedRepo([
      { id: 'VEH-01', title: 'Truck', systemcol4: null, systemcol5: [] },
      { id: 'VEH-02', title: 'Van', systemcol4: '', systemcol5: [] },
    ]);
    expect(checkSeedIntegrity(root).errors).toEqual([]);
  });

  it('surfaces a dangling ref as a demo check FAILURE, an inert ref as a WARNING', () => {
    const root = makeSeedRepo([
      { id: 'VEH-01', title: 'Truck', systemcol4: 'DRV-99', systemcol5: ['x'] },
    ]);
    const res = runCheck(root);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => /seed-integrity/.test(e) && /missing/.test(e))).toBe(true);
    expect(res.warnings.some((w) => /device\/tracker/.test(w))).toBe(true);
  });
});
