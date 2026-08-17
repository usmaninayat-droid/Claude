import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button } from '../primitives';

/**
 * TagsAndCategories — the Settings › Tags & Categories page (FAMS Settings, Figma
 * 2-7836). My Private Tags + My Organization Tags grouped by category (General +
 * custom categories with a Single/Multi-Select label and a Configure action).
 * Tags are coloured, removable chips; "+ Add new Tag" edits inline. Fully
 * config-driven (nothing domain-specific hardcoded) and token-only — tag colours
 * are DATA passed per tag. `readOnly` renders the inherited sub-organization view
 * (org tags become read-only; private tags stay editable).
 */

export interface Tag {
  id: string;
  label: string;
  /** Any CSS colour (hex or token, e.g. `var(--primary)`). Drives the chip tint. */
  color?: string;
}
export interface TagCategory {
  id: string;
  name: string;
  tags: Tag[];
  /** Selection semantics shown next to the name; omit for the "General" bucket. */
  selectType?: 'single' | 'multi';
  /** Show the "Configure" action (custom categories only). */
  configurable?: boolean;
  /** Category-level colour (set via CategorySheet) — tags without their own colour inherit it. */
  color?: string;
  /** Entities (workforce/devices/assets/poi/zones…) this category applies to. */
  entityIds?: string[];
}

export interface TagsAndCategoriesProps {
  title?: string;
  subtitle?: string;
  privateTags: Tag[];
  categories: TagCategory[];
  readOnly?: boolean;
  onAddPrivateTag?: (label: string) => void;
  onRemovePrivateTag?: (id: string) => void;
  onAddTag?: (categoryId: string, label: string) => void;
  onRemoveTag?: (categoryId: string, tagId: string) => void;
  onConfigureCategory?: (categoryId: string) => void;
  onCreateCategory?: () => void;
  className?: string;
}

const PRIVATE_COLOR = 'var(--primary)';

/** WCAG relative luminance for a `#rgb`/`#rrggbb` colour; `null` for a non-hex value (a DS
 *  token like `var(--primary)`, assumed already AA-safe). */
function relativeLuminance(color: string): number | null {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Clamp a light DATA colour's TEXT toward `--foreground` so it holds WCAG AA on the tinted
 *  chip background; darker colours render as-is. The tint/background always keeps the raw
 *  colour — only the text rendering is clamped. */
function accessibleChipText(color: string): string {
  const lum = relativeLuminance(color);
  return lum !== null && lum > 0.55 ? `color-mix(in srgb, ${color} 45%, var(--foreground) 55%)` : color;
}

/** A coloured, optionally-removable tag chip (tinted bg + colour text). */
export function TagChip({ label, color = 'var(--muted-foreground)', onRemove }: { label: string; color?: string; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex min-h-[34px] max-w-[16rem] items-center gap-1.5 rounded-md px-3.5 py-2 text-body-sm font-medium"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color: accessibleChipText(color) }}
    >
      <span className="truncate" title={label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="-m-1 shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icons.XClose size={13} />
        </button>
      )}
    </span>
  );
}

/** "+ Add new Tag" → inline text input (Enter adds · Esc/blur cancels). */
export function AddTagChip({ onAdd }: { onAdd: (label: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState('');
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { const v = val.trim(); if (v) onAdd(v); setVal(''); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setVal(''); setEditing(false); }
        }}
        onBlur={commit}
        placeholder="Tag name"
        aria-label="Tag name"
        size={Math.max(10, val.length + 2)}
        className="min-h-[34px] min-w-[8rem] max-w-[16rem] rounded-md border border-primary bg-card px-3.5 py-2 text-body-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-border px-3.5 py-2 text-body-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icons.Plus size={14} /> Add new Tag
    </button>
  );
}

function TagRow({ tags, color, readOnly, onAdd, onRemove }: {
  tags: Tag[]; color?: string; readOnly?: boolean; onAdd?: (label: string) => void; onRemove?: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((t) => (
        <TagChip key={t.id} label={t.label} color={t.color ?? color} onRemove={readOnly ? undefined : onRemove ? () => onRemove(t.id) : undefined} />
      ))}
      {!readOnly && onAdd && <AddTagChip onAdd={onAdd} />}
    </div>
  );
}

export function TagsAndCategories({
  title = 'All your tags & categories',
  subtitle = 'Organize assets, workforce and devices with tags. Group related tags into categories to structure your data the way your operation needs.',
  privateTags, categories, readOnly,
  onAddPrivateTag, onRemovePrivateTag, onAddTag, onRemoveTag, onConfigureCategory, onCreateCategory, className,
}: TagsAndCategoriesProps) {
  return (
    <div className={cn('p-7', className)}>
      {/* header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        {!readOnly && onCreateCategory && (
          <Button variant="primary" onClick={onCreateCategory}><Icons.Plus size={16} className="mr-1.5" />Create New Category</Button>
        )}
      </div>

      {/* My Private Tags */}
      <section className="mb-6">
        <h2 className="mb-3 text-body-md font-semibold text-foreground">My Private Tags</h2>
        <TagRow
          tags={privateTags}
          color={PRIVATE_COLOR}
          onAdd={onAddPrivateTag}
          onRemove={onRemovePrivateTag}
        />
      </section>

      <div className="my-6 h-px bg-border" />

      {/* My Organization Tags */}
      <section className="flex flex-col gap-6">
        <h2 className="text-body-md font-semibold text-foreground">My Organization Tags</h2>
        {categories.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">
            {readOnly ? (
              'No tags inherited from the parent organization yet.'
            ) : (
              <>
                No categories yet — create one to start grouping tags.
                {onCreateCategory && (
                  <button type="button" onClick={onCreateCategory} className="ml-1 font-semibold text-primary hover:underline">
                    Create Category
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span
                className={cn('max-w-[24rem] truncate font-semibold', cat.selectType ? 'text-body-md text-foreground' : 'text-body-sm text-muted-foreground')}
                title={cat.name}
              >
                {cat.name}
              </span>
              {cat.selectType && (
                <span className="text-body-xs text-muted-foreground">({cat.selectType === 'single' ? 'Single Select' : 'Multi Select'})</span>
              )}
              {!readOnly && cat.configurable && onConfigureCategory && (
                <button
                  type="button"
                  onClick={() => onConfigureCategory(cat.id)}
                  aria-label={`Configure ${cat.name}`}
                  className="-m-1.5 inline-flex items-center gap-1 rounded p-1.5 text-body-xs font-semibold text-primary hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icons.SwitchHorizontal01 size={13} /> Configure
                </button>
              )}
            </div>
            <TagRow
              tags={cat.tags}
              color={cat.color}
              readOnly={readOnly}
              onAdd={onAddTag ? (label) => onAddTag(cat.id, label) : undefined}
              onRemove={onRemoveTag ? (tagId) => onRemoveTag(cat.id, tagId) : undefined}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
