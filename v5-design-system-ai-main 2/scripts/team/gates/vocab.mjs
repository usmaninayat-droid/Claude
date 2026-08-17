#!/usr/bin/env node
/* G-VOCAB (SI-4, T-019) — static gate for the `ds-hardcoded-domain-assumption`
 * class. Exit 0 = pass, 1 = fail. No DOM/browser/deps — same family as
 * coherence.mjs / a11y-static.mjs / roundtrip.mjs (source scanned as text,
 * tuned for high signal).
 *
 * THE RECURRING BUG IT KILLS (seen 3x → T-016/T-017/T-018): the SHARED app-shell
 * & navigation CHROME — which a product consumes but CANNOT rewrite — bakes in
 * FLEET/asset-domain vocabulary as user-facing text, so a product with a
 * different data model (workforce attendance, site presence, generic reports)
 * inherits the wrong words. FleetHeader hardcoded 'Vehicle'/'Activity Overview'/
 * 'Speed' as column labels (T-017); the fix made them a CONFIGURABLE default
 * (`labels?.entity ?? 'Vehicle'`) — the product overrides, the fleet word is
 * only the fallback.
 *
 * THE CHECK — scan the shared chrome (`src/components/app-shell/**` and
 * `src/components/navigation/**`) for a curated set of fleet-domain words that
 * reach the UI, in exactly two contexts:
 *   V1  JSX TEXT NODE — the word appears as element text between `>` and `<`
 *       (e.g. `<th>Vehicle</th>`). Hardcoded on-screen copy.
 *   V2  DEFAULT-LABEL LITERAL — the word appears inside a string literal
 *       (`'Vehicle'` / `"Speed"` / `` `Truck` ``) used as a label/value.
 * A literal that is the FALLBACK of an overridable prop — `?? 'Vehicle'` — is
 * the SANCTIONED pattern and is NOT flagged (the product can override it).
 * Comments and bare identifiers (type names, variables like `Vehicle`) never
 * reach the UI and are NEVER flagged. Products & showcases MAY use domain words,
 * so `blocks/`, `showcase`, `.stories.`, `.test.`, `.spec.` trees are excluded.
 *
 * Opt out a genuinely-intrinsic case (a word that legitimately must be literal
 * in shared chrome) with `// vocab-allow <word> — <reason>` on the SAME line;
 * a bare `// vocab-allow — <reason>` allows every flagged word on that line.
 *
 * Narrow + high-signal by design (like the sibling gates). The non-regex-able
 * half of the class (subtler default-landing / domain-model assumptions) stays a
 * review-checklist item in review-fix — this gate covers the deterministic core.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const ROOT = process.argv[2] || '.';
const violations = [];

// Fleet/asset-domain user-facing vocabulary. Whole-word matched. Baking these
// into shared chrome as literal UI text is the bug this gate catches.
const WORDS = ['Vehicle', 'Vehicles', 'Speed', 'Driver', 'Fleet', 'Truck', 'Depot', 'Plate'];

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

/** Blank out comments while PRESERVING every byte offset (so line numbers and
 *  match indices stay aligned with the original text). Block comments and line
 *  comments become runs of spaces; newlines are kept. */
function blankComments(txt) {
  // block comments /* ... */ (incl. JSDoc, multi-line)
  let out = txt.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // line comments // ... (skip `://` so we don't eat protocol-relative URLs)
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

/** Is the flagged word opted out via `// vocab-allow` on this original line? */
function allowed(origLine, word) {
  const m = origLine.match(/vocab-allow\s+([^\n]*)/);
  if (!m) return false;
  const words = m[1].split(/[\s,]+/).filter((w) => WORDS.includes(w));
  return words.length === 0 || words.includes(word); // bare allow → whole line
}

const EXCLUDE_FILE = /\.(stories|test|spec)\.[jt]sx?$/;
const EXCLUDE_PATH = /[\\/](blocks|showcase|showcases|stories|__tests__)[\\/]/;

function scan(dir) {
  walk(dir, (p) => {
    if (!['.tsx', '.ts'].includes(extname(p))) return;
    if (EXCLUDE_FILE.test(basename(p)) || EXCLUDE_PATH.test(p)) return;
    const raw = readFileSync(p, 'utf8');
    const lines = raw.split('\n');
    const txt = blankComments(raw); // comments neutralised, offsets preserved
    const seen = new Set(); // dedupe per file:line:word

    for (const word of WORDS) {
      // V2 — string literals containing the word (' " or `), excluding `?? '...'`.
      const litRe = new RegExp(`(['"\`])((?:[^'"\`\\\\]|\\\\.)*?\\b${word}\\b(?:[^'"\`\\\\]|\\\\.)*?)\\1`, 'g');
      for (const m of txt.matchAll(litRe)) {
        const before = txt.slice(Math.max(0, m.index - 4), m.index).replace(/\s+$/, '');
        if (/\?\?$/.test(before)) continue;           // sanctioned overridable fallback
        const ln = lineOf(txt, m.index);
        if (allowed(lines[ln - 1] ?? '', word)) continue;
        const key = `${ln}:${word}`;
        if (seen.has(key)) continue; seen.add(key);
        violations.push(`V2 default-label ${p}:${ln}  hardcoded domain word "${word}" in a label literal — source it from a configurable prop (e.g. \`labels?.x ?? '${word}'\`) or // vocab-allow ${word} — <reason>`);
      }

      // V1 — JSX text node: the word as element text between `>` and `<` ON ONE
      // line. Single-line by design — `[^<>{}\n]` never crosses a newline, so a
      // `>` in code (e.g. `=>`) can't swallow unrelated literals on later lines;
      // multi-line text nodes are rare for a single-word label and out of scope.
      const jsxRe = new RegExp(`>([^<>{}\\n]*\\b${word}\\b[^<>{}\\n]*)<`, 'g');
      for (const m of txt.matchAll(jsxRe)) {
        const ln = lineOf(txt, m.index + 1);
        if (allowed(lines[ln - 1] ?? '', word)) continue;
        const key = `${ln}:${word}`;
        if (seen.has(key)) continue; seen.add(key);
        violations.push(`V1 jsx-text     ${p}:${ln}  hardcoded domain word "${word}" in JSX text — render a configurable label, not baked copy (or // vocab-allow ${word} — <reason>)`);
      }
    }
  });
}

scan(join(ROOT, 'src', 'components', 'app-shell'));
scan(join(ROOT, 'src', 'components', 'navigation'));

if (violations.length) {
  console.log(`VOCAB: FAIL (${violations.length})`);
  violations.forEach((v) => console.log(`  - ${v}`));
  process.exit(1);
}
console.log(`VOCAB: PASS (${WORDS.length} domain words checked in app-shell + navigation)`);
process.exit(0);
