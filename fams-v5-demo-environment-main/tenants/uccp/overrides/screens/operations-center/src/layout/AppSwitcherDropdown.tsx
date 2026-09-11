import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  cn, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from '@fams/design-system'
import { Maximize2 } from 'lucide-react'
import { HOME_SUITES } from '../features/home/homeData'

/**
 * The application switcher's MINIMIZED state — a tile grid anchored to the
 * application row in the primary rail. Figma "Tadweer — Launch Pad" node
 * `5951:23143` (Modal), colours from `6843:15423`.
 *
 * Its expanded counterpart is a whole page, not a bigger card: the Launch Pad
 * (`#/home`). The header's single control expands to it and records the choice,
 * so the rail's application row opens the Launch Pad from then on; the Launch
 * Pad's own minimize button records the reverse. See `appSwitcherPreference.ts`.
 *
 * Every tile is a real switch: clicking one flips the shell's active app (see
 * `activeAppPreference.ts`), which repaints the rail's app row and filters its
 * module list to that app's modules.
 */

export function AppSwitcherDropdown({
  open,
  onClose,
  onExpand,
  activeAppId,
  onSelectApp,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  /** Expand to the Launch Pad — routes to `#/home` and remembers the choice. */
  onExpand: () => void
  activeAppId: string
  /** Fires when the user picks a different app tile. Host persists it. */
  onSelectApp: (id: string) => void
  /** Anchor element the dropdown positions itself next to (the application row). */
  anchorRef: React.RefObject<HTMLElement | null>
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 54, top: 48 })

  // Sit just off the rail's trailing edge, top-aligned with the trigger row.
  // Re-measured on open, since the rail's width (46px vs 276px) moves the
  // anchor and the card has to stay on screen vertically.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const cardHeight = cardRef.current?.offsetHeight ?? 0
      const top = Math.min(rect.top, Math.max(8, window.innerHeight - cardHeight - 8))
      setPos({ left: rect.right + 8, top })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, anchorRef])

  // Outside-click / Escape closes the popup.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (cardRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Switch application"
      className="fixed z-50 flex w-[340px] flex-col gap-2 rounded-md border border-border bg-card p-2 shadow-[0_20px_24px_-4px_rgba(16,24,40,0.08),0_8px_8px_-4px_rgba(16,24,40,0.03)]"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted-foreground">Switch Application</p>
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onExpand}
                aria-label="Expand to home"
                className="flex size-4 items-center justify-center rounded-[2px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Maximize2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Expand to home</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {HOME_SUITES.map((app) => (
          <AppTileBtn
            key={app.id}
            id={app.id}
            label={app.label}
            icon={app.icon}
            color={app.color}
            active={app.id === activeAppId}
            onSelect={() => {
              onSelectApp(app.id)
              onClose()
            }}
          />
        ))}
      </div>
    </div>
  )
}

function AppTileBtn({
  label,
  icon: Icon,
  color,
  active,
  onSelect,
}: {
  id: string
  label: string
  icon: import('lucide-react').LucideIcon
  color: string
  active: boolean
  onSelect: () => void
}) {
  const chipStyle = { backgroundColor: `${color}1F`, color }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex size-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md p-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-muted font-semibold' : ''
      )}
    >
      <span
        className="flex items-center justify-center rounded-[4px] p-2"
        style={chipStyle}
      >
        <Icon size={24} />
      </span>
      <span
        className={cn(
          'text-center text-[12px] leading-[18px]',
          active ? 'font-semibold text-foreground' : 'font-medium text-gray-700'
        )}
      >
        {label}
      </span>
    </button>
  )
}
