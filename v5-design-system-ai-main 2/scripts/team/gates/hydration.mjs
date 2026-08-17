#!/usr/bin/env node
/* G-HYDRATION (SI-4, T-020) — static, deterministic "drop-on-LOAD" gate.
 * Exit 0 = pass, 1 = fail. No DOM/browser/deps — same spirit as coherence.mjs,
 * a11y-static.mjs and roundtrip.mjs (source scanned as text, tuned for high signal).
 *
 * THE RECURRING BUG IT KILLS (drop-on-load-hydration, hit 3x: EntityConfig,
 * UserAccounts, PipelineConfig): opening an EDIT sheet for a *seeded* row that
 * has no stored draft under-hydrates `initial`, so Save overwrites real data OR
 * (worse) a step-gate leaves the submit button permanently disabled / a repeated
 * draft-save mints duplicate rows. It is the MIRROR of drop-on-save — and
 * G-ROUNDTRIP does NOT catch it (that gate scans save handlers, not `initial`
 * hydration nor the draft-save close discriminator).
 *
 * This class has THREE root causes; only two have a clean, zero-false-positive
 * static signature — those are gated here. The third (a seed that silently omits
 * a persisted ROW field, or corrupts a composite like phone) is row-type≠draft-type
 * and NOT cheaply regex-able → it stays a mandatory review-fix CHECKLIST item
 * (see .claude/workflows/review-fix.js + persona-notes/frontend-eng.md).
 *
 * THE CHECKS (per `blocks/ ** /*.block.tsx`):
 *   A. seed-reachability — an `initial={…editingId…}` edit-path expression that
 *      reads a stored draft (`drafts[`) MUST also carry a `*ToDraftSeed(` fallback
 *      (`drafts[id] ?? xToDraftSeed(row)`). A stored-draft lookup with no seed
 *      fallback edits a seeded row BLANK.
 *   B. save-draft close discriminator — every `onSaveDraft={handler}` MUST thread
 *      a `closeOnDone`-style discriminator: the handler (inline, or a resolved
 *      one-liner wrapper) must call an upsert with a 2nd argument. A pure 1-arg
 *      passthrough (`onSaveDraft={submitX}` where submitX resets editingId) mints
 *      a duplicate per click.
 *
 * Opt out a genuine exception with `// hydration-allow <reason>` in the block.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || '.';
const violations = [];

function walk(dir, fn) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, fn);
    else fn(p);
  }
}
const lineOf = (txt, idx) => txt.slice(0, idx).split('\n').length;

/** Brace-match forward from the index of an opening `{`; returns the inner body
 *  (quote/backtick aware so `{` inside a string doesn't miscount). */
function matchBrace(txt, openIdx) {
  let depth = 0, q = null;
  for (let i = openIdx; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === q && txt[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return txt.slice(openIdx + 1, i); }
  }
  return txt.slice(openIdx + 1);
}

/** A call with >= 2 args, e.g. `upsertPipeline(d, false)` — the close-discriminator shape. */
const hasTwoArgCall = (s) => /\w+\s*\([^()]*,[^()]*\)/.test(s);

walk(join(ROOT, 'blocks'), (p) => {
  if (!p.endsWith('.block.tsx')) return;
  const txt = readFileSync(p, 'utf8');

  // A. seed-reachability on edit-path `initial={ … }`
  for (const m of txt.matchAll(/initial\s*=\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    const body = matchBrace(txt, open);
    if (!/drafts\s*\[/.test(body)) continue;          // no stored-draft lookup → not this pattern
    if (/hydration-allow/.test(body)) continue;
    if (/\w*ToDraftSeed\s*\(|\w*Seed\s*\(/.test(body)) continue; // has a seed fallback → correct
    violations.push(`hydration  ${p}:${lineOf(txt, m.index)}  edit-path \`initial\` reads a stored draft (drafts[…]) with no *ToDraftSeed fallback — a seeded row with no stored draft edits BLANK (drop-on-load). Add \`drafts[id] ?? xToDraftSeed(row)\` or mark // hydration-allow.`);
  }

  // B. save-draft close discriminator on every `onSaveDraft={ … }`
  for (const m of txt.matchAll(/onSaveDraft\s*=\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    const expr = matchBrace(txt, open).trim();
    if (/hydration-allow/.test(expr)) continue;
    let safe = hasTwoArgCall(expr) || /closeOnDone/.test(expr);
    if (!safe) {
      const idm = expr.match(/^(\w+)$/); // bare handler identifier → resolve its body
      if (idm) {
        const def = txt.match(new RegExp(`const\\s+${idm[1]}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*([^\\n;]+)`));
        if (def && (hasTwoArgCall(def[1]) || /closeOnDone/.test(def[1]))) safe = true;
        // arity >= 2 (an explicit closeOnDone param) also counts
        const params = txt.match(new RegExp(`const\\s+${idm[1]}\\s*=\\s*\\(([^)]*)\\)`));
        if (params && params[1].split(',').filter((s) => s.trim()).length >= 2) safe = true;
      }
    }
    if (!safe) {
      violations.push(`hydration  ${p}:${lineOf(txt, m.index)}  \`onSaveDraft\` handler threads no closeOnDone discriminator — a repeated draft-save mints DUPLICATE rows. Wire \`upsert(d, closeOnDone)\` (capture the minted id) or mark // hydration-allow.`);
    }
  }
});

if (violations.length) {
  console.log(`HYDRATION: FAIL (${violations.length})`);
  violations.forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
}
console.log('HYDRATION: PASS (edit-path seed-reachability + save-draft close discriminator)');
process.exit(0);
