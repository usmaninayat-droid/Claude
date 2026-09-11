import { LayoutDashboard, MessageSquareWarning, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ds/components/primitives/tooltip';
import { cn } from '@ds/components/utils/cn';
import { useInspectorStore } from '../data/store';
import type { ActiveModule } from '../data/store';
import mmLogo from '../../assets/mm-logo.svg';

interface RailModule {
  key: ActiveModule;
  label: string;
  icon: LucideIcon;
}

const MODULES: RailModule[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'requests', label: 'Requests & Complaints', icon: MessageSquareWarning },
  { key: 'plans', label: 'Plan Monitoring', icon: ClipboardCheck },
];

/**
 * InspectorRail — single rail matching FAMS V5 web's module rail 1:1
 * (source of truth: fams-design-system/packages/ui-kit/src/shells/SideNav.tsx
 * — `RailItem` + `SideNavFooterItem`, the demo-verified/audited version:
 * 51px rail, 44×44 hit-area boxes around 28×28 chips, `rounded-sm` +
 * `border-s-2` accent, white-pill active state, white/20 hover, Radix
 * tooltip side="right" sideOffset=8 delayDuration=150).
 *
 * Markup is replicated verbatim (not the component itself imported) because
 * this project's own `@ds` SideNav ships a different, older lineage
 * (`AppRailButton`: 44px rail, `rounded-[4px]`, no hit-area/no border-s-2)
 * that does not match current web — reproducing `RailItem`'s classes here
 * keeps parity without forking the shared shell's props/API.
 */
export function InspectorRail() {
  const { activeModule, setActiveModule } = useInspectorStore();

  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label="Primary"
        style={{ width: 51, background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
        className="flex h-full shrink-0 flex-col items-center gap-1 px-2 py-4"
      >
        {/* Logo — 28×28, mb-4 (nav-a SPEC.md §1) */}
        <div className="mb-4 flex size-7 shrink-0 items-center justify-center overflow-hidden text-white [&_*]:max-h-full [&_*]:max-w-full [&_img]:size-full [&_img]:object-contain [&_svg]:size-full">
          <img src={mmLogo} alt="" />
        </div>

        {/* Module items — each owns a 44×44 hit-area box, so no extra gap is
            needed between them (28 + 16 gap === 44 + 0 gap). */}
        <ul className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
          {MODULES.map(({ key, label, icon: Icon }) => {
            const active = activeModule === key;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <li aria-current={active ? 'page' : undefined}>
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={active}
                      onClick={() => setActiveModule(key)}
                      className="flex size-11 shrink-0 items-center justify-center"
                    >
                      <span
                        data-active={active || undefined}
                        className={cn(
                          'relative flex size-7 items-center justify-center rounded-[var(--ins-radius-sm)] border-s-2 outline-none transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-white/60',
                          active
                            ? 'border-primary/60 bg-white text-primary shadow-sm'
                            : 'border-primary/40 text-white/70 hover:bg-white/20 hover:text-white',
                        )}
                      >
                        <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
                          <Icon size={16} />
                        </span>
                        <span className="sr-only">{label}</span>
                      </span>
                    </button>
                  </li>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  showArrow={false}
                  className="rounded-[var(--ins-radius-sm)] bg-popover px-2 py-1 text-xs font-normal leading-none text-popover-foreground shadow-md"
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ul>

        {/* Footer — hairline divider + circular avatar (SideNavFooterItem) */}
        <div className="mt-auto flex w-full flex-col items-center gap-2 pt-2">
          <div aria-hidden className="h-px w-10 bg-white/20" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Account"
                className="group flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white transition-colors group-hover:bg-white/30">
                  IN
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              showArrow={false}
              className="rounded-[var(--ins-radius-sm)] bg-popover px-2 py-1 text-xs font-normal leading-none text-popover-foreground shadow-md"
            >
              Inspector Account
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
