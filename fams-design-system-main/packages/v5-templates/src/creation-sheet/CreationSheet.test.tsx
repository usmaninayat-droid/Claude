import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Zap } from '@fams/ui-kit/icons'
import { CreationSheet } from './CreationSheet'
import { companiesConfig, dealsConfig } from '../entity-profile/fixtures'

describe('CreationSheet — single group (FormSheet)', () => {
  it('renders one sheet (no stepper) and submits a mapped record', async () => {
    const onSubmit = vi.fn()
    render(<CreationSheet open onOpenChange={() => {}} config={companiesConfig} onSubmit={onSubmit} />)

    // Single group → no Stepper progress trail, no "Next".
    expect(screen.queryByRole('navigation', { name: 'Progress' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Company/), { target: { value: 'Acme Ltd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ title: 'Acme Ltd' }))
  })
})

describe('CreationSheet — multiple groups (Stepper wizard)', () => {
  it('shows a stepper and gates Next on per-step validation', async () => {
    const onSubmit = vi.fn()
    render(<CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={onSubmit} />)
    // The Sheet portals outside the render container; target the field by its id
    // (FieldControl wires `sf-<col>`) via the document to dodge portal + label ambiguity.
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement

    // Stepper present with the decision-#10 group titles.
    expect(screen.getByRole('navigation', { name: 'Progress' })).toBeInTheDocument()
    expect(screen.getByText('Basic Info')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()

    // Step 2's field ("Owner") is not shown yet.
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()

    // Next with the required "Deal" title empty is blocked (stays on step 1).
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText('Required')).toBeInTheDocument())
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()

    // Fill the required field → Next advances to step 2.
    fireEvent.change(titleInput(), { target: { value: 'Big Deal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Owner')).toBeInTheDocument()

    // Final step → submit.
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ title: 'Big Deal' }))
  })

  it('keeps a visible header close X even past step 0, where the footer swaps Cancel for Back', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={dealsConfig} onSubmit={() => {}} />)
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement

    // Step 0 has both exits: footer Cancel AND the header X.
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()

    // Advance to step 2 — Cancel becomes Back, the X must remain as the exit.
    fireEvent.change(titleInput(), { target: { value: 'Exit Deal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Owner')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()

    // The X is still the exit — but this wizard is DIRTY (a title was typed to
    // get past step 0), so since the round-5 discard guard the X routes through
    // the same confirmation every other dismissal route does, rather than
    // closing straight away. Asserting the prompt here is what proves the
    // header X is actually covered by the guard and not a fifth unguarded exit.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

describe('CreationSheet — stepperVariant/stepIcons pass-through (W3d)', () => {
  it('defaults to the numbered variant unchanged when omitted', () => {
    render(<CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Progress' })
    expect(nav).not.toHaveAttribute('data-variant', 'tabs')
  })

  it('threads stepperVariant="tabs" down to the internal Stepper', () => {
    render(
      <CreationSheet
        open
        onOpenChange={() => {}}
        config={dealsConfig}
        onSubmit={() => {}}
        stepperVariant="tabs"
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Progress' })).toHaveAttribute('data-variant', 'tabs')
  })

  it('threads stepIcons to the rail keyed by CreationGroup.id, and tolerates a group with no entry', () => {
    render(
      <CreationSheet
        open
        onOpenChange={() => {}}
        config={dealsConfig}
        onSubmit={() => {}}
        stepIcons={{ basic: <Zap data-testid="basic-icon" /> }}
      />,
    )
    // Sheet content portals outside the render container — query the document.
    const markers = document.querySelectorAll('[data-slot="stepper-marker"]')
    // step 0 ("basic", current): its icon renders in place of the digit.
    expect(markers[0].querySelector('[data-testid="basic-icon"]')).toBeInTheDocument()
    // step 1 ("details" — no stepIcons entry): falls back to the plain index digit.
    expect(markers[1]).toHaveTextContent('2')
  })

  it('resolves a stepIcons STRING entry through the platform icon vocabulary (W3e), and degrades an unknown name to the default marker rather than throwing', () => {
    render(
      <CreationSheet
        open
        onOpenChange={() => {}}
        config={dealsConfig}
        onSubmit={() => {}}
        stepIcons={{ basic: 'phone', details: 'not-a-real-icon-name' }}
      />,
    )
    const markers = document.querySelectorAll('[data-slot="stepper-marker"]')
    // step 0 ("basic"): "phone" resolves through FIELD_ICON_VOCABULARY to a real icon, not the "1" digit.
    expect(markers[0].querySelector('svg')).toBeInTheDocument()
    expect(markers[0]).not.toHaveTextContent('1')
    // step 1 ("details"): an unresolvable name never throws — falls back to the plain index digit.
    expect(markers[1]).toHaveTextContent('2')
    expect(markers[1].querySelector('svg')).not.toBeInTheDocument()
  })
})

describe('CreationSheet — showSummaryStep (W3a)', () => {
  it('defaults to off: omitting it leaves the last real group as the terminal step', async () => {
    const onSubmit = vi.fn()
    render(<CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={onSubmit} />)
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement

    fireEvent.change(titleInput(), { target: { value: 'No Summary Deal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Owner')).toBeInTheDocument()

    // No extra step appended — "Details" is already the terminal step.
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('appends a read-only recap step, empty fields show a placeholder, and Edit jumps back with values retained', async () => {
    const onSubmit = vi.fn()
    render(
      <CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={onSubmit} showSummaryStep />,
    )
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement

    fireEvent.change(titleInput(), { target: { value: 'Summary Deal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' })) // Basic Info -> Details
    expect(await screen.findByText('Owner')).toBeInTheDocument()
    // Still mid-wizard — "Details" is no longer terminal once a summary is appended.
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' })) // Details -> Summary
    expect(await screen.findByText('Summary Deal')).toBeInTheDocument() // recapped title value
    expect(screen.getByText('Owner')).toBeInTheDocument() // recapped field label
    expect(screen.getAllByText('—').length).toBeGreaterThan(0) // untouched fields get an explicit placeholder

    // The terminal button now reads submitLabel — "Next" is gone.
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()

    // Every section header's Edit affordance jumps back to that step, values retained.
    fireEvent.click(screen.getByRole('button', { name: 'Edit Basic Info' }))
    await waitFor(() => expect(titleInput().value).toBe('Summary Deal'))

    // Walk back to Summary and submit.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Owner')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('uses submitLabel ("Update") as the summary step\'s terminal button, not a hardcoded "Create"', async () => {
    render(
      <CreationSheet
        open
        onOpenChange={() => {}}
        config={dealsConfig}
        onSubmit={() => {}}
        showSummaryStep
        submitLabel="Update"
      />,
    )
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement
    fireEvent.change(titleInput(), { target: { value: 'Update Deal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Owner')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('button', { name: 'Update' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('is a no-op for a single-group config — no rail exists to append a summary step to', () => {
    render(
      <CreationSheet open onOpenChange={() => {}} config={companiesConfig} onSubmit={() => {}} showSummaryStep />,
    )
    expect(screen.queryByRole('navigation', { name: 'Progress' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})

describe('CreationSheet — clean state on every open (round-1 QA `sheet-reopen-clean`)', () => {
  it('reopening after a successful create shows EMPTY fields, not the previous submission', async () => {
    const onSubmit = vi.fn()
    const { rerender } = render(
      <CreationSheet open onOpenChange={() => {}} config={companiesConfig} onSubmit={onSubmit} />,
    )

    fireEvent.change(screen.getByLabelText(/Company/), { target: { value: 'Stale Values Ltd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    // Close (the consumer's post-submit responsibility), then reopen.
    rerender(<CreationSheet open={false} onOpenChange={() => {}} config={companiesConfig} onSubmit={onSubmit} />)
    rerender(<CreationSheet open onOpenChange={() => {}} config={companiesConfig} onSubmit={onSubmit} />)

    // rhf state was reset on the open transition — no stale value.
    await waitFor(() =>
      expect((screen.getByLabelText(/Company/) as HTMLInputElement).value).toBe(''),
    )
  })

  it('reopening a wizard resets values AND returns to step 1', async () => {
    const { rerender } = render(
      <CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} />,
    )
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement

    fireEvent.change(titleInput(), { target: { value: 'Wizard Deal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Owner')).toBeInTheDocument()

    rerender(<CreationSheet open={false} onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} />)
    rerender(<CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} />)

    // Back on step 1 with a clean form.
    expect(screen.queryByText('Owner')).not.toBeInTheDocument()
    await waitFor(() => expect(titleInput().value).toBe(''))
  })
})

/**
 * Round 5, run 2026-09-05-preventive-maintenance. Dismissing a creation sheet
 * with unsaved input destroyed it silently — flagged by three separate gates
 * and rated the highest-cost interaction defect on the screen (ruling B3).
 * The guard lives on `Sheet`'s `onOpenChange`, the one seam every dismissal
 * route funnels through, so these pin BOTH halves of the contract: a dirty
 * form prompts, and a CLEAN one still closes instantly (an untouched sheet
 * must not be taxed with a dialog).
 */
describe('CreationSheet — discard guard on dismissal', () => {
  it('closes immediately when the form is untouched', () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={dealsConfig} onSubmit={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('prompts instead of closing when the form is dirty', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={dealsConfig} onSubmit={() => {}} />)

    fireEvent.change(document.getElementById('sf-title') as HTMLInputElement, {
      target: { value: 'Half-typed work' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // The sheet did NOT close; a confirmation stands in the way.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('"Keep editing" dismisses the prompt and preserves the typed value', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={dealsConfig} onSubmit={() => {}} />)
    const titleInput = () => document.getElementById('sf-title') as HTMLInputElement

    fireEvent.change(titleInput(), { target: { value: 'Half-typed work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(titleInput().value).toBe('Half-typed work')
  })

  it('"Discard changes" closes the sheet', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={dealsConfig} onSubmit={() => {}} />)

    fireEvent.change(document.getElementById('sf-title') as HTMLInputElement, {
      target: { value: 'Half-typed work' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

/**
 * Round 5/6: a blocked advance rendered correct error text and `aria-invalid`
 * but left focus on the Next button, so a keyboard or screen-reader user was
 * told "Required" with no indication of WHICH field to return to. Both round 4
 * and round 5 measured `document.activeElement` still on Next.
 */
describe('CreationSheet — blocked advance moves focus to the first invalid field', () => {
  it('focuses the offending input instead of leaving focus on Next', async () => {
    render(<CreationSheet open onOpenChange={() => {}} config={dealsConfig} onSubmit={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('sf-title')))
  })
})

/**
 * Round-7 code review, P1-1: the discard guard was wired into two of
 * `CreationSheet`'s three render paths. The single-group `FormSheet` path — the
 * one a <=5-field module takes — had the same bug and no coverage, because
 * every discard test above uses `dealsConfig`, which takes the wizard path.
 * `companiesConfig` is the fixture that exercises `FormSheet`; these pin the
 * guard on it so the paths cannot drift apart again.
 */
describe('CreationSheet — discard guard on the non-wizard (flat / FormSheet) path', () => {
  // This path has no footer Cancel (a floating close covers abandoning), so the
  // gesture under test is Escape — which is also the one every path shares.
  const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' })

  it('prompts instead of closing when the form is dirty', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={companiesConfig} onSubmit={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Company/), { target: { value: 'Half-typed' } })
    escape()

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('"Keep editing" returns to the sheet with the value intact', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={companiesConfig} onSubmit={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Company/), { target: { value: 'Half-typed' } })
    escape()
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect((screen.getByLabelText(/Company/) as HTMLInputElement).value).toBe('Half-typed')
  })

  it('"Discard changes" closes the sheet', async () => {
    const onOpenChange = vi.fn()
    render(<CreationSheet open onOpenChange={onOpenChange} config={companiesConfig} onSubmit={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Company/), { target: { value: 'Half-typed' } })
    escape()
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
