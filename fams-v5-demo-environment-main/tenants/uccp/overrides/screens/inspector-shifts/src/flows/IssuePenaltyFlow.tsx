/**
 * Issue Penalty flow (PO) — built to docs/lifecycle-specs/07-issue-penalty.md.
 *
 * Three surfaces, all exported for the Incident-detail Penalties tab + the PO
 * Penalties pipeline:
 *   • IssuePenaltySheet   — full-screen right Sheet, tabs KPI Selection · Penalty
 *                           Receipt; issues a structured Penalty into the store.
 *   • PenaltiesTabEmpty   — the empty-state card (search + "+ Issue Penalty").
 *   • PenaltyDetail       — the issued-penalty 2-column detail (summary + Timeline
 *                           composer), reachable from the tab summary card and the
 *                           Penalties pipeline.
 *
 * Brand law: every green CTA / active tab / toggle in the source frames is FAMS
 * primary blue (var(--primary)). Green survives only as genuine amount context —
 * the receipt / penalty-details header band + the AED total. Any tab-render that
 * uses hooks is a real hoisted component (stable hook order).
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import {
  Button, Input, toast,
  Sheet, SheetContent, SheetHeader, SheetTitle,
  Popover, PopoverTrigger, PopoverContent,
} from '@ds/components/primitives';
import { Timeline, StatusTransitionDropdown } from '@ds/components/data-display';
import type { TransitionStage } from '@ds/components/data-display';
import { useIims, PROJECT_OFFICER } from '@/store/store';
import { VIOLATION_TYPES, KPI_CATEGORIES, kpiCodeFor } from '@/data/catalog';
import { AvatarChip, formatAed, formatDate } from '@/lib/ui';
import type { Penalty, PenaltyLineItem, PenaltyStatus, ViolationType } from '@/data/types';
import emptyPenaltyIllustration from '@/assets/empty-penalty.svg';

/* ─────────────────────────── KPI catalog (§2) ──────────────────────────────
 * Derive KPI cards from VIOLATION_TYPES grouped by category, numbered
 * {categoryOrder}.{itemIndex}, badge-tinted per CATEGORY_META. Kept local (small
 * mirror of po-modules' CATEGORY_META — colour + order for the badge). */
const CATEGORY_META: { key: string; label: string; color: string }[] = [
  { key: 'Resource Allocation', label: 'Resource Allocation', color: 'var(--chart-accent-teal)' },
  { key: 'Solid Waste', label: 'Solid Waste Collection & Transportation', color: 'var(--chart-accent-green)' },
  { key: 'Mechanical Sweeping', label: 'Mechanical Sweeping / Sand Removal', color: 'var(--chart-accent-yellow)' },
  { key: 'Manual Sweeping', label: 'Manual Sweeping & Cleaning Services', color: 'var(--chart-accent-orange)' },
  { key: 'Fleet', label: 'Vehicle / Fleet Management', color: 'var(--chart-accent-cyan)' },
  { key: 'EHS', label: 'Environment, Health & Safety', color: 'var(--chart-accent-red)' },
  { key: 'PCC', label: 'Public Cleanliness Complaints', color: 'var(--chart-accent-purple)' },
];
const catMeta = (c: string) => CATEGORY_META.find((m) => m.key === c) ?? { key: c, label: c, color: 'var(--muted-foreground)' };

export interface KpiCatalogItem {
  vt: ViolationType;
  code: string;            // "{categoryOrder}.{itemIndex}"
  categoryNo: number;      // category order (1-based)
  categoryLabel: string;
  categoryColor: string;
  title: string;
  description: string;
  periodOfCompliance: string;
  penaltyText: string;
}

/** Human-readable compliance window from rectifyWithinHrs. */
const complianceWindow = (hrs: number) =>
  hrs >= 24 ? `${Math.round(hrs / 24)} Day${hrs >= 48 ? 's' : ''} to rectify the non-compliance.` : `${hrs} Hours to rectify the non-compliance.`;

