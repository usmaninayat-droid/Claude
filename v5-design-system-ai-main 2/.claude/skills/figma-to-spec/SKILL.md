---
name: figma-to-spec
description: Turn a Figma frame/link or screenshots into a structured FAMS spec — module/view mapping, fields, states, and acceptance criteria. Use at the start of an evolve-ds or product loop when the input is a design. Produces the spec the PO/UX work from.
allowed-tools: Read, Bash
---
# figma-to-spec (gate G1 input)

## Steps
1. Get the design: a **frame-level** Figma node screenshot (not a whole section —
   those time out) via the Figma MCP, or the user's screenshots.
2. Extract: layout regions, components, fields + their apparent **types**
   (text/date/currency/select/reference/boolean), states shown, interactions.
3. **Map to FAMS**: which module type + views; which fields → `systemcolumns`;
   card placements (header/title/body/footer); detail profile + right-panel tabs;
   filters. Never invent a screen or a token.
4. Emit a spec with **acceptance criteria** (checkable statements) — this is G1.

## Output
```yaml
spec:
  module: { type, views, entity }
  fields: [ { col, name, type } ]
  card: { header: [...], body: [...], footer: [...] }
  detail: { profile: [...], tabs: [...] }
  acceptance: [ "<checkable statement>", ... ]
```
