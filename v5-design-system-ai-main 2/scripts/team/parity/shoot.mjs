#!/usr/bin/env node
/* Parity screenshotter — the team's "QA can actually SEE the output" harness.
 *
 * Drives the locally-installed Chrome/Edge headless (via puppeteer-core, NO browser
 * download) with software WebGL, so it captures normal DS pages AND MapLibre/WebGL
 * maps deterministically — unlike the flaky live-preview screenshots. Produces a PNG
 * QA/ui-designer can diff against the Figma frame for design-parity review.
 *
 *   node scripts/team/parity/shoot.mjs <url> <out.png> [--wait <sel>] [--w 1440] [--h 900] [--delay 800] [--full]
 *
 * Env: CHROME_PATH overrides the browser executable.
 */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((p) => existsSync(p));
}

function parseArgs(argv) {
  const [url, out, ...rest] = argv;
  const o = { url, out, w: 1440, h: 900, delay: 800, wait: null, full: false, actions: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--wait') o.wait = rest[++i];
    else if (rest[i] === '--w') o.w = Number(rest[++i]);
    else if (rest[i] === '--h') o.h = Number(rest[++i]);
    else if (rest[i] === '--delay') o.delay = Number(rest[++i]);
    else if (rest[i] === '--full') o.full = true;
    // Ordered actions to reach nested / field-gated states:
    //   --click "css:<sel>" | "text:<substr>" | "aria:<substr>"   --type "<css sel>::<value>"
    else if (rest[i] === '--click') o.actions.push({ kind: 'click', arg: rest[++i] });
    else if (rest[i] === '--type') o.actions.push({ kind: 'type', arg: rest[++i] });
  }
  return o;
}

/** Click an element by CSS / visible text / aria-label substring.
 *  Polls up to ~6s so async UI (login transitions, lazy screens) can mount. */
async function doClick(page, arg) {
  const [kind, ...r] = arg.includes(':') ? [arg.slice(0, arg.indexOf(':')), arg.slice(arg.indexOf(':') + 1)] : ['css', arg];
  const val = r.join(':');
  const deadline = Date.now() + 6000;
  let ok = false;
  while (!ok && Date.now() < deadline) {
    ok = await tryClick(page, kind, val);
    if (!ok) await new Promise((res) => setTimeout(res, 250));
  }
  if (!ok) throw new Error(`click target not found: ${arg}`);
}

async function tryClick(page, kind, val) {
  return page.evaluate(({ kind, val }) => {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'));
    let el;
    if (kind === 'text') el = els.find((e) => (e.textContent || '').trim().includes(val));
    else if (kind === 'aria') el = els.find((e) => new RegExp(val, 'i').test(e.getAttribute('aria-label') || e.getAttribute('title') || ''));
    else el = document.querySelector(val);
    if (!el) return false;
    el.click();
    return true;
  }, { kind, val });
}

/** Fill an input/textarea by CSS selector: "<css>::<value>" (React-compatible). */
async function doType(page, arg) {
  const idx = arg.indexOf('::');
  const sel = arg.slice(0, idx); const value = arg.slice(idx + 2);
  const ok = await page.evaluate(({ sel, value }) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { sel, value });
  if (!ok) throw new Error(`type target not found: ${sel}`);
}

const a = parseArgs(process.argv.slice(2));
if (!a.url || !a.out) { console.error('usage: shoot.mjs <url> <out.png> [--wait sel] [--w N] [--h N] [--delay ms] [--full]'); process.exit(2); }

const exe = findBrowser();
if (!exe) { console.error('SHOOT: FAIL — no Chrome/Edge found (set CHROME_PATH)'); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  args: [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    // software WebGL so MapLibre/canvas render without a GPU
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    `--window-size=${a.w},${a.h}`,
  ],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: a.w, height: a.h, deviceScaleFactor: 1 });
  await page.goto(a.url, { waitUntil: 'networkidle2', timeout: 60000 });
  for (const act of a.actions) {
    if (act.kind === 'click') await doClick(page, act.arg);
    else if (act.kind === 'type') await doType(page, act.arg);
    await new Promise((r) => setTimeout(r, 500));
  }
  if (a.wait) await page.waitForSelector(a.wait, { timeout: 30000 });
  if (a.delay) await new Promise((r) => setTimeout(r, a.delay));
  await page.screenshot({ path: a.out, fullPage: a.full });
  console.log(`SHOOT: OK → ${a.out} (${a.w}×${a.h}${a.full ? ', full' : ''})`);
} catch (e) {
  console.error(`SHOOT: FAIL — ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
