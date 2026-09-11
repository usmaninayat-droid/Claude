import { Button } from '@fams/ui-kit'
import type { RecordGeometry } from './record-map-model'

export interface RecordMapPopupProps {
  item: RecordGeometry
  /** The colour-key axis's label — e.g. "Priority" (config, never hardcoded). */
  colorLabel: string
  onOpen?: () => void
}

/**
 * RecordMapPopup — the pin/polygon popover body (SPEC row 24). [tier-2 internal]
 *
 * Chrome, positioning and viewport clamping are `MapPanel`'s (`popup-anchor`,
 * the one clamping helper — UX C.19/L.76); this is only the content. It states
 * the colour key IN TEXT, which is what makes a colour-only pin acceptable on
 * the map surface at all (UX K.72).
 */
export function RecordMapPopup({ item, colorLabel, onOpen }: RecordMapPopupProps) {
  return (
    <div data-slot="record-map-popup" className="flex min-w-48 flex-col gap-2">
      <p className="text-body-sm font-semibold text-foreground">{item.record.title ?? item.label}</p>
      <dl className="flex flex-col gap-1 text-body-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt className="font-medium">ID</dt>
          <dd>{item.label}</dd>
        </div>
        {item.colorKey ? (
          <div className="flex items-center gap-2">
            <dt className="font-medium">{colorLabel}</dt>
            <dd className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-xs bg-border"
                style={item.color ? { backgroundColor: item.color } : undefined}
              />
              {item.colorKey}
            </dd>
          </div>
        ) : null}
      </dl>
      {onOpen ? (
        <Button variant="tertiary" size="sm" className="self-start" onClick={onOpen}>
          Open
        </Button>
      ) : null}
    </div>
  )
}

RecordMapPopup.displayName = 'RecordMapPopup'
