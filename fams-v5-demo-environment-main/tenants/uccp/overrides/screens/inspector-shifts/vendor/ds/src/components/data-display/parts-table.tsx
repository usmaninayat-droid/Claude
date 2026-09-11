import * as React from 'react';
import { Plus, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * PartsTable — the Truemax/Ducon parts & consumables table: line items with
 * qty inputs, live stock-out detection (row highlight + pulsing LOW STOCK
 * badge + onStockWarning callback), auto-totaling footer, and an "Add Part"
 * dropdown with searchable inventory.
 */

export interface PartLine {
  id: string;
  sku: string;
  name: string;
  unitCost: number;
  qty: number;
}

export interface InventoryPart {
  id: string;
  sku: string;
  name: string;
  unitCost: number;
  stock: number;
}

export interface PartsTableProps {
  parts: PartLine[];
  inventory: InventoryPart[];
  /** When false, qty inputs / add / remove are hidden (stage-locked records). */
  editable?: boolean;
  onChange?: (parts: PartLine[]) => void;
  /** Fired when a line's qty exceeds the inventory stock. */
  onStockWarning?: (part: PartLine, stock: number) => void;
  currency?: string;
  className?: string;
}

export function PartsTable({
  parts,
  inventory,
  editable = true,
  onChange,
  onStockWarning,
  currency = 'AED',
  className,
}: PartsTableProps) {
  const [q, setQ] = React.useState('');
  const stockOf = (sku: string) => inventory.find((i) => i.sku === sku)?.stock;

  const setQty = (id: string, qty: number) => {
    const next = parts.map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p));
    onChange?.(next);
    const line = next.find((p) => p.id === id);
    const stock = line ? stockOf(line.sku) : undefined;
    if (line && stock != null && line.qty > stock) onStockWarning?.(line, stock);
  };

  const remove = (id: string) => onChange?.(parts.filter((p) => p.id !== id));

  const add = (inv: InventoryPart) => {
    if (parts.some((p) => p.sku === inv.sku)) {
      setQty(parts.find((p) => p.sku === inv.sku)!.id, parts.find((p) => p.sku === inv.sku)!.qty + 1);
      return;
    }
    onChange?.([...parts, { id: inv.id, sku: inv.sku, name: inv.name, unitCost: inv.unitCost, qty: 1 }]);
  };

  const available = inventory.filter(
    (i) => `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase())
  );
  const total = parts.reduce((s, p) => s + p.unitCost * p.qty, 0);
  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border', className)}>
      {/* Header */}
      <div className="grid grid-cols-[90px_1fr_72px_100px_100px_36px] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        <span>SKU</span>
        <span>Part</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit Cost</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {/* Lines */}
      {parts.map((p) => {
        const stock = stockOf(p.sku);
        const short = stock != null && p.qty > stock;
        return (
          <div
            key={p.id}
            className={cn(
              'grid grid-cols-[90px_1fr_72px_100px_100px_36px] items-center gap-2 border-b border-border px-3 py-2 text-body-sm',
              short && 'bg-destructive/5'
            )}
          >
            <span className="truncate font-mono text-caption text-muted-foreground">{p.sku}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-foreground">{p.name}</span>
              {short ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-destructive">
                  <span className="size-1.5 animate-pulse rounded-full bg-destructive" aria-hidden />
                  LOW STOCK ({stock})
                </span>
              ) : null}
            </span>
            {editable ? (
              <input
                type="number"
                min={1}
                value={p.qty}
                onChange={(e) => setQty(p.id, parseInt(e.target.value, 10) || 1)}
                aria-label={`Quantity for ${p.name}`}
                className="h-8 w-full rounded-md border border-border bg-card px-2 text-right text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <span className="text-right text-foreground">{p.qty}</span>
            )}
            <span className="text-right text-muted-foreground">{fmt(p.unitCost)}</span>
            <span className="text-right font-medium text-foreground">{fmt(p.unitCost * p.qty)}</span>
            {editable ? (
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => remove(p.id)}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <X size={14} />
              </button>
            ) : (
              <span />
            )}
          </div>
        );
      })}

      {!parts.length ? (
        <div className="px-3 py-4 text-center text-body-sm text-muted-foreground">No parts added.</div>
      ) : null}

      {/* Footer — add + total */}
      <div className="flex items-center justify-between gap-2 bg-muted/30 px-3 py-2">
        {editable ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 px-2.5 py-1.5 text-body-sm font-medium text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={14} /> Add Part
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <div className="relative border-b border-border p-2">
                <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search inventory…"
                  className="h-8 w-full rounded-md bg-muted/50 pl-7 pr-2 text-body-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-56 overflow-auto p-1">
                {available.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => add(i)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-foreground">{i.name}</span>
                      <span className="text-caption text-muted-foreground">
                        {i.sku} · stock {i.stock}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption font-medium text-foreground">{fmt(i.unitCost)}</span>
                  </button>
                ))}
                {!available.length ? (
                  <div className="px-2 py-3 text-center text-caption text-muted-foreground">No matches.</div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span />
        )}
        <div className="text-body-sm">
          <span className="text-muted-foreground">Total Parts Cost </span>
          <span className="font-semibold text-primary">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}
