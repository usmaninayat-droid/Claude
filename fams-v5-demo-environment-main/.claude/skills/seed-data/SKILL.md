---
name: seed-data
description: Use for demo DATA changes — "add 10 trucks", "rename the depot", "add a driver called Ahmed", "give me a dispatcher login", personas/users, or fixing dangling-reference failures from demo check. NOT for adding new fields (edit-module) or styling (design system).
---

# Seed data (demo records & personas)

- **Per-tenant records:** `tenants/<t>/seeds/<m>.seed.json` (tenants: `fams`,
  `iwmp`; modules: `asset`, `workforce`, `ticketing`). Copy an existing record
  as a template — field keys must match the module's blueprint
  (`resolved/<t>/<m>.blueprint.json`), including any tenant-added fields.
- **Personas/logins:** `tenants/<t>/seeds/users.json` — copy an existing persona;
  privileges gate what they see (e.g. `settings.view`).
- **References:** `SingleReference`/`MultiReference` values must contain ids that
  exist in the target module's seeds. `pnpm demo check` fails on dangling refs
  and warns on inert ones (target type has no licensed module) — fix, don't skip.

## After every change

```
pnpm demo check
```

Then verify in the app: `pnpm --filter app dev` →
`http://localhost:6300/?tenant=<t>&persona=<personaId>`.

No resolve step is needed for seeds-only changes (seeds are not part of the
blueprint resolve pipeline), but `demo check` is mandatory.
