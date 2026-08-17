#!/usr/bin/env node
/* Coherence gate — deterministic checks for the coherence laws.
 * Exit 0 = pass, 1 = fail. Prints a compact report the loop parses.
 * (1) no raw hex UI colours in src/components TSX  (2) no product/recipe dirs in the DS. */
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
    const st = statSync(p);
    if (st.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;
// Files that ARE the token/colour source bridge (a status→hex map) — legitimate.
const COLOR_SOURCE = /leaflet-map|map-view|map-marker|map-widgets|config-bridge|pipeline-right-panel/;

walk(join(ROOT, 'src', 'components'), (p) => {
  if (!['.tsx', '.ts'].includes(extname(p))) return;
  if (COLOR_SOURCE.test(p)) return;
  const txt = readFileSync(p, 'utf8');
  txt.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (!HEX.test(line)) return;
    if (/^(\/\/|\/\*|\*)/.test(t)) return;            // comment line
    if (/coherence-allow/.test(line)) return;          // explicit, documented opt-out
    if (/data:image|viewBox|<svg|<path|fill="#|stroke="#/.test(line)) return; // inline SVG art
    violations.push(`hex  ${p}:${i + 1}  ${t.slice(0, 80)}`);
  });
});

// blocks/ are demo config files where sample-data hex (status maps, zone/tag colours) is
// legitimate DATA. Scan them ONLY for CHROME hex — Tailwind arbitrary values like
// `bg-[#fff]` / `text-[#0072d6]` in classNames — which IS a token-law violation.
const CHROME_HEX = /\[#[0-9a-fA-F]{3,8}\]/;
walk(join(ROOT, 'blocks'), (p) => {
  if (extname(p) !== '.tsx') return;
  const txt = readFileSync(p, 'utf8');
  txt.split('\n').forEach((line, i) => {
    if (!CHROME_HEX.test(line)) return;
    const t = line.trim();
    if (/^(\/\/|\/\*|\*)/.test(t)) return;
    if (/coherence-allow/.test(line)) return;
    violations.push(`hex(chrome)  ${p}:${i + 1}  ${t.slice(0, 80)}`);
  });
});

for (const bad of ['products', 'apps']) {
  try { statSync(join(ROOT, bad)); violations.push(`leak product dir '${bad}/' inside the DS`); } catch {}
}

if (violations.length) {
  console.log(`COHERENCE: FAIL (${violations.length})`);
  violations.slice(0, 60).forEach((v) => console.log('  - ' + v));
  process.exit(1);
}
console.log('COHERENCE: PASS');
