# src/ — build context (loads only when working here)
- `runtime/composition.ts` — `createAppRuntime(recipe)`: RBAC lists + rule-enforced moves. VERIFIED — don't rewrite.
- `runtime/config-render.ts` — config→view-model bridge (columns/cards/filters/detail). VERIFIED.
- `components/app-shell/` — AppShell + module-registry + view-renderers (the 9 module-type renderers, here in the folder). Wire its data inputs to `runtime/config-render.ts` builders.
- `components/`, `tokens/`, `icons/` — the component library, Figma-aligned tokens, icon set.
- `sim/` — dummy-data engine (EAV + rules + persistence). VERIFIED — pure TS, sandbox-tested.
- `showcase/`, `stories/` — the live catalog + Storybook.
Rule: a module renders from config via `runtime/config-render.ts`; never write per-product screen React.
