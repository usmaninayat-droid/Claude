# Training Management (iwmp) — field provenance

> **The seed is GENERATED, not hand-authored.** Run
> `python3 tenants/iwmp/modules/training/generate-seed.py`, then
> `pnpm demo resolve iwmp && pnpm demo debt && pnpm demo check`.
> It ports the shift-rostering prototype's own training model verbatim, so the
> Training Register and the roster board can never disagree about who is
> trained on what. Never edit `tenants/iwmp/seeds/training.seed.json` by hand.

Where each field's content comes from. The scope document (IWMP-SCOPE-ROSTER-V01) is not in
this repo; its training tables were transcribed into the roster prototype and that transcription
is the authority here:

`tenants/iwmp/overrides/screens/shift-rostering/public/screens/shift-rostering/shift-rostering.html`
→ `const TRAININGS`, `const CATS`, `const LICENCE`, `GRACE_DAYS`, `TRAIN_TODAY`.

## Stated in the document

| Field | Source |
|---|---|
| Training Name | `TRAININGS[code].name` — verbatim (e.g. "Rear End Loader Operation", NOT "Rear Loader Operation") |
| Training Code | `TRAININGS` keys: DEF, WCS, RL, SL, HLC, CCV, BWC, TW |
| Validity (Months) | `TRAININGS[code].months` — DEF 24, WCS 6, all others 12 |
| Grace Period (Days) | `GRACE_DAYS` = 90 |
| Vehicle Categories | `CATS[].name` for the 6 equipment trainings; DEF/WCS have none |

| Training Register rows | The roster prototype's own `WORKFORCE` (43 people) and its per-worker training records — same names, roles, licences and attendance dates the board uses |
| Certificate status | `Valid` / `Re-training Due` (expired within the 90-day grace, BR-04/05) / `Expired` (past grace) / `Not Completed` — the same tiers the roster blocks and warns on |
| Employee Status | The roster's own unavailability wording: Licence Expired, HSE Expired, Medical Expired, Annual Leave, Sick Leave, Resigned, Terminated |

Who each training governs follows the prototype's gating exactly: every driver needs Defensive
Driving, every route helper needs Waste Collection Safety, and equipment training applies to the
drivers whose licence pool covers that vehicle category. The roster's two deliberately seeded
edge cases surface here too — **Tariq Mehmood**'s Defensive Driving is *Re-training Due* (expired
40 days, inside grace → the board's amber warning) and **Salim Haddad**'s Rear End Loader is
*Expired* (130 days, past grace → the board's hard block). Each driver's one missing equipment
training (`missEqp`) shows as *Not Completed*, which is what the board reports as
"Not trained for {vehicle}".

## NOT stated in the document — demo-only, kept deliberately

- **Category** (Equipment / Safety / Compliance / Operations) — invented classification. The
  document's `TRAININGS` table has no grouping. "Compliance" and "Operations" are currently
  unused by any seeded record; they exist only so the creation sheet offers a range.
- **Licence Class Required** — *derived*, not stated. `lic` (HDD/LDD/ANY) is an attribute of a
  **vehicle category** in `CATS`, not of a training. Each equipment training is joined to its
  vehicle category by the shared code to surface the licence it implies. DEF and WCS have no
  vehicle category, so their "Any valid licence" is an assumption.
- **Applies To** — inferred: equipment training → its licence class's role; DEF → drivers;
  WCS → drivers + helpers.
- **Training Owner** — a supervisor from the workforce seed, for demo realism.

Already removed for having no basis in the document: a Sessions tab, Next Session date + alert
banner, a certifications bar chart, Training Provider, Duration (Hours), and two invented
courses (HSE Induction, First Aid at Work).
