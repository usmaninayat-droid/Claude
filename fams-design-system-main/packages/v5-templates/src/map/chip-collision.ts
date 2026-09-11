/**
 * chip-collision.ts — which marker chips get suppressed this frame.
 *
 * SPEC §2.3 flanks every marker with a plate chip (start side) and a
 * speed/dwell chip (end side). At real fleet density those 10px white-on-
 * scrim pills overlap each other and run under cluster badges ("45 mins"
 * under the "152" cluster; the "E 20365" / "H 32730" pair at high zoom —
 * round-1 UX finding 17), and markers sitting on the pane's inline edges get
 * their chips cut mid-word by the pane's `overflow-hidden`.
 *
 * The rule: walk the visible markers in PRIORITY order (selected first, then
 * the caller's order), keep a chip when its box clears every box already
 * kept — plus the cluster badges, which always win — and suppress it
 * otherwise. Suppression only hides the chips: `VehicleMarker` still reveals
 * them on hover and always renders them while `selected`, and the same data
 * stays in the marker's `aria-label`, the list and the card (UX-9), so this
 * removes no information channel.
 *
 * Pure screen-space geometry (no DOM, no map instance) so it unit-tests and
 * can run on every camera frame.
 */
export interface ChipCollisionItem {
  id: string
  /** Pane-relative pixel position of the marker's anchor point. */
  x: number
  y: number
  /** Higher wins a collision. Selected markers should score highest. */
  priority?: number
  /** Whether this item HAS chips to suppress (clusters do not). */
  chips?: boolean
}

export interface ChipCollisionOptions {
  /** Pane width in px — chips closer than `edgeGuard` to either inline edge
   *  would be clipped, so they are suppressed instead of cut mid-word. */
  paneWidth: number
  /** Half the full chip span (plate + circle + meta), px. */
  chipHalfWidth?: number
  /** Chip band height, px. */
  chipHeight?: number
  /** Distance from the anchor point up to the chip band's centre, px —
   *  the marker's leader line + half the 40px circle. */
  chipCenterOffset?: number
  /** Cluster badge half-size, px — clusters block chips beneath them. */
  clusterHalfSize?: number
  /** Minimum visible chip run before a chip is deemed clipped, px. */
  edgeGuard?: number
  /** Above this many visible items the pass is skipped (perf floor). */
  maxItems?: number
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/**
 * Returns the ids whose chips must be hidden this frame. Items without
 * `chips` (clusters) are never returned — they only block.
 */
export function suppressedChipIds(
  items: ChipCollisionItem[],
  {
    paneWidth,
    chipHalfWidth = 96,
    chipHeight = 20,
    chipCenterOffset = 42,
    clusterHalfSize = 24,
    edgeGuard = 56,
    maxItems = 400,
  }: ChipCollisionOptions,
): Set<string> {
  const suppressed = new Set<string>()
  if (items.length === 0 || items.length > maxItems) return suppressed

  const occupied: Box[] = []
  // Cluster badges always win — they are reserved before any chip is kept.
  for (const item of items) {
    if (item.chips) continue
    occupied.push({
      left: item.x - clusterHalfSize,
      right: item.x + clusterHalfSize,
      top: item.y - clusterHalfSize,
      bottom: item.y + clusterHalfSize,
    })
  }

  const ordered = items
    .filter((item) => item.chips)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (b.item.priority ?? 0) - (a.item.priority ?? 0) || a.index - b.index)

  for (const { item } of ordered) {
    const box: Box = {
      left: item.x - chipHalfWidth,
      right: item.x + chipHalfWidth,
      top: item.y - chipCenterOffset - chipHeight / 2,
      bottom: item.y - chipCenterOffset + chipHeight / 2,
    }
    // Clamp guard: a chip run that would be cut by the pane edge is dropped
    // rather than rendered mid-word.
    const clipped = box.left < -edgeGuard || box.right > paneWidth + edgeGuard
    if (clipped || occupied.some((other) => overlaps(box, other))) {
      suppressed.add(item.id)
      continue
    }
    occupied.push(box)
  }
  return suppressed
}
