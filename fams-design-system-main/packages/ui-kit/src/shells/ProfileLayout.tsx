import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Stack } from '../layout/Stack'
import { Toolbar } from '../layout/Toolbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../primitives/Tabs'
import { NoPermission } from '../composites/NoPermission'

/**
 * ProfileTab — composition as DATA, not code. This is the manifest schema:
 * "which tabs exist for entity X on tenant Y, in what order, behind what
 * privilege" lives in the APP as an array of these, built per entity/tenant.
 * `ProfileLayout` only ever renders whatever manifest it's handed — it has
 * zero knowledge of AssetVehicle, bins, or any other domain vocabulary.
 *
 * This is what replaces the v5 codebase's per-tenant, per-entity hand-rolled
 * profile components (31 files across 3 tenant packages, with byte-identical
 * fams/ead forks) — one shell, N manifests.
 */
export interface ProfileTab {
  id: string
  label: string
  /** Tab panel body — owned entirely by the app/feature layer. */
  content: ReactNode
  /** Omit the tab entirely (e.g. failed a privilege check upstream). */
  hidden?: boolean
  /** Render the tab but inert, with a reason (NoPermission "inline" case). */
  disabled?: boolean
  disabledReason?: string
}

export interface ProfileLayoutProps {
  /** Small identity element — avatar, icon, or thumbnail. */
  media?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Header action buttons (edit, link, unlink, …). */
  actions?: ReactNode
  /** The tab manifest — see `ProfileTab`. */
  tabs: ProfileTab[]
  /** Controlled active tab id. Omit for uncontrolled (defaults to the first visible tab). */
  activeTab?: string
  onTabChange?: (id: string) => void
  className?: string
}

/**
 * ProfileLayout — header + tab strip + panel canvas. [L4 shell] Chrome only:
 * it owns spacing, the tab strip, and disabled/hidden tab semantics. Every
 * tab's content is a slot — the shell has no opinion about what's inside.
 */
export function ProfileLayout({
  media,
  title,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabChange,
  className,
}: ProfileLayoutProps) {
  const visibleTabs = tabs.filter((t) => !t.hidden)
  const defaultTab = activeTab ?? visibleTabs[0]?.id

  return (
    <div data-slot="profile-layout" className={cn('flex h-full min-h-0 flex-col', className)}>
      <Stack direction="row" align="center" gap="field" className="shrink-0 p-section">
        {media ? <div className="shrink-0">{media}</div> : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <Toolbar gap="inline">{actions}</Toolbar> : null}
      </Stack>

      <Tabs
        value={activeTab}
        defaultValue={defaultTab}
        onValueChange={onTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="shrink-0 px-section">
          {visibleTabs.map((tab) =>
            tab.disabled ? (
              <NoPermission key={tab.id} reason={tab.disabledReason}>
                <TabsTrigger value={tab.id} disabled>
                  {tab.label}
                </TabsTrigger>
              </NoPermission>
            ) : (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ),
          )}
        </TabsList>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="overflow-auto p-section">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
