import * as React from 'react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * EntityDetail — the STANDARD entity detail view, adapted faithfully from the
 * Make designs (Truemax/Ducon asset-detail-popup; same shape as the CRM
 * company/contact panel). One layout for every entity kind the platform
 * defines — vehicles, assets, drivers, workforce, products, services:
 *
 *   ┌─────────────┬──────────────────────────────────────────┐
 *   │ image       │ Overview · Details · Maintenance Log     │ ← underline tabs
 *   │ +status     ├──────────────────────────────────────────┤
 *   │ Name 22px   │ [METRIC][METRIC][METRIC]   ← metric cards│
 *   │ ID# ····    │ [chart card     ][chart card     ]       │
 *   │ [CAT][tag]+ │ [recent activity rows                ]   │
 *   │ ───────────             (per-tab content)              │
 *   │ Details     │                                          │
 *   │ label  value│                                          │
 *   │ label  value│                                          │
 *   └─────────────┴──────────────────────────────────────────┘
 *
 * Left identity panel: 320px, muted background, hero image with status badge
 * overlaid, 22px bold name, "ID# x", category badge + managed tag pills with
 * a "+" tag-popup, then a titled stack of justify-between DetailRows.
 */

/* ── building blocks (exported — every entity config composes these) ──── */

/** Justify-between label/value row (demo DetailRow: 12px muted | 12px dark). */
export function EntityDetailRow({
  label,
  value,
  borderBottom = true,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  borderBottom?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-2.5', borderBottom && 'border-b border-border')}>
      <p className="shrink-0 text-[12px] font-semibold text-muted-foreground">{label}</p>
      {typeof value === 'string' || typeof value === 'number' ? (
        <p className="min-w-0 truncate text-right text-[12px] font-semibold text-foreground">{value || '—'}</p>
      ) : (
        <div className="min-w-0 text-right">{value}</div>
      )}
    </div>
  );
}

/** Overview metric card (demo: 11px uppercase label, 28px bold value, sub). */
export function EntityMetricCard({
  label,
  value,
  sub,
  children,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  /** Extra content under the sub (e.g. a status badge). */
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] border border-border p-4">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {value != null ? <p className="text-[28px] font-bold leading-tight text-foreground">{value}</p> : null}
      {sub ? <p className="text-[11px] font-medium text-muted-foreground">{sub}</p> : null}
      {children ? <div className="mt-1.5">{children}</div> : null}
    </div>
  );
}

/** Overview chart/list card (demo: 14px bold title + 11px muted subtitle). */
export function EntityChartCard({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[8px] border border-border p-4', className)}>
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <p className="text-[14px] font-bold text-foreground">{title}</p>
      </div>
      {subtitle ? <p className="mb-3 text-[11px] font-medium text-muted-foreground">{subtitle}</p> : null}
      {children}
    </div>
  );
}

/** A row inside a recent-activity card (badge + label | right meta). */
export function EntityListItem({
  leading,
  title,
  trailing,
  borderBottom = true,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  trailing?: React.ReactNode;
  borderBottom?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-2', borderBottom && 'border-b border-border')}>
      <div className="flex min-w-0 items-center gap-2.5">
        {leading}
        <p className="truncate text-[12px] font-medium text-foreground">{title}</p>
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-3">{trailing}</div> : null}
    </div>
  );
}

/* ── EntityDetail root ────────────────────────────────────────────────── */

export interface EntityTag {
  id: string;
  label: string;
}

