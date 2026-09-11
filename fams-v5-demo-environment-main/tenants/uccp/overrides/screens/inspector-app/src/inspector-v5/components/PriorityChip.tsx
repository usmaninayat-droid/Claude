import { Badge } from '@ds/components/primitives/badge';
import { PRIORITY_TONE } from '../data/status';
import type { Priority } from '../data/types';

const TONE_TO_VARIANT = {
  error: 'destructive',
  warning: 'warning',
  success: 'success',
  info: 'info',
  neutral: 'muted',
} as const;

export interface PriorityChipProps {
  priority: Priority;
}

/** PriorityChip — badge tinted by data/status.ts's PRIORITY_TONE map. */
export function PriorityChip({ priority }: PriorityChipProps) {
  const tone = PRIORITY_TONE[priority];
  return (
    <Badge variant={TONE_TO_VARIANT[tone]} size="sm">
      {priority}
    </Badge>
  );
}
