/**
 * Normalizes the `string | string[] | null` controlled-value shape shared by
 * `Combobox` and `PeoplePicker` (single vs. multi selection) into a plain
 * array for internal list logic (selection lookups, counts, rendering).
 */
export function toArray(value: string | string[] | null): string[] {
  if (value === null) return []
  return Array.isArray(value) ? value : [value]
}
