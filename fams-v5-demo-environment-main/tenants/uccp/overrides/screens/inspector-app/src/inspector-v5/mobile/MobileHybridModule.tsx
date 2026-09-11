import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { MapRoute, MapViewHandle, MapZone } from '@ds/components/map/types';
import { MapCanvas, type CanvasMarkerInput } from '../components/MapCanvas';
import { MobileSheetHeader, MobileDetailSheetHeader } from './MobileSheetHeader';
import { MobileDetailTabs } from './MobileDetailTabs';
import { useDragSheet } from './useDragSheet';
import type { DragProps } from './MobileCards';

/** LIST sheet (sheet #1) — old app's queue/task-list sheet: a compact PEEK
 *  prompt (grabber + one "Swipe up to view …" line, nothing else — no teased
 *  list underneath) and a HALF state that reveals a search field over the
 *  full scrollable list. This is the module's persistent resting sheet; it
 *  never disappears. */
type ListSnap = 'half' | 'peek';
const LIST_PEEK_PX = 96;
const LIST_HALF_PCT = 86;

/** DETAIL sheet (sheet #2) — stacked ABOVE the list sheet whenever an item is
 *  selected: PEEK (compact card) → OVERVIEW (80%, details) → FULL (100%,
 *  MobileDetailTabs). Dragging past PEEK toward the bottom (overdrag) closes
 *  it back down to the list sheet, restoring whatever snap the list sheet
 *  was at before the item was selected. */
type DetailSnap = 'full' | 'overview' | 'peek';
const DETAIL_PEEK_PX = 150;
const DETAIL_OVERVIEW_PCT = 80;

export interface PeekContext {
  onExpand: () => void;
  onClose: () => void;
  dragProps: DragProps;
}

export interface OverviewContext {
  onViewFull: () => void;
}

export interface MobileHybridModuleProps<T> {
  title: string;
  items: T[];
  getId: (item: T) => string;
  /** Record title shown in the full-screen mobile detail header. Defaults
   *  to the module `title` when not provided. */
  getItemTitle?: (item: T) => string;
  getCenter?: (item: T) => [number, number] | undefined;
  /** Free-text haystack for the HALF-state search field (old shell's queue
   *  search). Search is hidden when this is not supplied. */
  getSearchText?: (item: T) => string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  markers: CanvasMarkerInput[];
  /** Extra map layers (e.g. a selected plan's live tanker/incident/discharge
   *  overlay scene — see `PlanMapScene.tsx`). Optional; unused by modules
   *  that only ever show plain dot markers (Requests). */
  zones?: MapZone[];
  routes?: MapRoute[];
  selectedId: string | null;
  onSelectItem: (id: string | null) => void;
  /** Sheet #1 list row (mobile-dense card). */
  renderListCard: (item: T, selected: boolean, onTap: () => void) => ReactNode;
  /** Sheet #2 PEEK slot — the compact selected-asset card. */
  renderPeek: (item: T, ctx: PeekContext) => ReactNode;
  /** Sheet #2 OVERVIEW slot — key stats + bottom action stack. */
  renderOverview: (item: T, ctx: OverviewContext) => ReactNode;
  renderDetails: (item: T) => ReactNode;
  renderTimeline: (item: T) => ReactNode;
  renderRelatedTasks: (item: T) => ReactNode;
}

/** Tap-through backdrop behind a sheet once it's past its resting snap —
 *  ported verbatim from the old app's `SheetScrim`: a translucent scrim that
 *  collapses the sheet in front of it back to its resting snap on tap. */
function SheetScrim({ show, onTap, z }: { show: boolean; onTap: () => void; z: number }) {
  return (
    <div
      onClick={show ? onTap : undefined}
      aria-hidden={!show}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: z,
        background: 'rgba(0,0,0,0.3)',
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
        transition: 'opacity 200ms ease',
      }}
    />
  );
}

