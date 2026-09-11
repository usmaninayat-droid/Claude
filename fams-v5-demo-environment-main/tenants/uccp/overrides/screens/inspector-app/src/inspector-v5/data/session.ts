import { DAILY_PLANS } from './plans';
import type { DailyPlan, Incident } from './types';

/**
 * session.ts — WHO is using this tablet, and therefore what it may show.
 *
 * The tablet/field app is inherently single-inspector: unlike the web module
 * (which is an operations-wide console with an "Assigned Inspector" filter),
 * every list here is already scoped to the signed-in inspector, so that
 * dropdown has nothing to filter and is omitted from the panels' toolbars.
 *
 * IDENTITY. `Nasser Al-Hajri` is a real name from the shared data — one of the
 * six Field Inspectors on the Live Monitoring workforce roster, which
 * DATA-LINKAGE.md §Workforce names as "the only names allowed in a plan's
 * Inspector column". (It replaces the invented "Ahmed Khalid" / "Inspector A.
 * Al-Khalifa" personas the tablet used to carry.)
 *
 * KNOWN UPSTREAM GAP — the two seeds carry DISJOINT inspector rosters: the
 * plan seed's `systemcol6` uses those six Field Inspectors, while the
 * incidents seed's `systemcol10` ("Assigned Inspector") uses ten OTHER names.
 * No name appears in both. That is a real cross-seed inconsistency to settle
 * in the seeds, not to paper over here with a made-up merge — so this app
 * derives the inspector's request queue from the seeds' OWN join instead:
 * a request is his when a plan of his was raised from it
 * (`plan-monitoring.seed.json`'s `source_request`, DATA-LINKAGE.md §5), OR
 * when the incidents seed already names him as the assigned inspector (which
 * is what will start matching the day the two rosters are merged upstream).
 */
export const SIGNED_IN_INSPECTOR = 'Nasser Al-Hajri';

/** The signed-in inspector's plans — the plan seed's own Inspector column. */
export function plansForInspector(plans: DailyPlan[], inspector = SIGNED_IN_INSPECTOR): DailyPlan[] {
  return plans.filter((plan) => plan.inspector === inspector);
}

const REQUEST_IDS_FROM_OWN_PLANS = new Set(
  DAILY_PLANS.filter((plan) => plan.inspector === SIGNED_IN_INSPECTOR)
    .map((plan) => plan.sourceRequestId)
    .filter((id): id is string => Boolean(id)),
);

/** The signed-in inspector's requests — see the roster note above. */
export function requestsForInspector(
  incidents: Incident[],
  inspector = SIGNED_IN_INSPECTOR,
): Incident[] {
  return incidents.filter(
    (incident) =>
      incident.assignedInspector === inspector || REQUEST_IDS_FROM_OWN_PLANS.has(incident.id),
  );
}
