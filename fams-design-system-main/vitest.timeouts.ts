/**
 * ONE test-timeout budget for every package's vitest config (2026-09-06, fix9).
 *
 * Above vitest's 5000ms default. The heaviest suites in this repo — Leaflet map
 * panels, Recharts dashboard widgets, the lazy/Suspense LocationPicker, the
 * `V5AppShell` bootstrap, and the axe passes over all of them — legitimately
 * take 5–12s each when `turbo run test` runs every package's vitest in parallel
 * and saturates the machine. At the default they timed out, so `pnpm test` went
 * RED at the repo root while the SAME files passed 1947/1947 at
 * `--maxWorkers=2` and every failing file passed alone. The failing SET also
 * changed from run to run — the signature of a timing flake, not a regression.
 *
 * That cost the 2026-09-05 job-orders run three false alarms in one day. A gate
 * that goes red on machine load is worse than no gate: it trains a reader to
 * discount reds, and this cycle's whole lesson is that a green gate is only as
 * good as its assertions — a red one has to be equally trustworthy.
 *
 * Shared from here rather than pasted into each of the six `vitest.config.ts`
 * files, for the same reason every other rule in this cycle got centralized:
 * six copies of one number drift, and then two packages disagree about what
 * "too slow" means.
 *
 * Deliberately 20s, not unbounded: a genuinely hung test still fails, and a
 * UNIT test needing more than ~5s is still a smell worth chasing. This raises
 * the ceiling so the gate measures correctness; it does not bless slowness.
 */
export const TEST_TIMEOUT_MS = 20_000
export const HOOK_TIMEOUT_MS = 20_000
