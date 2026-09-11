# FloatingLabelInput — behavioral spec

## Source of truth

- Figma screenshots (Web Portal Settings page + New Job Order creation drawer)
- Walkthrough: `knowledge-base/product-context/22-settings-module-chrome.md` §"Form field pattern"
- Walkthrough: `knowledge-base/product-context/23-creation-drawer-spec.md` §"Form field pattern"

## Purpose

A form input where the **label hugs the top edge** of the input box and the
value sits below. The opposite of the standard `<Input>` primitive (label
above, then input — separate elements).

```
┌──────────────────────────────────────┐
│ DEFAULT MAP REGION                ⌄ │  ← caption 10-11px muted uppercase
│ Dubai                                │  ← value 14px foreground medium
└──────────────────────────────────────┘
```

## When to use

- **Settings module form fields** — every input in the 3-column chrome uses this
- **Creation drawer fields** — Job Order, Lead, Vehicle creation drawers
- **Detail-view inline edit forms**

When NOT to use: simple inline filters at the top of list views (use a
regular `<Input>`); fields where the label is so descriptive it can't fit
inside the input.

## Anatomy

```
┌─[border 1px]──────────────────────┐ ← border-border, focus → primary
│ [icon? 16px]  Caption label       │ ← caption: 10px medium muted
│               Value text or       │ ← value: 14px medium foreground
│               placeholder…        │
│                            [chev?]│ ← optional chevron-down for selects
└───────────────────────────────────┘
  height: 56px
  padding: 0 12px
  rounded-md (6px)
```

## Layout

- Container: `relative flex h-14 w-full items-center rounded-md border bg-input-background px-3`
- Leading icon (optional): 16px stroke, `var(--muted-foreground)`, `margin-right: 8px`
- Inner stack (label + value): `flex-col justify-center`
- Label: caption 10px, `font-medium`, `uppercase`, `tracking-wide` (`0.04em`)
- Input: 14px, `font-medium`, `text-foreground`, `bg-transparent`, `border-none`, `outline-none`
- Trailing chevron (optional): 16px, `var(--muted-foreground)`, `margin-left: 8px`

## States

| State | Border | Ring |
|---|---|---|
| Default | `border-border` | — |
| Focus-within | `border-primary` | `ring-2 ring-primary/15` |
| Error | `border-destructive` | — |
| Disabled | `border-border` + `opacity-60` | — |

## Props

```ts
interface FloatingLabelInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;                    // Caption inside top edge
  leadingIcon?: React.ReactNode;    // 16px stroke icon
  showChevron?: boolean;            // For select-like inputs
  errorText?: string;
  helperText?: string;
}
```

Passes all other `HTMLInputElement` attributes to the inner `<input>` (so
`value`, `onChange`, `placeholder`, `type`, `name`, etc. all work normally).

## Hard constraints

1. **Height is 56px** (`h-14`) — taller than the standard `<Input>` (40px)
   because of the label-inside-top-edge layout.
2. **Border-radius is `rounded-md` (6px)** — matches the rest of the form system.
3. **Label is uppercase tracked** — caption-style, never sentence case.
4. **Value font weight is 500 (medium)**, not 400 (regular) or 600 (semibold).
5. **Chevron only when `showChevron` is true** — don't add for non-select fields.

## Anti-patterns

- ❌ Using this for inline filters or compact search (too tall)
- ❌ Putting interactive elements inside (the entire container is the click target)
- ❌ Using as a multi-line textarea (use `<Textarea>` with a separate label)
- ❌ Hardcoding the height in pixels — use the `h-14` Tailwind class

## Forms helper composition

For full forms with validation, combine with `react-hook-form` + zod:

```tsx
<form>
  <FloatingLabelInput
    label="Petrol Cost / Liter"
    leadingIcon={<Fuel size={16} />}
    {...register('petrolCost', { valueAsNumber: true })}
    errorText={errors.petrolCost?.message}
  />
</form>
```

## Cross-references

- Used by: `SettingsModule`, `EntityCreationDrawer`, `PipelineCreationDrawer`
- Companion: `<Input>` (the inline-label sibling)
- Related: `settings-module.spec.md`, `creation-drawer.spec.md`
