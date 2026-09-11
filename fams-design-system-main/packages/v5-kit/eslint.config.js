import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/**
 * Mirrors skeleton-kit's self-contained lint config (boot machinery, not a
 * presentational surface, so no jsx-a11y sweep).
 *
 * Unlike skeleton-kit, @fams/v5-kit IS the v5 tier: it deliberately imports the
 * sibling v5-tier packages (@fams/skeleton-kit, @fams/v5-composer), so it does
 * NOT inherit the decision #13 core-tier ban on `@fams/v5-*` imports. It keeps
 * the decision #7 Radix ban (no new Radix anywhere).
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

      // Decision #7: no new Radix usage anywhere.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@radix-ui/*', 'radix-ui'],
              message:
                'New Radix usage is banned (decision #7): use @base-ui/react (or React Aria for date/time pickers).',
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
