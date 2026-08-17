import * as React from 'react';
import { Check, X, Minus, ChevronDown, Camera, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * MaintenanceChecklist — category-driven inspection list.
 *
 * Source of truth: `_unpacked/truemax/src/app/components/ticket-detail.tsx`
 * MAINTENANCE_CHECKLISTS map. Spec: `maintenance-checklist.spec.md` (co-located).
 *
 * Renders a fixed 10-item inspection checklist for a given asset category.
 * Each item has 4 states (pending / passed / failed / n/a) + optional note
 * + optional photo.
 *
 * The list is data-driven via the `items` prop. Pass the category-matched
 * array (the parent looks it up from `MAINTENANCE_CHECKLISTS[category]` or
 * `MAINTENANCE_CHECKLISTS.Default`).
 */

export type ChecklistItemState = 'pending' | 'passed' | 'failed' | 'na';

export interface ChecklistItem {
  id: string;
  label: string;
  state?: ChecklistItemState;
  note?: string;
  photoUrl?: string;
}

export interface MaintenanceChecklistProps {
  /** Title shown above the list. Default "Maintenance Checklist". */
  title?: string;
  /** Category label rendered in the header (e.g. "Mixer Trucks"). */
  category?: string;
  /** The 10 inspection items for this category. */
  items: ChecklistItem[];
  /** Whether the user can change item state / add notes. Default true. */
  editable?: boolean;
  /** Called when an item's state changes. */
  onStateChange?: (itemId: string, state: ChecklistItemState) => void;
  /** Called when a note is added/edited. */
  onNoteChange?: (itemId: string, note: string) => void;
  /** Called when the user attaches a photo. */
  onPhotoAttach?: (itemId: string) => void;
  className?: string;
}

const STATE_CONFIG: Record<ChecklistItemState, {
  bg: string;
  border: string;
  iconColor: string;
  label: string;
  Icon: typeof Check;
}> = {
  pending: { bg: 'transparent',                                                    border: 'var(--border)',      iconColor: 'var(--muted-foreground)', label: 'Pending', Icon: Minus },
  passed:  { bg: 'color-mix(in srgb, var(--status-success) 10%, transparent)',      border: 'var(--status-success)', iconColor: 'var(--status-success)', label: 'Passed', Icon: Check },
  failed:  { bg: 'color-mix(in srgb, var(--status-error) 10%, transparent)',        border: 'var(--destructive)', iconColor: 'var(--destructive)',     label: 'Failed', Icon: X },
  na:      { bg: 'color-mix(in srgb, var(--muted-foreground) 10%, transparent)',    border: 'var(--muted-foreground)', iconColor: 'var(--muted-foreground)', label: 'N/A',   Icon: Minus },
};

export function MaintenanceChecklist({
  title = 'Maintenance Checklist',
  category,
  items,
  editable = true,
  onStateChange,
  onNoteChange,
  onPhotoAttach,
  className,
}: MaintenanceChecklistProps) {
  const [expanded, setExpanded] = React.useState(true);

  const passedCount = items.filter((i) => i.state === 'passed').length;
  const failedCount = items.filter((i) => i.state === 'failed').length;
  const naCount = items.filter((i) => i.state === 'na').length;
  const pendingCount = items.length - passedCount - failedCount - naCount;

  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card',
        className,
      )}
    >
      <header
        className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            !expanded && '-rotate-90',
          )}
        />
        <h3 className="flex-1 text-body-sm font-semibold text-foreground">
          {title}
          {category ? (
            <span className="ml-2 text-caption font-normal text-muted-foreground">· {category}</span>
          ) : null}
        </h3>
        <div className="flex items-center gap-1.5 text-caption">
          {passedCount > 0 && (
            <span className="rounded bg-success-50 px-1.5 py-0.5 font-semibold text-success-700">
              {passedCount} pass
            </span>
          )}
          {failedCount > 0 && (
            <span className="rounded bg-error-50 px-1.5 py-0.5 font-semibold text-error-700">
              {failedCount} fail
            </span>
          )}
          {naCount > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
              {naCount} n/a
            </span>
          )}
          {pendingCount > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">
              {pendingCount} todo
            </span>
          )}
        </div>
      </header>
      {expanded ? (
        <ol className="divide-y divide-border">
          {items.map((item, idx) => (
            <ChecklistRow
              key={item.id}
              item={item}
              index={idx + 1}
              editable={editable}
              onStateChange={onStateChange}
              onNoteChange={onNoteChange}
              onPhotoAttach={onPhotoAttach}
            />
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function ChecklistRow({
  item, index, editable, onStateChange, onNoteChange, onPhotoAttach,
}: {
  item: ChecklistItem;
  index: number;
  editable: boolean;
  onStateChange?: (id: string, state: ChecklistItemState) => void;
  onNoteChange?: (id: string, note: string) => void;
  onPhotoAttach?: (id: string) => void;
}) {
  const state = item.state ?? 'pending';
  const cfg = STATE_CONFIG[state];
  const [noteOpen, setNoteOpen] = React.useState(!!item.note);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-caption font-semibold text-muted-foreground"
        style={{ background: 'var(--muted)' }}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-foreground">{item.label}</p>
        {item.note ? (
          <p className="mt-1 text-caption text-muted-foreground">
            <MessageSquare size={11} className="mr-1 inline align-text-bottom" />
            {item.note}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {editable ? (
          (['passed', 'failed', 'na'] as ChecklistItemState[]).map((s) => {
            const sc = STATE_CONFIG[s];
            const isActive = state === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onStateChange?.(item.id, isActive ? 'pending' : s)}
                aria-label={`Mark ${sc.label}`}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md border transition-colors',
                  isActive ? 'shadow-sm' : 'hover:border-muted-foreground',
                )}
                style={{
                  background: isActive ? sc.bg : 'transparent',
                  borderColor: isActive ? sc.border : 'var(--border)',
                  color: isActive ? sc.iconColor : 'var(--muted-foreground)',
                }}
              >
                <sc.Icon size={13} strokeWidth={2.5} />
              </button>
            );
          })
        ) : (
          <span
            className="flex size-7 items-center justify-center rounded-md border"
            style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.iconColor }}
          >
            <cfg.Icon size={13} strokeWidth={2.5} />
          </span>
        )}
        {editable ? (
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            aria-label="Add note"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquare size={13} />
          </button>
        ) : null}
        {editable && onPhotoAttach ? (
          <button
            type="button"
            onClick={() => onPhotoAttach(item.id)}
            aria-label="Attach photo"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Camera size={13} />
          </button>
        ) : null}
      </div>
      {noteOpen && editable ? (
        <div className="mt-2 w-full basis-full">
          <input
            type="text"
            defaultValue={item.note ?? ''}
            placeholder="Add a note…"
            onBlur={(e) => onNoteChange?.(item.id, e.target.value)}
            className="w-full rounded-md border border-border bg-input-background px-2 py-1 text-caption text-foreground outline-none focus:border-primary"
          />
        </div>
      ) : null}
    </li>
  );
}
