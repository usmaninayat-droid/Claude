import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/**
 * @fams/demo-kit lint config. Mirrors the core-tier quality bar and — crucially
 * — carries the decision #13 boundary ban: demo-kit is CORE tier
 * (product-agnostic demo machinery) and must NEVER import the `@fams/v5-*` tier.
 * The generic contracts here are bridged to the product kits in the demo app,
 * not by importing them upward across the tier boundary.
 */
export default tseslint.config(
  { ignores: ['dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error', // Hard rule 3: no `any`.

      // Decision #13: demo-kit is core tier (product-agnostic) — it must never
      // depend on the v5 patterns tier. v5 wiring lives in the demo app.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fams/v5-*'],
              message:
                'Core-tier packages never import the v5 tier (decision #13 — demo-kit is product-agnostic; the demo app bridges these generic contracts to the product kits).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
