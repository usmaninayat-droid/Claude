/**
 * Package-local axe sweep for the SchemaForm surface, mirroring ui-kit's
 * `a11y.axe.test.tsx` (see its header for why `color-contrast`/`region` are
 * disabled in jsdom and why the matcher is wired from `./dist/matchers.js`).
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { compileFieldSet } from './compiler'
import type { FieldSetInput } from './compiler'
import { SchemaForm } from './SchemaForm'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
}

expect.extend({ toHaveNoViolations })

const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

describe('SchemaForm — axe', () => {
  it('a representative form has no violations', async () => {
    const compiled = compileFieldSet({
      code: 'a11y/form',
      version: 1,
      fields: [
        { id: 'fld_title', col: 'title', name: 'Full name', type: 'SmallText', required: true },
        { id: 'fld_email', col: 'email', name: 'Email', type: 'Email' },
        { id: 'fld_amount', col: 'amount', name: 'Amount', type: 'Number' },
        { id: 'fld_active', col: 'active', name: 'Active', type: 'Boolean' },
        { id: 'fld_stage', col: 'stage', name: 'Stage', type: 'SingleSelect', listValues: ['Lead', 'Won'] },
        { id: 'fld_due', col: 'due', name: 'Due date', type: 'Date' },
        // Combobox-family widget (MultiSelectWidget) — covers the label→trigger
        // `id` wiring shared by MultiSelect/Reference/Assignee/Tags widgets.
        { id: 'fld_labels', col: 'labels', name: 'Labels', type: 'MultiSelect', listValues: ['Hot', 'Cold'] },
      ],
    } satisfies FieldSetInput)

    const { container } = render(<SchemaForm compiled={compiled} onSubmit={() => {}} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
