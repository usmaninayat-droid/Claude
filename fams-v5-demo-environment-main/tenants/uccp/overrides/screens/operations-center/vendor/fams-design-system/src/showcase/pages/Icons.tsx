import * as React from 'react';
import * as DSIcons from '../../icons';
import { FileTypeIcon, FILE_TYPES } from '../../components';
import { ICON_SIZE } from '../../tokens/figma-tokens';

function Sec({ id, title, count, desc, children }: { id: string; title: string; count?: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10">
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
        {count && <span className="rounded-full border border-border px-2.5 py-0.5 text-caption font-semibold text-muted-foreground">{count}</span>}
      </div>
      {desc && <p className="mb-5 max-w-3xl text-body-sm text-muted-foreground">{desc}</p>}
      {children}
    </section>
  );
}

// Collect the curated icon set (forwardRef objects + function components), excluding type exports.
type IconComp = React.ComponentType<{ size?: number; className?: string }>;
const ICON_ENTRIES = Object.entries(DSIcons as Record<string, unknown>)
  .filter(([name, v]) => /^[A-Z]/.test(name) && (typeof v === 'function' || (typeof v === 'object' && v !== null && 'render' in (v as object))))
  .map(([name, v]) => [name, v as IconComp] as const)
  .sort((a, b) => a[0].localeCompare(b[0]));

export function IconsPage() {
  const [q, setQ] = React.useState('');
  const filtered = ICON_ENTRIES.filter(([n]) => n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Sec id="icon-sizes" title="Icon sizes" count="IconBase · 7" desc="The IconBase component defines the standard icon footprints.">
        <div className="flex flex-wrap items-end gap-6">
          {Object.entries(ICON_SIZE).map(([k, px]) => (
            <div key={k} className="flex flex-col items-center gap-2">
              <DSIcons.Bell01 size={px} className="text-foreground" />
              <span className="text-caption font-semibold text-foreground">{k}</span>
              <code className="text-caption text-muted-foreground">{px}px</code>
            </div>
          ))}
        </div>
      </Sec>

      <Sec id="general-icons" title="General Icons" count={`${ICON_ENTRIES.length} icons`} desc="The real V5 icon set — generated from the design kit's SVG assets (20 categories, currentColor). Search by name.">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons…"
          className="mb-5 w-full max-w-xs rounded-md border border-border bg-card px-3 py-2 text-body-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map(([name, Icon]) => (
            <div key={name} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 text-center">
              <Icon size={22} className="text-foreground" />
              <span className="w-full truncate text-caption text-muted-foreground" title={name}>{name}</span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-body-sm text-muted-foreground">No icons match “{q}”.</p>}
        </div>
      </Sec>

      <Sec id="file-type" title="File Type" count={`${FILE_TYPES.length} types`} desc="Document icons with colour-coded extension badges — reproduced from the Figma File Type set.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
          {FILE_TYPES.map((ext) => (
            <div key={ext} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3">
              <FileTypeIcon ext={ext} size={40} />
              <span className="text-caption text-muted-foreground">{ext}</span>
            </div>
          ))}
        </div>
      </Sec>
    </div>
  );
}
