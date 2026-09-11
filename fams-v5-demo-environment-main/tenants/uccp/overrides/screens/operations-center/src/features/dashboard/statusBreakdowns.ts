import type { StatColumn, StatusBar } from '../../components/StatusBreakdownCard'

// Data-viz palette (from the prototype / Figma) — category colors, not brand tokens.
const GREEN = '#22c882'
const LAVENDER = '#9e77ed'
const BLUE = '#0072d6'
const YELLOW = '#f5bb2a'
const RED = '#f04438'
const GREY = '#475467'

// Fleet Availability mock — single vehicle type (tankers), so the fleet is
// expressed as tanker counts derived from work-order / staging state rather
// than a generic vehicle-status enum:
//   - Total Tankers: full fleet size (18) — the KPI stat, neutral dark tone.
//   - On Route: tankers with a work order currently assigned.
//   - Idle: unassigned tankers not staged and not reporting an issue.
//   - Standby: plan started, no work order assigned, tanker at the
//     assembly/staging point.
//   - Breakdown: tankers that reported a breakdown.
//   - Inactive: tankers out of rotation (down for non-breakdown reasons).
// Maintenance segment removed — no longer tracked on this widget.
// Total Tankers (18) = onRoute + idle + standby + breakdown + inactive.
//
// RECONCILIATION with Live Monitoring / the Command Center (2026-09-01
// cross-module audit — Build Delegate/DATA-LINKAGE.md). LM reports a
// TELEMATICS state per tanker (Moving 11 / Idling 2 / Stopped 4 /
// Non-Reporting 1); this widget reports a DISPATCH state. They are different
// axes over the same 18 tankers, mapped as:
//
//   on-route  9  LMV-QA02,06,07,08,09,10,11,12,15  (LM Moving, each on one of
//                the 8 Executing rows of plan-monitoring.seed.json)
//   idle      4  LMV-QA14,17 (LM Moving — returning to base, no work order)
//                LMV-QA03,05 (LM Idling)
//   standby   3  LMV-QA01,13,18 (LM Stopped, parked at a staging point)
//   breakdown 1  LMV-QA04      (LM Stopped — open critical work order
//                               WO-98765 in binRepair.ts)
//   inactive  1  LMV-QA16      (LM Non-Reporting — WO-54321, waiting parts)
//
// So LM's 11 "Moving" = 9 on-route + 2 returning, and LM's 4 "Stopped" = 3
// standby + 1 breakdown. Neither QA04 nor QA16 appears on any plan.
const TOTAL_TANKERS = 18
const onRoute = 9 // tankers with an assigned work order
const idle = 4 // unassigned, not staged, no reported issue
const standby = 3 // plan started, no work order, at assembly/staging point
const breakdown = 1 // reported a breakdown
const inactive = TOTAL_TANKERS - onRoute - idle - standby - breakdown // 1

export const fleet: { stats: StatColumn[]; bars: StatusBar[] } = {
  stats: [
    { label: 'Total Tankers', value: String(TOTAL_TANKERS), color: GREY },
    { label: 'On Route', value: String(onRoute), color: GREEN },
    { label: 'Idle', value: String(idle), color: LAVENDER },
    { label: 'Standby', value: String(standby), color: BLUE },
    { label: 'Breakdown', value: String(breakdown), color: RED },
    { label: 'Inactive', value: String(inactive), color: GREY },
  ],
  bars: [
    { color: GREEN, width: (onRoute / TOTAL_TANKERS) * 100 },
    { color: LAVENDER, width: ((onRoute + idle) / TOTAL_TANKERS) * 100 },
    { color: BLUE, width: ((onRoute + idle + standby) / TOTAL_TANKERS) * 100 },
    { color: RED, width: ((onRoute + idle + standby + breakdown) / TOTAL_TANKERS) * 100 },
  ],
}

// Workforce Readiness mock — single workforce type (drivers/crew), so the
// crew is expressed as counts derived from plan/work-order state rather than
// a generic status enum:
//   - Total Crew: full crew size — the KPI stat, neutral dark tone.
//   - On Duty: crew whose assigned plans have STARTED.
//   - Late: crew whose plan started late.
//   - Standby: drivers with NO work order assigned right now — reconciled
//     with Fleet Availability's standby tanker count (3), since a standby
//     tanker needs a standby driver.
//   - Next Shift: drivers coming in on the next shift, per plans.
// On Leave segment removed — no longer tracked on this widget.
// Total Crew = onDuty + late + standby + nextShift.
const onDuty = 42 // crew whose assigned plans have started
const late = 3 // crew whose plan started late
const crewStandby = 3 // no work order assigned — matches fleet standby tankers (3)
const nextShift = 18 // coming in next shift, per plans
const TOTAL_CREW = onDuty + late + crewStandby + nextShift // 66

export const workforce: { stats: StatColumn[]; bars: StatusBar[] } = {
  stats: [
    { label: 'Total Crew', value: String(TOTAL_CREW), color: GREY },
    { label: 'On Duty', value: String(onDuty), color: GREEN },
    { label: 'Late', value: String(late), color: LAVENDER },
    { label: 'Standby', value: String(crewStandby), color: BLUE },
    { label: 'Next Shift', value: String(nextShift), color: YELLOW },
  ],
  bars: [
    { color: GREEN, width: (onDuty / TOTAL_CREW) * 100 },
    { color: LAVENDER, width: ((onDuty + late) / TOTAL_CREW) * 100 },
    { color: BLUE, width: ((onDuty + late + crewStandby) / TOTAL_CREW) * 100 },
    { color: YELLOW, width: ((onDuty + late + crewStandby + nextShift) / TOTAL_CREW) * 100 },
  ],
}
