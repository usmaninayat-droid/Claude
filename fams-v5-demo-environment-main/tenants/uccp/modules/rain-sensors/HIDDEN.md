# Weather Stations module — hidden (2026-08-31)

The `rain-sensors` module ("Weather Stations") is hidden from the UCCP rail/nav
and routing, but all of its config, seeds, generators, blueprint, and the
incident detail cross-reference fields remain in the codebase untouched.

This does **not** affect the separate, always-on weather LAYER on the Live
Monitoring map (station pins by temperature) — that is unrelated code in
`tenants/uccp/overrides/screens/*/vendor/*/components/app-shell/types.ts`
(`weatherStations` prop) and stays fully functional.

## Re-enable (one edit, two lines)

In `tenants/uccp/tenant.json`, add `"rain-sensors"` back to:
1. the top-level `modules` array
2. `applications[0].modules` array

That's it — the rail entry, `/rain-sensors` route, and license grant are all
driven off that array (see `app/src/demo/model.ts` `buildBootstrapModules`
and `v5-kit/src/modules.ts` `resolveTenantModules`).

## Why nothing else needed patching

- Nav rail, launch tiles, and routes are all built only from the licensed
  module list derived from `tenant.json`'s `modules` arrays — an id absent
  from that list never gets a route or rail button.
- Incidents' "Related Weather Station" field (`fld_inc_sensor`,
  `fld_inc_weather_ref_meta` in `tenants/uccp/modules/incidents/blueprint.json`)
  already renders as inert plain text in this app (no `LinkedRecordProvider`
  is wired up anywhere), so it does not dead-link now and did not before.
