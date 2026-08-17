#!/usr/bin/env node
/* G-SEARCHFIELD (SI-4, T-062/T-092 promotion) — static gate for the
 * `search-icon-under-input` class (a.k.a. "the paint-over class"). Exit 0 =
 * pass, 1 = fail. No DOM/browser/deps — same family as coherence.mjs /
 * a11y-static.mjs / vocab.mjs / hydration.mjs (source scanned as text, tuned
 * for high signal, file:line output).
 *
 * THE RECURRING BUG IT KILLS (hit 3x — an early search-field law, T-062's
 * classwide fix, T-092's recurrence in a sheet built AFTER the law existed):
 * the DS Input primitive/any hand-wrapped input renders a POSITIONED sibling
 * — an externally-placed `pointer-events-none absolute` icon composed next to
 * an `<Input>`/`<input>` paints UNDER it wherever the input's background is
 * opaque (equal stacking order → DOM order loses). The icon is present in the
 * DOM the whole time; a DOM query passes while the PIXEL fails. Fix = `z-10`
 * (or higher) on the icon; forward law = prefer Input's own `leadingIcon` slot
 * (immune by construction — the span sits inside the SAME component tree).
 *
 * THE CHECKS:
 *   A. icon-under-input (paint-over) — a line that composes a JSX icon
 *      element with `pointer-events-none` + `absolute` in its className, with
 *      an `<Input`/`<input` tag nearby (the hand-wrapped search/decorated
 *      field pattern), MUST also carry a `z-10`+ utility on that same line.
 *   B. iconless-search-input (T-033/T-033a's bare-input variant) — an
 *      `<Input`/`<input` whose `placeholder` matches /search/i must carry
 *      EITHER a `leadingIcon` prop, OR a `Search*` icon element in the 3
 *      lines immediately before it, OR a `// searchfield-allow` comment.
 *
 * `primitives/input.tsx` is the CANONICAL immune composition (the icon slot
 * lives INSIDE the same component subtree as the native `<input>` — the
 * documented "immune by construction" case) and is excluded from Check A,
 * the same way coherence.mjs exempts its COLOR_SOURCE bridge files.
 *
 * Dual-target convention (matches coherence.mjs): ROOT = argv[2] || '.'.
 * Run once per tree — DS root scans its `src/components/**`; a product root
 * (no `src/components`, e.g. ifm-workforce's `src/modules`) scans its whole
 * `src/**`.
 *
 * Opt out a genuine exception with `// searchfield-allow <reason>` on the
 * flagged line or the line directly above it.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = process.argv[2] || '.';
const violations = [];

function walk(dir, fn) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, fn);
    else fn(p);
  }
}
const lineOf = (txt, idx) => txt.slice(0, idx).split('\n').length;

/** Blank out comments while PRESERVING every byte offset (line/index-stable),
 *  same helper shape as vocab.mjs — so a "Search" mentioned in a comment
 *  can't feed Check B's proximity scan or trip Check A. */
function blankComments(txt) {
  let out = txt.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out
    .split('\n')
    .map((line) => {
      const i = line.indexOf('//');
      if (i >= 0 && line[i - 1] !== ':') return line.slice(0, i) + ' '.repeat(line.length - i);
      return line;
    })
    .join('\n');
  return out;
}

/** Scan forward from a `<input`/`<Input` match start to its closing `>`,
 *  quote/brace aware (so `onChange={(e) => ...}` doesn't end the tag early
 *  and a placeholder string's own `>` can't either). */
function scanTag(txt, startIdx) {
  let depth = 0, q = null;
  for (let i = startIdx; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === q && txt[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth <= 0) return txt.slice(startIdx, i + 1);
  }
  return txt.slice(startIdx);
}

/** z-10 or higher, either `z-N` or an arbitrary `z-[N]`. */
function hasSufficientZ(line) {
  const m1 = line.match(/\bz-(\d+)\b/);
  if (m1 && parseInt(m1[1], 10) >= 10) return true;
  const m2 = line.match(/\bz-\[(\d+)(?:px)?\]/);
  if (m2 && parseInt(m2[1], 10) >= 10) return true;
  return false;
}

/** `// searchfield-allow` on this line or the line above (house escape hatch
 *  convention: on-the-line or one-above, per this gate's spec). */
function allowedAt(lines, ln) {
  return /searchfield-allow/.test(lines[ln - 1] ?? '') || /searchfield-allow/.test(lines[ln - 2] ?? '');
}

