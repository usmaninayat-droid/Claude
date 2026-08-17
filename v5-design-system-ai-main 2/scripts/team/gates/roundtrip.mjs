#!/usr/bin/env node
/* G-ROUNDTRIP (SI-4, T-007) — static, deterministic "drop-on-save" gate.
 * Exit 0 = pass, 1 = fail. No DOM/browser/deps — same spirit as coherence.mjs
 * and a11y-static.mjs (source scanned as text, tuned for high signal).
 *
 * THE RECURRING BUG IT KILLS (hit 4x: CategorySheet, RoleSheet, AppSheet,
 * EventConfig): a *Sheet collects a rich `Draft`, but the consumer container's
 * save handler builds the persisted row referencing only SOME `d.<field>` — the
 * rest are silently dropped, so edits/creates lose data with no error anywhere.
 *
 * THE CHECK: for every block-container save handler `(d: XxxDraft) => { … }`,
 * every top-level field of XxxDraft must be EITHER
 *   (a) read as `d.<field>` somewhere in the handler body, OR
 *   (b) persisted wholesale — the bare param `d` used as a value (`...d`,
 *       `: d`, `= d`), which forwards every field (the correct anti-drop
 *       pattern EventConfig uses via `setDrafts({ [id]: d })`).
 * A field that is neither → FAIL (that's the drop).
 *
 * Scope: `blocks/ ** /*.block.tsx` (the copy-paste consumer containers where
 * the drop happens). Draft shapes are read from `src/components/ ** /*.tsx`.
 * `id` is excluded (record identity — regenerated on create, never taken from
 * the draft). Opt out a genuinely-transient field with `// roundtrip-allow <field>`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] || '.';
const violations = [];
const IDENTITY = new Set(['id']); // regenerated / carried from editingId, never from the draft

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

/** Brace-match forward from the index of an opening `{`; returns the inner body. */
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

/** Top-level field names of an interface body (nested `{…}` groups stripped so
 *  their inner keys — e.g. `flags: { zoneBased: … }` — don't leak in). */
function topLevelFields(body) {
  let b = body;
  let prev;
  do { prev = b; b = b.replace(/\{[^{}]*\}/g, ' '); } while (b !== prev); // strip nested object types
  const fields = [];
  for (const m of b.matchAll(/(?:^|[;,\n])\s*(\w+)\??\s*:/g)) fields.push(m[1]);
  return fields;
}

// 1) Collect every `*Draft` interface shape from the component library.
const draftFields = new Map(); // name -> string[]
walk(join(ROOT, 'src', 'components'), (p) => {
  if (extname(p) !== '.tsx' && extname(p) !== '.ts') return;
  const txt = readFileSync(p, 'utf8');
  for (const m of txt.matchAll(/export\s+interface\s+(\w+Draft)\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    draftFields.set(m[1], topLevelFields(matchBrace(txt, open)));
  }
});

// 2) Scan block containers for Draft-typed save handlers.
walk(join(ROOT, 'blocks'), (p) => {
  if (!p.endsWith('.block.tsx')) return;
  const txt = readFileSync(p, 'utf8');
  // `(<param>: <XxxDraft>[, …]) => {`  — an arrow handler taking a Draft.
  for (const m of txt.matchAll(/\(\s*(\w+)\s*:\s*(\w+Draft)\b[^)]*\)\s*=>\s*\{/g)) {
    const [, param, draft] = m;
    const fields = draftFields.get(draft);
    if (!fields) continue; // unknown draft (not in the library) — nothing to assert
    const open = m.index + m[0].length - 1;
    const body = matchBrace(txt, open);

    // (b) wholesale persistence: bare param used as a value (not `param.` / `.param`).
    const wholesale = new RegExp(`(?<![.\\w])${param}(?![.\\w.])`).test(body);
    if (wholesale) continue;

    // (a) per-field reads: `param.<field>`.
    const read = new Set();
    for (const a of body.matchAll(new RegExp(`(?<![.\\w])${param}\\.(\\w+)`, 'g'))) read.add(a[1]);

    const allow = new Set([...body.matchAll(/roundtrip-allow\s+(\w+)/g)].map((x) => x[1]));
    const missing = fields.filter((f) => !read.has(f) && !IDENTITY.has(f) && !allow.has(f));
    if (missing.length) {
      violations.push(`roundtrip  ${p}:${lineOf(txt, m.index)}  save handler drops ${draft} field(s) [${missing.join(', ')}] — persist them or mark // roundtrip-allow`);
    }
  }
});

if (violations.length) {
  console.log(`ROUNDTRIP: FAIL (${violations.length})`);
  violations.forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
}
console.log(`ROUNDTRIP: PASS (${draftFields.size} draft shapes checked)`);
process.exit(0);
