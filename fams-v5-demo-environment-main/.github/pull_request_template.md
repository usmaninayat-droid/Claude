<!--
  fams-v5-demo-environment PR template. Most content changes (core/, tenants/, resolved/)
  have NO required reviewer (see .github/CODEOWNERS) so agents can land them
  fast; the seams (tools/, .github/, app/src/demo/) are human-gated. On approval
  or a `/capture` comment, the capture Action canonicalizes the resolved/ diff
  into typed deltas (decision #17) — see CLAUDE.md § Capture workflow.
-->

## What & why

<!-- One or two sentences. Link the ticket. -->

- Ticket:

## Tenant(s) touched

<!-- e.g. iwmp, fams, or "core (all tenants re-resolve)". -->

-

## Personas verified

<!-- Which logins you checked in the demo app (admin / dispatcher / …) and what
     differed (rail, New button, gated transitions). -->

-

## Screenshots

<!-- Before/after of the affected screen(s), per persona where it matters. -->

## Checklist

- [ ] `pnpm demo resolve --all && pnpm demo check` is green (resolved/ not stale, seed refs valid)
- [ ] `pnpm demo debt` re-run and `docs/debt-dashboard.md` committed if it changed
- [ ] `pnpm test` green
- [ ] Only typed deltas / seeds / tenant-native modules were hand-edited — `resolved/` was regenerated, never hand-edited (except as capture input)
- [ ] If an edit is not expressible as typed ops: either reworked to fit, or the `needs-canonicalization` label is applied to land it as flagged debt (ladder step 2)
