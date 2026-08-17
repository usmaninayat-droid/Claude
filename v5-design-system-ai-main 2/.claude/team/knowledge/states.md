# Component States & Variants (harvested, FAMS-adapted)

> QA/UI must verify EVERY state. Priority when multiple apply: disabled>loading>active>focus>hover>default.

Component state definitions and variant patterns.

## Interactive States

### State Definitions

| State | Trigger | Visual Change |
|-------|---------|---------------|
| default | None | Base appearance |
| hover | Mouse over | Slight color shift |
| focus | Tab/click | Focus ring |
| active | Mouse down | Darkest color |
| disabled | disabled attr | Reduced opacity |
| loading | Async action | Spinner + opacity |

### State Priority

When multiple states apply, priority (highest to lowest):

1. disabled
2. loading
3. active
4. focus
5. hover
6. default

### State Transitions

```css
/* Standard transition for interactive elements */
.interactive {
  transition-property: color, background-color, border-color, box-shadow;
  transition-duration: var(--duration-fast);
  transition-timing-function: ease-in-out;
}
```

| Transition | Duration | Easing |
|------------|----------|--------|
| Color changes | 150ms | ease-in-out |
| Background | 150ms | ease-in-out |
| Transform | 200ms | ease-out |
| Opacity | 150ms | ease |
| Shadow | 200ms | ease-out |

## Focus States

### Focus Ring Spec

```css
/* Standard focus ring */
.focusable:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--ring-offset) var(--color-background),
              0 0 0 calc(var(--ring-offset) + var(--ring-width)) var(--ring-color);
}
```

| Property | Value |
|----------|-------|
| Ring width | 2px |
| Ring offset | 2px |
| Ring color | primary (blue-500) |
| Offset color | background |

### Focus Within

```css
/* Container focus when child is focused */
.container:focus-within {
  border-color: var(--color-ring);
}
```

## Disabled States

### Visual Treatment

