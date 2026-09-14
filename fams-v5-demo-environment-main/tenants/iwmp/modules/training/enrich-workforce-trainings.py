#!/usr/bin/env python3
"""Add a `trainings` array to each workforce row in workforce.seed.json — the
projection the Workforce entity profile's "Trainings" tab reads.

The 11 IWMP workforce rows are the tenant's admin/dispatcher set, disjoint from
the shift-rostering prototype's ground-crew roster that training.seed.json is
projected from (only "Yusuf Rahman" overlaps). Rather than leaving 10 people
with empty tabs, we synthesize plausible per-person training records using the
same TRAININGS catalog and validity rule the training generator ports from the
prototype — role → required-training rule, deterministic dates seeded by row
index so re-runs are stable.

RUN:  python3 tenants/iwmp/modules/training/enrich-workforce-trainings.py
THEN: pnpm demo resolve iwmp && pnpm demo check
"""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
WORKFORCE_SEED = ROOT / 'tenants/iwmp/seeds/workforce.seed.json'

# Mirrored from generate-seed.py — code: (name, validity months)
TRAININGS = {
    'DEF': ('Defensive Driving', 24),
    'WCS': ('Waste Collection Safety', 6),
    'RL': ('Rear End Loader Operation', 12),
    'SL': ('Side Loader Operation', 12),
    'HLC': ('Hook Loader Operation', 12),
    'CCV': ('Compactor Container Operation', 12),
    'BWC': ('Bin Washer Operation', 12),
    'TW': ('Truck Wash Safety', 12),
}
EQUIPMENT_POOL = ['RL', 'SL', 'HLC', 'CCV', 'BWC', 'TW']
# Eligible vehicle category each training qualifies the holder for (TRN-06).
CATEGORY = {
    'DEF': 'All driving duties', 'WCS': 'Route helper',
    'RL': 'Rear End Loader', 'SL': 'Side Loader', 'HLC': 'Hook Loader',
    'CCV': 'Compactor Container Vehicle', 'BWC': 'Bin Washer', 'TW': 'Truck Wash Bay',
}
TODAY = dt.date(2026, 1, 8)
GRACE_DAYS = 90       # BR-04/05
EXPIRING_DAYS = 30    # TRN-04
TRAINERS = ['Layla Rahman (HSE)', 'Kareem Odeh (HSE)', 'Mariam Fadel (HSE)']
RANK = {'Blocked': 0, 'Expired': 1, 'Expiring': 2, 'Valid': 3}


def cert_status(left: int) -> str:
    """The scope's 4-tier record status (TRN-04)."""
    if left > EXPIRING_DAYS:
        return 'Valid'
    if left >= 0:
        return 'Expiring'
    if -left <= GRACE_DAYS:
        return 'Expired'
    return 'Blocked'


def cert(code: str, i: int, days_ago: int) -> dict:
    """One training record — Valid/Expiring/Expired/Blocked from days_ago."""
    name, months = TRAININGS[code]
    done = TODAY - dt.timedelta(days=days_ago)
    expires = done + dt.timedelta(days=months * 30)
    fmt = lambda d: d.strftime('%-d %b, %Y')
    return {
        'trainingCode': code,
        'trainingName': name,
        'vehicleCategory': CATEGORY.get(code, '—'),
        'completedOn': fmt(done),
        'expiresOn': fmt(expires),
        'trainer': TRAINERS[(i + len(code)) % len(TRAINERS)],
        'certificateRef': f'CRT-{code}-{2000 + i}',
        'status': cert_status((expires - TODAY).days),
    }


def trainings_for(row: dict, i: int) -> list[dict]:
    role = row.get('systemcol1', '')
    # Deterministic spread of "days since completion" across the row set —
    # a mix of Valid (bulk), Re-training Due (a couple), Expired (one) so
    # each profile's tab has meaningful colour variety.
    base = 40 + (i * 71) % 260
    if role == 'Driver':
        eq = EQUIPMENT_POOL[i % len(EQUIPMENT_POOL)]
        return [
            cert('DEF', i, base),
            cert(eq, i, base + 30),
            cert('WCS', i, base + 90),
        ]
    if role == 'Supervisor':
        return [
            cert('WCS', i, base + 20),
            cert('DEF', i, base + 60),
        ]
    return []


def build():
    workforce = json.loads(WORKFORCE_SEED.read_text())
    for i, w in enumerate(workforce):
        rows = trainings_for(w, i)
        rows.sort(key=lambda r: (RANK.get(r['status'], 9), r['trainingCode']))
        # Stable row id for the profile Trainings tab's eventList.
        for r in rows:
            r['id'] = f"{w['id']}-{r['trainingCode']}"
        w['trainings'] = rows
        # Per-person competency counts — the KPI cards on the Trainings tab
        # read these straight off the record (TRN-06 competency card).
        counts = {'Valid': 0, 'Expiring': 0, 'Expired': 0, 'Blocked': 0}
        for r in rows:
            counts[r['status']] = counts.get(r['status'], 0) + 1
        w['trnValid'] = str(counts['Valid'])
        w['trnExpiring'] = str(counts['Expiring'])
        w['trnExpired'] = str(counts['Expired'])
        w['trnBlocked'] = str(counts['Blocked'])
    WORKFORCE_SEED.write_text(json.dumps(workforce, indent=2, ensure_ascii=False) + '\n')
    print(f'wrote {WORKFORCE_SEED.relative_to(ROOT)} — enriched {len(workforce)} workforce row(s)')
    for w in workforce:
        buckets = {}
        for r in w['trainings']:
            buckets[r['status']] = buckets.get(r['status'], 0) + 1
        print(f"  {w['title']:22} {w.get('systemcol1',''):11} "
              f"{len(w['trainings'])} cert(s) → {buckets}")


if __name__ == '__main__':
    build()
