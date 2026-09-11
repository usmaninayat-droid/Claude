export type RosterView = 'board' | 'crew' | 'validate'

export interface EmbedParams {
  embed: boolean
  view: RosterView
  theme: 'light' | 'dark' | null
  tenant: string
  /** Who is making changes — recorded on every audit entry (BR-10). */
  actor: string
}

export const VIEW_MESSAGE_TYPE = 'iwmp-roster:view'

export function isRosterView(v: unknown): v is RosterView {
  return v === 'board' || v === 'crew' || v === 'validate'
}

export function readEmbedParams(search: string = window.location.search): EmbedParams {
  const q = new URLSearchParams(search)
  const view = q.get('view')
  const theme = q.get('theme')
  return {
    embed: q.get('embed') === '1',
    view: isRosterView(view) ? view : 'board',
    theme: theme === 'dark' || theme === 'light' ? theme : null,
    tenant: q.get('tenant') || 'iwmp',
    actor: q.get('actor') || 'Roster planner',
  }
}

/** The host owns theme + tenant; apply them before first paint so token CSS matches. */
export function applyEmbedTheme(p: EmbedParams): void {
  const root = document.documentElement
  if (p.theme) root.dataset.theme = p.theme
  root.dataset.tenant = p.tenant
}
