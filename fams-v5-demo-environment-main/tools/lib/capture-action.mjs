// @ts-check
/**
 * capture-action — the unit-testable CORE of the capture GitHub Action
 * (decision #17, the failure ladder). Deliberately free of GitHub/git glue
 * (that lives in `tools/capture-action.mjs`) so tests can drive every rung of
 * the ladder against a fixture repo.
 *
 * Failure ladder (tenant-model.md → "Capture failure = loud + harmless"):
 *   SUCCESS      every changed module is expressible → append the minimal typed
 *                ops, re-resolve, emit an ops-list report. exit 0.
 *   ① AMBIGUOUS  some module is inexpressible → NOTHING committed, write each
 *                `*.ops.proposed.json`, emit the proposal report, exit NON-ZERO
 *                (red check, PR stays open — never merged-wrong).
 *   ② OVERRIDE   the PR carries the `needs-canonicalization` label → exit 0 as
 *                visible, tracked debt. Everything EXPRESSIBLE is still committed
 *                exactly like SUCCESS; each inexpressible module instead gets a
 *                COMMITTED `<m>.override.json` debt record (proposed ops + a hash
 *                pinning the hand-edited resolved blueprint, which is kept as-is)
 *                so the branch is BOTH mergeable (check green) AND visibly
 *                carries the debt (dashboard + a LOUD check warning). Cleaned
 *                later by deleting the record and canonicalizing.
 *   NEVER silent every path returns a `report` markdown artifact.
 *
 * WHAT THE HASH GUARANTEES — and what it does NOT. The `resolvedHash` in an
 * override record is an INTEGRITY anchor, not an AUTHENTICITY one. It proves the
 * pinned resolved blueprint has not been silently re-edited after the record was
 * written (a later edit without re-flagging trips check's hash guard). It does
 * NOT prove the pinned content is legitimate or correct — an agent can write any
 * resolved/ it likes and pin a self-consistent hash, because CODEOWNERS
 * intentionally leaves `resolved/` and `tenants/` agent-writable (no required
 * review; CI + capture are the safety net). Legitimacy of override content comes
 * from HUMAN REVIEW of the PR plus the visible dashboard debt entry — not from
 * the hash. So check ALSO runs `validateBlueprint` on the pinned content, so at
 * least schema-invalid/garbage resolved cannot ride in behind a matching hash.
 *
 * "Working-tree changes vs the branch's committed state" (the brief) are exactly
 * what `planCapture` sees: it diffs the resolved base (core + committed deltas)
 * against the resolved/ files as they stand in the tree — i.e. a hand-edited
 * (vibecoded) resolved file. No git diffing is needed in the core.
 */
import { relative } from 'node:path';
import { planCapture, appendOps, writeProposed, writeOverrideRecord } from './capture.mjs';
import { resolveModule, writeResolved } from './resolve.mjs';
import { listTenants, removeProposed } from './repo.mjs';

const OVERRIDE_LABEL = 'needs-canonicalization';

/** Human-readable one-line summary of an op for the PR comment. */
function opSummary(op) {
  switch (op.op) {
    case 'addField': {
      const regions = op.placements ? Object.keys(op.placements) : [];
      const on = regions.length ? ` → placed on ${regions.join(', ')}` : '';
      return `add field "${op.field?.name ?? op.field?.id}" (${op.field?.id})${op.after ? ` after ${op.after}` : ''}${on}`;
    }
    case 'placeField': return `place field "${op.id}" on ${op.region}${op.after ? ` after ${op.after}` : ''}`;
    case 'hideField': return `hide list column "${op.id}"`;
    case 'setLabel': return `relabel "${op.id}" → "${op.label}"`;
    case 'setFieldProp': return `set ${op.prop}=${JSON.stringify(op.value)} on "${op.id}"`;
    case 'addStage': return `add stage "${op.stage?.label ?? op.stage?.id}" (${op.stage?.id})`;
    case 'removeStage': return `remove stage "${op.id}"`;
    case 'addTab': return `add tab "${op.tab?.title ?? op.tab?.id}" (${op.tab?.id})`;
    case 'hideTab': return `hide tab "${op.id}"`;
    case 'reorderTabs': return `reorder tabs → ${op.ids?.join(', ')}`;
    default: return op.op;
  }
}

/**
 * Run the capture action core across the given tenants.
 * @param {string} root
 * @param {{ tenants?: string[], override?: boolean }} [opts]
 *   override: simulate the PR carrying the `needs-canonicalization` label.
 * @returns {{ outcome: 'success'|'ambiguous'|'override', exitCode: number,
 *   report: string, committed: { tenant: string, module: string, ops: any[] }[],
 *   overrides: { tenant: string, module: string, file: string, hash: string, notes: string[] }[],
 *   proposals: { tenant: string, module: string, file: string, notes: string[] }[] }}
 */
