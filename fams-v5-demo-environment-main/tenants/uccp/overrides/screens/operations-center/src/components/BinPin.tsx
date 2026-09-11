/**
 * BinPin — the shared bin map marker (Figma node 2227:71033): a filled,
 * colourable circle on a short stem ("lollipop"). Used across the Manual Bin
 * Reassignment map and the Current Shift Issues / Nearby Routes side-sheet maps
 * so every bin looks identical. Anchor the wrapper at the pin's tip.
 */
export function BinPin({ color = 'var(--status-error)', className }: { color?: string; className?: string }) {
  return (
    <span className={`flex flex-col items-center ${className ?? ''}`}>
      <span
        className="size-3.5 rounded-full"
        style={{ background: color, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${color}, #000 18%), 0 1px 2px rgba(16,24,40,0.35)` }}
      />
      <span className="-mt-px h-2.5 w-[2px] rounded-b-full" style={{ background: color }} />
    </span>
  )
}
