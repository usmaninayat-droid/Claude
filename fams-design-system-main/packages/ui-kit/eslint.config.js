import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'
import { radixAllowlistFiles } from './eslint.radix-allowlist.mjs'

/**
 * Real lint, replacing the previous `echo 'lint: ui-kit ok'` stub.
 * jsx-a11y is here because it's the CI-time half of the a11y promise in
 * ARCHITECTURE.md — Storybook's a11y addon is manual/interactive only,
 * Playwright axe is still "once stable". This is the layer that actually
 * blocks a merge today.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'storybook-static/**', '.storybook/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '19' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // Rule 2 (tokens are the only source of truth) is not lint-enforceable
      // generically, but unused vars/imports catch drift from the restructure.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error', // Hard rule 3: no `any`.
      'react/prop-types': 'off', // TypeScript is the source of truth for props.

      // Decision #7: Radix is grandfathered, not banned outright — new work
      // builds on Base UI (`@base-ui/react`), with React Aria
      // (`react-aria-components`) reserved for date/time pickers + Tree.
      // Existing Radix files are exempted below via `radixAllowlistFiles`
      // (`eslint.radix-allowlist.mjs`) — migrate on touch, then remove them
      // from that list so this rule starts covering them too.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@radix-ui/*', 'radix-ui'],
              message:
                "New Radix usage is banned (decision #7): use @base-ui/react (or React Aria for date/time pickers). Existing files are grandfathered — migrate on touch and remove from the allowlist.",
            },
            {
              // Decision #13: one repo, two tiers. Core-tier packages
              // (tokens, ui-kit, skeleton-kit) are product-agnostic and must
              // never depend on the v5 patterns tier — that dependency only
              // ever runs the other way (v5-templates → ui-kit/tokens).
              group: ['@fams/v5-*'],
              message:
                'Core-tier packages never import the v5 tier (decision #13 — core is product-agnostic, v5-templates is opt-in on top of it). If v5-family code needs this, it belongs in @fams/v5-templates, not here.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Migrate-on-touch grandfather list (decision #7) — see
    // eslint.radix-allowlist.mjs for the full rationale and regeneration
    // command. Do not add new files here; new Radix imports are banned.
    files: radixAllowlistFiles,
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // Storybook CSF3's `render: () => { ... }` is a legitimate place to call
    // hooks — react-hooks/rules-of-hooks flags it as a false positive because
    // an inline arrow assigned to a `render` property isn't a PascalCase or
    // `use*`-named function by its naming heuristic.
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
)
