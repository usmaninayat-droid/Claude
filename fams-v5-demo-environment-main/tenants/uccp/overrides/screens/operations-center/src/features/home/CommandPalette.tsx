import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@fams/design-system'
import type { AppPage } from '../../layout/AppLayout'
import { setActiveAppId, setLastModuleForApp } from '../../layout/activeAppPreference'
import { ALL_CARDS, cardMatches, type FlatCard } from './homeData'

/**
 * Global command palette — opened by ⌘K / Ctrl+K from ANY page (wired in
 * `App.tsx`). Searches every app + module in the Home catalog (`ALL_CARDS`) and
 * jumps to the owning app's page on select. Keyboard-first: type to filter,
 * ↑/↓ to move, ↵ to open, Esc (or backdrop click) to close.
 */
export function CommandPalette({
  open, onClose, onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate: (page: AppPage, moduleId?: string) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(
    () => ALL_CARDS.filter((c) => cardMatches(c, c.suiteLabel, query)).slice(0, 60),
    [query],
  )

  // Reset + focus when opened.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const id = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(id)
  }, [open])

  // Clamp the active index whenever the result set changes.
  useEffect(() => { setActive((a) => Math.min(a, Math.max(results.length - 1, 0))) }, [results.length])

  // Keep the active row scrolled into view.
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const select = (card: FlatCard | undefined) => {
    if (!card) return
    if (card.page) {
      // Match the Launch Pad: opening a module also promotes its parent app, so
      // the rail's app row + module list line up with where the user landed.
      setActiveAppId(card.suiteId)
      setLastModuleForApp(card.suiteId, card.id)
      onNavigate(card.page, card.id)
    }
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); select(results[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[600px] overflow-hidden rounded-md border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Search apps and modules"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search field */}
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={20} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search any app or module…"
            aria-label="Search any app or module"
            className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="hover-scrollbar max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              No apps or modules match “{query}”.
            </div>
          ) : (
            results.map((c, i) => {
              const Icon = c.icon
              return (
                <button
                  key={`${c.suiteId}-${c.id}`}
                  type="button"
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => select(c)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left outline-none',
                    i === active ? 'bg-muted' : '',
                  )}
                >
                  <Icon size={18} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{c.label}</span>
                  {c.tag ? (
                    <span
                      className="shrink-0 whitespace-nowrap rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
                      style={{ background: c.tagColor }}
                    >
                      {c.tag}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs text-muted-foreground">{c.suiteLabel}</span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> to navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={12} /> to open</span>
          <span className="ml-auto">{results.length} result{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}
