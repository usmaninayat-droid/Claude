import { LayoutGrid } from 'lucide-react'
import { TopNavModule } from '@fams/design-system'
import { ComingSoonState } from '../../components/ComingSoonState'
import { findModuleMeta } from '../home/homeData'

/**
 * The shared surface for every application module that hasn't been built yet —
 * the module counterpart of the settings `ComingSoonPanel`. Reached through
 * `#/module/:id` from the rail, the Launch Pad, the ⌘K palette and the mobile
 * module sheet, so no module in any app is a dead click.
 *
 * It still wears the module's own chrome (`TopNavModule` with the module's
 * glyph + name, matching Zones / Live Monitoring) so the placeholder reads as
 * "this module exists, its screens are pending" rather than a broken route.
 */
export function ModuleComingSoonPage({ moduleId }: { moduleId: string }) {
  const meta = findModuleMeta(moduleId)
  const Icon = meta?.icon ?? LayoutGrid
  const label = meta?.label ?? 'This module'

  return (
    <>
      <TopNavModule
        moduleName={
          <span className="flex items-center gap-2.5">
            <Icon size={20} className="text-primary" />
            {label}
          </span>
        }
        variant="segment"
        views={[]}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <ComingSoonState
          label={label}
          icon={Icon}
          description={
            meta?.appLabel
              ? `This ${meta.appLabel} module hasn't been built yet.`
              : "This module hasn't been built yet."
          }
        />
      </div>
    </>
  )
}
