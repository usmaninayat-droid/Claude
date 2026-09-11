/** Presentation helpers — pure, no React. */

/** `08 Sep` — the blueprint's `fmtD`. */
export function fmtDay(day: string): string {
  return new Date(day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/** `Mon 08 Sep`. */
export function fmtDayLong(day: string): string {
  return new Date(day).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function initials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('')
}

/** `RL_04_MSW_101` → `RL·MSW_101` — the board's compact route label. */
export function compactRoute(id: string): string {
  return id.replace('_04_', '·')
}

export function num(n: number): string {
  return n.toLocaleString('en-GB')
}

/** Uppercase → Title Case for designations shown in prose. */
export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
