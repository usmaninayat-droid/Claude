#!/usr/bin/env node
// @ts-check
/**
 * `demo capture-action` — the GitHub-glue entry the capture workflow runs, and
 * the local drill/test harness (`--dry`). The ladder logic lives in
 * `tools/lib/capture-action.mjs` (`runCaptureAction`); this file adds the
 * environment glue around it (decision #17):
 *
 *   --dry            local simulation (Task 4.D drill + tests): run the core,
 *                    write `capture-report.md`, DO NOT touch git. Exit reflects
 *                    the ladder (non-zero on unflagged ambiguity).
 *   (default, CI)    run the core; write `capture-report.md`; when capture
 *                    produced anything to commit — SUCCESS (canonicalized deltas
 *                    + regenerated resolved/) or OVERRIDE (expressible edits PLUS
 *                    the *.override.json debt records + hand-edited resolved/) —
 *                    regenerate the debt dashboard, commit it all to the PR
 *                    branch under the bot identity, and print the path for the
 *                    workflow to post as a PR comment. Never silent: a report is
 *                    ALWAYS written (in a try/finally) — even if the core throws,
 *                    the report carries the error before the non-zero exit.
 *
 * Override (ladder ②): pass `--override` or set env `CAPTURE_OVERRIDE=1` (the
 * workflow sets this when the PR carries the `needs-canonicalization` label).
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, writeFileEnsuring } from './lib/repo.mjs';
import { runCaptureAction } from './lib/capture-action.mjs';
import { main as debtMain } from './debt-dashboard.mjs';

const BOT_NAME = 'fams-capture-bot';
const BOT_EMAIL = 'fams-capture-bot@users.noreply.github.com';

export function main(argv = [], root = REPO_ROOT) {
  const dry = argv.includes('--dry');
  const override = argv.includes('--override') || process.env.CAPTURE_OVERRIDE === '1';
  const reportFile = join(root, 'capture-report.md');

  // Never silent: the report is written in a `finally` so even a core crash
  // produces an artifact (carrying the error) before the non-zero exit.
  /** @type {ReturnType<typeof runCaptureAction> | null} */
  let result = null;
  let report;
  try {
    result = runCaptureAction(root, { override });
    report = result.report;
  } catch (err) {
    report = renderCrashReport(err);
  } finally {
    writeFileEnsuring(reportFile, report && report.endsWith('\n') ? report : `${report ?? ''}\n`);
  }
  console.log(report);

  if (!result) {
    // Loud + harmless: report already written; fail the check, commit nothing.
    console.error(`capture-action: core crashed — report → ${reportFile}`);
    return 1;
  }

  if (dry) {
    console.log(`\ncapture-action(--dry): outcome=${result.outcome}, report → ${reportFile}`);
    return result.exitCode;
  }

  // CI: commit whenever capture produced state to land — SUCCESS (canonicalized
  // deltas) or OVERRIDE (expressible edits + *.override.json debt records + the
  // hand-edited resolved/). Ladder ① (unflagged ambiguity) commits nothing.
  const overrides = result.overrides ?? [];
  const producedState = result.committed.length || overrides.length;
  if ((result.outcome === 'success' || result.outcome === 'override') && producedState) {
    debtMain([], root); // keep the debt dashboard in sync (staleness gate demands it).
    try {
      git(root, ['config', 'user.name', BOT_NAME]);
      git(root, ['config', 'user.email', BOT_EMAIL]);
      git(root, ['add', 'tenants', 'resolved', 'docs/debt-dashboard.md']);
      const tenants = [...new Set([...result.committed, ...overrides].map((c) => c.tenant))].join(', ');
      const summary = result.outcome === 'override'
        ? `canonicalize expressible edits + flag tracked debt (needs-canonicalization) for ${tenants}`
        : `canonicalize approved edits for ${tenants}`;
      git(root, ['commit', '-m', `chore(capture): ${summary} (decision #17)`]);
      console.log(result.outcome === 'override'
        ? 'capture-action: committed expressible edits + override debt records + resolved/ to the PR branch.'
        : 'capture-action: committed canonicalized deltas + resolved/ to the PR branch.');
    } catch (err) {
      console.error(`capture-action: git commit step failed: ${err.message}`);
      return 1;
    }
  }

  console.log(`capture-action: outcome=${result.outcome}, report → ${reportFile}`);
  return result.exitCode;
}

/** Render a crash report so a core error is never silent (minor fix a). */
function renderCrashReport(err) {
  const detail = err && err.stack ? err.stack : String(err);
  return [
    '## Capture — CRASHED (core error, nothing committed)',
    '',
    'The capture core threw before completing, so **nothing was committed** and this check is red (loud + harmless — decision #17). Fix the error below and re-run.',
    '',
    '```',
    detail,
    '```',
    '',
  ].join('\n');
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error(`capture-action: ${err.message}`); process.exit(1); }
}