export function runCaptureAction(root, opts = {}) {
  const override = opts.override ?? false;
  const tenants = opts.tenants ?? listTenants(root);

  /** @type {{ tenant: string, plan: any }[]} */
  const ambiguous = [];
  /** @type {{ tenant: string, plan: any }[]} */
  const expressible = [];
  for (const tenant of tenants) {
    for (const plan of planCapture(root, tenant)) {
      if (plan.status === 'ambiguous') ambiguous.push({ tenant, plan });
      else if (plan.status === 'expressible') expressible.push({ tenant, plan });
    }
  }

  // Ladder ①: UNFLAGGED ambiguity → write proposals, commit NOTHING (red check,
  // PR stays open — never merged-wrong).
  if (ambiguous.length && !override) {
    /** @type {{ tenant: string, module: string, file: string, notes: string[] }[]} */
    const proposals = [];
    for (const { tenant, plan } of ambiguous) {
      const file = writeProposed(root, tenant, plan.module, plan);
      proposals.push({ tenant, module: plan.module, file: relative(root, file), notes: plan.notes });
    }
    return {
      outcome: 'ambiguous',
      exitCode: 1,
      report: renderAmbiguousReport(proposals),
      committed: [],
      overrides: [],
      proposals,
    };
  }

  // SUCCESS *and* OVERRIDE both commit everything EXPRESSIBLE: append the ops and
  // re-resolve JUST that module (never the whole tenant — that would clobber a
  // sibling ambiguous module's hand-edited resolved file we must keep as-is).
  /** @type {{ tenant: string, module: string, ops: any[] }[]} */
  const committed = [];
  for (const { tenant, plan } of expressible) {
    appendOps(root, tenant, plan.module, plan.ops);
    writeResolved(root, resolveModule(root, tenant, plan.module));
    committed.push({ tenant, module: plan.module, ops: plan.ops });
  }

  // OVERRIDE (ladder ②): the remaining inexpressible modules land as COMMITTED
  // tracked debt — an override.json record (proposed ops + a hash pinning the
  // hand-edited resolved) with the resolved blueprint kept exactly as edited.
  if (ambiguous.length) {
    /** @type {{ tenant: string, module: string, file: string, hash: string, notes: string[] }[]} */
    const overrides = [];
    for (const { tenant, plan } of ambiguous) {
      const { file, hash } = writeOverrideRecord(root, tenant, plan.module, plan);
      removeProposed(root, tenant, plan.module); // debt now lives in the record.
      overrides.push({ tenant, module: plan.module, file: relative(root, file), hash, notes: plan.notes });
    }
    return {
      outcome: 'override',
      exitCode: 0,
      report: renderOverrideReport(committed, overrides),
      committed,
      overrides,
      proposals: [],
    };
  }

  return {
    outcome: 'success',
    exitCode: 0,
    report: renderSuccessReport(committed),
    committed,
    overrides: [],
    proposals: [],
  };
}

function renderSuccessReport(committed) {
  const out = ['## Capture — canonicalized (decision #17)', ''];
  if (!committed.length) {
    out.push('No working-tree edits to canonicalize — `resolved/` already equals `resolve(core + deltas)`. Nothing committed.');
    out.push('');
    return out.join('\n');
  }
  out.push('The approved edits were expressible as minimal typed ops. They were appended to the tenant deltas and `resolved/` was regenerated and committed to this PR:');
  out.push('');
  out.push('| Tenant | Module | Op | Target / summary |');
  out.push('| --- | --- | --- | --- |');
  for (const c of committed) {
    for (const op of c.ops) {
      out.push(`| ${c.tenant} | ${c.module} | \`${op.op}\` | ${opSummary(op).replace(/\|/g, '\\|')} |`);
    }
  }
  out.push('');
  return out.join('\n');
}

function renderAmbiguousReport(proposals) {
  const out = ['## Capture — agent-proposed ops (NEEDS HUMAN REVIEW)', ''];
  out.push('One or more modules could not be canonicalized into the supported op set, so **nothing was committed** and this check is red (the PR stays open — never merged-wrong, decision #17).');
  out.push('');
  out.push('Approve by applying the proposed ops below (adjust the edit to fit the ops, or land it as a flagged override — add the `needs-canonicalization` label to merge as tracked debt, ladder step ②).');
  out.push('');
  for (const p of proposals) {
    out.push(`### \`${p.tenant}/${p.module}\` → \`${p.file}\``);
    for (const n of p.notes) out.push(`- ${n}`);
    out.push('');
  }
  return out.join('\n');
}

function renderOverrideReport(committed, overrides) {
  const out = [`## Capture — merged as FLAGGED DEBT (\`${OVERRIDE_LABEL}\`)`, ''];
  out.push('⚠️ This PR carries the `needs-canonicalization` label. Everything expressible was still canonicalized and committed; each inexpressible module was merged as **visible, tracked debt** (decision #17, ladder step ②). The branch is mergeable (`demo check` stays green with a loud warning) AND the debt is committed — a `*.override.json` record plus the hand-edited `resolved/` kept as-is. It shows under "Outstanding capture proposals" on the debt dashboard until cleaned up.');
  out.push('');

  if (committed.length) {
    out.push('### Canonicalized + committed (expressible)');
    out.push('');
    out.push('| Tenant | Module | Op | Target / summary |');
    out.push('| --- | --- | --- | --- |');
    for (const c of committed) {
      for (const op of c.ops) {
        out.push(`| ${c.tenant} | ${c.module} | \`${op.op}\` | ${opSummary(op).replace(/\|/g, '\\|')} |`);
      }
    }
    out.push('');
  }

  out.push('### Merged as tracked debt (needs canonicalization)');
  out.push('');
  for (const o of overrides) {
    out.push(`#### \`${o.tenant}/${o.module}\` → \`${o.file}\``);
    out.push(`- resolved blueprint pinned at \`${o.hash}\``);
    for (const n of o.notes) out.push(`- ${n}`);
    out.push('- resolve by deleting the override record and canonicalizing the edit into typed deltas.');
    out.push('');
  }
  return out.join('\n');
}

export { OVERRIDE_LABEL };
