#!/usr/bin/env python3
"""Regenerate tenants/iwmp/seeds/training.seed.json from the SHIFT ROSTERING
prototype's own training model, so the two modules can never disagree.

WHY THIS EXISTS: the Training module and the roster board describe the same
facts — who is trained on what, and whether that certificate is still valid.
Hand-authoring the training seed let it drift (wrong course names, invented
people, a different expiry rule). This script instead PORTS the prototype's
seeding rules verbatim, so the register is a projection of the roster's data
rather than a second, parallel copy of it.

SOURCE OF TRUTH (all read/transcribed from the prototype):
  tenants/iwmp/overrides/screens/shift-rostering/public/screens/shift-rostering/
      shift-rostering.html
  → const WORKFORCE, TRAININGS, CATS, LICENCE, GRACE_DAYS, TRAIN_TODAY
    and the `WORKFORCE.forEach` block that seeds each worker's licence,
    home category and attendance-dated training records.

Those tables were themselves transcribed from IWMP-SCOPE-ROSTER-V01.

RUN:  python3 tenants/iwmp/modules/training/generate-seed.py
THEN: pnpm demo resolve iwmp && pnpm demo debt && pnpm demo check

If the prototype's WORKFORCE or seeding rules change, re-run this — do not
edit the seed by hand.
"""
import datetime as dt
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[4]
PROTOTYPE = (ROOT / 'tenants/iwmp/overrides/screens/shift-rostering/public'
                    '/screens/shift-rostering/shift-rostering.html')
OUT = ROOT / 'tenants/iwmp/seeds/training.seed.json'

# ── mirrored from the prototype ───────────────────────────────────────────────
TRAININGS = {  # code: (name, validity months)
    'DEF': ('Defensive Driving', 24), 'WCS': ('Waste Collection Safety', 6),
    'RL': ('Rear End Loader Operation', 12), 'SL': ('Side Loader Operation', 12),
    'HLC': ('Hook Loader Operation', 12), 'CCV': ('Compactor Container Operation', 12),
    'BWC': ('Bin Washer Operation', 12), 'TW': ('Truck Wash Safety', 12),
}
CATS = {  # vehicle category: (name, licence class it requires)
    'RL': ('Rear End Loader', 'HDD'), 'SL': ('Side Loader', 'HDD'),
    'HLC': ('Hook Loader', 'HDD'), 'CCV': ('Compactor Container Vehicle', 'HDD'),
    'BWC': ('Bin Washer', 'LDD'), 'TW': ('Truck Wash Bay', 'ANY'),
}
LIC_LABEL = {'HDD': 'HDD — Heavy Duty Driver', 'LDD': 'LDD — Light Duty Driver',
             'ANY': 'Any valid licence'}
HDD_POOL, LDD_POOL = ['RL', 'SL', 'HLC', 'CCV'], ['BWC', 'TW']
TRAIN_TODAY = dt.date(2026, 1, 8)
GRACE_DAYS = 90       # BR-04/05: expired within grace = warning; beyond = block
EXPIRING_DAYS = 30    # TRN-04: within 30 days of expiry = "Expiring"
# The supervisor who owns the training register (a workforce.seed.json id).
OWNER = 'WCR-02'
# HSE trainers who deliver/certify the courses (TRN-01: trainer / certificate ref).
TRAINERS = ['Layla Rahman (HSE)', 'Kareem Odeh (HSE)', 'Mariam Fadel (HSE)']


def cert_status(left_days: int) -> str:
    """The scope's 4-tier record status (TRN-04), computed from days-to-expiry.
    Valid >30d · Expiring 0..30d · Expired 1..90d past · Blocked >90d past."""
    if left_days > EXPIRING_DAYS:
        return 'Valid'
    if left_days >= 0:
        return 'Expiring'
    if -left_days <= GRACE_DAYS:
        return 'Expired'
    return 'Blocked'


# Eligible vehicle category a training qualifies the holder for (TRN-06).
def eligible_category(code: str) -> str:
    if code in CATS:
        return CATS[code][0]
    if code == 'DEF':
        return 'All driving duties'
    if code == 'WCS':
        return 'Route helper'
    return '—'


