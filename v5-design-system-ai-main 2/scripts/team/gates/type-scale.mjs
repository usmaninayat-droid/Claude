#!/usr/bin/env node
/**
 * G-TYPESCALE — font sizes in components must use the DS semantic type scale
 * (text-caption / text-body-xs|sm|md|lg|xl / text-h1..h6), never Tailwind's
 * default sizes (text-xs/sm/base/lg/xl/…) or arbitrary px (`text-[13px]`).
 *
 * Promoted to a gate after a platform-wide font-size normalization (recurring
 * "raw/arbitrary font size" defect class) — same spirit as G-SEARCHFIELD. Colour
 * arbitrary values (`text-[#..]`, `text-[color:var(..)]`) are NOT flagged here;
 * numeric SVG `fontSize={n}` props are not class tokens and are ignored.
 * Calibrate a genuine exception with a `// coherence-allow` (or `// type-allow`)
 * comment on the line.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] || '.';
const violations = [];

function walk(dir, fn) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, fn);
    else fn(p);
  }
}

// Tailwind default size utilities (standalone tokens; the DS `text-body-*` /
// `text-caption` / `text-h*` never contain these as a bounded token).
const TW_DEFAULT = /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/;
// Arbitrary numeric font size: `text-[13px]` / `text-[1.2rem]` — but NOT
// `text-[#fff]` or `text-[color:var(--x)]` (those start with # or a letter).
const ARB_SIZE = /text-\[[0-9.]+(px|rem|em)\]/;

walk(join(ROOT, 'src', 'components'), (p) => {
  if (extname(p) !== '.tsx') return;
  readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
    if (/coherence-allow|type-allow/.test(line)) return;
    if (TW_DEFAULT.test(line)) violations.push(`tw-default  ${p}:${i + 1}  ${line.trim().slice(0, 90)}`);
    else if (ARB_SIZE.test(line)) violations.push(`arbitrary   ${p}:${i + 1}  ${line.trim().slice(0, 90)}`);
  });
});

if (violations.length) {
  console.log(`TYPESCALE: FAIL (${violations.length})`);
  violations.slice(0, 80).forEach((v) => console.log('  - ' + v));
  process.exit(1);
}
console.log('TYPESCALE: PASS');
