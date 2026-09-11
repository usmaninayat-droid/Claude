import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronsRight, Hash } from 'lucide-react';
import { cn } from '@ds/components/utils/cn';

/**
 * RecordWorkspace — PORTED from the FAMS V5 web app-shell's `TaskDetail`
 * (…/vendor/fams-design-system/src/components/app-shell/task-detail.tsx),
 * with the right pane's single Timeline slot generalised into the
 * `pipeline-right-panel.tsx` tab strip (Timeline | Related …).
 *
 * Layout (verbatim from the web file):
 *   ┌──────────────────────────────────────────────┬──┬──────────────┐
 *   │ [# INC-01][⚑ REQUEST]        [STATUS][Change▾]│»│ Timeline │Rel │
 *   │ Title (26px semibold)                        │  │  feed +      │
 *   │ label———value    label———value  (2 columns)  │  │  composer    │
 *   │ ▸ Customer Info   ▸ Assessment Notes         │  │              │
 *   └──────────────────────────────────────────────┴──┴──────────────┘
 *
 * The `»` collapse divider is the web file's `ChevronRightDouble` button
 * (lucide's `ChevronsRight` here — this app's single icon source).
 */

/* ── InfoRow — horizontal label/value (label fixed 140px) ─────────────── */

export interface RecordInfoRowDef {
  label: ReactNode;
  value: ReactNode;
}

