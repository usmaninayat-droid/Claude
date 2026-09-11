import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
  FloatingLabelInput, Button,
} from '../primitives';
import { ColorPicker } from './color-picker';
import { TagChip, AddTagChip } from './tags-categories';
import type { Tag } from './tags-categories';

/**
 * CategorySheet — create / edit a tag category (FAMS Settings, Figma 2-8040 /
 * 1009-241). A right side sheet: name + colour, Single/Multi-Select type, the
 * category's tags, and which entities it applies to. Config-driven — the entity
 * list is passed in (`entities`) with sensible FAMS defaults; `initial` switches
 * it to edit mode (shows Delete). Token-only; brand FAMS blue.
 */

export type CategorySelectType = 'single' | 'multi';
export interface CategoryEntity { id: string; label: string; description?: string; icon: React.ComponentType<{ size?: number; className?: string }>; }
export interface CategoryDraft {
  name: string;
  color: string;
  selectType: CategorySelectType;
  tags: Tag[];
  entityIds: string[];
}

const DEFAULT_ENTITIES: CategoryEntity[] = [
  { id: 'workforce', label: 'Workforce', description: 'Applies to workforce / drivers.', icon: Icons.Users01 },
  { id: 'devices', label: 'Devices', description: 'Applies to devices / vehicles telematics.', icon: Icons.Signal01 },
  { id: 'assets', label: 'Assets', description: 'Applies to assets (vehicles, equipment).', icon: Icons.Car01 },
  { id: 'poi', label: 'POI', description: 'Applies to points of interest.', icon: Icons.MarkerPin01 },
  { id: 'zones', label: 'Zones', description: 'Applies to service zones.', icon: Icons.Grid01 },
];

export const DEFAULT_COLOR = '#0072D6'; // coherence-allow — FAMS primary as the default category colour (data)

export interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode (shows Delete + prefilled). Absent → create. */
  initial?: Partial<CategoryDraft> & { id?: string };
  entities?: CategoryEntity[];
  /** Sibling category names (excluding this one) — blocks case-insensitive duplicates. */
  existingNames?: string[];
  onSubmit: (draft: CategoryDraft) => void;
  onDelete?: () => void;
}

export function CategorySheet({ open, onOpenChange, initial, entities = DEFAULT_ENTITIES, existingNames = [], onSubmit, onDelete }: CategorySheetProps) {
  const isEdit = !!initial?.id;
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(DEFAULT_COLOR);
  const [selectType, setSelectType] = React.useState<CategorySelectType>('multi');
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [entityIds, setEntityIds] = React.useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const seq = React.useRef(0);

  // hydrate from `initial` each time the sheet opens
  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setColor(initial?.color ?? DEFAULT_COLOR);
    setSelectType(initial?.selectType ?? 'multi');
    setTags(initial?.tags ?? []);
    setEntityIds(initial?.entityIds ?? []);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleEntity = (id: string) => setEntityIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const addTag = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setTags((cur) => (cur.some((t) => t.label.toLowerCase() === trimmed.toLowerCase()) ? cur : [...cur, { id: `t-${(seq.current += 1)}`, label: trimmed, color }]));
  };
  const removeTag = (id: string) => setTags((cur) => cur.filter((t) => t.id !== id));
  const nameDuplicate = name.trim().length > 0 && existingNames.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && !nameDuplicate;

  const TYPES: { value: CategorySelectType; label: string; desc: string }[] = [
    { value: 'multi', label: 'Multi-Select', desc: 'The user can select multiple tags from this category per asset, workforce or device.' },
    { value: 'single', label: 'Single Select', desc: 'The user can select a single tag from this category per asset, workforce or device.' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="min(560px, 92vw)" className="p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 pb-4 pt-6">
          <div>
            <SheetTitle className="text-h6 font-bold text-foreground">{isEdit ? 'Edit category' : 'Create a new category'}</SheetTitle>
            <SheetDescription className="mt-1 text-body-sm text-muted-foreground">
              Group related tags and choose where they can be applied across your operation.
            </SheetDescription>
          </div>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
              className={cn(
                'shrink-0 rounded-md px-2 py-1 text-body-sm font-semibold text-destructive transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                confirmDelete && 'bg-destructive/10',
              )}
            >
              {confirmDelete ? 'Confirm delete' : 'Delete Category'}
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-5">
          {/* name + colour */}
          <div className="flex items-stretch gap-2">
            <FloatingLabelInput
              label="Category Name *"
              placeholder="E.g. Waste Type"
              value={name}
              onChange={(e) => setName(e.target.value)}
              errorText={nameDuplicate ? 'A category with this name already exists.' : undefined}
              className="flex-1"
            />
            <ColorPicker value={color} onChange={setColor} size={56} />
          </div>

          {/* type */}
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-foreground">Select the category type</span>
            <div role="radiogroup" aria-label="Category type" className="flex flex-col gap-2">
              {TYPES.map((t) => {
                const on = selectType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSelectType(t.value)}
                    className={cn('flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}
                  >
                    <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary text-primary' : 'border-muted-foreground/40')}>
                      {on && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-body-sm font-semibold text-foreground">{t.label}</span>
                      <span className="text-body-xs text-muted-foreground">{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* tags */}
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-foreground">Add tags</span>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => <TagChip key={t.id} label={t.label} color={color} onRemove={() => removeTag(t.id)} />)}
              <AddTagChip onAdd={addTag} />
            </div>
          </div>

          {/* entities */}
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-foreground">For which entities can you use this tag?</span>
            <div className="flex flex-col gap-2">
              {entities.map((e) => {
                const on = entityIds.includes(e.id);
                const Icon = e.icon;
                return (
                  <button
                    key={e.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleEntity(e.id)}
                    className={cn('flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}
                  >
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                      {on && <Icons.Check size={11} />}
                    </span>
                    <Icon size={18} className="shrink-0 text-muted-foreground" />
                    <span className="flex flex-col">
                      <span className="text-body-sm font-semibold text-foreground">{e.label}</span>
                      {e.description && <span className="text-body-xs text-muted-foreground">{e.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4">
          <Button
            variant="primary"
            className="w-full"
            disabled={!valid}
            onClick={() => { onSubmit({ name: name.trim(), color, selectType, tags, entityIds }); onOpenChange(false); }}
          >
            {isEdit ? 'Save changes' : 'Create New Category'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
