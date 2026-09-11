import { useMemo } from 'react'
import type { EntityConfig } from '@fams/v5-composer'

/**
 * use-compact-list-config.ts — the hybrid views' compact-left-list column
 * derivation, extracted from `HybridView` (root rule 12, decompose-on-touch)
 * so the live list+map hybrid (`LiveHybridView`) shares it byte-for-byte.
 *
 * Blueprint authors reference fields by stable `id` (`fld_name`) in
 * `uiConfig.hybrid.listColumns`, but the list works in storage `col` keys —
 * accept either: an entry matching a systemcolumn id maps to that column's
 * `col`, anything else passes through as a col key. And because `ListView`
 * derives its columns from the module's `listcolumns` (the PRIMARY list's
 * column set), a hybrid column that isn't in `listcolumns` would silently
 * drop — so the compact list renders from a derived config whose
 * `listcolumns` IS the hybrid column set.
 */
export function useCompactListConfig(config: EntityConfig): {
  listConfig: EntityConfig
  /** Resolved col keys for `ListView.visibleCols`; undefined = all columns. */
  listColumns?: string[]
} {
  const authoredListColumns = config.uiConfig.hybrid?.listColumns
  const listColumns = authoredListColumns?.map(
    (key) => config.systemcolumns.find((c) => c.id === key)?.col ?? key,
  )
  const listColumnsKey = listColumns?.join('|')
  const listConfig = useMemo(() => {
    if (!listColumns?.length) return config
    return {
      ...config,
      listcolumns: listColumns.map((col) => {
        const existing = config.listcolumns.find((p) => p.col === col)
        if (existing) return existing
        const sysCol = config.systemcolumns.find((c) => c.col === col)
        return { id: sysCol?.id ?? `fld_${col}`, col }
      }),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the authored column list
  }, [config, listColumnsKey])
  return { listConfig, listColumns }
}
