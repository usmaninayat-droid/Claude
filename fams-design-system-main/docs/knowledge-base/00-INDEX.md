# FAMS Design System — Knowledge Base

Locked decisions from the July 2026 architecture R&D. **These files are the source of truth for any session working on the design system.** Read this index first, then the file relevant to your task. Full evidence: [research.html](../research.html) · full plan: [index.html](../index.html).

| File | What's locked in there |
|---|---|
| [decisions.md](decisions.md) | The complete numbered decision log — who decided what and why |
| [naming.md](naming.md) | All naming conventions (packages, repos, concepts, hierarchy) |
| [architecture.md](architecture.md) | Repos, tiers, folder structures, security model |
| [tech-stack.md](tech-stack.md) | Library picks + licenses + the 8 performance rules |
| [tenant-model.md](tenant-model.md) | The multi-tenant demo-environment model (deltas/resolved/capture/lifecycles) |

## Hard rules (never violate)

1. **Zero paid libraries/SaaS** — every dependency must be license-verified free OSS.
2. **Do not touch `./v5`** — the production Vue codebase is read-only reference material until the production rebuild phase (not started).
3. **The API structure is never restructured** — modules keep `api/` + `lib/` as-is; only frontends are rebuilt.
4. **Tokens: Ben's DTCG set is canonical**, single override: caption = 12px/14px.
5. **Core tier stays product-agnostic** (tokens, ui-kit, skeleton-kit, demo-kit) — lint-enforced; v5 vocabulary only in v5-tier packages.
6. **One table engine:** TanStack Table for ALL tables. React Aria = date/time pickers (+Tree) only.
7. Build order: design system foundation → composer port → demo environment → (later) production. Founder reviews at every phase gate.

## Source repos in this workspace

- `FAMS-Design-System-By-Ben/` — the engineering skeleton (monorepo, tokens, ~102 tested components, docs). Becomes the foundation.
- `FAMS-Design-System-By-Shaheer/` — the design truth + low-code runtime (~243 Figma-faithful components, recipe runtime, blocks, schemas). Gets ported in.
- `v5/` — production (Vue). Read-only blueprint. **Never modify.**
