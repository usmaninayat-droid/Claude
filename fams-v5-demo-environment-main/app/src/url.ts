/** URL param plumbing for tenant/persona selection (`?tenant=&persona=`). */
export interface DemoParams {
  tenant: string
  persona: string | null
}

export function readParams(defaultTenant: string): DemoParams {
  const p = new URLSearchParams(window.location.search)
  return { tenant: p.get('tenant') ?? defaultTenant, persona: p.get('persona') }
}

export function buildQuery(params: DemoParams): string {
  const p = new URLSearchParams()
  p.set('tenant', params.tenant)
  if (params.persona) p.set('persona', params.persona)
  return `${window.location.pathname}?${p.toString()}`
}

/**
 * A tenant/persona switch is a full reload (v1, documented): the set of
 * registered modules is persona-dependent and the tenant theme + resolved set
 * + seeds all change at boot, so re-running `bootstrapTenant` is the honest
 * path rather than surgically re-wiring a live app.
 */
export function switchTo(params: DemoParams): void {
  window.location.href = buildQuery(params)
}
