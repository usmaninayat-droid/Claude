# Callout — contract

Inline, non-modal tinted banner. Distinct from `AlertDialog` (modal) and `toast`
(transient) — a Callout sits in the page flow to convey persistent status/context.
Backport origin: ifm-workforce hand-rolled status banners with one-off
`color-mix` tints (worker-detail live-status / upcoming-leave) — the DS lacked an
inline callout, so this centralises the recipe.

## Shape
`Callout({ tone?, title?, children, icon?, actions?, onDismiss?, className })`
- **`tone`** — `info` (primary) · `success` · `warning` · `error` · `neutral`
  (muted). Default `info`.
- **`icon`** — override the tone's default icon, or `false` to hide.
- **`actions`** — trailing node (link/small button). **`onDismiss`** — renders a × button.

## Laws / a11y
- **Token-only.** The soft fill + border are `color-mix` over the tone's TOKEN
  (`--primary`/`--status-*`/`--muted-foreground`) + `--card` — theme-aware, no raw
  hex. This component is the SANCTIONED home for that tint; products consume it
  rather than inlining `color-mix` (coherence law).
- **a11y.** `role="alert"` for warning/error (assertive), `role="status"` otherwise;
  dismiss button is icon-only with `aria-label="Dismiss"`.

## Acceptance
1. Each tone renders its coloured icon + tinted fill/border from tokens (no hex).
2. `title`/`children`/`actions`/`onDismiss` are all optional and compose.
3. `icon={false}` hides the icon; a custom `icon` node overrides the default.
4. Coherence + a11y-static green.