def read_workforce():
    """Parse `const WORKFORCE = [...]` out of the prototype."""
    src = PROTOTYPE.read_text()
    start = re.search(r'const\s+WORKFORCE\s*=\s*\[', src)
    i = start.end() - 1
    depth, j = 0, i
    while j < len(src):
        if src[j] == '[':
            depth += 1
        elif src[j] == ']':
            depth -= 1
            if depth == 0:
                j += 1
                break
        j += 1
    body = src[i:j]
    found = re.findall(
        r"\{name:'([^']+)'[^}]*?role:'([^']+)'[^}]*?status:'([^']+)'"
        r"(?:[^}]*?reason:'([^']*)')?[^}]*\}", body)
    return [{'name': n, 'role': r, 'status': s, 'reason': why}
            for n, r, s, why in found]


def seed_training(workforce):
    """Port of the prototype's `WORKFORCE.forEach` training seeding."""
    for i, e in enumerate(workforce):
        e['lic'] = ('HDD' if e['role'] == 'HD Driver'
                    else 'LDD' if e['role'] == 'LD Driver' else '')
        e['isDriver'] = e['lic'] != ''
        e['isHelper'] = e['role'] == 'Helper'
        pool = (HDD_POOL if e['lic'] == 'HDD'
                else LDD_POOL if e['lic'] == 'LDD' else HDD_POOL + LDD_POOL)
        e['pool'] = pool
        e['homeCat'] = pool[i % len(pool)]
        e['training'] = {}
        if e['isDriver']:
            # i 24 (Tariq Mehmood): Defensive Driving expired 40 days ago —
            # inside the grace, so the roster shows an amber WARNING row.
            e['training']['DEF'] = 24 * 30 + 40 if i == 24 else 120 + (i * 7) % 300
            miss = pool[(i % len(pool) + 1) % len(pool)]
            e['missEqp'] = miss
            for code in pool:
                if code == miss:
                    continue  # the deliberate "not trained on this one" gap
                # i 28 (Salim Haddad): home-category certificate expired 130
                # days ago — past grace, so the roster shows a hard BLOCK.
                e['training'][code] = (12 * 30 + 130
                                       if (i == 28 and code == e['homeCat'])
                                       else 90 + (i * 11 + len(code) * 13) % 250)
        elif e['isHelper']:
            e['training']['WCS'] = 30 + (i * 9) % 120
    return workforce


def employee_status(e):
    """The roster's own wording for why someone is unavailable."""
    if e['reason']:
        return e['reason']                       # Licence/HSE/Medical Expired, Annual/Sick Leave
    return {'resigned': 'Resigned', 'terminated': 'Terminated'}.get(e['status'], 'Active')


