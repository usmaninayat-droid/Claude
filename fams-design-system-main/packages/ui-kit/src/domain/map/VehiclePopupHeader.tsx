import { type CSSProperties, type ReactNode } from 'react'
import { ExternalLink, LocateFixed, Navigation, Pause, Square, X } from '../../icons'
import { cn } from '../../lib/cn'
import { VehicleIcon3D, type VehicleIcon3DArt } from './VehicleIcon3D'
import type { VehicleStatusTone } from './VehiclePopupCard'
import {
  BADGE_INSET,
  HEADER_ACTIONS_BOX,
  HEADER_BOX,
  LOCATION_MAX,
  META_TEXT,
  STATUS_TEXT,
  TILE_SIZE,
  TITLE_MAX,
  TITLE_TEXT,
  TONE_BADGE_BG,
  TONE_TEXT,
  TONE_TILE_BG,
} from './vehicle-popup-style'

/**
 * `VehiclePopupCard`'s 558×110 header (Figma 16:21380, 2026-08-30 board) — internal to the card,
 * not exported from the package barrel.
 *
 * Layout is pinned to Figma's absolute geometry: the 68×68 status-tinted tile
 * at (16,24) carrying the 3D vehicle art and a 16×16 status badge on its
 * bottom-END corner, then the title (y=27, 29 tall) / meta row (y=56, 14 tall,
 * ONE line) / status line (y=79) stack, then three 16px actions on a 24px
 * pitch at (478,24).
 *
 * The status row is TWO TEXT NODES ONLY (Figma 495:4223) — the red glyph that
 * reads before the status word is the tile badge sitting immediately to its
 * left, not a second icon. Don't "restore" a status-line glyph; that renders
 * two status marks.
 */

const TONE_BADGE_GLYPH: Record<VehicleStatusTone, ReactNode> = {
  success: <Navigation className="size-2 fill-current" strokeWidth={0} />,
  warning: <Pause className="size-2 fill-current" strokeWidth={0} />,
  error: <Square className="size-2 fill-current" strokeWidth={0} />,
  muted: <Square className="size-2 fill-current" strokeWidth={0} />,
}

export interface VehiclePopupHeaderProps {
  model: string
  plate: string
  /** @deprecated The 2026-08-30 board moved the driver to the Workforce tab;
   *  the header no longer renders it. Accepted for API compatibility. */
  driver?: string
  location: string
  status: string
  statusTone: VehicleStatusTone
  statusSince?: string
  /** Which `VehicleIcon3D` illustration fills the tile. @default 'car' */
  art?: VehicleIcon3DArt
  /**
   * Custom art CONTENT replacing `VehicleIcon3D` inside the tile (workforce
   * popup: the vendored avatar art). The 68×70 status-tinted tile AND the
   * 16×16 corner badge coin still paint from `statusTone`, exactly as for
   * the 3D vehicle art (2026-09-01 fix — the workforce header was missing
   * both the tile and, briefly in an earlier pass, the badge; the reference
   * design shows tile + avatar + one status coin, same as the vehicle
   * header). `art` is what stops applying — the caller's node is the
   * rendered art in its place. The badge coin sits ON TOP of the art, so
   * it covers rather than doubles any status glyph the art itself might
   * bake into that same corner.
   */
  artNode?: ReactNode
  /**
   * Custom meta row replacing the plate/location pair (workforce popup:
   * a briefcase + designation line per Figma 3439:6849). Caller-owned nodes;
   * the row's single-line overflow behavior is preserved by the wrapper.
   */
  meta?: ReactNode
  /**
   * Class override for the status WORD's color — for statuses whose accent
   * sits outside the 4-tone vocabulary (workforce "Clocked In" blue). Wins
   * over `statusTone`'s text class only; `statusSince` stays grey.
   */
  statusClassName?: string
  /** Id the card's `aria-labelledby` points at. */
  titleId: string
  onClose?: () => void
  onLocate?: () => void
  onExpand?: () => void
  /**
   * Whether the map is actively following this vehicle (the "Center on
   * vehicle" action's own toggled state) — the ONLY thing that should tint
   * that glyph primary. Defaults to `false`: at rest all three header
   * actions render the same muted glyph (A21). Previously this button
   * carried a hardcoded `text-primary` unconditionally, which read as a
   * stuck focus ring/active state next to its two plain siblings.
   */
  locating?: boolean
  /** Extra control rendered BEFORE the locate/expand/close trio — the slot for
   *  an overflow menu of remote commands. Caller-owned trigger + menu. */
  overflow?: ReactNode
}

