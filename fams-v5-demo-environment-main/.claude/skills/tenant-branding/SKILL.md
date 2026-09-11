---
name: tenant-branding
description: Use when ONE tenant's brand should change — logo, brand colors, font, app/product name — e.g. "make Tadweer green", "swap the IWMP logo", "FAMS should use a different font". NOT for global styling of components (that is the design system's styling-change skill).
---

# Tenant branding (per-tenant look, zero component forks)

Branding is split across the two repos. Never fork a component per tenant.

## Colors (per tenant)

In `../fams-design-system`: edit
`packages/tokens/tokens/tenants/<t>.tokens.json` (exists: fams, iwmp, ead, uccp;
new tenant = new file next to them). Then:

```
cd ../fams-design-system && pnpm --filter @fams/tokens build
```

Style Dictionary emits `[data-tenant='<t>'] { … }` override blocks; the app
picks them up on reload — verify at `:6300/?tenant=<t>`.

## Logo / name / apps / font (per tenant)

Here, in `tenants/<t>/tenant.json`:
- `branding.logo` — logo key; the asset file lives in `app/public/branding/`
  (adding an image file there is data, not a component — allowed).
- `name`, `fontFamily` (e.g. `"Gilroy"`), `applications[]` (id/name/icon +
  module list — the outer nav rail).

Then `pnpm demo resolve <t> && pnpm demo check`, verify at
`:6300/?tenant=<t>`.

## New tenant

1. DS repo: `packages/tokens/tokens/tenants/<id>.tokens.json` → build tokens.
2. Here: `tenants/<id>/tenant.json` (+ `seeds/users.json`, seeds, optional
   deltas) → `pnpm demo resolve <id>` → `pnpm demo check`.

## Never

- Never hardcode a color/logo in a component or in `app/` — tokens and the
  tenant manifest are the only branding surfaces (DS hard rule 6: no per-tenant
  component forks).
