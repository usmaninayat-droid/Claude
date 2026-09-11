/**
 * The kanban lens's display-mode (card-media) switch. [tier-2 internal]
 *
 * Figma frames `33534:32278` / `33534:32740` are the two states of ONE
 * segmented control in the kanban toolbar. The left state's own tooltip names
 * it: **"Data-only view"**. It removes the card's cover thumbnail and NOTHING
 * else — the board shape, the lanes, the card's id chip, priority chip, title,
 * description, meta rows and footer are all unchanged.
 *
 * Two consequences the naming in `SPEC.md` §2 row 10 got wrong and
 * `INTERACTIONS.md` corrects:
 *
 * - it is **not** a rows/table mode, so it is **not** a fifth `ViewKind` — it
 *   is a media flag threaded onto the single shared card component, and
 * - both icon buttons carry tooltips and accessible names (an icon-only
 *   segmented control with neither is a dead end for AT and for anyone who
 *   doesn't recognise the glyphs).
 *
 * The mode is sticky per view: it round-trips through the active view's
 * `ViewState` (`saved-views.ts`) like filters, search and sort, so switching
 * lens and back restores it.
 */

export type KanbanDisplayMode = 'data' | 'image'

/** The default mode — cards carry their cover image, per frame `33534:32740`. */
export const DEFAULT_KANBAN_DISPLAY_MODE: KanbanDisplayMode = 'image'

/**
 * Accessible name AND tooltip copy per mode. `'data'`'s string is the
 * designer's own wording, transcribed verbatim from the tooltip visible in
 * frame `33534:32278` — do not paraphrase it.
 */
export const KANBAN_DISPLAY_MODE_LABEL: Record<KanbanDisplayMode, string> = {
  data: 'Data-only view',
  image: 'Image view',
}

/** Narrow an unknown persisted value back to a mode, falling back to the default. */
export function toDisplayMode(value: unknown): KanbanDisplayMode {
  return value === 'data' || value === 'image' ? value : DEFAULT_KANBAN_DISPLAY_MODE
}