/**
 * MobileHybridModule — generic mobile "map behind + drag sheets in front"
 * module, shared by Requests and Plans. Replicates the OLD
 * InspectorMobileShell's two-STACKED-SHEET architecture AND its visual
 * chrome: 28px sheet corners, `var(--muted)` list sheet over white cards,
 * `0 -8px 24px` / `0 -10px 28px` sheet shadows, the centered 20px
 * "Swipe up …" PEEK prompt, the 44px search field at HALF, and the detail
 * sheet's `[X | grabber | chevron]` header at every snap.
 *
 * LIST sheet (open → closed): 'half' (86% of module height, scrollable list)
 * → 'peek' (96px, grabber + "Swipe up to view …" prompt only).
 *
 * DETAIL sheet (open → closed), stacked above the list sheet only while
 * `selectedId` is set: 'full' (offset 0, MobileDetailTabs) → 'overview' (80%,
 * compact card + key stats + actions) → 'peek' (150px, compact card only).
 * Overdragging past 'peek' deselects the item and closes the detail sheet.
 */
export function MobileHybridModule<T>({
  title,
  items,
  getId,
  getItemTitle,
  getCenter,
  getSearchText,
  searchPlaceholder = 'Search',
  emptyTitle = 'Nothing to show yet',
  emptySubtitle = 'New records will appear here.',
  markers,
  zones,
  routes,
  selectedId,
  onSelectItem,
  renderListCard,
  renderPeek,
  renderOverview,
  renderDetails,
  renderTimeline,
  renderRelatedTasks,
}: MobileHybridModuleProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapViewHandle>(null);
  const [containerH, setContainerH] = useState(0);
  const [search, setSearch] = useState('');

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setContainerH(h);
    });
    ro.observe(el);
    setContainerH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  const selectedItem = selectedId != null ? items.find((it) => getId(it) === selectedId) : undefined;

  const visibleItems = useMemo(() => {
    if (!getSearchText || !search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((it) => getSearchText(it).toLowerCase().includes(q));
  }, [items, search, getSearchText]);

  const [listSnap, setListSnap] = useState<ListSnap>('peek');
  const [detailSnap, setDetailSnap] = useState<DetailSnap>('peek');
  // Item 1 (old app parity) — selecting an item collapses the list sheet to
  // 'peek' so only the compact detail card + zoomed map are visible, never
  // two stacked open sheets. Remember the snap the list was in right before
  // collapsing so closing the detail card restores it.
  const prevListSnapRef = useRef<ListSnap>('peek');

  useEffect(() => {
    if (selectedId != null) {
      setDetailSnap('peek');
      setListSnap((prev) => {
        if (prev !== 'peek') prevListSnapRef.current = prev;
        return 'peek';
      });
    }
  }, [selectedId]);

  const listOffsetPx = (s: ListSnap) => (s === 'half' ? containerH * (1 - LIST_HALF_PCT / 100) : containerH - LIST_PEEK_PX);
  const listSheet = useDragSheet<ListSnap>({
    snaps: ['half', 'peek'],
    offsetPx: listOffsetPx,
    snap: listSnap,
    setSnap: setListSnap,
    contentH: containerH,
  });
  const cycleList = () => setListSnap((s) => (s === 'peek' ? 'half' : 'peek'));

  const detailOffsetPx = (s: DetailSnap) =>
    s === 'full' ? 0 : s === 'overview' ? containerH * (1 - DETAIL_OVERVIEW_PCT / 100) : containerH - DETAIL_PEEK_PX;

  const handleDeselect = () => {
    onSelectItem(null);
    setListSnap(prevListSnapRef.current);
  };

  const detailSheet = useDragSheet<DetailSnap>({
    snaps: ['full', 'overview', 'peek'],
    offsetPx: detailOffsetPx,
    snap: detailSnap,
    setSnap: setDetailSnap,
    contentH: containerH,
    onOverdrag: handleDeselect,
  });

  const detailDragProps: DragProps = {
    onPointerDown: detailSheet.onPointerDown,
    onPointerMove: detailSheet.onPointerMove,
    onPointerUp: detailSheet.onPointerUp,
    onPointerCancel: detailSheet.onPointerCancel,
  };

  const handleTap = (item: T) => {
    onSelectItem(getId(item));
    setDetailSnap('peek');
    const center = getCenter?.(item);
    if (center && mapRef.current) mapRef.current.flyTo(center, 13);
  };

  const handleMarkerSelect = (id: string) => {
    const item = items.find((it) => getId(it) === id);
    if (item) handleTap(item);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapCanvas
          ref={mapRef}
          markers={markers}
          zones={zones}
          routes={routes}
          selectedId={selectedId}
          onSelect={handleMarkerSelect}
          className="qmme-mobile-map"
        />
      </div>

      {/* Scrim behind the list sheet once it's past peek (half state). */}
      <SheetScrim show={listSnap === 'half'} onTap={() => setListSnap('peek')} z={1} />

      {/* SHEET #1 — LIST. */}
      <div
        ref={listSheet.ref}
        style={{
          ...listSheet.style,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          background: 'var(--muted)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -8px 24px rgba(16,24,40,0.14)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <div style={{ ...listSheet.innerStyle, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <MobileSheetHeader
            handleProps={listSheet.handleProps}
            onTap={cycleList}
            title={listSnap === 'half' ? title : undefined}
            count={listSnap === 'half' ? visibleItems.length : undefined}
          />
          {listSnap === 'peek' ? (
            <div
              {...listSheet.handleProps}
              onClick={cycleList}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 20px 10px',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--foreground)', textAlign: 'center' }}>
                Swipe up to view {title.toLowerCase()}
              </span>
            </div>
          ) : (
            <>
              {getSearchText ? (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 8px' }}>
                  <div style={{ position: 'relative', display: 'flex', flex: 1, alignItems: 'center' }}>
                    <Search
                      size={16}
                      style={{ pointerEvents: 'none', position: 'absolute', insetInlineStart: 12, color: 'var(--muted-foreground)' }}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={searchPlaceholder}
                      style={{
                        minHeight: 44,
                        width: '100%',
                        borderRadius: 'var(--ins-radius-sm)',
                        border: '1px solid var(--border)',
                        paddingInlineStart: 38,
                        paddingInlineEnd: 12,
                        background: 'var(--card)',
                        fontSize: 14,
                        color: 'var(--foreground)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              ) : null}
              <div
                className="fams-hide-scrollbar"
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  overflowY: 'auto',
                  padding: '0 20px 20px',
                }}
              >
                {visibleItems.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 0' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{emptyTitle}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{emptySubtitle}</span>
                  </div>
                ) : (
                  visibleItems.map((item) => {
                    const id = getId(item);
                    return <div key={id}>{renderListCard(item, id === selectedId, () => handleTap(item))}</div>;
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scrim behind the detail sheet once it's past peek (overview state);
          'full' is a separate full-bleed render that doesn't need one. */}
      <SheetScrim show={!!selectedItem && detailSnap === 'overview'} onTap={() => setDetailSnap('peek')} z={2} />

      {/* SHEET #2 — DETAIL, stacked above the list sheet only while an item
          is selected. ONE transformed sheet across all three snaps, same
          drag mechanics/easing in both directions, real drag handle at every
          stage (including full, so it can be pulled back down). */}
      {selectedItem && (
        <div
          ref={detailSheet.ref}
          style={{
            ...detailSheet.style,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: detailSnap === 'full' ? 4 : 2,
            background: 'var(--card)',
            borderTopLeftRadius: detailSnap === 'full' ? 0 : 28,
            borderTopRightRadius: detailSnap === 'full' ? 0 : 28,
            borderTop: '1px solid var(--border)',
            boxShadow: '0 -10px 28px rgba(16,24,40,0.18)',
            transition: `${detailSheet.style.transition}, border-radius 300ms cubic-bezier(0.32,0.72,0,1)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            touchAction: 'none',
          }}
        >
          <div style={{ ...detailSheet.innerStyle, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MobileDetailSheetHeader
              handleProps={detailSheet.handleProps}
              showClose={detailSnap !== 'peek'}
              onClose={handleDeselect}
              expanded={detailSnap === 'full'}
              fullBleed={detailSnap === 'full'}
              onToggleExpand={() =>
                setDetailSnap((s) => (s === 'peek' ? 'overview' : s === 'overview' ? 'full' : 'overview'))
              }
            />
            {detailSnap === 'full' ? (
              <MobileDetailTabs
                title={getItemTitle ? getItemTitle(selectedItem) : title}
                onBack={() => setDetailSnap('overview')}
                renderOverview={() => renderDetails(selectedItem)}
                renderTimeline={() => renderTimeline(selectedItem)}
                renderRelatedTasks={() => renderRelatedTasks(selectedItem)}
              />
            ) : detailSnap === 'overview' ? (
              renderOverview(selectedItem, { onViewFull: () => setDetailSnap('full') })
            ) : (
              renderPeek(selectedItem, {
                onExpand: () => setDetailSnap('overview'),
                onClose: handleDeselect,
                dragProps: detailDragProps,
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
