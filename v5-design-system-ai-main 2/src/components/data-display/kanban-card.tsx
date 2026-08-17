import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Hash, Flag, Container, Tag as TagIcon, Clock, MapPin } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../utils/cn';
import { DowntimeBadge } from './downtime-badge';

/**
 * KanbanCard — Pattern #26 — Truemax production-exact.
 *
 * Source of truth: `_unpacked/truemax/src/app/components/kanban-card.tsx`.
 * Spec: `kanban-card.spec.md` (co-located).
 *
 * Card chrome:
 *   - bg-card, 1px border-border, rounded-[6px], 16px padding all sides
 *   - 16px gap between top section / downtime badge / footer
 *
 * Top section (gap 6px):
 *   - Badge row: WO-ID (bg-border, gray-200) + Priority (flag icon + colored) + Type
 *     all rounded-[2px] sharp corners, 10-12px uppercase 600 weight
 *   - Title (16px bold 700, ellipsis whitespace-nowrap)
 *   - Metadata icon chips (Equipment Name, Equipment ID, Meter, Location)
 *
 * Downtime badge (conditional, 3 visual scenarios — DowntimeBadge primitive)
 *
 * Footer (16px top padding, border-t):
 *   - Left: 24×24 colored circle with SINGLE letter (not initials)
 *   - Right: Calendar icon + date (destructive red + 600 weight when overdue)
 */

export type PriorityConfig = {
  /** Background color hex for the priority chip. */
  bg: string;
  /** Text color hex. */
  text: string;
  /** Flag icon fill color. */
  flagFill: string;
  /** Flag icon stroke color. */
  flagStroke: string;
};

export type TypeConfig = {
  bg: string;
  text: string;
};

export type AvatarTuple = {
  /** Single uppercase letter shown in the circle (NOT initials). */
  letter: string;
  /** Background color of the circle. */
  color: string;
};

export interface KanbanCardMetadataField {
  /** Icon name from lucide-react (e.g. "Container", "Tag", "Clock", "MapPin") OR a React node. */
  icon?: string | React.ReactNode;
  /** Label text. */
  value: React.ReactNode;
}

export interface KanbanCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'id'> {
  /** Sortable id; omit for purely-visual cards (e.g. drag overlay). */
  id?: string;
  /** Stage id for DnD parent-tracking. */
  stageId?: string;
  /** Zone id for hybrid/map grouping — tracked by the parent, never spread to the DOM. */
  zoneId?: string;

  // ── Top section ────────────────────────────────────────
  /** WO-ID or display id, rendered in the leftmost badge. */
  ticketId?: string;
  /** Priority label, rendered with flag icon. */
  priority?: string;
  /** Priority colors (from PRIORITY_CONFIG lookup). */
  priorityConfig?: PriorityConfig;
  /** Maintenance / category type label, rendered as the second chip. */
  type?: string;
  /** Type colors (from MAINTENANCE_TYPE_CONFIG lookup). */
  typeConfig?: TypeConfig;
  /** Card title (16px bold). */
  title?: React.ReactNode;
  /** Optional metadata fields (Equipment Name / ID / Meter / Location). */
  metadataFields?: KanbanCardMetadataField[];
  /** Optional cover image (e.g. first uploaded task image). Rendered as a banner
   *  between the text content and the footer when `showImage` is not false. */
  imageUrl?: string;
  /** Board-level display toggle. When false, the cover image is hidden (data-only
   *  view) even if `imageUrl` is present. Defaults to true. */
  showImage?: boolean;

  // ── Downtime ───────────────────────────────────────────
  downtimeEnabled?: boolean;
  downtimeStart?: string;
  downtimeEnd?: string;

  // ── Footer ─────────────────────────────────────────────
  /** Assigned avatar (single-letter circle). */
  assignedAvatar?: AvatarTuple | null;
  /**
   * Multiple avatars (e.g. assignee + owner), rendered as an overlapping stack
   * on the footer-left. Takes precedence over `assignedAvatar` when non-empty.
   */
  avatars?: AvatarTuple[];
  /** Fallback avatar when no assignment yet. */
  defaultAvatar?: AvatarTuple;
  /** When true + no `assignedAvatar`, renders the unassigned-pop trigger. */
  isUnassigned?: boolean;
  /** Slot for an unassigned-flow button (typically opens an assign popover). */
  unassignedSlot?: React.ReactNode;
  /** Due date label. */
  dateLabel?: string;
  /** When true, date renders in destructive red + 600 weight. */
  isOverdue?: boolean;
  /** Optional inline card actions (e.g. approve / reject) rendered in a bordered
   *  row at the card bottom. Additive — cards without it are unchanged. */
  actions?: React.ReactNode;

  size?: 'compact' | 'default' | 'wide';
  selected?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Container,
  Tag: TagIcon,
  Clock,
  MapPin,
  Hash,
};

function resolveIcon(icon?: string | React.ReactNode, size = 12, color = 'var(--muted-foreground)'): React.ReactNode {
  if (!icon) return null;
  if (typeof icon === 'string') {
    const Cmp = ICON_MAP[icon] ?? (LucideIcons as any)[icon];
    if (Cmp) return <Cmp size={size} style={{ color }} />;
    return null;
  }
  return icon;
}

