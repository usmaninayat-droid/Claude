# Calendar block — scheduled items

**Type:** `calendar` · **Form:** TSX `ModuleConfig` (`calendar.block.tsx` — to author).

## What it is
A month/week calendar of dated records, color-coded by a chosen field, with prev/next/Today nav and
a date-picker. Use it for scheduled inspections, plans, shifts, maintenance windows.

## Anatomy
- Month/Week toggle + navigation + date picker.
- Events placed by a date field, colored by a "view-by" field (with a legend).
- Click an event → opens the record detail.

## Adapt
The date field, the view-by/color field, the event label. Reuses the DS `CalendarView` (the pipeline
`calendar` view already wraps it).

## Compose
Splice the TSX `ModuleConfig` into the app. Reference: facilities-ops `schedule.tsx` + the pipeline calendar view.
