# V5 Design System — Ai

A **dynamic React composition design system**: compose any product from a fixed
menu of modules (new or existing) that always feels like one coherent product,
runs functionally on **dummy data** (no backend), and is backend-swappable later.
Everything needed to run is in this folder — nothing is referenced from outside it.

## Run it
```bash
pnpm install
pnpm dev          # the live component showcase
pnpm storybook    # the component workbench
pnpm test         # vitest spine tests
pnpm build        # tsc + vite production build
```

## Contributing
See **[CONTRIBUTING.md](CONTRIBUTING.md)** to get set up, plus **[docs/](docs/)** for the
architecture, the module-type cookbook, the build sequence, and ADRs. The 6 coherence laws
(token-only · one shell · fixed module-type menu · config-driven · theming = tokens+logo ·
FAMS-default) are what keep every product feeling like one coherent system — read them first.

## Layout (all self-contained)
- `src/components` · `src/tokens` · `src/icons` — the component library + Figma-aligned tokens + icons.
- `src/components/app-shell` — AppShell + the 9 module-type renderers.
- `src/runtime` — composition + the config-driven render bridge (the dynamic core).
- `src/sim` — dummy-data engine (EAV + rules + persistence).
- `src/showcase` · `src/stories` — the live catalog + Storybook.
- `recipes/` — declarative product compositions (example: `recipes/crm/`).
- `schemas/` — recipe + module-type JSON schemas.
- `assets/` · `Font/` — icons, vectors, fonts.

## What it is
- A fixed menu of **module types** (entity · pipeline · dashboard · live-monitoring ·
  reports · inbox · settings · calendar · forms), each with a config-driven renderer.
- A module is **config, not React** — its UI is derived from the config.
- See `KIT-INDEX.md` for the full component/module/schema inventory.

> The dummy-data engine, composition runtime, and config-render bridge are verified
> (41 checks). Products are built in their own repos, consuming this design system read-only.
