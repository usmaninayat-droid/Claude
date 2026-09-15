import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'

/**
 * IWMP Contract Management (Figma: Tadweer June Release, node 3215:4609) — a
 * bespoke static screen (card-grid list + full-screen "Create New Contract"
 * wizard) served from `app/public/screens/contract-management/` and embedded
 * here via <iframe>, the same isolation route the roster + uccp screens use.
 */
const SCREEN_PATH = '/screens/contract-management/index.html'

export interface ContractManagementDeps {
  actor?: string
}

function iframeSrc(): string {
  const q = new URLSearchParams({ embed: '1', tenant: 'iwmp' })
  const theme = document.documentElement.getAttribute('data-theme')
  if (theme) q.set('theme', theme)
  return `${SCREEN_PATH}?${q}`
}

function ContractManagementPage(_deps: ContractManagementDeps) {
  return (
    <div className="h-full">
      <iframe
        title="Contract Management"
        src={iframeSrc()}
        style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}

export function makeContractManagementRoute(path: string, deps: ContractManagementDeps): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: () => <ContractManagementPage {...deps} /> }))
}
