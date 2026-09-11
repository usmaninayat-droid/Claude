import { useCallback, useEffect, useRef } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { FileText, Minus, Plus, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@ds/components/primitives/sheet';
import { cn } from '@ds/components/utils/cn';

/**
 * DetailSheet — PORTED VERBATIM (markup + classes) from the FAMS V5 web
 * app-shell's own DetailSheet:
 *   fams-v5-demo-environment/tenants/frms/overrides/screens/operations-center/
 *     vendor/fams-design-system/src/components/app-shell/side-sheet.tsx
 *
 * Header = the Figma DS V2 detail top nav (6995:455): macOS traffic-light
 * controls (red close-all / amber minimize) then a bordered browser-tab strip
 * with an optional `+`. Body is a single full-bleed slot — the record layout
 * (main pane + right panel) is the caller's, exactly as on the web where
 * `TaskDetail` is rendered into this body.
 *
 * The only deliberate divergence from the web file: this app IS the tablet
 * shell, so the sheet is pinned to the full viewport (user-approved) instead
 * of `min(1100px, 94vw)`.
 */

export interface DetailSheetTab {
  id: string;
  label: ReactNode;
  category?: ReactNode;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
}

export interface DetailSheetProps {
  open: boolean;
  /** Fired on Esc / overlay click — treated as a MINIMIZE (tabs are preserved). */
  onOpenChange: (open: boolean) => void;
  tabs: DetailSheetTab[];
  activeId?: string;
  onTabClick?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  /** Close-all (red control) — clears every tab for the module. */
  onCloseAll?: () => void;
  /** Minimize (amber control) — hides the sheet but keeps the module's tabs. */
  onMinimize?: () => void;
  onAdd?: () => void;
  children: ReactNode;
}

/**
 * Return-focus-on-close: capture whatever was focused when the sheet opens
 * and hand back an `onCloseAutoFocus` that restores it, since a controlled
 * sheet with no Radix trigger has nothing else to restore focus to.
 */
function useReturnFocus(open: boolean) {
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      openerRef.current = document.activeElement;
    }
  }, [open]);
  return useCallback((event: Event) => {
    const opener = openerRef.current;
    if (opener && opener.isConnected) {
      event.preventDefault();
      opener.focus();
    }
  }, []);
}

export function DetailSheet({
  open,
  onOpenChange,
  tabs = [],
  activeId,
  onTabClick,
  onCloseTab,
  onCloseAll,
  onMinimize,
  onAdd,
  children,
}: DetailSheetProps) {
  const onCloseAutoFocus = useReturnFocus(open);
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        width="100vw"
        onCloseAutoFocus={onCloseAutoFocus}
        className="gap-0 p-0"
      >
        <SheetTitle className="sr-only">
          {typeof activeTab?.label === 'string' ? activeTab.label : 'Record details'}
        </SheetTitle>
        <SheetDescription className="sr-only">Record detail side sheet</SheetDescription>

        {/* Header — Figma DS V2 detail top nav (6995:455): close-all + minimize
            controls, then a bordered browser-tab strip + add. */}
        <div
          className="flex h-12 shrink-0 items-stretch border-b border-border bg-background"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <div className="flex items-center gap-2 px-6">
            <button
              type="button"
              aria-label="Close all tabs"
              onClick={() => (onCloseAll ? onCloseAll() : onOpenChange(false))}
              className="grid size-4 place-items-center text-black/55 transition hover:brightness-90"
              style={{ background: '#FF5F57', borderRadius: 'var(--ins-radius-full)' }}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Minimize"
              onClick={() => (onMinimize ? onMinimize() : onOpenChange(false))}
              className="grid size-4 place-items-center text-black/55 transition hover:brightness-90"
              style={{ background: '#FFBD2E', borderRadius: 'var(--ins-radius-full)' }}
            >
              <Minus size={10} strokeWidth={2.5} />
            </button>
          </div>

          {/* Browser-style tabs: no scroll. As more tabs open the inactive ones
              flex-shrink + truncate (full label on hover via title tooltip); the
              active tab keeps its (bounded) full width. */}
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden">
            {tabs.map((t) => {
              const Icon = t.icon ?? FileText;
              const active = t.id === activeTab?.id;
              return (
                <div
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  title={typeof t.label === 'string' ? t.label : undefined}
                  onClick={() => onTabClick?.(t.id)}
                  className={cn(
                    '-mr-px flex cursor-pointer items-center gap-3 border-l border-r border-border px-3 py-1 transition-colors',
                    active
                      ? 'max-w-[280px] shrink-0 bg-card'
                      : 'min-w-0 flex-1 basis-0 bg-transparent hover:bg-muted/60',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Icon size={16} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex min-w-0 flex-col justify-center leading-tight">
                      {t.category ? (
                        <span
                          className="truncate text-[10px] font-semibold leading-3 text-muted-foreground"
                          style={{ opacity: active ? 1 : 0.7 }}
                        >
                          {t.category}
                        </span>
                      ) : null}
                      <span
                        className="truncate text-[12px] font-semibold leading-[18px]"
                        style={{ color: active ? 'var(--card-foreground)' : 'var(--muted-foreground)' }}
                      >
                        {t.label}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close tab"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCloseTab) onCloseTab(t.id);
                      else onOpenChange(false);
                    }}
                    className="ml-auto grid size-5 shrink-0 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    style={{ borderRadius: 'var(--ins-radius-full)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {onAdd ? (
            <button
              type="button"
              aria-label="New record"
              onClick={onAdd}
              className="relative my-auto ml-1 grid size-8 place-items-center text-muted-foreground transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-muted hover:text-foreground"
              style={{ borderRadius: 'var(--ins-radius-sm)' }}
            >
              <Plus size={18} />
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-hidden bg-background">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