def build():
    wf = seed_training(read_workforce())
    fmt = lambda d: d.strftime('%-d %b, %Y')
    # Register sort: worst compliance first (TRN-07 register surfaces risk).
    rank = {'Blocked': 0, 'Expired': 1, 'Expiring': 2, 'Valid': 3}
    rows = []
    for n, (code, (name, months)) in enumerate(TRAININGS.items(), 1):
        uid = f'TRN-{1000 + n}'
        is_eqp = code in CATS
        lic = CATS[code][1] if is_eqp else 'ANY'
        category = eligible_category(code)
        # Who the training governs — exactly the prototype's gating: every
        # driver needs Defensive Driving, every route helper needs Waste
        # Collection Safety, and equipment training applies to the drivers
        # whose licence pool covers that category.
        if code == 'DEF':
            holders = [e for e in wf if e['isDriver']]
        elif code == 'WCS':
            holders = [e for e in wf if e['isHelper']]
        else:
            holders = [e for e in wf if e['isDriver'] and code in e['pool']]

        register, valid, expiring, expired, blocked = [], 0, 0, 0, 0
        for idx, e in enumerate(holders):
            base = {'employee': e['name'], 'role': e['role'],
                    'licence': e['lic'] or '—', 'employeeStatus': employee_status(e),
                    'vehicleCategory': category,
                    'trainer': TRAINERS[idx % len(TRAINERS)]}
            age = e['training'].get(code)
            if age is None:
                # Never completed → Blocked for this category (BR-05).
                blocked += 1
                register.append({**base, 'completedOn': '—', 'expiresOn': '—',
                                 'certificateRef': '—', 'status': 'Blocked'})
                continue
            done = TRAIN_TODAY - dt.timedelta(days=age)
            expires = done + dt.timedelta(days=months * 30)
            status = cert_status((expires - TRAIN_TODAY).days)
            if status == 'Valid':
                valid += 1
            elif status == 'Expiring':
                expiring += 1
            elif status == 'Expired':
                expired += 1
            else:
                blocked += 1
            register.append({**base, 'completedOn': fmt(done),
                             'expiresOn': fmt(expires),
                             'certificateRef': f'CRT-{code}-{1000 + idx}',
                             'status': status})
        register.sort(key=lambda r: (rank[r['status']], r['employee']))
        total = len(register) or 1

        # Derived widgets data (grounded in `register`, not invented).
        # Grouped by role, for the "Assignable by Role" bar chart — everyone
        # not Blocked can be rostered (Valid/Expiring/Expired-within-grace).
        by_role = {}
        for r in register:
            if r['status'] != 'Blocked':
                by_role[r['role']] = by_role.get(r['role'], 0) + 1
        completions_by_role = [{'label': role, 'value': v}
                               for role, v in sorted(by_role.items())]

        # Last-12-months completions from real `completedOn` dates in the
        # register, so the trend line matches what the Register tab shows.
        month_labels = []
        cursor = dt.date(TRAIN_TODAY.year, TRAIN_TODAY.month, 1)
        for _ in range(12):
            month_labels.append(cursor)
            cursor = (cursor.replace(day=1) - dt.timedelta(days=1)).replace(day=1)
        month_labels.reverse()
        buckets = {(m.year, m.month): 0 for m in month_labels}
        for r in register:
            if r['completedOn'] == '—':
                continue
            done = dt.datetime.strptime(r['completedOn'], '%d %b, %Y').date()
            key = (done.year, done.month)
            if key in buckets:
                buckets[key] += 1
        completions_by_month = [
            {'month': m.strftime('%b %Y'), 'value': buckets[(m.year, m.month)]}
            for m in month_labels
        ]

        # Status distribution — the scope's 4-tier competency vocabulary (TRN-04).
        status_distribution = [
            {'label': 'Valid', 'value': valid},
            {'label': 'Expiring', 'value': expiring},
            {'label': 'Expired', 'value': expired},
            {'label': 'Blocked', 'value': blocked},
        ]

        rows.append({
            'id': uid, 'uniqueidentifier': uid, 'title': name, 'systemcol1': code,
            'systemcol2': 'Equipment' if is_eqp else 'Safety',
            'systemcol3': sorted({r['role'] for r in register}),
            'systemcol4': [f'{code} — {CATS[code][0]}'] if is_eqp else [],
            'systemcol5': LIC_LABEL[lic], 'systemcol6': months,
            'systemcol7': GRACE_DAYS, 'systemcol10': OWNER,
            'tags': (['Equipment'] if is_eqp else ['Safety'])
                    + (['Roster Eligibility'] if is_eqp else []),
            'status': 'Active',
            # KPI cards per TRN-07: Valid / Expiring / Expired / Blocked.
            'kpiValid': str(valid), 'kpiExpiring': str(expiring),
            'kpiExpired': str(expired), 'kpiBlocked': str(blocked),
            # Compliance = assignable share (everyone not Blocked), BR-02/05.
            'kpiCompliance': f'{round(100 * (total - blocked) / total)}%',
            'trainedEmployees': register,
            'completionsByRole': completions_by_role,
            'completionsByMonth': completions_by_month,
            'statusDistribution': status_distribution,
        })
    return rows


if __name__ == '__main__':
    rows = build()
    OUT.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)} — {len(rows)} trainings')
    print(f"{'code':5}{'ppl':>5}{'valid':>7}{'expng':>7}{'expd':>6}{'blkd':>6}  compliance")
    for r in rows:
        print(f"{r['systemcol1']:5}{len(r['trainedEmployees']):>5}{r['kpiValid']:>7}"
              f"{r['kpiExpiring']:>7}{r['kpiExpired']:>6}{r['kpiBlocked']:>6}"
              f"  {r['kpiCompliance']}")
