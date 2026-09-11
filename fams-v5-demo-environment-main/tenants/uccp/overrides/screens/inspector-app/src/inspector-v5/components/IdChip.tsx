import { Badge } from '@ds/components/primitives/badge';

export interface IdChipProps {
  id: string;
}

/** IdChip — monospace record-id badge (e.g. INC-1042, FPL-9004). */
export function IdChip({ id }: IdChipProps) {
  return (
    <Badge variant="muted" size="sm" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
      {id}
    </Badge>
  );
}
