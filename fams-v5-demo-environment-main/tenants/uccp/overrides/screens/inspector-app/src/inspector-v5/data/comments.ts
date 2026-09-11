/**
 * Mock comment entries for the record-detail Timeline panel.
 *
 * Shape mirrors the web `ActivityCommentFeed`'s seed-row contract
 * (`kind: 'log' | 'comment', actor, text, at`) — see
 * `fams-design-system/packages/v5-templates/src/views/task-detail/
 *  ActivityCommentFeed.tsx`. Only `comment` rows live here; the `log` rows
 * are synthesised from `timelineForIncident` / `timelineForPlan`.
 *
 * Demo data only, and deliberately deterministic: `commentsForRecord` derives
 * a stable 2–3 comment thread from the record id + its actors so every record
 * has a populated Timeline without a hand-written table of 36 threads.
 */

export interface RecordComment {
  id: string;
  actor: string;
  /** `@Name` tokens render as maroon mentions; may contain `**bold**`. */
  text: string;
  /** ISO datetime. */
  at: string;
}

/** UCCP / control-room voices that author the seeded threads. */
const UCCP_VOICES = ['Aisha Al-Kuwari', 'Mohammed Al-Sulaiti', 'Noora Al-Thani', 'Khalid Al-Mansoori'];

function hash(source: string): number {
  let h = 0;
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shift(iso: string, minutes: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

/**
 * A stable comment thread for one record.
 *
 * @param recordId  INC-## / FPL-####
 * @param baseAt    the record's last-updated ISO — comments land after it
 * @param actors    [primary, secondary] — the inspector and the contractor/driver
 */
export function commentsForRecord(
  recordId: string,
  baseAt: string,
  actors: [string, string],
): RecordComment[] {
  const [inspector, partner] = actors;
  const operator = UCCP_VOICES[hash(recordId) % UCCP_VOICES.length];
  const thread: RecordComment[] = [
    {
      id: `${recordId}-cmt-1`,
      actor: operator,
      text: `@${firstName(inspector).replace(/\s+/g, '')} please confirm site access before the crew rolls — the service lane was still blocked on the last visit.`,
      at: shift(baseAt, 12),
    },
    {
      id: `${recordId}-cmt-2`,
      actor: inspector,
      text: `Access confirmed. @${firstName(partner).replace(/\s+/g, '')} is staging at the north entry; depth measured at **35 cm** at the low point.`,
      at: shift(baseAt, 41),
    },
  ];

  // A third voice on roughly every other record, so threads vary in length.
  if (hash(recordId) % 2 === 0) {
    thread.push({
      id: `${recordId}-cmt-3`,
      actor: partner,
      text: `Two tankers on site. Will update @${firstName(operator).replace(/\s+/g, '')} once the first load is discharged.`,
      at: shift(baseAt, 74),
    });
  }

  return thread;
}
