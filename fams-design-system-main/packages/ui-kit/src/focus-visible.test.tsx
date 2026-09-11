/**
 * Keyboard focus-ring contract (fix3 — round-3 UX P1 "invisible keyboard
 * focus", WCAG 2.4.7 / UX-NOTES §7 ":focus-visible ring, 2px, primary").
 *
 * jsdom has no CSS engine, so these are the computed-style assertions'
 * stand-in: they pin the class-level contract on the representative controls
 * the gate flagged — a ≥2px `:focus-visible` ring wired to the `ring` token
 * (now PRIMARY, not primary-50) on every interactive control, instant (no
 * `transition-all` fading the ring in), with `bare`/inset controls covered by
 * their shell's `has-[:focus-visible]` ring instead of an inner one.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './primitives/Button'
import { Input } from './primitives/Input'
import { InsetField } from './primitives/InsetField'
import { Select, SelectTrigger, SelectValue } from './primitives/Select'
import { PhoneInput } from './composites/PhoneInput'
import { VehicleMarker } from './domain/map/VehicleMarker'

describe('focus-visible ring contract', () => {
  it('Button: 2px focus-visible ring, painted instantly (no transition-all)', () => {
    render(<Button>Create</Button>)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn.className).toContain('focus-visible:ring-2')
    expect(btn.className).toContain('focus-visible:ring-ring')
    // `transition-all` animated box-shadow → the ring faded in from 0px and
    // keyboard focus sampled as invisible. Rings must not be transitioned.
    expect(btn.className).not.toContain('transition-all')
  })

  it('Input (plain): solid focus-visible ring on the ring token', () => {
    render(<Input aria-label="Email" />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input.className).toContain('focus-visible:ring-2')
    expect(input.className).toContain('focus-visible:ring-ring')
  })

  it('Input (floating label): same ring contract', () => {
    render(<Input label="Email" id="email" />)
    const input = document.getElementById('email') as HTMLInputElement
    expect(input.className).toContain('focus-visible:ring-2')
    expect(input.className).toContain('focus-visible:ring-ring')
  })

  it('SelectTrigger: keyboard ring via :focus-visible (mouse keeps border only)', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Role">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
      </Select>,
    )
    const trigger = screen.getByRole('combobox', { name: 'Role' })
    expect(trigger.className).toContain('focus-visible:ring-2')
    expect(trigger.className).toContain('focus-visible:ring-ring')
  })

  it('InsetField shell: has-[:focus-visible] ring covers its bare inner controls', () => {
    render(
      <InsetField label="Ticket Source" htmlFor="src" data-testid="shell">
        <Input id="src" bare aria-label="Ticket Source" />
      </InsetField>,
    )
    const shell = screen.getByTestId('shell')
    expect(shell.className).toContain('has-[:focus-visible]:ring-2')
    expect(shell.className).toContain('has-[:focus-visible]:ring-ring')
    // The bare inner control stays chrome-less — the shell owns the ring.
    const inner = screen.getByRole('textbox', { name: 'Ticket Source' })
    expect(inner.className).not.toContain('focus-visible:ring-2')
  })

  it('PhoneInput (non-bare): the composite wrapper carries the ring for both inner controls', () => {
    render(<PhoneInput value="+9745" onChange={() => {}} ariaLabel="Phone Number" />)
    const wrapper = document.querySelector('[data-slot="phone-input"]') as HTMLElement
    expect(wrapper.className).toContain('has-[:focus-visible]:ring-2')
    expect(wrapper.className).toContain('has-[:focus-visible]:ring-ring')
  })

  it('PhoneInput (bare): no wrapper ring — the InsetField shell owns it', () => {
    render(<PhoneInput value="+9745" onChange={() => {}} ariaLabel="Phone Number" bare />)
    const wrapper = document.querySelector('[data-slot="phone-input"]') as HTMLElement
    expect(wrapper.className).not.toContain('has-[:focus-visible]:ring-2')
  })

  it('VehicleMarker: map marker button shows a focus-visible ring (LM round-3 UX P2 B)', () => {
    render(<VehicleMarker label="Y 62210" />)
    const marker = screen.getByRole('button')
    expect(marker.className).toContain('focus-visible:ring-2')
    expect(marker.className).toContain('focus-visible:ring-ring')
  })
})
