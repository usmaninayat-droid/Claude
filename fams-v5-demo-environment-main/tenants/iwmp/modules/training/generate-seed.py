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
GRACE_DAYS = 90
# The supervisor who owns the training register (a workforce.seed.json id).
OWNER = 'WCR-02'


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
    rank = {'Expired': 0, 'Not Completed': 1, 'Re-training Due': 2, 'Valid': 3}
    rows = []
    for n, (code, (name, months)) in enumerate(TRAININGS.items(), 1):
        uid = f'TRN-{1000 + n}'
        is_eqp = code in CATS
        lic = CATS[code][1] if is_eqp else 'ANY'
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

        register, cert, grace, expired, missing = [], 0, 0, 0, 0
        for e in holders:
            base = {'employee': e['name'], 'role': e['role'],
                    'licence': e['lic'] or '—', 'employeeStatus': employee_status(e)}
            age = e['training'].get(code)
            if age is None:
                missing += 1
                register.append({**base, 'completedOn': '—', 'expiresOn': '—',
                                 'status': 'Not Completed'})
                continue
            done = TRAIN_TODAY - dt.timedelta(days=age)
            expires = done + dt.timedelta(days=months * 30)
            left = (expires - TRAIN_TODAY).days
            if left > 0:
                status = 'Valid'; cert += 1
            elif -left <= GRACE_DAYS:
                status = 'Re-training Due'; grace += 1      # BR-04/05: inside grace
            else:
                status = 'Expired'; expired += 1
            register.append({**base, 'completedOn': fmt(done),
                             'expiresOn': fmt(expires), 'status': status})
        register.sort(key=lambda r: (rank[r['status']], r['employee']))
        total = len(register) or 1
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
            'kpiCertified': str(cert), 'kpiRetraining': str(grace),
            'kpiExpired': str(expired), 'kpiNotCompleted': str(missing),
            'kpiCompliance': f'{round(100 * (cert + grace) / total)}%',
            'trainedEmployees': register,
        })
    return rows


if __name__ == '__main__':
    rows = build()
    OUT.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')
    print(f'wrote {OUT.relative_to(ROOT)} — {len(rows)} trainings')
    print(f"{'code':5}{'ppl':>5}{'valid':>7}{'grace':>7}{'expd':>6}{'none':>6}  compliance")
    for r in rows:
        print(f"{r['systemcol1']:5}{len(r['trainedEmployees']):>5}{r['kpiCertified']:>7}"
              f"{r['kpiRetraining']:>7}{r['kpiExpired']:>6}{r['kpiNotCompleted']:>6}"
              f"  {r['kpiCompliance']}")