export const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard(
    {
      className,
      id,
      stageId,
      zoneId,
      ticketId,
      priority,
      priorityConfig,
      type,
      typeConfig,
      title,
      metadataFields,
      imageUrl,
      showImage = true,
      downtimeEnabled,
      downtimeStart,
      downtimeEnd,
      assignedAvatar,
      avatars,
      defaultAvatar,
      isUnassigned,
      unassignedSlot,
      dateLabel,
      isOverdue,
      actions,
      size = 'default',
      selected,
      ...rest
    },
    ref,
  ) {
    const sortable = useSortable({
      id: id ?? '__inert__',
      data: { stageId, type: 'card' },
      disabled: !id,
    });
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = sortable;

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0 : undefined,
    };

    const displayAvatar = assignedAvatar ?? defaultAvatar;
    const showUnassigned = isUnassigned && !assignedAvatar;

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        className={cn(
          'group relative w-full rounded-[6px] border border-border bg-card transition-shadow',
          'hover:shadow-sm',
          selected && 'ring-2 ring-primary',
          isDragging && 'cursor-grabbing',
          !isDragging && id && 'cursor-grab',
          className,
        )}
        {...(id ? attributes : {})}
        {...(id ? listeners : {})}
        {...rest}
      >
        <div className={cn(
          'flex w-full flex-col gap-4 p-4',
          size === 'compact' && 'p-3 gap-3',
          size === 'wide' && 'p-5',
        )}>
          {/* TOP SECTION ─────────────────────────────────── */}
          <div className="flex w-full flex-col items-start gap-1.5">
            {/* Badge row — id (+ type) on the left, priority pinned to the right */}
            <div className="flex w-full items-start justify-between gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {ticketId ? (
                  <div className="inline-flex h-5 items-center gap-1 rounded-[2px] px-2 py-1 bg-border">
                    <Hash size={11} className="text-muted-foreground" />
                    <span className="text-caption font-semibold uppercase leading-none text-muted-foreground">
                      {ticketId}
                    </span>
                  </div>
                ) : null}
                {type && typeConfig ? (
                  <div
                    className="inline-flex items-center rounded-[2px] px-2 py-1"
                    style={{ background: typeConfig.bg }}
                  >
                    <span
                      className="text-caption font-semibold uppercase leading-none"
                      style={{ color: typeConfig.text }}
                    >
                      {type}
                    </span>
                  </div>
                ) : null}
              </div>
              {priority && priorityConfig ? (
                <div
                  className="inline-flex shrink-0 items-center gap-1 rounded-[2px] px-2 py-1"
                  style={{ background: priorityConfig.bg }}
                >
                  <Flag
                    size={11}
                    style={{ color: priorityConfig.flagStroke, fill: priorityConfig.flagFill }}
                    strokeWidth={2.2}
                  />
                  <span
                    className="text-caption font-semibold uppercase leading-none"
                    style={{ color: priorityConfig.text }}
                  >
                    {priority}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Title (wraps) + stacked metadata rows with leading icons */}
            <div className="flex w-full flex-col items-start gap-2 mt-1">
              {title ? (
                <p className="w-full text-body-md font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
                  {title}
                </p>
              ) : null}
              {metadataFields && metadataFields.length > 0 ? (
                <div className="flex w-full flex-col items-start gap-1.5">
                  {metadataFields.map((field, i) => (
                    <div key={i} className="inline-flex max-w-full items-center gap-1.5">
                      {resolveIcon(field.icon, 15)}
                      <span className="truncate text-body-sm font-medium leading-[18px] text-muted-foreground">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* COVER IMAGE (conditional — first uploaded task image) ─── */}
          {imageUrl && showImage ? (
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="w-full rounded-[6px] border border-border object-cover"
              style={{ height: size === 'compact' ? 96 : size === 'wide' ? 168 : 132 }}
            />
          ) : null}

          {/* DOWNTIME BADGE (conditional) ─────────────────── */}
          {downtimeEnabled && downtimeStart ? (
            <DowntimeBadge start={downtimeStart} end={downtimeEnd} />
          ) : null}

          {/* FOOTER ──────────────────────────────────────── */}
          <div className="relative flex w-full items-center justify-between pt-4">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 border-t border-border"
            />
            <div className="flex items-center">
              {avatars && avatars.length > 0 ? (
                <div className="flex items-center -space-x-1.5">
                  {avatars.map((a, i) => (
                    <div
                      key={i}
                      className="inline-flex size-7 items-center justify-center overflow-hidden rounded-full ring-2 ring-card"
                      style={{ background: a.color }}
                      title={a.letter}
                    >
                      <span className="text-caption font-semibold leading-none text-white">
                        {a.letter}
                      </span>
                    </div>
                  ))}
                </div>
              ) : showUnassigned ? (
                unassignedSlot ?? <DefaultUnassignedDot />
              ) : displayAvatar ? (
                <div
                  className="inline-flex size-6 items-center justify-center overflow-hidden rounded-full"
                  style={{ background: displayAvatar.color }}
                >
                  <span className="text-caption font-semibold leading-none text-white">
                    {displayAvatar.letter}
                  </span>
                </div>
              ) : null}
            </div>
            {dateLabel ? (
              <div className="inline-flex items-center gap-1">
                <Calendar
                  size={14}
                  style={{ color: isOverdue ? 'var(--destructive)' : 'var(--muted-foreground)' }}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-caption leading-[14px]',
                    isOverdue ? 'font-semibold text-destructive' : 'font-medium text-card-foreground',
                  )}
                >
                  {dateLabel}
                </span>
              </div>
            ) : null}
          </div>

          {/* ACTIONS ROW (conditional — inline card actions) ─── */}
          {actions ? (
            <div
              className="flex w-full items-center gap-2 border-t border-border pt-3"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

KanbanCard.displayName = 'KanbanCard';

function DefaultUnassignedDot() {
  return (
    <div
      className="inline-flex size-6 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/50"
      title="Unassigned"
      aria-label="Unassigned"
    >
      <span className="text-caption font-bold text-muted-foreground">?</span>
    </div>
  );
}