export const KPI_CATALOG: KpiCatalogItem[] = (() => {
  // category order = order of first appearance in CATEGORY_META, else append
  const order = CATEGORY_META.map((m) => m.key);
  const cats = Array.from(new Set(VIOLATION_TYPES.map((v) => v.category)))
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const out: KpiCatalogItem[] = [];
  cats.forEach((cat) => {
    const meta = catMeta(cat);
    const categoryNo = Math.round(KPI_CATEGORIES.find((c) => c.category === cat)?.no ?? (order.indexOf(cat) + 1));
    VIOLATION_TYPES.filter((v) => v.category === cat).forEach((vt) => {
      out.push({
        vt,
        code: kpiCodeFor(vt.id),
        categoryNo,
        categoryLabel: meta.label,
        categoryColor: meta.color,
        title: vt.name,
        description: 'As defined in the Contract Document.',
        periodOfCompliance: complianceWindow(vt.rectifyWithinHrs),
        penaltyText: `AED ${vt.penaltyAed.toLocaleString('en-AE')} per incident per day until the non-compliance is rectified.`,
      });
    });
  });
  return out;
})();

/* ─────────────────────────── category badge ────────────────────────────── */
function CategoryBadge({ item }: { item: KpiCatalogItem }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: `color-mix(in srgb, ${item.categoryColor} 14%, transparent)`, color: item.categoryColor }}
    >
      <span className="tabular-nums">{item.categoryNo}.0</span>
      <span className="truncate">{item.categoryLabel}</span>
    </span>
  );
}

/* ───────────────────────── VIEW MORE detail box ────────────────────────── */
function KpiDetailBox({ item }: { item: KpiCatalogItem }) {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-body-sm text-foreground">{value}</span>
    </div>
  );
  return (
    <div className="mt-3 flex flex-col gap-3 border-l-2 border-primary bg-secondary/30 py-2 pl-3 pr-2">
      <Row label="Non Compliance" value={item.vt.name} />
      <Row label="Period Of Compliance" value={item.periodOfCompliance} />
      <Row label="Penalty after period for compliance is passed (AED)" value={item.penaltyText} />
    </div>
  );
}

/* ─────────────────────────── selectable KPI card ───────────────────────── */
function KpiCard({
  item, selected, onToggle,
}: { item: KpiCatalogItem; selected: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className={`rounded-[10px] border bg-card p-4 transition-colors ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <CategoryBadge item={item} />
          <div className="flex items-baseline gap-2">
            <span className="text-body-sm font-bold tabular-nums text-foreground">{item.code}</span>
            <span className="text-body-sm font-semibold text-foreground">{item.title}</span>
          </div>
          <p className="text-body-xs text-muted-foreground">{item.description}</p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-fit items-center gap-1 text-body-xs font-semibold text-primary hover:underline"
          >
            {expanded ? 'VIEW LESS' : 'VIEW MORE'}
            <Icons.ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>
        {/* checkbox (right) */}
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select KPI ${item.code}`}
          onClick={onToggle}
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border transition-colors ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-transparent hover:border-primary'}`}
        >
          <Icons.Check size={13} />
        </button>
      </div>
      {expanded && <KpiDetailBox item={item} />}
    </div>
  );
}

/* ═══════════════════════════ Issue Penalty sheet (§3) ═══════════════════════ */

type SheetTab = 'kpi' | 'receipt';

/** Editable receipt line — starts from a selected KPI, amount is editable. */
interface DraftLine { id: string; code: string; nonCompliance: string; amountAed: number; vtId: string; }