export function VehiclePopupHeader({
  model,
  plate,
  location,
  status,
  statusTone,
  statusSince,
  art = 'car',
  artNode,
  meta,
  statusClassName,
  titleId,
  onClose,
  onLocate,
  onExpand,
  locating = false,
  overflow,
}: VehiclePopupHeaderProps) {
  return (
    <div
      data-slot="vehicle-popup-header"
      style={HEADER_BOX}
      className="relative flex shrink-0 items-start gap-3 border-b border-border"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {/* 68×68 status-tinted tile + art (3D vehicle art, or the caller's
            `artNode` — e.g. the workforce avatar) + 16×16 badge coin at
            bottom-end, on TOP of the tile — same tile/badge cluster for
            both art sources (2026-09-01 fix: the badge coin is the single
            status mark on the tile; it sits above whatever the art itself
            draws in that corner, so a baked-in dot on the caller's own art,
            if any, ends up covered rather than doubled — the art asset
            itself is never altered here). */}
        <div className="relative shrink-0">
          <div
            style={TILE_SIZE}
            className={cn('grid place-items-center rounded', TONE_TILE_BG[statusTone])}
          >
            {artNode ?? <VehicleIcon3D size="md" art={art} />}
          </div>
          <span
            aria-hidden="true"
            data-slot="vehicle-popup-status-badge"
            style={BADGE_INSET}
            className={cn(
              'absolute grid size-4 place-items-center rounded-full text-white ring-2 ring-card',
              TONE_BADGE_BG[statusTone],
            )}
          >
            {TONE_BADGE_GLYPH[statusTone]}
          </span>
        </div>

        {/* Title · meta · status. */}
        <div className="flex min-w-0 flex-col pt-0.5">
          {/* The title is the only line of this column that shares its band
              with the actions, so it is the only one that carries their
              width cap (visual #17). */}
          <p
            id={titleId}
            className="truncate font-semibold text-foreground"
            style={{ ...TITLE_TEXT, maxWidth: TITLE_MAX }}
          >
            {model}
          </p>
          <div
            data-slot="vehicle-popup-meta"
            className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-3 overflow-hidden"
          >
            {/* Board 16:21393: TWO items only — `tag-03` plate and
                `marker-pin-02` address, 12px apart. The driver moved out of
                the header onto the Workforce tab, so it is no longer rendered
                here (`driver` stays in the props for API compatibility). */}
            {meta ?? (
              <>
                <MetaItem icon={<TagGlyph />} text={plate} />
                <MetaItem icon={<PinGlyph />} text={location} style={LOCATION_MAX} truncating />
              </>
            )}
          </div>
          <p className="mt-1.5 flex items-center">
            <span className={cn('font-medium', statusClassName ?? TONE_TEXT[statusTone])} style={STATUS_TEXT}>
              {status}
            </span>
            {statusSince ? (
              <span className="ms-1.5 font-semibold text-gray-400" style={STATUS_TEXT}>
                {statusSince}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Actions — 16px icons on a 24px pitch (Figma `mark` / `share-04` /
          `x-close`). Each button is a 24px hit area (UX-7) and always renders,
          labelled, whether or not its handler is wired. Absolutely positioned
          so the ICON grid (not the hit-area grid) lands on Figma's (478,24)
          and the meta row below keeps the full content width — visual #16/#17;
          see `HEADER_ACTIONS_BOX`. */}
      <div
        data-slot="vehicle-popup-actions"
        style={HEADER_ACTIONS_BOX}
        className="absolute flex items-center text-muted-foreground"
      >
        {overflow}
        {/*
         * Shared ghost icon-button rest state (A21): no border, no
         * background, same muted glyph colour as its siblings — the SAME
         * base class string on all three buttons below. `aria-pressed`
         * marks the genuinely toggled action (map-follow) for assistive
         * tech; only `locating` (explicit prop, defaults off) swaps the
         * glyph to primary — a mouse click or the card's own
         * `focusOnMount` programmatic focus never does, because neither
         * sets `:focus-visible`.
         */}
        <button
          type="button"
          aria-label="Center on vehicle"
          aria-pressed={locating}
          onClick={onLocate}
          className={cn(
            'grid size-6 place-items-center rounded-sm border-0 bg-transparent outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
            locating ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <LocateFixed />
        </button>
        <button
          type="button"
          aria-label="Expand details"
          onClick={onExpand}
          className="grid size-6 place-items-center rounded-sm border-0 bg-transparent text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
        >
          <ExternalLink />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-6 place-items-center rounded-sm border-0 bg-transparent text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
        >
          <X />
        </button>
      </div>
    </div>
  )
}

/**
 * One `tag-03 GFU47893` / `marker-pin-02 <address>` meta item. The row is a
 * single 14px line (Figma 16:21393) — the plate holds its intrinsic width
 * (`shrink-0`) and only the address, capped at its 255px Figma item width,
 * ellipsizes.
 */
function MetaItem({
  icon,
  text,
  style,
  truncating = false,
}: {
  icon: ReactNode
  text: string
  style?: CSSProperties
  truncating?: boolean
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 font-semibold text-gray-400',
        truncating ? 'min-w-0' : 'shrink-0',
      )}
      style={style ?? META_TEXT}
    >
      <span className="grid size-3.5 shrink-0 place-items-center [&_svg]:size-3.5">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  )
}

/* Inline meta glyphs (kept local so the header has zero icon-prop ceremony).
   Stroke/fill use currentColor → they inherit the meta row's tone. */
function TagGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 7.5h.01M3 6v5.17a2 2 0 0 0 .59 1.42l8.83 8.83a2 2 0 0 0 2.83 0l4.34-4.34a2 2 0 0 0 0-2.83l-8.83-8.83A2 2 0 0 0 11.17 3H6a3 3 0 0 0-3 3Z" />
    </svg>
  )
}
function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
