---
name: tenant-branding
description: Use when ONE tenant's brand should change — colors, theme values for FAMS/IWMP(Tadweer)/EAD/UCCP, or adding a new tenant's theme. NOT for global styling (styling-change skill). Logo/name/font/apps live in the demo environment's tenant manifest — this skill covers both sides.
---

# Tenant branding

One component, per-tenant looks — only via tokens + the tenant manifest. Never
fork a component per tenant (root hard rule 6).

## Colors / theme values (this repo)

Edit `packages/tokens/tokens/tenants/<t>.tokens.json` (fams, iwmp, ead, uccp —
new tenant = new file, same DTCG shape as the others; override only what
differs from core). Then:

```
pnpm --filter @fams/tokens build
pnpm lint
```

Style Dictionary emits `[data-tenant='<t>'] { … }` blocks. Verify in the
showcase (`:6100`) using its tenant switcher, in light AND dark.

## Logo / display name / font / applications (demo environment repo)

Those live in `../fams-v5-demo-environment/tenants/<t>/tenant.json`
(`branding.logo`, `name`, `fontFamily`, `applications[]`) — switch to that repo
and use its `tenant-branding` skill. Logo image files go in its
`app/public/branding/` (data, not components).

## Propagate

After the token build, reload the demo app (`:6300/?tenant=<t>`) — it links
this repo's `dist/` directly.
