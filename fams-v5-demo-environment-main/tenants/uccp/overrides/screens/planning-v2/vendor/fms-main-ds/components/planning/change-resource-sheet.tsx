import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Button, Input,
  Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle,
} from '../primitives';

/**
 * ChangeResourceSheet — a reusable right side-sheet to re-assign a resource on a
 * scheduled plan (Tadweer Plan Monitoring: change vehicle / driver / helper /
 * discharge station — Nov release `3624-*` / `3633-*`). A searchable single-select
 * radio list of options, each with an avatar/icon + label + meta + optional status
 * chip; Cancel / Confirm (disabled until the selection changes). Config-driven —
 * one component for every "swap this field" flow. Chrome is FAMS blue.
 */

export interface ResourceOption {
  id: string;
  label: string;
  meta?: string;
  /** small status chip, e.g. "Available" / "On Duty". */
  status?: string;
  statusTone?: string;
  /** leading avatar initials (people) — takes precedence over icon. */
  avatar?: string;
  avatarColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ChangeResourceSheetProps {
  open: boolean;
  title: string;
  /** optional helper line under the title. */
  subtitle?: string;
  options: ResourceOption[];
  /** the currently-assigned option id (pre-selected; Confirm stays disabled until changed). */
  currentId?: string;
  searchPlaceholder?: string;
  confirmLabel?: string;
  onConfirm: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}

// Same deterministic multi-hue palette + hash as `plan-monitoring.tsx`'s
// `hashAvatarColor` — a resource-picker avatar is a per-person identity
// marker, not brand chrome, so an unset `avatarColor` no longer falls back
// to `var(--primary)` (2026-08-31 role-separation fix, user-directed).
const AVATAR_PALETTE = [
  'var(--chart-accent-cyan)',
  'var(--chart-accent-purple)',
  'var(--chart-accent-teal)',
  'var(--chart-accent-pink)',
  'var(--status-info)',
  'var(--chart-accent-yellow)',
];
function hashAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function Initials({ name, color }: { name: string; color?: string }) {
  const resolvedColor = color ?? hashAvatarColor(name);
  return <span className="grid size-8 shrink-0 place-items-center rounded-full text-caption font-semibold text-white" style={{ background: resolvedColor }}>{name}</span>;
}

export function ChangeResourceSheet({
  open, title, subtitle, options, currentId, searchPlaceholder = 'Search…',
  confirmLabel = 'Confirm', onConfirm, onOpenChange,
}: ChangeResourceSheetProps) {
  const [query, setQuery] = React.useState('');
  const [sel, setSel] = React.useState<string | undefined>(currentId);

  // reset selection each time the sheet opens
  React.useEffect(() => { if (open) { setSel(currentId); setQuery(''); } }, [open, currentId]);

  const q = query.trim().toLowerCase();
  const list = options.filter((o) => !q || `${o.label} ${o.meta ?? ''} ${o.status ?? ''}`.toLowerCase().includes(q));
  const dirty = sel != null && sel !== currentId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="min(440px, 94vw)" className="p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <p className="text-body-sm text-muted-foreground">{subtitle}</p>}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="relative mb-3">
            <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="pl-8" />
          </div>

          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto px-1">
            {list.map((o) => {
              const active = sel === o.id;
              const isCurrent = o.id === currentId;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => setSel(o.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                    active ? 'border-primary bg-primary/[0.05]' : 'border-border hover:bg-muted/40',
                    o.disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {o.avatar ? <Initials name={o.avatar} color={o.avatarColor} />
                    : o.icon ? <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">{o.icon}</span>
                      : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 truncate text-body-sm font-semibold text-foreground">
                      {o.label}
                      {isCurrent && <span className="rounded bg-muted px-1.5 py-0.5 text-caption font-medium uppercase text-muted-foreground">Current</span>}
                    </span>
                    {o.meta && <span className="truncate text-body-xs text-muted-foreground">{o.meta}</span>}
                  </span>
                  {o.status && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-caption font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${o.statusTone ?? 'var(--status-success)'} 14%, transparent)`, color: o.statusTone ?? 'var(--status-success)' }}>{o.status}</span>
                  )}
                  <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', active ? 'border-primary' : 'border-border')}>{active && <span className="size-2 rounded-full bg-primary" />}</span>
                </button>
              );
            })}
            {!list.length && <p className="py-8 text-center text-body-sm text-muted-foreground">No matches.</p>}
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!dirty} onClick={() => { if (sel) onConfirm(sel); }}>{confirmLabel}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
