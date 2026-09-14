#!/usr/bin/env python3
"""Add an `attendanceLog` array + a `workingHours` series to each workforce row
in workforce.seed.json — the data the profile "Attendance Log" tab renders
(replicated from the Tadweer April-Release Figma: a Working Hours bar chart over
a biometric attendance table).

Shapes:
  attendanceLog[]: {date, clockIn, clockOut, clockInLocation, clockOutLocation,
                    duration, source}
  workingHours[]:  {label, value}   # daily hours, for the bar chart

Lives beside the other workforce-seed enrichers; run AFTER them (it loads the
current file and only adds its own keys, preserving trainings/counts).

RUN:  python3 tenants/iwmp/modules/training/enrich-workforce-attendance.py
THEN: pnpm demo resolve iwmp && pnpm demo check
"""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
WORKFORCE_SEED = ROOT / 'tenants/iwmp/seeds/workforce.seed.json'

# Abu Dhabi landmarks used as clock-in/out locations (from the Figma).
LOCATIONS = [
    'Corniche Road, Abu Dhabi',
    'Sheikh Zayed Bridge, Abu Dhabi',
    'Emirates Palace, Abu Dhabi',
    'Abu Dhabi Mall, Abu Dhabi',
    'Louvre Abu Dhabi, Abu Dhabi',
    'Qasr Al Watan, Abu Dhabi',
    'Yas Island, Abu Dhabi',
    'Ferrari World, Abu Dhabi',
    'Al Ain Zoo, Abu Dhabi',
    'Marina Mall, Abu Dhabi',
]
# Per-day clock in/out pairs (in, out) — the Figma's spread of shift patterns.
SHIFTS = [
    ('08:30 AM', '05:15 PM'),
    ('07:45 AM', '04:45 PM'),
    ('08:00 AM', '05:15 PM'),
    ('08:15 AM', '04:30 PM'),
    ('08:30 AM', '02:00 PM'),
    ('08:30 AM', '02:00 PM'),
    ('08:30 AM', '02:00 PM'),
    ('08:00 AM', '05:10 PM'),
    ('07:50 AM', '04:55 PM'),
    ('08:20 AM', '05:05 PM'),
]
SOURCE = 'Bio Time'
LAST_DAY = dt.date(2025, 9, 9)   # newest row; table runs newest → oldest
DAYS = 10


def _parse(t: str) -> dt.datetime:
    return dt.datetime.strptime(t, '%I:%M %p')


def _duration(cin: str, cout: str) -> str:
    delta = _parse(cout) - _parse(cin)
    mins = int(delta.total_seconds() // 60)
    return f'{mins // 60:02d}:{mins % 60:02d} hours'


def build():
    workforce = json.loads(WORKFORCE_SEED.read_text())
    for i, w in enumerate(workforce):
        log, hours = [], []
        for d in range(DAYS):
            day = LAST_DAY - dt.timedelta(days=d)
            cin, cout = SHIFTS[(i + d) % len(SHIFTS)]
            loc = LOCATIONS[(i + d) % len(LOCATIONS)]
            dur = _duration(cin, cout)
            log.append({
                'id': f"{w['id']}-att-{day.isoformat()}",
                'date': day.strftime('%-d %b, %Y'),
                'clockIn': cin,
                'clockOut': cout,
                'clockInLocation': loc,
                'clockOutLocation': loc,
                'duration': dur,
                'source': SOURCE,
            })
            # Bar-chart point: hours worked that day (oldest → newest below).
            hrs = round(int(_duration(cin, cout)[:2]) + int(dur[3:5]) / 60, 1)
            hours.append({'label': day.strftime('%-d %b'), 'value': hrs})
        w['attendanceLog'] = log            # newest first (table order)
        w['workingHours'] = list(reversed(hours))   # oldest → newest (chart order)
    WORKFORCE_SEED.write_text(json.dumps(workforce, indent=2, ensure_ascii=False) + '\n')
    print(f'wrote {WORKFORCE_SEED.relative_to(ROOT)} — attendance for {len(workforce)} row(s)')
    for w in workforce:
        print(f"  {w['title']:22} {len(w['attendanceLog'])} day(s), "
              f"hours {w['workingHours'][0]['value']}..{w['workingHours'][-1]['value']}")


if __name__ == '__main__':
    build()
