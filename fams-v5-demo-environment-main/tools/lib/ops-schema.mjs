// @ts-check
/**
 * Real JSON-Schema validation for ops files against `tools/schemas/OpsFile.schema.json`
 * (decision #14's op shape contract). Until this module existed the schema was
 * documentation-only — nothing loaded or ran it — so a typo'd/mis-shaped ops
 * file (extra property, missing required field, wrong enum value, etc.) could
 * silently pass `demo check` as long as the hand-rolled shape checks in
 * `check.mjs`/`validateOp` (lib/ops.mjs) happened not to trip on it. This wires
 * the schema file itself in as the single source of truth, via `ajv`
 * (MIT-licensed; decision #5 — no paid deps).
 *
 * The schema declares `$schema: https://json-schema.org/draft/2020-12/schema`,
 * so we compile it with Ajv's 2020 build. `strictRequired` is turned off
 * because `setFieldProp`'s conditional `required: ["id", "prop", "value"]`
 * intentionally leaves `value` untyped (op values are op-specific — any JSON
 * value) with no matching `properties.value` entry; that is correct schema
 * authoring, not a schema bug, so it should not fail Ajv's strict-mode lint.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

export const OPS_FILE_SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'OpsFile.schema.json');

/** @type {import('ajv').ValidateFunction | null} */
let _validate = null;

function getValidator() {
  if (!_validate) {
    const schema = JSON.parse(readFileSync(OPS_FILE_SCHEMA_PATH, 'utf8'));
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
    _validate = ajv.compile(schema);
  }
  return _validate;
}

/**
 * Validate an ops-file document (parsed JSON) against OpsFile.schema.json.
 * Returns human-readable, per-error strings of the form
 * `<instance pointer>: <message>` (empty array when valid). Errors are
 * de-duplicated of Ajv's redundant `if`/`allOf` wrapper noise ("must match
 * \"then\" schema") — the concrete child error (e.g. the actual missing
 * property or enum mismatch) is always reported instead.
 * @param {unknown} doc
 * @returns {string[]}
 */
export function validateOpsFileSchema(doc) {
  const validate = getValidator();
  const ok = validate(doc);
  if (ok) return [];
  return (validate.errors ?? [])
    .filter((e) => e.keyword !== 'if') // wrapper noise; the real error is a sibling entry
    .map((e) => {
      const pointer = e.instancePath || '/';
      let detail = e.message ?? 'schema validation failed';
      if (e.keyword === 'additionalProperties') detail += ` ("${e.params.additionalProperty}")`;
      if (e.keyword === 'enum') detail += ` [${e.params.allowedValues.join(', ')}]`;
      return `${pointer}: ${detail}`;
    });
}
