// @ts-check
/**
 * Blueprint helpers: deterministic serialization, structural node-id walking,
 * and deep clone. Pure — no filesystem, no @fams/v5-composer dependency.
 *
 * Determinism contract (decision #14 — "resolve(core+deltas) === resolved"):
 *   - Object keys are emitted in sorted order (stable regardless of authoring
 *     order or the order ops mutate them in).
 *   - Arrays keep their order (order is semantically meaningful — field order,
 *     stage order, tab order).
 *   - Two-space indent + a single trailing newline (clean git diffs).
 */

/** @typedef {Record<string, any>} Blueprint */

/** Structured deep clone (Node 17+ has global structuredClone). */
export function deepClone(value) {
  return structuredClone(value);
}

/**
 * Stable JSON: recursively sort object keys, preserve array order, 2-space
 * indent, trailing newline. Byte-identical for structurally-equal inputs.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value), null, 2) + '\n';
}

/** Recursively sort object keys; arrays untouched. */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    /** @type {Record<string, any>} */
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

/** Deep structural equality via stable serialization. */
export function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

/**
 * Walk every object carrying a string `id` and yield its id. Used to seed
 * provenance ("every blueprint node has a stable id" — tenant-model.md). The
 * same id can legitimately appear in several regions (e.g. `fld_title` lives in
 * systemcolumns, listcolumns and profile.details); it is one logical node, so
 * ids are deduped.
 * @param {unknown} root
 * @returns {Set<string>}
 */
export function collectNodeIds(root) {
  /** @type {Set<string>} */
  const ids = new Set();
  walk(root);
  return ids;

  function walk(node) {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === 'object') {
      if (typeof node.id === 'string') ids.add(node.id);
      for (const key of Object.keys(node)) walk(node[key]);
    }
  }
}
