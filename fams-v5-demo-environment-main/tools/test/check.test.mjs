// @ts-check
import { describe, it, expect, afterEach, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { runCheck } from '../lib/check.mjs';
import { main as checkCli } from '../check.mjs';
import { paths, listTenants, REPO_ROOT } from '../lib/repo.mjs';
import { resolveAndWrite } from '../lib/resolve.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { makeRepo, readText, writeText, WIDGET_CORE } from './helpers.mjs';

/** License a second module (a clone of widget) for t_delta and resolve it. */
function addSecondModule(root, module = 'gadget') {
  writeText(paths.coreModule(root, module), stableStringify({ ...WIDGET_CORE, code: `test/${module}` }));
  const m = JSON.parse(readText(paths.tenantManifest(root, 't_delta')));
  m.modules = [...m.modules, module];
  writeText(paths.tenantManifest(root, 't_delta'), stableStringify(m));
  resolveAndWrite(root, 't_delta', listTenants);
}

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });
function repo() { const r = makeRepo(); cleanups.push(r.cleanup); return r.root; }

describe('check — the CI gate', () => {
  it('passes on freshly resolved content', () => {
    const { ok, errors } = runCheck(repo());
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  it('(a) catches a hand-edited resolved file', () => {
    const root = repo();
    const file = paths.resolvedBlueprint(root, 't_delta', 'widget');
    writeText(file, readText(file).replace('"Sector"', '"Tampered"'));
    const { ok, errors } = runCheck(root);
    expect(ok).toBe(false);
    expect(errors.join('\n')).toMatch(/STALE resolved file/);
  });

  it('(b) catches a structurally bad op', () => {
    const root = repo();
    const doc = JSON.parse(readText(paths.deltas(root, 't_delta', 'widget')));
    doc.ops.push({ opId: 'op_bad', op: 'teleport', id: 'fld_title' });
    writeText(paths.deltas(root, 't_delta', 'widget'), JSON.stringify(doc, null, 2));
    const { ok, errors } = runCheck(root);
    expect(ok).toBe(false);
    expect(errors.join('\n')).toMatch(/unknown op type "teleport"/);
  });

  it('(c) catches an op referencing an unknown stable id', () => {
    const root = repo();
    const doc = JSON.parse(readText(paths.deltas(root, 't_delta', 'widget')));
    doc.ops.push({ opId: 'op_ghost', op: 'setLabel', id: 'fld_does_not_exist', label: 'x' });
    writeText(paths.deltas(root, 't_delta', 'widget'), JSON.stringify(doc, null, 2));
    const { ok, errors } = runCheck(root);
    expect(ok).toBe(false);
    expect(errors.join('\n')).toMatch(/missing field id "fld_does_not_exist"/);
  });

  // The founder's "break a delta, watch CI fail" proof (referenced in
  // docs/WALKTHROUGH.md): a delta whose op targets a bad stable id makes the
  // `demo check` CLI exit non-zero with a loud, named message.
  it('break-a-delta → the check CLI exits non-zero with a loud message', () => {
    const root = repo();
    const doc = JSON.parse(readText(paths.deltas(root, 't_delta', 'widget')));
    // Corrupt a live op's stable id (fld_kind → fld_kind_TYPO).
    doc.ops.find((o) => o.opId === 'op_label_kind').id = 'fld_kind_TYPO';
    writeText(paths.deltas(root, 't_delta', 'widget'), JSON.stringify(doc, null, 2));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = checkCli([], root);
    const loud = errSpy.mock.calls.flat().join('\n');
    errSpy.mockRestore();

    expect(code).toBe(1); // non-zero → CI fails
    expect(loud).toMatch(/check: FAILED/);
    expect(loud).toMatch(/missing field id "fld_kind_TYPO"/);
  });

  it('(minor a) catches a REPO-WIDE (cross-module) duplicate opId for a tenant', () => {
    const root = repo();
    addSecondModule(root, 'gadget');
    // Reuse an opId that already exists in widget's deltas, in a DIFFERENT module.
    writeText(paths.deltas(root, 't_delta', 'gadget'), stableStringify({
      module: 'gadget',
      ops: [{ opId: 'op_label_kind', op: 'setLabel', id: 'fld_kind', label: 'Dup' }],
    }));
    resolveAndWrite(root, 't_delta', listTenants);
    const { ok, errors } = runCheck(root);
    expect(ok).toBe(false);
    expect(errors.join('\n')).toMatch(/duplicate opId "op_label_kind" — already used by tenant "t_delta" in module "gadget"/);
  });

  // Task I1: demo check now runs real JSON-Schema validation against
  // tools/schemas/OpsFile.schema.json (tools/lib/ops-schema.mjs), not just the
  // hand-rolled shape checks above. A schema violation the manual checks don't
  // catch (an extra top-level property) must fail loudly, naming the file.
  it('(d) catches an ops file that violates OpsFile.schema.json (extra top-level property)', () => {
    const root = repo();
    const doc = JSON.parse(readText(paths.deltas(root, 't_delta', 'widget')));
    doc.notAKnownProperty = true;
    writeText(paths.deltas(root, 't_delta', 'widget'), JSON.stringify(doc, null, 2));
    const { ok, errors } = runCheck(root);
    expect(ok).toBe(false);
    const relPath = 'tenants/t_delta/deltas/widget.ops.json';
    expect(errors.some((e) => e.includes(relPath))).toBe(true);
    expect(errors.join('\n')).toMatch(/additional properties.*"notAKnownProperty"/i);
  });

  it('a valid ops file (the fixture, exercising every op family) produces zero schema errors', () => {
    const { ok, errors } = runCheck(repo());
    expect(ok).toBe(true);
    expect(errors).toEqual([]);
  });

  it('catches a tenant licensing a non-existent module', () => {
    const root = repo();
    const m = JSON.parse(readText(paths.tenantManifest(root, 't_delta')));
    m.modules.push('ghostmodule');
    writeText(paths.tenantManifest(root, 't_delta'), JSON.stringify(m, null, 2));
    const { ok, errors } = runCheck(root);
    expect(ok).toBe(false);
    expect(errors.join('\n')).toMatch(/licensed module "ghostmodule" has no blueprint/);
  });
});

describe('check.mjs CLI entrypoint — run-as-a-real-process guard (FIX WAVE C-1, defect B)', () => {
  // The bug: `import.meta.url === \`file://${process.argv[1]}\`` compares a
  // percent-encoded URL (spaces become %20) against a raw filesystem path
  // (spaces stay literal). On a path containing a space — this repo's own
  // checkout lives under ".../The Lab/..." — the two sides never match, the
  // `main()` guard silently stays false, and `node tools/check.mjs` exits 0
  // having done nothing. `runCheck`/`checkCli` unit tests above call the
  // exported function directly and never exercise this guard at all, so only
  // an actual spawned subprocess proves the fix. The fixed guard compares
  // `import.meta.url` against `pathToFileURL(process.argv[1]).href` — both
  // sides percent-encoded — so it matches regardless of spaces in the path.
  it('REPO_ROOT (this checkout) contains a space, so this test exercises the real bug condition', () => {
    expect(REPO_ROOT).toContain(' ');
  });

  it('spawning `node tools/check.mjs` from a cwd with a space in its path prints real output, not silence', () => {
    const result = spawnSync(process.execPath, ['tools/check.mjs'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(result.error).toBeUndefined();
    // The pre-fix behavior was: main() never runs, nothing is printed, and the
    // process exits 0 regardless of repo state. Any real run — pass or fail —
    // prints a `check: OK …` or `check: FAILED …` line; a silently-skipped run
    // prints neither and both stdout+stderr are empty.
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout).toMatch(/^check: (OK|FAILED)/m);
    // Exit code must agree with which line was printed — never the old
    // always-0-and-silent no-op.
    if (/^check: OK/m.test(result.stdout)) {
      expect(result.status).toBe(0);
    } else {
      expect(result.status).toBe(1);
    }
  });
});
