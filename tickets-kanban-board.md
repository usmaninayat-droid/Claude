# Tickets — Kanban Board View

> **Source:** Figma — *Tadweer – May Release*
> **Frame:** `Scroll on Hover` (node `309:15094`), 1920 × 1080
> **Link:** https://www.figma.com/design/vTuiXC3D390q2rFJSeeYg2/Tadweer---May-Release?node-id=309-15094

A ticket-management **Kanban board** for a waste-management operations platform (Tadweer). Tickets flow left-to-right through status columns and are represented as compact cards.

---

## Screen layout

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Top Nav:  Tickets    [ List View | Kanban View ]                           │
├───────────────────────────────────────────────────────────────────────────┤
│  [ 🔍 Search Task ]        [⚙filter] [↕sort] [👤 Assignee ▾]   [+ Create New Ticket] │
├───────────────────────────────────────────────────────────────────────────┤
│ New Requests│ Scheduled │In Progress│ Resolved │ Overdue │ Closed │ Rejected │
│    (n)      │    (n)    │    (n)    │   (n)    │   (n)   │  (n)   │   (n)    │
│  ┌───────┐  │ ┌───────┐ │ ┌───────┐ │┌───────┐ │┌──────┐ │┌─────┐ │┌───────┐ │
│  │ card  │  │ │ card  │ │ │ card  │ ││ card  │ ││ card │ ││card │ ││ card  │ │
│  └───────┘  │ └───────┘ │ └───────┘ │└───────┘ │└──────┘ │└─────┘ │└───────┘ │
│    ...      │   ...     │   ...     │  ...     │  ...    │  ...   │   ...    │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Left rail:** vertical app navigation (icons only) — dashboard, tickets (active), and other modules.
- **Top bar:** page title `Tickets`, a **List View / Kanban View** tab toggle (Kanban active).
- **Toolbar:** search field (`Search Task`), filter, sort, an **Assignee** dropdown, and a primary **+ Create New Ticket** button (right-aligned).
- **Board:** seven horizontally-scrolling status columns; each column body scrolls vertically ("Scroll on Hover").

---

## Status columns

Each column has a **colored top accent bar**, a **title**, and a **count badge**. Left → right:

| # | Column | Meaning |
|---|--------|---------|
| 1 | **New Requests** | Newly submitted, not yet triaged/scheduled |
| 2 | **Scheduled** | Assigned a slot; may carry a `Reopened` flag |
| 3 | **In Progress** | Currently being worked |
| 4 | **Resolved** | Work completed, pending closure |
| 5 | **Overdue** | Past SLA / due time (shows overdue badge) |
| 6 | **Closed** | Finalized |
| 7 | **Rejected** | Declined / invalid |

---

## Ticket card anatomy

Each card (Figma `modal`, 290 px wide) stacks the following:

**Header row**
- `# TK-XXXXX` — ticket ID (hash icon)
- **Priority flag** — `Critical` / `Medium` / `Minor` (flag icon, color-coded)

**Body**
- **Ticket title** (e.g. *"Ticket Title here"*)
- **Detail rows** (icon + short label), including:
  - Channel / source — `IWMP`, `Halo`, `TAMM`, `US` (phone / monitor icon)
  - Request type — `Complaint`, `Incident`, `Report Wrong Practices` (file-search / alert-octagon icon)
  - Service — `Service Type`, `Waste Container Cleaning`, `Dead Animals Removal`, `Green Waste Collection`, `Residential Waste Removal` (tool icon)
  - Category — `Collection & Transportation` (alert-triangle icon)
  - Assignee name — e.g. *Amir Khan, Novaed Iqbal, Kapil Kumar* (user icon)
  - Location — e.g. *Al Reem Island, Khalifa City, Zayed Al Nahyan* (map-pin icon)

**Footer**
- Assignee **avatar** (initial, e.g. `G`, `M`)
- **Attachment count** (clock-stopwatch / paperclip)
- **Sub-task or comment count** (calendar icon)
- **Time-left** indicator — e.g. `2d 5h left`, `18h 20m left`, or an overdue badge like `+3h 24m`

---

## Design tokens

**Colors**

| Token | Hex | Use |
|-------|-----|-----|
| Primary (Green) | `#22C882` | Brand / primary button, active nav |
| Primary Green 100 | `#DDF4EA` | Light green surface |
| Error | `#F04438` | Critical priority / overdue |
| Warning | `#F79009` | Medium priority |
| Success | `#12B76A` | Resolved / positive |
| Info | `#0072D6` | Info accents |
| Accent — Lavender | `#9E77ED` | Column / tag accents |
| Accent — Pink | `#EE46BC` | Column / tag accents |
| Accent — Rose | `#F63D68` | Column / tag accents |
| Accent — Flame | `#FF6A1A` | Column / tag accents |
| Neutral text (dark) | `#101828` / `#1D2939` | Headings / body |
| Neutral (muted) | `#667085` | Secondary text |
| Border light | `#D0D5DD` | Card / input borders |
| Grey 50 / White | `#F9FAFB` / `#FFFFFF` | Backgrounds |

**Typography** — Font family **Gilroy**
- Heading (Semibold): 16 px / 24 line-height / weight 600
- Body 1 (Semibold): 14 px / 20 line-height / weight 600
- Body 2: 12 px

**Icon sizes:** 14 (2x-small), 16 (x-small), 20 (small)

---

## Notes

- Board is **light mode**.
- Columns are independently vertically scrollable; the whole board scrolls horizontally.
- Priority, channel, and status are the primary color-coded signals on each card.
- Card fields present but with placeholder copy in the design (*"Ticket Title here"*, *"Some kind of short d…"*) — real content comes from ticket data.
