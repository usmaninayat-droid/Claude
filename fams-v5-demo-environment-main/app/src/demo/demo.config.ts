/**
 * This demo's default tenant — what a plain `http://localhost:6300/` (no
 * `?tenant=` param) resolves to. Previously this fell back to
 * `listTenants()[0]?.id`, i.e. whichever tenant sorted first alphabetically,
 * which silently changes the "default" demo every time a tenant is
 * added/removed. Pin it explicitly here instead.
 *
 * Kept at `fams` (the value the alphabetical fallback already produced) so
 * adding the `uccp` tenant does not move this repo's default demo — the UCCP
 * workspace pins its own copy to `uccp` because that IS its whole demo.
 */
export const DEFAULT_TENANT = 'fams'
