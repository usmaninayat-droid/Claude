# Contract Management — Figma parity run (2026-09-16)

**Result:** the IWMP Contract Management flow (`/contract-management?tenant=iwmp`) now mirrors the Figma
"Tadweer — June Release" flow §3215:4609 end to end — list, the 10-step Create New Contract wizard, the
Contract Summary review step, and the Contract Details page with its Timeline and Raw Data drawers.
Everything is functional (search, filters, wizard state, pickers, config cards, KPI steppers, attachments,
summary review, timeline comments, raw-data search) and the Playwright gate walks the whole flow with
0 console errors at 1920×1080.

## Figma → build map
| Figma | Built | Wave / commit |
|---|---|---|
| List 2111:10733 | toolbar · KPI strip · contract cards | 1 · f91b765 |
| Wizard shell + Basic Info 2111:1925 | rail stepper · 56px fields | 2–3 · f91b765 |
| Zone Selection 2111:2185 | scaled map canvas · polygon · layers/zoom controls | 4 · f91b765 |
| Vehicles / Equipment / Workforce / Bins pickers 2111:2302…3690 | empty states · picker drawer · config cards | 5 · f91b765 |
| Services & Frequencies 2111:3933/3808 | service cards (Action/Recurrence/Frequency/Response) | 6 · fab91bd |
| KPI Targets 2111:4159/4565 | smart-hint pill · KPI cards (Fixed/Yearly/Manual) · 5-year preview | 6 · fab91bd |
| Attachments 2111:4484 | drop zone · attachment rows | 6 · fab91bd |
| Summary 2111:4992 | bordered sections · kv grid · 400h lot map · review tables · tag chips | 6c · fab91bd |
| Contract Details V5 2303:2988 | gauge · 6+3 tiles · contractor · 5 charts · 4 donuts · documents | 7 |
| Timeline V6 2303:3679 | 500px drawer · grouped entries · status badges · comment composer | 7 |
| Raw Data V7 2303:4514 | 1080px drawer · toolbar · 7-column table · live search | 7 |

## Real bugs found & fixed on the way
- Services picker never opened: `openPicker` read `draft[key]` while the draft stores services at `draft.services` (TypeError). Fixed with `draftItems()`.
- The gate swallowed the failure — its `unhandledRejection` hook never fired for a top-level-await throw; added `uncaughtException` + a `bail()` that prints collected console errors and a debug screenshot.
- Summary table cells inherited the 58px row height on chips (CSS `span` selector too broad) — scoped to direct children.

## Deviations from Figma (known, deliberate)
- The screen lives in the app's iframe module slot: the wizard overlay covers the content area only (app rails stay visible), the app rail is 46px (Figma 118) and the module top bar has no "List View | +" tab strip. Those belong to the app shell, not this screen.
- Contract Details: Figma's "Number of Services" tile uses a 32px avatar while its five siblings use 48px — built consistently at 48px. The KPI-table `#` column is 44px (Figma 34) so "2.1" doesn't truncate at Gilroy metrics. The Summary "Edit" link on KPI Target is `opacity:0` in Figma and was omitted.
- Functional extras Figma doesn't show: remove buttons on config/service cards, re-upload/remove on attachments, working search in the Raw Data drawer, posting a timeline comment.
- Some Figma icons (edit pencil in card headers, the 40px vehicle thumbnail, PDF glyph) export as empty placeholders from Dev Mode; the thumbnail and PDF glyph were captured from Figma screenshots instead, the empty edit icon was dropped.

## How to verify
```bash
node plan/run-2026-09-16-contract-management/shoot.mjs
```
Writes `qa/*.png` (list, every wizard step, pickers, summary, detail 1–4, timeline, raw) and prints the
interaction counters + console errors. Figma references live in `specs/*.png` and `specs/detail/`.
