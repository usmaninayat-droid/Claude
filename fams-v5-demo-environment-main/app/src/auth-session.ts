import { buildQuery } from './url'

/**
 * Demo login session — which persona is signed in for a tenant, persisted in
 * sessionStorage (same lifetime the demo-kit store's
 * `SessionStoragePersistence` uses). The pre-boot login gate (`main.tsx` +
 * `demo/login-gate.tsx`) engages ONLY when neither a `?persona=` URL param
 * (QA deep links keep bypassing login) nor a stored session exists.
 *
 * Logout (WP3's popover) goes through `logoutToLogin` — clears the session
 * and reloads without a persona param, which lands back on the gate.
 */

const key = (tenant: string) => `famsdemo:${tenant}:persona`

export function readStoredPersona(tenant: string): string | null {
  try {
    return window.sessionStorage.getItem(key(tenant))
  } catch {
    return null
  }
}

export function storePersona(tenant: string, personaId: string): void {
  try {
    window.sessionStorage.setItem(key(tenant), personaId)
  } catch {
    /* storage unavailable — login still works for this page view via reload param-less flow */
  }
}

export function clearStoredPersona(tenant: string): void {
  try {
    window.sessionStorage.removeItem(key(tenant))
  } catch {
    /* ignore */
  }
}

/** Clear the session and land on the login gate (preserves `?tenant=`). */
export function logoutToLogin(tenant: string): void {
  clearStoredPersona(tenant)
  window.location.href = buildQuery({ tenant, persona: null })
}
