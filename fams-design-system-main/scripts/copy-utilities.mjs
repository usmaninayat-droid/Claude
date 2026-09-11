/*
 * Copies the design system's single compiled stylesheet
 * (`packages/tokens/dist/utilities.css`, built by scripts/build-css.mjs) into
 * one markup package's dist:
 *
 *   node scripts/copy-utilities.mjs ui-kit fams-ui-kit
 *
 * Wired into each markup package's `build`, AFTER tsup (which runs with
 * `clean: true` and would otherwise wipe it). Every package's
 * `./utilities.css` export therefore resolves to byte-identical content: a
 * consumer that installs one package from a registry still gets working
 * styles, and a consumer that imports several cannot reorder the cascade into
 * a broken state — importing `@fams/tokens/utilities.css` once is the
 * recommended form (see docs/ARCHITECTURE.md).
 */
import { copyFile, mkdir, access } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'

const [pkg, name] = process.argv.slice(2)
if (!pkg || !name) throw new Error('usage: copy-utilities.mjs <package-dir> <output-name>')

const packages = resolve(import.meta.dirname, '..', 'packages')
const src = join(packages, 'tokens', 'dist', 'utilities.css')
await access(src).catch(() => {
  throw new Error(
    `copy-utilities: ${src} missing — build @fams/tokens first (pnpm --filter @fams/tokens build)`,
  )
})

const dest = join(packages, pkg, 'dist', `${name}.css`)
await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
console.log(`copy-utilities: ${pkg}/dist/${name}.css`)
