/**
 * filter-icons — compatibility re-export. The shared field-glyph vocabulary
 * (filter fields, group-by headers, and any future authored-glyph surface)
 * now lives in `views/field-icons.tsx`, since it stopped being filter-only.
 * This file re-exports it unchanged so existing filter call sites
 * (`FilterField.tsx`) are untouched.
 */
export { resolveFilterFieldIcon, lookupFieldIcon, filterFieldIconNames } from '../field-icons'