const EXCLUDE_FILE = /\.(stories|test|spec)\.[jt]sx?$|\.d\.ts$/;
const EXCLUDE_PATH = /[\\/](blocks|showcase|showcases|stories|__tests__)[\\/]/;
const INPUT_SOURCE = /[\\/]primitives[\\/]input\.tsx$/; // canonical immune composition

const ICON_TAG_RE = /<[A-Za-z][\w.]*\b/; // any JSX element opening (icon or otherwise)
const HAS_PEN_ABS = (line) => /\bpointer-events-none\b/.test(line) && /\babsolute\b/.test(line);
const INPUT_TAG_RE = /<(?:Input|input)(?=[\s/>])/;
// Line-level variant: split('\n') drops the trailing newline, so a `<input`
// opening tag alone on its own line (attrs follow on later lines — the
// overwhelmingly common shape here) has no character left for the `[\s/>]`
// lookahead to match against. Allow end-of-string too.
const INPUT_TAG_LINE_RE = /<(?:Input|input)(?:[\s/>]|$)/;

function scan(dir) {
  walk(dir, (p) => {
    if (!['.tsx', '.ts'].includes(extname(p))) return;
    if (EXCLUDE_FILE.test(basename(p)) || EXCLUDE_PATH.test(p)) return;
    const raw = readFileSync(p, 'utf8');
    const txt = blankComments(raw); // comments neutralised, offsets preserved
    const lines = raw.split('\n');
    const cleanLines = txt.split('\n');

    // ---- CHECK A: icon-under-input (paint-over) ----
    if (!INPUT_SOURCE.test(p)) {
      for (let i = 0; i < cleanLines.length; i++) {
        const line = cleanLines[i];
        if (!ICON_TAG_RE.test(line) || !HAS_PEN_ABS(line)) continue;
        if (hasSufficientZ(line)) continue; // already safe
        // "sits next to an Input/input" — check a small surrounding window
        // (icon-then-input is the observed convention; allow a little slack
        // either direction rather than assuming exact adjacency).
        const winStart = Math.max(0, i - 2);
        const winEnd = Math.min(cleanLines.length, i + 6);
        const nearby = cleanLines.slice(winStart, winEnd).some((l) => INPUT_TAG_LINE_RE.test(l));
        if (!nearby) continue;
        const ln = i + 1;
        if (allowedAt(lines, ln)) continue;
        violations.push(
          `A z-index    ${p}:${ln}  icon absolutely positioned next to an Input/input with no z-10+ — paints UNDER an opaque input (the T-062/T-092 paint-over class). Add z-10 (or higher) to the icon's className, or // searchfield-allow <reason>.`
        );
      }
    }

    // ---- CHECK B: iconless-search-input ----
    for (const m of txt.matchAll(new RegExp(INPUT_TAG_RE.source, 'g'))) {
      const tag = scanTag(txt, m.index);
      const phMatch = tag.match(/placeholder\s*=\s*(["'`])((?:(?!\1)[\s\S])*)\1/);
      if (!phMatch || !/search/i.test(phMatch[2])) continue;
      if (/\bleadingIcon\b/.test(tag)) continue; // has the DS icon prop
      const ln = lineOf(txt, m.index);
      const precedingStart = Math.max(0, ln - 4); // 3 lines strictly before ln (1-based)
      const preceding = cleanLines.slice(precedingStart, ln - 1).join('\n');
      if (/<[\w.]*Search[\w]*\b/.test(preceding)) continue; // Search* icon nearby
      if (allowedAt(lines, ln)) continue;
      violations.push(
        `B no-icon    ${p}:${ln}  <input>/<Input> placeholder "${phMatch[2]}" matches /search/i with no leadingIcon prop and no Search* icon in the 3 preceding lines — bare search field (T-033 class). Add a leading SearchMd icon (mirror an existing DS search field) or leadingIcon, or // searchfield-allow <reason>.`
      );
    }
  });
}

// Dual-target convention (coherence.mjs): DS root has src/components/**;
// a product root (no src/components, e.g. ifm-workforce's src/modules) is
// scanned via its whole src/**.
const compDir = join(ROOT, 'src', 'components');
scan(existsSync(compDir) ? compDir : join(ROOT, 'src'));

if (violations.length) {
  console.log(`SEARCHFIELD: FAIL (${violations.length})`);
  violations.forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
}
console.log('SEARCHFIELD: PASS (icon-under-input z-index + iconless-search-input checks)');
process.exit(0);