export function RecordInfoRow({ label, value }: RecordInfoRowDef) {
  return (
    <div className="flex items-center gap-4">
      <p className="w-[140px] shrink-0 text-[12px] font-semibold leading-[14px] text-muted-foreground">{label}</p>
      <div className="flex min-w-0 flex-col items-start justify-center">
        {typeof value === 'string' || typeof value === 'number' ? (
          <p className="truncate text-[14px] font-semibold leading-4 text-foreground">{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

/* ── Section — chevron header, optional right slot, collapsible ───────── */

export function RecordSection({
  title,
  headerRight,
  defaultOpen = true,
  inset = true,
  children,
  className,
}: {
  title: ReactNode;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  /** Indent the body like the web demo (px-4). */
  inset?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn('flex w-full flex-col gap-3', className)}>
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 outline-none"
        >
          <ChevronDown
            size={14}
            className={cn('text-muted-foreground transition-transform', !open && '-rotate-90')}
          />
          <span className="whitespace-nowrap text-[14px] font-semibold text-foreground">{title}</span>
        </button>
        {headerRight}
      </div>
      {open ? <div className={cn('w-full', inset && 'px-4')}>{children}</div> : null}
    </section>
  );
}

/* ── Read-only note block (the web CollapsibleNote's body, no gradient) ── */

export function RecordNoteBlock({ label, text }: { label: ReactNode; text: string }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-[12px] font-semibold leading-[14px] text-muted-foreground">{label}</p>
      <div
        className="w-full border border-border bg-muted/40 p-4"
        style={{ borderRadius: 'var(--ins-radius-sm)' }}
      >
        <p className="whitespace-pre-wrap text-justify text-[14px] leading-[19px] text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/* ── RecordWorkspace root ─────────────────────────────────────────────── */

export interface RecordRightTab {
  key: string;
  title: ReactNode;
  render: () => ReactNode;
}

export interface RecordWorkspaceProps {
  /** "#" pill content (the record id). */
  recordId: ReactNode;
  /** Second joined pill (module context, rendered UPPERCASE). */
  moduleLabel?: ReactNode;
  /** Glyph inside the second joined pill. */
  moduleIcon?: ReactNode;
  title: ReactNode;
  /** Solid status chip — top right, before the actions. */
  statusSlot?: ReactNode;
  /** Header action controls (Change Status dropdown, overflow menu…). */
  actions?: ReactNode;
  /** The two-column horizontal InfoRow grid under the title. */
  details: { left: RecordInfoRowDef[]; right: RecordInfoRowDef[] };
  /** Main-column sections (RecordSection stack). */
  children?: ReactNode;
  /** Right panel tabs (Timeline | Related …). Omit to render main pane only. */
  rightTabs?: RecordRightTab[];
  className?: string;
}

export function RecordWorkspace({
  recordId,
  moduleLabel,
  moduleIcon,
  title,
  statusSlot,
  actions,
  details,
  children,
  rightTabs,
  className,
}: RecordWorkspaceProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(rightTabs?.[0]?.key ?? '');
  const hasPanel = Boolean(rightTabs && rightTabs.length);
  const current = rightTabs?.find((t) => t.key === activeTab) ?? rightTabs?.[0];

  return (
    <div className={cn('flex h-full min-h-0 items-stretch', className)}>
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 overflow-y-auto fams-hide-scrollbar bg-card">
        <div className="flex w-full flex-col gap-8 p-6">
          {/* Header block */}
          <div className="flex w-full flex-col gap-4">
            <div className="flex min-h-[26px] w-full flex-wrap items-center justify-between gap-2">
              {/* Joined pill group: [# id][⚑ MODULE] */}
              <div className="flex items-center">
                <span
                  className="flex h-[26px] items-center gap-1 border border-border bg-card px-2"
                  style={{
                    borderTopLeftRadius: 'var(--ins-radius-full)',
                    borderBottomLeftRadius: 'var(--ins-radius-full)',
                  }}
                >
                  <Hash size={12} className="text-muted-foreground" />
                  <span className="text-[14px] font-semibold text-muted-foreground">{recordId}</span>
                </span>
                {moduleLabel ? (
                  <span
                    className="-ml-px flex h-[26px] items-center gap-1 border border-border bg-card px-2"
                    style={{
                      borderTopRightRadius: 'var(--ins-radius-full)',
                      borderBottomRightRadius: 'var(--ins-radius-full)',
                    }}
                  >
                    {moduleIcon}
                    <span className="text-[14px] font-semibold uppercase text-muted-foreground">{moduleLabel}</span>
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {statusSlot}
                {actions}
                {hasPanel ? (
                  <button
                    type="button"
                    aria-label={panelOpen ? 'Collapse timeline panel' : 'Expand timeline panel'}
                    onClick={() => setPanelOpen((v) => !v)}
                    className="relative grid size-8 place-items-center border border-border bg-card text-muted-foreground outline-none transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:text-foreground"
                    style={{ borderRadius: 'var(--ins-radius-sm)' }}
                  >
                    <ChevronsRight size={16} className={cn('transition-transform', !panelOpen && 'rotate-180')} />
                  </button>
                ) : null}
              </div>
            </div>
            <h2 className="w-full whitespace-pre-wrap text-[26px] font-semibold leading-snug text-foreground">
              {title}
            </h2>

            {/* Details — two columns of horizontal InfoRows, bottom border.
                Wraps to a single stacked column when the surface is narrow so
                the fixed-width labels never collide. */}
            <div className="flex w-full flex-wrap items-start gap-x-8 gap-y-5 border-b border-border pb-4">
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                {details.left.map((d, i) => (
                  <RecordInfoRow key={i} {...d} />
                ))}
              </div>
              <div className="flex min-w-[220px] flex-1 basis-[220px] flex-col gap-5">
                {details.right.map((d, i) => (
                  <RecordInfoRow key={i} {...d} />
                ))}
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      {hasPanel && panelOpen ? (
        <aside className="flex w-[clamp(320px,34%,440px)] shrink-0 flex-col border-l border-border bg-background">
          {/* Tab strip — ported from pipeline-right-panel.tsx RightPanelTabStrip */}
          <div
            className="flex shrink-0 gap-4 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            {rightTabs!.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={current?.key === t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-caption font-semibold outline-none transition-colors',
                  current?.key === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.title}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4">{current?.render()}</div>
        </aside>
      ) : null}
    </div>
  );
}
