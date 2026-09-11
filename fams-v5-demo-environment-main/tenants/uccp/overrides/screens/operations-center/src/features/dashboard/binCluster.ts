// Shared bin-cluster helper for the side-sheet maps (Current Shift Issues +
// Nearby Routes): a deterministic golden-angle spiral of ~100 bin points around
// a collection site, revealed when the "100" cluster is zoomed in.
export function binSpread(center: [number, number], n = 100): [number, number][] {
  const [lat, lng] = center
  const maxR = 0.0024 // ≈ 260 m
  const lngScale = 1 / Math.cos((lat * Math.PI) / 180)
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const r = maxR * Math.sqrt((i + 0.5) / n)
    const theta = i * 2.399963 // golden angle (radians)
    pts.push([lat + r * Math.cos(theta), lng + r * Math.sin(theta) * lngScale])
  }
  return pts
}
