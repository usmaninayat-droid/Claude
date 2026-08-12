# WFMC — Workforce Management Console · Working Brief

Consolidated context for the Tajmee'e Workforce Management Console build.
Everything below is derived from three source attachments — see [Source
files](#source-files). This file is the single reference; the attachments
themselves live outside the repo.

- **Owner:** Usman Inayat (usman.inayat5@gmail.com)
- **Current phase:** Blue (committed) design review — internal, due **Thu 13 Aug 2026**
- **Prototype in repo:** [wfmc-blue-review.html](wfmc-blue-review.html) · 8 routes covering all blue workstreams
- **Reference prototype:** `Tajmee_Workforce_Console.html` (client-side · not in repo)

---

## 1. Source files

| # | File | What it is |
|---|---|---|
| 1 | `Tajmeee_WFMC_BRD_v1.2 (1).docx` | Business Requirements Document, ref **TAJ-OPS-BRD-2026-014**, 03 Aug 2026, Vaishak A. (Ops & Analytics Manager, Tajmee'e). 78 functions across 10 modules; 65 Must, 11 Should, 2 Could. |
| 2 | `Tajmee_Workforce_Console (2) (1) (1).html` | Working clickable prototype — declared **authoritative UX reference** in the BRD. |
| 3 | `[V5 + IWMP] Designs Weekly Sync – 2026_08_06 – Notizen von Gemini.pdf` | Meeting transcript + auto-summary from the 06-Aug design sync. Sets the Thursday delivery cut. |

---

## 2. Business context (from BRD §2)

Tajmee'e (Tadweer Group) operates municipal waste collection across
LOTs 3, 4 and 5. Full-mobilization workforce ≈ **2,000 staff**, fleet
**365 vehicles**, **70,000 bins**, **4 depots**, **3 shifts** seven days
with staggered weekly offs, majority housed in **company-managed labour
camps**. Today: spreadsheets, manual attendance, email approvals. WFMC
replaces that with one web console covering the full employee lifecycle.

**Objectives (§3):**

| # | Objective | Success measure |
|---|---|---|
| O1 | Single source of truth for workforce | 100% active employees in WFMC; Excel retired within 60 days of go-live |
| O2 | Zero missed legal-document renewals | All expiries alerted at lead times; zero roster-ineligible driver deployments |
| O3 | Same-day attendance visibility | Shortage by LOT/shift on dashboard by 08:00 daily |
| O4 | Workflow-driven approvals with audit | 100% of leave/disciplinary/TBT in-system with SLA tracking |
| O5 | Structured safety communication | Monthly TBT calendar published before month start |
| O6 | Full accommodation traceability | Every camp resident mapped to room/bed; live occupancy 100%; zero double allocations |
| O7 | Scalable | New LOT/camp/Emirate onboarded by configuration only |

---

## 3. Meeting cut · 06 Aug 2026

Kashish Bindrani presented a **colour-coded functional register** against
the BRD. Abusufean Ali set the delivery cadence:

| Bucket | Date (2026) | Meaning |
|---|---|---|
| **Blue · Committed** | Internal review **Thu 13 Aug**; finalized ~Sun 17 Aug ("one-and-a-half week") | Vendor commits to build; timelines shared with Tajmee'e |
| **Green · Good for product** | Reviewed **Thu 20 Aug** | Reusable across MM / DMT / HR pitches; **not shown to client until internal approval** |
| **Parked** | Not in scope this phase | Tajmee'e-custom items — camp, TBT, HSE, EOM, timesheets/payroll, extra alert triggers, org chart, etc. |

**Explicit ask:** blue and green **visually partitioned** in any deck. Green cannot leak to the client until internal sign-off. Prototype [wfmc-blue-review.html](wfmc-blue-review.html) enforces this by only rendering blue routes; green/parked are listed on `#/excluded` for context.

**Open decision from register:** employee master source of truth —
`register = admin-created (M00)` vs `meeting = Maximo`. BRD §8 settles it in
WFMC's favour (Maximo is inbound *vehicle master* only) but a written note
is still needed.

---

## 4. Blue scope — the six workstreams + shift entity

All seven items must be design-complete for Thursday. The prototype covers
every one.

### 0. Global Shift Entity — foundation
Organisation-level shift catalogue. **Shift Name is decoupled from Shift
Timings.** One shift name (e.g. "Afternoon Shift") holds multiple timing
variants. Consumed by workstreams 1, 3, 5, 6. Owner: Muhammad Shaheer
(share config draft; Kashish + Benjamin review).

### 1. Employee Master · field alignment (EMP)
Append Tajmee'e-specific fields **without removing** the existing platform
master. Two new mandatory fields: **Weekly off-day**, **Assigned shift**
(bound to Global Shift). Blocked on: **Kashish's 29-column Excel**.

### 2. Document Expiry Alerts + Dispatch Block (NTF)
**Three credentials only:** Emirates ID · Passport · Driving Licence.
Buckets at **90 / 60 / 30 / 7 days**. Alerts sit in a **dedicated section
inside the existing alerts module** (not a new module). Digest toggle:
**weekly or monthly** email. Expired credential = **hard block at
dispatch**, no override this phase.

### 3. Training · Skill · Materials Library (TRN)
- **Materials Library is new** — a document repository (upload / preview / mark reviewed). Kashish's flagged gap.
- Completion is **manually marked**; explicitly no engagement/progress tracking.
- **Skill matrix is derived** from training history; **not editable**.
- **TBT calendar deferred** this phase.
- Generalise for other ESPs — Abusufean: current shape is "maybe too simple".

### 4. Working-hours validation + rostered-off block (ROS)
- **6 consecutive days → day 7 auto-blocked** as mandatory off. Hard block.
- **Day 6 shows amber warning** (tipping-point cell).
- Smart-planning board **hard-blocks** operators from assigning
  rostered-off personnel to dynamically-generated routes.

### 5. Standby vs Reliever (POOL)

| Absence | Trigger | Covered by | Chip style |
|---|---|---|---|
| Planned leave (approved) | Approval workflow · before shift | **Standby workforce** | Amber dashed |
| No-show / emergency | Live · after shift start | **Reliever workforce** (pre-rostered buffer) | Green solid-bordered |

Two structurally different flows. Must be visually distinguishable on the roster.

### 6. Shift Attendance · two sources (ATT)

| Employee type | Source | Mechanism |
|---|---|---|
| HD Driver / LD Driver | **Plan-login** | Opens & executes plan in app; login = In, completion = Out |
| Labour / Helper / Supervisor / Terminal | **BioTime** | Biometric device at depot; 10-min poll |

Register never conflates the two. Missing-source state = "Absent · plan not opened" (never a BioTime miss).

---

## 5. Explicit exclusions (do not build, do not estimate)

From BRD §4.2 + meeting cut:

- Camp Management (10 Musts · added in v1.2 · biggest deferred block)
- TBT Calendar (create · publish · yearly view)
- Disciplinary & HSE (incident · CAPA · warning ladder)
- Employee of the Month workflow
- Timesheets · OT/night/holiday classification · Oracle payroll export
- Exit clearance · encashment · lifecycle extras
- Extra notification triggers: medical fitness · visa · labour card · probation · contract · birthdays
- Reports Center module · Administration module · Settings module

The BRD notes: prototype screens exist for Reports / Administration /
Settings but **"must not be estimated or built in this phase"**.

---

## 6. Contractual watch-outs

Two clauses in the BRD to negotiate before signature:

1. **§1 + §12** — *"where wording leaves room for interpretation, the prototype behaviour is the requirement"* and *"the vendor matches layouts, workflows, validations and popup behaviours unless a change is agreed in writing."* Open-ended commitment to someone else's UI. Needs a written carve-out: **IWMP design system governs presentation, prototype governs behaviour only**.
2. **§4.2** — Reports / Admin / Settings screens must not be scoped in. Guard against them entering the estimate.

---

## 7. Deliverables expected back to Tajmee'e (BRD §13)

| # | Output |
|---|---|
| 1 | **Appendix A checklist completed** — 78 functions, one of A / PA / RD / CR each, plus remarks |
| 2 | **Solution design** for RD/PA items |
| 3 | **Effort estimate** per function |
| 4 | **Alternatives** for anything IWMP cannot meet |

Acceptance is against **Must-priority items in §7** and **flows in §9**,
verified in UAT with migrated LOT 4 data and one camp's live register as
the pilot set.

---

## 8. Open dependencies (block Thursday)

| # | Item | Owner | Impact if late |
|---|---|---|---|
| 1 | 29-column Manpower Master Excel | Kashish Bindrani | Employee Master field diff incomplete |
| 2 | Skill Matrix source details | Kashish Bindrani | Derived-mapping rules can only be inferred from HTML |
| 3 | Global Shift configuration draft | Muhammad Shaheer | Blocks 4 downstream workstreams; Kashish + Benjamin review |
| 4 | Employee-master source of truth decision | Team | Determines whether create/edit screens are built at all |
| 5 | Biometric device APIs & depot connectivity | Tajmee'e | BRD §12 pre-UAT dependency; ATT-01 risk |

---

## 9. Meeting action items (from Gemini notes)

- **The group** — map event notifications: define standard email/SMS/WhatsApp templates
- **Muhammad Taimoor** — build immobilizer features (privilege gate, audit log, user reporting)
- **Muhammad Taimoor** — research critical-actions auth (OTP / 2FA options)
- **Muhammad Taimoor** — implement contract UI (total + daily mileage allowance)
- **The group** — maintenance-due service reminder report
- **The group** — daily critical-exception summary email
- **Muhammad Shaheer** — share Shift configuration draft
- **Kashish + Benjamin** — review Shift configuration
- **Kashish** — share Skill Matrix details
- **Kashish** — distribute the 29-column Excel
- **Kashish** — review RAG report design (driver behaviour)
- **Muhammad Shaheer** — handle Maintenance report tasks
- **Muhammad Shaheer** — update Fleet Manager Console
- **Abusufean** — schedule fuel-monitoring follow-up

Immobilizer / fleet-reporting / fuel-monitoring items sit **outside WFMC scope** but are on the same team's plate.

---

## 10. Key decisions locked in this meeting

- **Immobilizer** = standard reusable platform event (notifications + PIN + audit-log timeline in asset profile)
- **Critical-action auth** — platform-wide standard replacing simple password
- **Post-immobilization recovery** = event with standard statuses, not a new flow
- **Rental mileage** — total + daily config within vehicle profile
- **IWMP timeline** — 1.5-week delivery for priority items, review at 1 week
- **Global shift configuration adopted** — centralized org-level, not per-module

---

## 11. Roles & data scoping (BRD §5)

Six roles at launch. Admin screens are out of scope but scoping enforcement is not.

| Role | Scope |
|---|---|
| System Administrator | Platform level |
| Operations Manager | All modules; approves leave/OT/disciplinary; EOM; publishes rosters/TBT; camp master |
| HR Manager / Officer | Employee, leave, exits, disciplinary, training; bed allocation |
| LOT Supervisor | Own-LOT: attendance, roster view, leave endorse, incident, TBT logging |
| Camp Boss | Own-camp: room/bed occupancy, transfer requests, handover |
| Viewer | Read-only dashboards; no personal-document access |

Enforcement: per module × action (view/create/edit/approve/export) × LOT × camp.

---

## 12. Integrations (BRD §10)

| System | Direction | Data | Mode |
|---|---|---|---|
| Biometric controllers (4 depots) | In | Punch events | API / device poll · 10 min |
| IWMP core | Bi | Route in; jobs/TBT out; completion in | API |
| Maximo | In | Vehicle master + availability | Scheduled sync |
| Oracle payroll | Out | Locked monthly timesheets | Monthly file / API |
| SMS gateway | Out | Employee alerts EN/AR/HI/UR | API |
| Corporate email | Out | Workflow + compliance notices | SMTP / API |
| SSO / IdP | In | Auth + provisioning | SAML / OIDC |

---

## 13. Non-functional requirements (BRD §11)

- **Performance:** standard views < 3 s; exports < 30 s at 2,000+ employees, 1,400+ beds, 35+ days attendance
- **Availability:** 99.5% during 04:00–24:00 GST, 7 days
- **Security:** action-level RBAC + LOT + camp scoping; encrypted at rest and in transit; document access logged
- **Data residency:** UAE + Tadweer Group IT policy
- **Auditability:** all create/change/approval/export/allocation events · 5-year retention
- **Scalability:** 5,000 employees / 3,500 beds without redesign
- **Backup/recovery:** daily backup · RPO 24 h · RTO 8 h
- **Browsers:** current Chrome + Edge · no client install

---

## Appendix — Function count by module (from BRD Appendix A)

| Module | Ref | Functions | Must |
|---|---|---|---|
| Dashboard | DSH | 11 | 9 |
| Employee Management | EMP | 8 | 7 |
| Attendance & Timesheet | ATT | 6 | 5 |
| Roster & Job Assignment | ROS | 6 | 5 |
| Leave Management | LVE | 6 | 4 |
| **Camp Management** (v1.2) | CMP | 10 | **10** |
| Training + TBT | TRN | 14 | 11 |
| Disciplinary & HSE | HSE | 6 | 5 |
| Notifications | NTF | 6 | 5 |
| Cross-cutting | GEN | 5 | 4 |
| **Total** | | **78** | **65** |
