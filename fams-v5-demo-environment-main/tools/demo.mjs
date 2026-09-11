#!/usr/bin/env node
// @ts-check
/** `demo <resolve|check|capture|promote> ...` dispatcher (pnpm demo <cmd>). */
import { main as resolve } from './resolve.mjs';
import { main as check } from './check.mjs';
import { main as capture } from './capture.mjs';
import { main as promote } from './promote.mjs';
import { main as captureAction } from './capture-action.mjs';
import { main as debt } from './debt-dashboard.mjs';

const commands = { resolve, check, capture, promote, 'capture-action': captureAction, debt };

async function run() {
  const [cmd, ...rest] = process.argv.slice(2);
  const fn = commands[cmd];
  if (!fn) {
    console.error(`usage: demo <${Object.keys(commands).join('|')}> [args]`);
    process.exit(cmd ? 1 : 0);
  }
  try {
    process.exit(await fn(rest));
  } catch (err) {
    console.error(`${cmd}: ${err && err.message ? err.message : err}`);
    process.exit(1);
  }
}

run();
