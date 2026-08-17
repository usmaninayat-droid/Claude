#!/usr/bin/env node
/* G-A11Y (SI-5) — static, deterministic accessibility gate for src/components.
 * Exit 0 = pass, 1 = fail. No DOM, no axe, no browser/WebGL, no deps — the same
 * spirit as coherence.mjs, so it never flakes like the live preview. Heuristic
 * (JSX is scanned as text, not parsed), tuned for HIGH signal / LOW false-positive
 * and calibratable via an inline `// a11y-allow` opt-out (with a reason).
 *
 * Rules (the a11y defects that actually recur in this DS):
 *   A11Y-1  icon-only control (<button>/<a>/role="button") with NO accessible name
 *           (aria-label / aria-labelledby / title) and NO visible text — a control
 *           screen-readers announce as blank. The #1 real a11y bug in icon UIs.
 *   A11Y-2  <img> with no `alt` (decorative → alt="").
 *   A11Y-3  positive tabIndex (tabIndex={1+}) — breaks natural focus order.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

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
const ACCESSIBLE_NAME = /\baria-label\b|\baria-labelledby\b|\btitle=/;
const ICON_TAG = /<svg\b|<[A-Z][\w.]*\b|Icons\./; // svg or a Component (icon)

/**
 * Scan for `<tag …>…</tag>` controls, brace/quote-aware so inline arrow handlers
 * (`onClick={() => …}`, which contain `>`) don't truncate the open tag — a plain
 * `[^>]*` regex silently misses those (and that's most buttons).
 */
function scanControls(txt, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b`, 'g');
  let m;
  while ((m = re.exec(txt))) {
    let i = re.lastIndex, depth = 0, q = null;
    for (; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    if (i >= txt.length) continue;
    const attrs = txt.slice(re.lastIndex, i);
    if (txt[i - 1] === '/') { out.push({ index: m.index, attrs, body: '' }); continue; }
    const close = txt.indexOf(`</${tag}>`, i);
    out.push({ index: m.index, attrs, body: close >= 0 ? txt.slice(i + 1, close) : '' });
  }
  return out;
}

/** body is icon/markup only — no visible text and no `{expr}` that might be a label. */
function isIconOnly(body) {
  const stripped = body.replace(/<[^>]*>/g, '').trim(); // drop tags (incl. `<Icon size={16}/>`)
  if (stripped.length) return false;                    // leftover text OR a bare {expr} → assume it names the control
  return ICON_TAG.test(body);                           // and there's actually an icon/svg inside
}

function skip(txt, idx) {
  // honor `// a11y-allow`, and ignore matches inside comment/JSDoc prose
  // (e.g. "Pass an <img> or inline SVG" in a doc comment is not real markup).
  const start = txt.lastIndexOf('\n', idx) + 1;
  let end = txt.indexOf('\n', idx); if (end < 0) end = txt.length;
  const line = txt.slice(start, end);
  const t = line.trimStart();
  return /a11y-allow/.test(line) || /^(\/\/|\/\*|\*)/.test(t);
}

for (const root of [['src', 'components'], ['blocks']]) walk(join(ROOT, ...root), (p) => {
  if (extname(p) !== '.tsx') return;
  if (/\.(test|spec|stories)\.tsx$/.test(p)) return;
  const txt = readFileSync(p, 'utf8');

  // A11Y-1 — icon-only <button>/<a> without an accessible name
  for (const tag of ['button', 'a']) {
    for (const c of scanControls(txt, tag)) {
      if (ACCESSIBLE_NAME.test(c.attrs)) continue;
      if (!isIconOnly(c.body)) continue;
      if (skip(txt, c.index)) continue;
      violations.push(`a11y-1  ${p}:${lineOf(txt, c.index)}  icon-only <${tag}> has no accessible name (add aria-label)`);
    }
  }

  // A11Y-2 — <img> without alt
  for (const m of txt.matchAll(/<img\b([^>]*?)\/?>/g)) {
    if (/\balt=/.test(m[1])) continue;
    if (skip(txt, m.index)) continue;
    violations.push(`a11y-2  ${p}:${lineOf(txt, m.index)}  <img> has no alt attribute`);
  }

  // A11Y-3 — positive tabIndex
  for (const m of txt.matchAll(/tabIndex=\{?["']?([1-9]\d*)/g)) {
    if (skip(txt, m.index)) continue;
    violations.push(`a11y-3  ${p}:${lineOf(txt, m.index)}  positive tabIndex (${m[1]}) breaks focus order`);
  }
});

if (violations.length) {
  console.log(`A11Y: FAIL (${violations.length})`);
  violations.slice(0, 40).forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
}
console.log('A11Y: PASS');
process.exit(0);
