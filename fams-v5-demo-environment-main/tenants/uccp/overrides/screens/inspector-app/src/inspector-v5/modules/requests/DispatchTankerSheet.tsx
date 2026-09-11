import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { DetailSheet } from '../../shell/DetailSheet';
import { Checkbox } from '@ds/components/primitives/checkbox';
import { Button } from '@ds/components/primitives/button';
import { Input } from '@ds/components/primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ds/components/primitives/select';
import { useInspectorStore } from '../../data/store';
import type { Incident, Shift } from '../../data/types';

export interface DispatchTankerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: Incident;
}

const MOCK_TANKERS = [
  { id: 'TNK-002', driver: 'Turki Al-Kubaisi' },
  { id: 'TNK-005', driver: 'Sultan Al-Marzouqi' },
  { id: 'TNK-011', driver: 'Fahad Al-Naimi' },
  { id: 'TNK-014', driver: 'Rashid Al-Emadi' },
  { id: 'TNK-022', driver: 'Khalid Al-Marri' },
  { id: 'TNK-030', driver: 'Hamad Al-Attiyah' },
];

const SHIFTS: Shift[] = ['Morning', 'Afternoon', 'Night'];

/** DispatchTankerSheet — nested sheet: mock tanker multi-select + shift/time/zone, dispatches on submit. */
export function DispatchTankerSheet({ open, onOpenChange, incident }: DispatchTankerSheetProps) {
  const { plans, dispatchTankers } = useInspectorStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shift, setShift] = useState<Shift>('Morning');
  const [plannedStart, setPlannedStart] = useState('06:00');
  const [plannedEnd, setPlannedEnd] = useState('09:00');
  const [blackSpotZone, setBlackSpotZone] = useState('');
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const zoneOptions = useMemo(() => {
    const zones = new Set(plans.map((p) => p.blackSpotZone).filter(Boolean));
    zones.add(incident.zone);
    return Array.from(zones);
  }, [plans, incident.zone]);

  const toggleTanker = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedIds.size === 0) return;
    const tankers = MOCK_TANKERS.filter((t) => selectedIds.has(t.id)).map((t) => ({ tanker: t.id, driver: t.driver }));
    const today = new Date().toISOString().slice(0, 10);
    dispatchTankers(incident.id, {
      tankers,
      shift,
      plannedStart: `${today}T${plannedStart}:00`,
      plannedEnd: `${today}T${plannedEnd}:00`,
      blackSpotZone: blackSpotZone || incident.zone,
    });

    const message = `Dispatched ${tankers.length} tanker${tankers.length > 1 ? 's' : ''} for ${incident.id}`;
    if (typeof toast === 'function') {
      toast.success(message);
    } else {
      setConfirmation(message);
    }

    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      tabs={[
        {
          id: incident.id,
          category: 'REQUESTS & COMPLAINTS',
          label: 'Dispatch Tankers',
          icon: Truck,
        },
      ]}
      activeId={incident.id}
      onCloseTab={() => onOpenChange(false)}
      onCloseAll={() => onOpenChange(false)}
      onMinimize={() => onOpenChange(false)}
    >
      <div style={{ padding: 24 }}>
      {confirmation ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 'var(--ins-radius-sm)',
            background: 'var(--muted)',
            fontSize: 13,
            color: 'var(--foreground)',
          }}
        >
          {confirmation}
        </div>
      ) : null}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select Tankers</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_TANKERS.map((tanker) => (
            <label
              key={tanker.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 'var(--ins-radius-sm)',
                cursor: 'pointer',
              }}
            >
              <Checkbox
                checked={selectedIds.has(tanker.id)}
                onCheckedChange={() => toggleTanker(tanker.id)}
              />
              <span style={{ fontSize: 13 }}>
                {tanker.id} — {tanker.driver}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>Shift</div>
        <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIFTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>Planned Start</div>
          <Input type="time" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>Planned End</div>
          <Input type="time" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>Black-Spot Zone</div>
        <Select value={blackSpotZone || undefined} onValueChange={setBlackSpotZone}>
          <SelectTrigger>
            <SelectValue placeholder="Select zone" />
          </SelectTrigger>
          <SelectContent>
            {zoneOptions.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
        <Button type="button" variant="tertiary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} disabled={selectedIds.size === 0}>
          Dispatch {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </Button>
      </div>
      </div>
    </DetailSheet>
  );
}
