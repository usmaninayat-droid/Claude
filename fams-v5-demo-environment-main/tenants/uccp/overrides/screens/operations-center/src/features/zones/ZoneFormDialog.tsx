import { useEffect, useState } from 'react'
import {
  Button, Input, Label, Textarea, Badge, cn,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@fams/design-system'
import { Check } from 'lucide-react'
import { ALL_TAGS, ZONE_PALETTE, polygonAreaKm2, type Zone, type ZoneStatus } from './zonesData'

const STATUSES: ZoneStatus[] = ['Active', 'Inactive', 'Draft']

export interface ZoneDraft {
  /** Present when editing an existing zone. */
  id?: string
  name: string
  color: string
  location: string
  description: string
  status: ZoneStatus
  tags: string[]
  points: Zone['points']
}

/**
 * Create / edit a zone. Opens either from the map's "Create New Zone" flow
 * (with the ring the user just traced) or from a row's ⋮ → Edit.
 */
export function ZoneFormDialog({
  draft, onClose, onSave, takenColors,
}: {
  draft: ZoneDraft | null
  onClose: () => void
  onSave: (draft: ZoneDraft) => void
  takenColors: string[]
}) {
  const [form, setForm] = useState<ZoneDraft | null>(draft)

  useEffect(() => { setForm(draft) }, [draft])

  if (!form) return null

  const set = <K extends keyof ZoneDraft>(key: K, value: ZoneDraft[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const toggleTag = (tag: string) =>
    set('tags', form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])

  const editing = !!form.id

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg gap-0 rounded-[6px] p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>{editing ? `Edit ${form.id}` : 'Create New Zone'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update this zone’s details. The shape on the map is unchanged.'
              : `Name the zone you just drew — ${polygonAreaKm2(form.points).toFixed(2)} km² across ${form.points.length} points.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-name">Zone name</Label>
            <Input
              id="zone-name"
              value={form.name}
              autoFocus
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Al Quoz Industrial 2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zone-location">Location</Label>
              <Input
                id="zone-location"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="e.g. Al Rayyan, Doha"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zone-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as ZoneStatus)}>
                <SelectTrigger id="zone-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone-description">Description</Label>
            <Textarea
              id="zone-description"
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What this zone covers and how it's served."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => {
                const on = form.tags.includes(tag)
                return (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}>
                    <Badge
                      variant={on ? 'success' : 'outline'}
                      className={cn('cursor-pointer rounded-[4px] font-medium', !on && 'text-muted-foreground')}
                    >
                      {tag}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Map colour</Label>
            <div className="flex flex-wrap gap-2">
              {ZONE_PALETTE.map((c) => {
                const taken = takenColors.includes(c) && c !== form.color
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    aria-label={`Use colour ${c}`}
                    disabled={taken}
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full transition-transform',
                      form.color === c && 'ring-2 ring-foreground ring-offset-2',
                      taken && 'cursor-not-allowed opacity-25'
                    )}
                    style={{ background: c }}
                  >
                    {form.color === c ? <Check className="size-3.5 text-white" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.name.trim()} onClick={() => onSave(form)}>
            {editing ? 'Save changes' : 'Create zone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
