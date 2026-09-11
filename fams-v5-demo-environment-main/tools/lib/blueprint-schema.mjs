// @ts-check
/**
 * Real JSON-Schema validation of every COMMITTED resolved blueprint against
 * its own declared `$schema` (fix-d6, review finding 1: "the schema has now
 * drifted twice in one run" — `SystemColumn.unit`, `rowActions.alwaysVisible`
 * and the C-family filter keys were all added to `types.ts`/
 * `blueprint-schema.ts` but not to `EntityModuleConfig.schema.json`, so the
 * PM/pipelines/workforce blueprints shipped GREEN in CI while being INVALID
 * against the schema they declare — nothing in either repo's gates loaded
 * that schema until now).
 *
 * Mirrors `ops-schema.mjs`'s ajv wiring (same MIT dependency, already a repo
 * dependency — no new dep). Unlike ops files, a resolved blueprint's `kind`
 * selects a DIFFERENT schema file (`EntityModuleConfig`/`PipelineModuleConfig`
 * /`DashboardModuleConfig`/…), each `$ref`-ing shared `$defs` (SystemColumn,
 * FilterDef, UiConfig, …) out of `EntityModuleConfig.schema.json` — so all
 * schema files are compiled together into one Ajv instance keyed by filename.
 *
 * Schemas are read from `@fams/v5-composer`'s published `./schemas/*` export
 * (see that package's package.json `exports`) rather than reaching across
 * repos by relative path, so this keeps working under the real npm-published
 * layout, not just the workspace `link:` used in this monorepo checkout.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Ajv2020 from 'ajv/dist/2020.js';

const require = createRequire(import.meta.url);

/**
 * `kind` (defaults to 'entity') → the schema file that validates it.
 *
 * Deliberately scoped to `entity` and `pipeline` only — the two kinds that
 * share `EntityModuleConfig.schema.json`'s `SystemColumn`/`UiConfig`/
 * `FilterDef` `$defs`, which is exactly where this guard's motivating defect
 * (finding 1: `unit`, `rowActions.alwaysVisible`, the C-family filter keys)
 * lives. `inbox` blueprints declare `kind: 'inbox'` but
 * `EntityModuleConfig.schema.json`'s `kind` is a `const: 'entity'` — there is
 * no dedicated Inbox schema yet — and at least one shipped `dashboard`
 * blueprint already fails `DashboardModuleConfig.schema.json` on an unrelated
 * pre-existing data-shape issue. Both are real gaps, but neither is this
 * fix's defect class; wiring them in here would fail `demo check` on
 * unrelated grounds. Extend this map (and fix the underlying blueprint/
 * schema mismatch) as its own follow-up.
 */
const KIND_SCHEMA_FILE = {
  entity: 'EntityModuleConfig.schema.json',
  pipeline: 'PipelineModuleConfig.schema.json',
};

/** @type {import('ajv').default | null} */
let _ajv = null;

function getAjv() {
  if (_ajv) return _ajv;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  for (const file of new Set(Object.values(KIND_SCHEMA_FILE))) {
    const schemaPath = require.resolve(`@fams/v5-composer/schemas/${file}`);
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    ajv.addSchema(schema, file);
  }
  _ajv = ajv;
  return ajv;
}

/**
 * Validate one resolved blueprint document against the JSON Schema its
 * `kind` selects. Returns human-readable `<pointer>: <message>` strings
 * (empty when valid, or when `kind` has no known schema mapping — that is a
 * different, pre-existing gap, not this guard's job to report).
 * @param {unknown} doc
 * @returns {string[]}
 */
export function validateBlueprintSchema(doc) {
  if (typeof doc !== 'object' || doc === null) return ['expected an object'];
  const kind = /** @type {any} */ (doc).kind ?? 'entity';
  const schemaFile = KIND_SCHEMA_FILE[kind];
  if (!schemaFile) return [];
  const validate = getAjv().getSchema(schemaFile);
  if (!validate) return [];
  const ok = validate(doc);
  if (ok) return [];
  return (validate.errors ?? [])
    .filter((e) => e.keyword !== 'if')
    .map((e) => {
      const pointer = e.instancePath || '/';
      let detail = e.message ?? 'schema validation failed';
      if (e.keyword === 'additionalProperties') detail += ` ("${e.params.additionalProperty}")`;
      if (e.keyword === 'enum') detail += ` [${e.params.allowedValues.join(', ')}]`;
      return `${pointer}: ${detail}`;
    });
}
