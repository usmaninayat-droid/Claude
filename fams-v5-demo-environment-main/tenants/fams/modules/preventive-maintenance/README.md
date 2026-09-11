# Preventive Maintenance — status flow (provisional)

`uiConfig.statusChangeRule` in `blueprint.json` encodes the forward-only,
single-terminal-state graph:

```
scheduled -> jobOrderCreated -> ongoing -> { overdue | completed }
overdue -> completed
```

This graph is **inferred, not read from Figma**. Node `29995:11873`
("Status Flows") turned out to be a plain badge legend with no
connector/arrow nodes — see
`plan/run-2026-08-25-pipelines-entities/specs/preventive-maintenance/SPEC.md`
§6 and `REFERENCE-MINING.md` §6.1/§6.2. The graph above was reconstructed from
two corroborating frames (the Grouped List's 4 metric cards, and the Trigger
Rule step's "Preview" table's two-phase `Reminder`/`Job Order Creation` model),
not read off a drawn state machine. Treat it as **provisional pending designer
confirmation** — do not add enforcement UI or guard/reason fields on top of it
without that confirmation.

## `trigger` (`systemcol18`) → job order auto-creation

`uiConfig.recordAutomation` (`@fams/v5-composer`'s generic record-automation
vocabulary, `automation.ts`) declares: when `systemcol18` ("Trigger") becomes
`"fired"`, create a `maintenance/job-order` record (vehicle ← this rule's
`systemcol1`, title ← this rule's `title`, Source Rule (`systemcol31`) ← this
rule's id, status ← `reported-issues`) and patch this record back with
`status: "jobOrderCreated"` + `linkedJobOrder` (`systemcol19`) → the created
job order's id.

**Why a dedicated `trigger` column and not the `status` field itself:** the
requirement is that this record's `status` flips to `jobOrderCreated` as an
EFFECT of the automation — so `status` cannot also be the automation's cause
(that would make the effect its own trigger, or require the automation to
special-case its own resulting state to avoid re-firing forever). `trigger`
is a separate, narrower vocabulary (`armed`/`fired`) that exists ONLY to carry
this cause.

**`trigger` is the demo's honest simulation of a telematics threshold, not a
computed one.** In production this would flip automatically when a backend
scheduler observes the vehicle crossing a real threshold (odometer/engine-
hours/calendar interval — the same numbers this rule already tracks in
`systemcol2`/`systemcol4`/`systemcol9` etc.). This demo environment has no
backend scheduler and does not compute odometer deltas over time, so it never
flips `trigger` on its own — it exposes `trigger` as a plain editable field in
the detail sheet (`uiConfig.profile.details`) so a human (a demo operator, or
the interaction-gate test) can flip it by hand and observe the real
automation fire. Do not read the seeded `armed`/`fired` values as evidence of
a live threshold calculation.