/** Inline amount editor (small popover) for a receipt row. */
function AmountEditor({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { if (open) setDraft(String(value)); }, [open, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Edit amount" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-primary">
          <Icons.Edit01 size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-3">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount (AED)</span>
          <Input type="number" min={0} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => { onSave(Math.max(0, Number(draft) || 0)); setOpen(false); }}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function IssuePenaltySheet({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const s = useIims();
  const [tab, setTab] = React.useState<SheetTab>('kpi');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [lines, setLines] = React.useState<DraftLine[]>([]);

  const q = query.trim().toLowerCase();
  const filtered = React.useMemo(
    () => KPI_CATALOG.filter((k) => !q || `${k.code} ${k.title} ${k.categoryLabel}`.toLowerCase().includes(q)),
    [q],
  );

  const toggle = (item: KpiCatalogItem) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.vt.id)) next.delete(item.vt.id); else next.add(item.vt.id);
      return next;
    });
  };

  const subtotal = KPI_CATALOG.filter((k) => selected.has(k.vt.id)).reduce((sum, k) => sum + k.vt.penaltyAed, 0);
  const selectedCount = selected.size;

  // Build the editable receipt from the current selection when moving to tab 2.
  const goReceipt = () => {
    const picked = KPI_CATALOG.filter((k) => selected.has(k.vt.id));
    setLines((prev) => picked.map((k) => {
      const existing = prev.find((l) => l.vtId === k.vt.id);
      return existing ?? { id: `${incidentId}-${k.vt.id}`, code: k.code, nonCompliance: k.vt.name, amountAed: k.vt.penaltyAed, vtId: k.vt.id };
    }));
    setTab('receipt');
  };

  const total = lines.reduce((sum, l) => sum + l.amountAed, 0);

  const issue = () => {
    const lineItems: PenaltyLineItem[] = lines.map((l) => ({ id: l.id, code: l.code, nonCompliance: l.nonCompliance, amountAed: l.amountAed }));
    s.issuePenalty(incidentId, lineItems);
    toast.success('Penalty issued.');
    onClose();
  };

  const TabBtn = ({ id, label }: { id: SheetTab; label: string }) => (
    <button
      type="button"
      onClick={() => { if (id === 'receipt') { if (selectedCount) goReceipt(); } else setTab('kpi'); }}
      disabled={id === 'receipt' && selectedCount === 0}
      className={`relative px-1 py-3 text-body-sm font-semibold transition-colors disabled:opacity-40 ${tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {label}
      {tab === id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
    </button>
  );

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" width="min(720px, 96vw)" className="flex flex-col p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>Issue Penalty</SheetTitle>
          <p className="text-body-sm text-muted-foreground">Select from the following penalty types to issue a Penalty.</p>
        </SheetHeader>

        <div className="flex items-center gap-6 border-b border-border px-6">
          <TabBtn id="kpi" label="KPI Selection" />
          <TabBtn id="receipt" label="Penalty Receipt" />
        </div>

        {/* ── Tab 1 — KPI Selection ── */}
        {tab === 'kpi' && (
          <>
            <div className="flex flex-col gap-3 px-6 pb-3 pt-4">
              <p className="text-h5 font-semibold text-foreground">KPIs Selection</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
                </div>
                <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Filter"><Icons.FilterLines size={15} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-4">
              <div className="flex flex-col gap-3">
                {filtered.map((item) => (
                  <KpiCard key={item.vt.id} item={item} selected={selected.has(item.vt.id)} onToggle={() => toggle(item)} />
                ))}
                {filtered.length === 0 && (
                  <p className="py-10 text-center text-body-sm text-muted-foreground">No KPIs match your search.</p>
                )}
              </div>
            </div>
            {/* sticky footer */}
            <div className="flex items-center gap-4 border-t border-border px-6 py-4">
              <div className="flex flex-col">
                <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Subtotal</span>
                <span className="text-body-md font-bold text-foreground">
                  {formatAed(subtotal)} <span className="text-body-xs font-medium text-muted-foreground">({selectedCount} item{selectedCount === 1 ? '' : 's'})</span>
                </span>
              </div>
              <Button variant="primary" className="ml-auto min-w-[220px]" disabled={selectedCount === 0} onClick={goReceipt}>
                Save and Continue
              </Button>
            </div>
          </>
        )}

        {/* ── Tab 2 — Penalty Receipt ── */}
        {tab === 'receipt' && (
          <>
            <div className="px-6 pb-2 pt-4">
              <p className="text-h5 font-semibold text-foreground">Penalty Receipt</p>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-4">
              <div className="overflow-hidden rounded-[10px] border border-border">
                <table className="w-full border-collapse">
                  <thead>
                    {/* Decorative green header — acceptable "amount receipt" context. */}
                    <tr style={{ background: '#12B76A' }}>
                      <th className="w-12 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white">#</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white">Non-Compliance</th>
                      <th className="w-32 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-white">Amount</th>
                      <th className="w-24 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-3 py-2.5 text-body-sm tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex flex-col">
                            <span className="text-body-sm font-medium text-foreground">{l.nonCompliance}</span>
                            <span className="text-body-xs tabular-nums text-muted-foreground">KPI {l.code}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-body-sm font-semibold tabular-nums text-foreground">{formatAed(l.amountAed)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <AmountEditor value={l.amountAed} onSave={(v) => setLines((prev) => prev.map((x) => x.id === l.id ? { ...x, amountAed: v } : x))} />
                            <button
                              type="button"
                              aria-label="Delete line"
                              onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
                              className="grid size-7 place-items-center rounded-md text-[var(--status-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-error)_10%,transparent)]"
                            >
                              <Icons.XClose size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr className="border-t border-border">
                        <td colSpan={4} className="px-3 py-8 text-center text-body-sm text-muted-foreground">
                          All line items removed. Go back to KPI Selection to add penalties.
                        </td>
                      </tr>
                    )}
                    {/* Total row */}
                    <tr className="border-t-2 border-border bg-secondary/40">
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-body-sm font-bold uppercase tracking-wide text-foreground">Total</td>
                      <td className="px-3 py-3 text-right text-body-md font-bold tabular-nums text-[#12B76A]">{formatAed(total)}</td>
                      <td className="px-3 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border-t border-border px-6 py-4">
              <Button variant="primary" className="w-full" disabled={lines.length === 0} onClick={issue}>
                Issue Penalty
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════ Penalties tab — empty state (§4) ════════════════ */

export function PenaltiesTabEmpty({
  search, onSearch, onIssue,
}: { search: string; onSearch: (v: string) => void; onIssue: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search anything here" className="pl-8" />
        </div>
        <Button variant="primary" size="md" className="shrink-0 gap-1" onClick={onIssue}>
          <Icons.Plus size={14} /> Issue Penalty
        </Button>
      </div>
      <button
        type="button"
        onClick={onIssue}
        className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-border bg-secondary/20 px-6 py-10 text-center transition-colors hover:bg-secondary/40"
      >
        <img src={emptyPenaltyIllustration} alt="" className="h-28 w-28 object-contain" />
        <p className="text-body-md font-semibold text-foreground">Issue A Penalty</p>
        <p className="max-w-[260px] text-body-xs text-muted-foreground">Tap here or on the button to Issue a Penalty.</p>
      </button>
    </div>
  );
}

/* ═══════════════════════════ Penalty detail (§5) ════════════════════════════ */

const PENALTY_STAGES: { id: PenaltyStatus; label: string; color: string }[] = [
  { id: 'issued', label: 'Issued', color: 'var(--primary)' },
  { id: 'acknowledged', label: 'Acknowledged', color: '#06B6D4' },
  { id: 'disputed', label: 'Disputed', color: '#F04438' },
  { id: 'paid', label: 'Paid', color: '#12B76A' },
];

/** Render @Mentions inline in FAMS primary blue (mirrors IncidentDetail). */
function renderCommentBody(text: string) {
  const parts = text.split(/(@[A-Za-z][A-Za-z0-9_-]*)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold text-primary">{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>,
  );
}

function PenaltyComposer({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = React.useState('');
  const submit = () => { const t = draft.trim(); if (!t) return; onSend(t); setDraft(''); };
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary" aria-label="Attach file">
        <Icons.Paperclip size={16} />
      </button>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="Write a comment here …"
        className="flex-1"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!draft.trim()}
        aria-label="Send comment"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
      >
        <Icons.Send01 size={15} />
      </button>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-body-sm font-medium text-foreground">{children}</span>
    </div>
  );
}

/** The issued-penalty detail — 2-column: left summary + collapsible line-item
 *  table, right Timeline + composer. Rendered inline in the Penalties tab (and
 *  reachable from the pipeline via the parent Incident detail). */
export function PenaltyDetail({
  penaltyId, onBack, role = 'po',
}: { penaltyId: string; onBack?: () => void; role?: 'inspector' | 'esp' | 'po' }) {
  const s = useIims();
  const penalty = s.penaltyById(penaltyId);
  const [detailsOpen, setDetailsOpen] = React.useState(true);

  if (!penalty) {
    return <div className="py-10 text-center text-body-sm text-muted-foreground">Penalty not found.</div>;
  }

  const incident = s.incident(penalty.incidentId);
  const esp = incident ? s.esp(incident.espId) : undefined;
  const issuer = penalty.issuedById === PROJECT_OFFICER.id
    ? { name: PROJECT_OFFICER.name, avatarColor: PROJECT_OFFICER.avatarColor }
    : { name: s.inspector(penalty.issuedById)?.name ?? penalty.issuedById, avatarColor: '#7F56D9' };

  const stages: TransitionStage[] = PENALTY_STAGES.map((p) => ({ id: p.id, label: p.label, color: p.color }));

  const hhmm = (at: string) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const timelineItems = [
    {
      at: penalty.issuedAt,
      item: {
        id: `${penalty.id}-issued`,
        title: (
          <span>
            <span className="font-semibold text-foreground">{issuer.name}</span>{' '}
            <span className="text-muted-foreground">issued penalty to</span>{' '}
            <span className="font-semibold text-foreground">{esp?.name ?? 'ESP'}</span>
          </span>
        ),
        subtitle: `${penalty.lineItems.length} KPI line item${penalty.lineItems.length > 1 ? 's' : ''} · ${formatAed(penalty.totalAed)}`,
        timestamp: hhmm(penalty.issuedAt),
        icon: <Icons.CurrencyDollarCircle size={12} />,
        color: 'var(--primary)',
      },
    },
    ...(penalty.comments ?? []).map((c) => {
      const name = c.authorRole === 'po'
        ? PROJECT_OFFICER.name
        : c.authorRole === 'esp'
          ? (esp?.name ?? 'ESP')
          : (s.inspector(c.authorId)?.name ?? c.authorId);
      return {
        at: c.at,
        item: {
          id: c.id,
          title: <span><span className="font-semibold text-foreground">{name}</span> <span className="text-muted-foreground">commented</span></span>,
          subtitle: <span className="whitespace-pre-wrap">{renderCommentBody(c.text)}</span>,
          timestamp: hhmm(c.at),
          icon: <Icons.MessageTextSquare01 size={12} />,
          color: 'var(--primary)',
        },
      };
    }),
  ]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((x) => x.item);

  const handleSend = (text: string) => {
    s.addPenaltyComment(penalty.id, { authorId: PROJECT_OFFICER.id, authorRole: role, text });
  };

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* ── Left — summary + line items ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {onBack && (
          <button type="button" onClick={onBack} className="flex w-fit items-center gap-1 text-body-xs font-medium text-primary hover:underline">
            <Icons.ChevronLeft size={13} /> Back to Penalties
          </button>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{penalty.id}</span>
          <h2 className="text-h5 font-semibold text-foreground">{incident ? incident.title : 'Penalty'}</h2>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <DetailField label="Status">
            <StatusTransitionDropdown
              stages={stages}
              currentId={penalty.status}
              onTransition={(to) => { s.transitionPenalty(penalty.id, to as PenaltyStatus); toast.success('Penalty status updated.'); }}
              forwardOnly={false}
              size="sm"
            />
          </DetailField>
          <DetailField label="Issue By">
            <span className="flex items-center gap-1.5">
              <AvatarChip name={issuer.name} color={issuer.avatarColor} size={20} />{issuer.name}
            </span>
          </DetailField>
          <DetailField label="Issued On">{formatDate(penalty.issuedAt)}</DetailField>
          <DetailField label="Due Date">{formatDate(penalty.dueAt)}</DetailField>
          {incident && (
            <DetailField label="Linked Incident">
              <span className="flex items-center gap-1.5 text-primary">
                <Icons.AlertTriangle size={14} />{incident.id}
              </span>
            </DetailField>
          )}
          <DetailField label="Contractor">
            <span className="flex items-center gap-1.5">
              {esp && <AvatarChip name={esp.name} color={esp.avatarColor} size={20} />}{esp?.name ?? '—'}
            </span>
          </DetailField>
        </div>

        {/* collapsible Penalty Details table */}
        <div className="overflow-hidden rounded-[10px] border border-border">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-body-sm font-semibold text-white"
            style={{ background: '#12B76A' }}
          >
            Penalty Details
            <Icons.ChevronDown size={16} className={detailsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {detailsOpen && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="w-12 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Non-Compliance</th>
                  <th className="w-32 px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {penalty.lineItems.map((l, i) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2.5 text-body-sm tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-col">
                        <span className="text-body-sm font-medium text-foreground">{l.nonCompliance}</span>
                        <span className="text-body-xs tabular-nums text-muted-foreground">KPI {l.code}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-body-sm font-semibold tabular-nums text-foreground">{formatAed(l.amountAed)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-secondary/40">
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-body-sm font-bold uppercase tracking-wide text-foreground">Total</td>
                  <td className="px-3 py-3 text-right text-body-md font-bold tabular-nums text-[#12B76A]">{formatAed(penalty.totalAed)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right — Timeline + composer ── */}
      <div className="hidden min-h-0 w-[320px] shrink-0 flex-col overflow-hidden border-l border-border pl-4 md:flex">
        <p className="shrink-0 pb-3 text-body-sm font-semibold text-foreground">Timeline</p>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mb-3 flex items-center justify-center">
            <span className="rounded-full bg-secondary px-3 py-1 text-body-xs font-semibold text-muted-foreground">
              {formatDate(penalty.issuedAt)}
            </span>
          </div>
          <Timeline items={timelineItems} />
        </div>
        <div className="shrink-0 border-t border-border pt-3">
          <PenaltyComposer onSend={handleSend} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ issued-penalty summary card ════════════════════ */

/** Compact summary shown in the Penalties tab when a penalty exists — clicking
 *  it opens the PenaltyDetail. */
export function PenaltySummaryCard({ penalty, onOpen }: { penalty: Penalty; onOpen: () => void }) {
  const stage = PENALTY_STAGES.find((p) => p.id === penalty.status) ?? PENALTY_STAGES[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-[10px] border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-secondary/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm font-bold text-foreground">{penalty.id}</span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: `color-mix(in srgb, ${stage.color} 16%, transparent)`, color: stage.color }}
        >
          {stage.label}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {penalty.lineItems.slice(0, 3).map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 text-body-xs">
            <span className="truncate text-muted-foreground">{l.nonCompliance}</span>
            <span className="shrink-0 tabular-nums text-foreground">{formatAed(l.amountAed)}</span>
          </div>
        ))}
        {penalty.lineItems.length > 3 && (
          <span className="text-body-xs text-muted-foreground">+ {penalty.lineItems.length - 3} more…</span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="flex items-center gap-1 text-body-xs text-muted-foreground">
          <Icons.Calendar size={13} />{formatDate(penalty.issuedAt)}
        </span>
        <span className="text-body-md font-bold text-foreground">{formatAed(penalty.totalAed)}</span>
      </div>
    </button>
  );
}
