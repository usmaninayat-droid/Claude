import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/**
 * Mirrors ui-kit's lint config (minus jsx-a11y — skeleton-kit ships boot
 * machinery, not the presentational component surface a11y sweeps target).
 */
export default tseslint.config(
  { ignores: ['dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
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
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error', // Hard rule 3: no `any`.
      'react/prop-types': 'off', // TypeScript is the source of truth for props.

      // Decision #13: skeleton-kit is core tier (product-agnostic boot
      // layer) — it must never depend on the v5 patterns tier.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fams/v5-*'],
              message:
                'Core-tier packages never import the v5 tier (decision #13 — core is product-agnostic, v5-templates is opt-in on top of it).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