export interface EntityDetailTab {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

export interface EntityDetailProps {
  /** Hero image URL — or omit and pass avatarFallback letters. */
  image?: string;
  avatarFallback?: string;
  avatarColor?: string;
  /** Status badge overlaid top-left on the hero. */
  statusOverlay?: React.ReactNode;
  name: React.ReactNode;
  entityId?: React.ReactNode;
  /** Category badge — first chip in the tag row (light-primary, uppercase). */
  categoryBadge?: React.ReactNode;
  /** Managed tags with optional add/remove (the demo's tag popup). */
  tags?: EntityTag[];
  tagSuggestions?: string[];
  onAddTag?: (label: string) => void;
  onRemoveTag?: (id: string) => void;
  /** Title above the left-panel detail rows (e.g. "Equipment Details"). */
  infoTitle?: React.ReactNode;
  /** Left-panel detail rows (label | value). */
  info?: { label: React.ReactNode; value: React.ReactNode }[];
  tabs: EntityDetailTab[];
  defaultTabId?: string;
  className?: string;
}

export function EntityDetail({
  image,
  avatarFallback,
  avatarColor,
  statusOverlay,
  name,
  entityId,
  categoryBadge,
  tags,
  tagSuggestions = [],
  onAddTag,
  onRemoveTag,
  infoTitle = 'Details',
  info,
  tabs,
  defaultTabId,
  className,
}: EntityDetailProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTabId ?? tabs[0]?.id);
  const [tagQuery, setTagQuery] = React.useState('');
  const [tagOpen, setTagOpen] = React.useState(false);
  const tab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  const suggestions = tagSuggestions.filter(
    (s) =>
      s.toLowerCase().includes(tagQuery.toLowerCase()) &&
      !(tags ?? []).some((t) => t.label.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className={cn('flex h-full min-h-0 items-stretch', className)}>
      {/* ── Left identity panel (demo: 320px, muted bg, p-28) ─────────── */}
      <aside className="w-[320px] shrink-0 overflow-y-auto border-r border-border bg-muted/40">
        <div className="flex flex-col gap-6 p-7">
          {/* Hero image + status overlay */}
          <div className="relative w-full">
            <div className="h-[220px] w-full overflow-hidden rounded-[4px] bg-muted">
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-h2 font-bold text-white"
                  style={{ background: avatarColor ?? 'var(--primary)' }}
                  aria-hidden
                >
                  {avatarFallback}
                </div>
              )}
            </div>
            {statusOverlay ? <div className="absolute left-2 top-2 flex items-center gap-1.5">{statusOverlay}</div> : null}
          </div>

          {/* Name, ID, category + tags */}
          <div className="flex flex-col gap-1">
            <p className="text-[22px] font-bold leading-snug text-foreground">{name}</p>
            {entityId ? <p className="text-[14px] font-medium text-muted-foreground">ID# {entityId}</p> : null}
            <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
              {categoryBadge}
              {(tags ?? []).map((t) => (
                <span
                  key={t.id}
                  className="group flex items-center gap-1 rounded-[2px] border border-primary bg-secondary py-1 pl-2 pr-1.5 text-[11px] font-semibold text-primary"
                >
                  {t.label}
                  {onRemoveTag ? (
                    <button
                      type="button"
                      aria-label={`Remove tag ${t.label}`}
                      onClick={() => onRemoveTag(t.id)}
                      className="rounded-full p-0.5 opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                        <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}
                </span>
              ))}
              {onAddTag ? (
                <Popover open={tagOpen} onOpenChange={(o) => { setTagOpen(o); if (!o) setTagQuery(''); }}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Add tag"
                      className="grid size-7 place-items-center rounded-[2px] bg-muted text-[16px] font-semibold text-foreground transition-colors hover:bg-border"
                    >
                      +
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-60 p-2">
                    <input
                      autoFocus
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagQuery.trim()) {
                          onAddTag(tagQuery.trim());
                          setTagQuery('');
                          setTagOpen(false);
                        }
                      }}
                      placeholder="Search or create tag…"
                      className="mb-1 h-8 w-full rounded-md bg-muted/60 px-2 text-body-sm outline-none placeholder:text-muted-foreground"
                    />
                    <div className="flex max-h-44 flex-col overflow-auto">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { onAddTag(s); setTagOpen(false); setTagQuery(''); }}
                          className="rounded px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
                        >
                          {s}
                        </button>
                      ))}
                      {tagQuery.trim() && !suggestions.some((s) => s.toLowerCase() === tagQuery.toLowerCase()) ? (
                        <button
                          type="button"
                          onClick={() => { onAddTag(tagQuery.trim()); setTagOpen(false); setTagQuery(''); }}
                          className="rounded px-2 py-1.5 text-left text-body-sm font-medium text-primary outline-none transition-colors hover:bg-muted"
                        >
                          + Create “{tagQuery.trim()}”
                        </button>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          </div>

          {/* Detail rows */}
          {info?.length ? (
            <div className="flex flex-col">
              <p className="mb-3 text-[14px] font-semibold text-muted-foreground">{infoTitle}</p>
              {info.map((row, i) => (
                <EntityDetailRow key={i} label={row.label} value={row.value} borderBottom={i < info.length - 1} />
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      {/* ── Right content: underline tabs + scrollable tab body ────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
        <div className="shrink-0 px-7 pt-5">
          <div className="flex items-center gap-8 border-b border-border" role="tablist">
            {tabs.map((t) => {
              const active = t.id === tab?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'pb-2.5 text-[14px] outline-none transition-colors',
                    active
                      ? 'border-b-2 border-primary font-semibold text-primary'
                      : 'font-medium text-foreground/80 hover:text-foreground'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">{tab?.render()}</div>
      </div>
    </div>
  );
}
