import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Pin, PinOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { useKanbanBoardContext } from './kanban-board';

export interface KanbanColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stage / column id. REQUIRED for @dnd-kit drop targeting. */
  id: string;
  label: string;
  color?: string;
  count?: number;
  aggregateMetric?: { value: React.ReactNode; tooltip?: string };
  pinned?: boolean;
  onPinToggle?: () => void;
  onAdd?: () => void;
  width?: string;
  /** IDs of cards rendered inside this column — required so DnDKit can sort them. */
  cardIds?: string[];
  /**
   * `plain` (default) — dot + label header on a muted column.
   * `board` — Truemax production board: 4px colored top-border, tinted column,
   * white header card, colored count badge.
   */
  variant?: 'plain' | 'board';
  /** Column background tint (board variant). */
  tint?: string;
  /** Count-badge background / text (board variant). */
  counterBg?: string;
  counterText?: string;
  children?: React.ReactNode;
}

/**
 * KanbanColumn — header strip + body slot for cards. Pattern #26 + #33.
 *
 * Registers itself with the parent KanbanBoard's DndContext as a droppable
 * (so empty columns still accept cards) AND wraps its children in a
 * SortableContext so cards within can be reordered.
 */
export const KanbanColumn = React.forwardRef<HTMLDivElement, KanbanColumnProps>(
  (
    {
      className, id, label, color, count, aggregateMetric, pinned, onPinToggle, onAdd,
      width = '280px', cardIds, variant = 'plain', tint, counterBg, counterText, children, ...props
    },
    ref
  ) => {
    // Rule-aware drop state (Pipeline V5): while a card is dragging and the board
    // knows the legal target stages, columns outside that set are blocked
    // (drop disabled + dimmed) and columns inside it are highlighted.
    const { activeId, allowedStageIds } = useKanbanBoardContext();
    const ruleActive = !!activeId && allowedStageIds !== null;
    const isAllowed = !ruleActive || (allowedStageIds as string[]).includes(id);
    const isBlocked = ruleActive && !isAllowed;

    const { isOver, setNodeRef } = useDroppable({
      id,
      data: { type: 'column', stageId: id },
      disabled: isBlocked,
    });

    // Infer card ids from children if not explicitly passed.
    const resolvedCardIds = React.useMemo(() => {
      if (cardIds && cardIds.length > 0) return cardIds;
      const ids: string[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const cid = (child.props as any).id;
          if (cid) ids.push(String(cid));
        }
      });
      return ids;
    }, [cardIds, children]);

    const board = variant === 'board';

    const header = board ? (
      /* Truemax production header: white card + 4px colored top-border + colored count badge */
      <div className="relative h-[42px] w-full shrink-0">
        <div className="flex size-full items-center justify-between rounded-[6px] border border-border bg-card px-2 pb-2.5 pt-3">
          <div className="flex items-center gap-1">
            <span className="whitespace-nowrap text-body-sm font-semibold text-foreground">{label}</span>
            {typeof count === 'number' ? (
              <span
                className="inline-flex min-w-[22px] items-center justify-center rounded-[18px] px-1 py-1.5 text-caption font-extrabold leading-[14px]"
                style={{ backgroundColor: counterBg ?? 'var(--secondary)', color: counterText ?? 'var(--primary)' }}
              >
                {count}
              </span>
            ) : null}
          </div>
          {aggregateMetric ? (
            <span className="text-caption tabular-nums text-muted-foreground" title={aggregateMetric.tooltip}>
              {aggregateMetric.value}
            </span>
          ) : null}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[6px] border-t-4 border-solid"
          style={{ borderColor: color ?? 'var(--border)' }}
        />
      </div>
    ) : (
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: color ?? 'var(--gray-400)' }}
        />
        <span className="text-caption font-semibold uppercase tracking-wide text-foreground">{label}</span>
        {typeof count === 'number' ? (
          <Badge variant="outline" size="xs" className="ml-1">{count}</Badge>
        ) : null}
        {aggregateMetric ? (
          <span className="ml-2 text-caption tabular-nums text-muted-foreground" title={aggregateMetric.tooltip}>
            {aggregateMetric.value}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-0.5">
          {onPinToggle ? (
            <Button variant="ghost" size="icon" className="size-7" onClick={onPinToggle} title={pinned ? 'Unpin' : 'Pin'}>
              {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </Button>
          ) : null}
          {onAdd ? (
            <Button variant="ghost" size="icon" className="size-7" onClick={onAdd} title="Add">
              <Plus className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    );

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        data-slot="kanban-column"
        data-stage-id={id}
        className={cn(
          'flex shrink-0 flex-col transition-all',
          board ? 'gap-3 rounded-[6px] p-2' : 'rounded-lg bg-muted/40',
          // Highlight a legal drop target while dragging…
          ruleActive && isAllowed && 'ring-2 ring-primary/40',
          isOver && isAllowed && (board ? 'ring-2 ring-primary' : 'bg-secondary/40 ring-2 ring-primary'),
          // …and dim + disable the illegal ones.
          isBlocked && 'opacity-40 saturate-50',
          className
        )}
        aria-disabled={isBlocked || undefined}
        style={board ? { backgroundColor: tint ?? 'var(--muted)', minWidth: '306px', width } : { width }}
        {...props}
      >
        {header}
        <SortableContext items={resolvedCardIds} strategy={verticalListSortingStrategy}>
          <div className={cn('flex-1 overflow-y-auto', board ? 'w-full space-y-4' : 'space-y-2 p-2')}>
            {children}
          </div>
        </SortableContext>
      </div>
    );
  }
);
KanbanColumn.displayName = 'KanbanColumn';
