import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { cn } from '../utils/cn';

/**
 * KanbanBoard — horizontal scroll container for KanbanColumn children.
 *
 * Drag-and-drop is now powered by `@dnd-kit/core` + `@dnd-kit/sortable` (the
 * native HTML5 DnD path was retired due to inconsistent touch + a11y support).
 *
 * KanbanColumn registers itself with the board as a droppable; KanbanCard
 * registers as a sortable item with a `data.stageId` payload. On drop, the
 * board emits BOTH:
 *
 *   - `onCardMove(cardId, fromStageId, toStageId)`  — preferred Stage-4 signature
 *   - `onDropToColumn(toStageId, cardId)`           — back-compat (kept so
 *                                                     existing consumers
 *                                                     continue to work)
 *
 * Cards rendered inside the board are wrapped in a Drag Overlay during drag
 * so the original DOM position keeps its layout slot (and so we can render
 * a slight shadow lift). Auto-scroll near the board edges is provided by
 * DndKit out of the box.
 */
export interface KanbanBoardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Back-compat handler — fires with (toStageId, cardId). */
  onDropToColumn?: (columnId: string, cardId: string) => void;
  /** Preferred Stage-4 handler — fires with (cardId, fromStageId, toStageId). */
  onCardMove?: (cardId: string, fromStageId: string, toStageId: string) => void;
  /** Optional renderer for the DragOverlay preview. Defaults to a faint shadow card. */
  renderDragOverlay?: (activeId: string) => React.ReactNode;
  /**
   * Legal target stages for a card (from the rule engine). When provided, on drag
   * the board highlights allowed columns, blocks (disables drop on) the rest, and
   * rejects an illegal drop. Return `null`/undefined to disable highlighting for
   * that card (all columns droppable — back-compat default).
   */
  getAllowedStages?: (cardId: string) => string[] | null | undefined;
}

/**
 * Context exposed to KanbanColumn / KanbanCard so they can resolve the
 * shared DndContext sensors without each consumer re-wiring boilerplate.
 */
interface KanbanBoardCtxValue {
  activeId: string | null;
  /**
   * Stages the dragging card may legally move to (incl. its own stage), or `null`
   * when no rule info is available (every column stays droppable — the default).
   */
  allowedStageIds: string[] | null;
}
const KanbanBoardCtx = React.createContext<KanbanBoardCtxValue>({ activeId: null, allowedStageIds: null });
export const useKanbanBoardContext = () => React.useContext(KanbanBoardCtx);

export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(
  ({ className, children, onDropToColumn, onCardMove, renderDragOverlay, getAllowedStages, ...props }, ref) => {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [allowedStageIds, setAllowedStageIds] = React.useState<string[] | null>(null);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: { distance: 4 },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    const handleDragStart = (e: DragStartEvent) => {
      const cardId = String(e.active.id);
      setActiveId(cardId);
      const allowed = getAllowedStages?.(cardId);
      if (allowed) {
        // Always include the card's own stage so reordering / dropping back is
        // never treated as a blocked move.
        const fromStageId = (e.active.data.current as any)?.stageId as string | undefined;
        setAllowedStageIds(Array.from(new Set([...allowed, ...(fromStageId ? [fromStageId] : [])])));
      } else {
        setAllowedStageIds(null);
      }
    };

    const reset = () => {
      setActiveId(null);
      setAllowedStageIds(null);
    };

    const handleDragEnd = (e: DragEndEvent) => {
      const allowed = allowedStageIds;
      reset();
      const { active, over } = e;
      if (!over) return;
      const cardId = String(active.id);
      const fromStageId = (active.data.current as any)?.stageId as string | undefined;
      // `over` may be a column (droppable) or another card. Resolve target stage.
      const overData = over.data.current as any;
      const toStageId =
        (overData?.type === 'column' ? overData.stageId : overData?.stageId) ??
        String(over.id);
      if (!toStageId) return;
      if (fromStageId && fromStageId === toStageId && active.id === over.id) return;
      // Belt-and-suspenders: never fire a move to a stage the rules disallow (a
      // card inside a blocked column can still be an `over` target). The runtime
      // also enforces this, so this just keeps the UI honest.
      if (allowed && !allowed.includes(toStageId)) return;
      onCardMove?.(cardId, fromStageId ?? '', toStageId);
      onDropToColumn?.(toStageId, cardId);
    };

    return (
      <KanbanBoardCtx.Provider value={{ activeId, allowedStageIds }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={reset}
        >
          <div
            ref={ref}
            data-slot="kanban-board"
            className={cn('flex h-full gap-3 overflow-x-auto p-3', className)}
            {...props}
          >
            {children}
          </div>
          <DragOverlay dropAnimation={{ duration: 200 }}>
            {activeId ? (
              renderDragOverlay ? (
                renderDragOverlay(activeId)
              ) : (
                <div
                  aria-hidden
                  className="pointer-events-none rounded-lg border border-border bg-card p-3 shadow-elevation opacity-95"
                  style={{ width: 260 }}
                >
                  <div className="text-xs text-muted-foreground">Moving card…</div>
                </div>
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      </KanbanBoardCtx.Provider>
    );
  }
);
KanbanBoard.displayName = 'KanbanBoard';
