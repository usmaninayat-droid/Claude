#!/usr/bin/env python3
"""Generate tenants/iwmp/seeds/attendance.seed.json — the biometric attendance
reconciliation register (scope RST-ATT / section 5.4): one row per employee per
day, rostered duty vs punch → Present / Late / Absent, source = the attendance
machine ("Bio Time"). Employees on WO/AV/EL are excluded (no punch expected),
matching ATT-02.

Grounded in the workforce roster (names) so the two never disagree.

RUN:  python3 tenants/iwmp/modules/attendance/generate-seed.py
THEN: pnpm demo resolve iwmp && pnpm demo check
"""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
WORKFORCE_SEED = ROOT / 'tenants/iwmp/seeds/workforce.seed.json'
OUT = ROOT / 'tenants/iwmp/seeds/attendance.seed.json'

SOURCE = 'Bio Time'
LAST_DAY = dt.date(2025, 9, 9)
DAYS = 6
SHIFTS = ['Day', 'Night', 'Afternoon', 'Evening', 'Mid']
LOTS = ['LOT 1', 'LOT 2', 'LOT 3', 'LOT 4']
# Rostered work duties a punch reconciles against (RT route / RL reliever /
# OC on-call / EX extra) — scope BLD-02 duty codes.
DUTIES = [
    'RT · RL_04_MSW_012', 'RT · SL_04_MSW_007', 'RT · HLC_04_BLK_003',
    'RT · CCV_04_MSW_021', 'RL · Reliever Pool', 'OC · On Call (Day)',
    'EX · Bin Deployment', 'RT · 3TPU_04_BKW_005', 'RT · TC15_04_MSW_009',
]
# Deterministic status spread — mostly Present, some Late, a few Absent.
STATUS_CYCLE = ['Present', 'Present', 'Present', 'Late', 'Present',
                'Present', 'Absent', 'Present', 'Late', 'Present']
CLOCK = {
    'Present': ('08:02 AM', '05:10 PM'),
    'Late':    ('09:18 AM', '05:12 PM'),
    'Absent':  ('—', '—'),
}


def build():
    workforce = json.loads(WORKFORCE_SEED.read_text())
    rows, n = [], 0
    for i, w in enumerate(workforce):
        # Inactive employees are not rostered, so no attendance to reconcile.
        if w.get('status') == 'Inactive':
            continue
        shift = SHIFTS[i % len(SHIFTS)]
        lot = LOTS[i % len(LOTS)]
        for d in range(DAYS):
            day = LAST_DAY - dt.timedelta(days=d)
            status = STATUS_CYCLE[(i + d) % len(STATUS_CYCLE)]
            cin, cout = CLOCK[status]
            n += 1
            uid = f'ATT-{2000 + n}'
            rows.append({
                'id': uid,
                'uniqueidentifier': uid,
                'title': w['title'],
                'systemcol1': day.strftime('%-d %b, %Y'),
                'systemcol2': DUTIES[(i + d) % len(DUTIES)],
                'systemcol3': shift,
                'systemcol4': lot,
                'systemcol5': cin,
                'systemcol6': cout,
                'systemcol7': SOURCE,
                'systemcol8': '',
                'status': status,
                'tags': [],
            })
    OUT.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')
    counts = {}
    for r in rows:
        counts[r['status']] = counts.get(r['status'], 0) + 1
    print(f'wrote {OUT.relative_to(ROOT)} — {len(rows)} records → {counts}')


if __name__ == '__main__':
    build()
