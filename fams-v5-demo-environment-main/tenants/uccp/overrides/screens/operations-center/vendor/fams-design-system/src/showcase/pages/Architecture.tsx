import * as React from 'react';
import { ArrowUpRight } from '../../icons';
import { workshopApp } from '../apps/workshop.config';
import { salesApp } from '../apps/sales.config';
import { eadRmsApp } from '../apps/ead-rms.config';
import { cementApp } from '../apps/cement.config';
import { duconApp } from '../apps/ducon.config';
import { generatorApp } from '../apps/generator.config';

const ALL_APPS = [
  { app: workshopApp, note: 'Enterprise workshop — pipeline, assets, preventive, inventory, reports.' },
  { app: salesApp, note: 'Lean CRM — deals pipeline, companies, contacts, activities. Green brand.' },
  { app: eadRmsApp, note: 'White-label regulator — manifests, vehicles, zones, live map. Navy brand.' },
  { app: cementApp, note: 'Bulk-cement delivery — presenter-clickable 12-step orders, finance.' },
  { app: duconApp, note: 'Factory maintenance — two plants, machine assets. Amber brand.' },
  { app: generatorApp, note: 'Genset telemetry — gauges, alarms, settings + forms modules. Violet brand.' },
];

function Sec({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10">
      <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
      {desc && <p className="mb-6 mt-1 max-w-3xl text-body-sm text-muted-foreground">{desc}</p>}
      {!desc && <div className="mb-6" />}
      {children}
    </section>
  );
}

const TIERS = [
  {
    k: 'App',
    color: 'var(--primary)',
    blurb: 'A branded operational environment — logo, theme, and a hand-picked set of modules. Same kit, different app per business.',
  },
  {
    k: 'Module',
    color: 'var(--chart-3)',
    blurb: 'One functional domain, picked from a fixed menu of module types (Entity, Pipeline, Dashboard, Live Monitoring, Reports, Inbox, Settings…).',
  },
  {
    k: 'View',
    color: 'var(--chart-2)',
    blurb: 'A visualisation of the same module data — List, Kanban, Calendar, Map, Hybrid, Dashboard. Views change presentation, never the data.',
  },
];

export function Architecture() {
  return (
    <div>
      <Sec
        id="app-shell"
        title="App Shell"
        desc="The composition root. AppShell assembles a complete branded app from an AppConfig — the blue app rail (apps + collective inbox + support/settings/user), the white module rail, the module top-nav (views/instances as tabs), and the active view with its detail and creation side sheets. Below is the REAL shell preview — the same six-app build served at /appshell.html — embedded live. Click the app icons in the blue rail to switch between six apps built from the same kit."
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-body-sm text-muted-foreground">
            Six apps · live data mutations · task &amp; entity detail sheets · stepped creation forms.
          </p>
          <a
            href="/appshell.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-body-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open full screen
            <ArrowUpRight size={14} />
          </a>
        </div>
        {/* The standalone shell embedded via iframe — side sheets and dialogs
            stay contained in the frame (they're position:fixed, so rendering
            AppShell inline here would let them escape over the docs chrome). */}
        <iframe
          src="/appshell.html"
          title="FAMS AppShell — live six-app preview"
          className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          style={{ height: 760 }}
        />
        <p className="mt-3 text-caption text-muted-foreground">
          Truemax Workshop · Acme Sales · EAD RMS · Cement Delivery OS · Ducon Industries · Generator Monitoring — every record opens the standard
          {' '}<code>TaskDetail</code> / <code>EntityDetail</code> surfaces; Create New opens the stepped form sheets.
        </p>
      </Sec>

      <Sec
        id="composition"
        title="App = Module → View"
        desc="Three conceptual tiers. An app is the whole environment; modules are its functional sections; views are how each module's data is shown."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.k} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="inline-block size-3 rounded-full" style={{ background: t.color }} />
                <span className="text-body-md font-semibold text-foreground">{t.k}</span>
              </div>
              <p className="text-body-sm text-muted-foreground">{t.blurb}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ALL_APPS.map(({ app, note }) => (
            <AppModuleList key={app.id} app={app} note={note} />
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-body-sm text-muted-foreground">
          Same component library underneath. The selection of modules — and the brand theme — is the only thing that differs across all six apps. That is the FAMS V5 thesis: compose business software by choosing modules, not by writing new code.
        </p>
      </Sec>

      <Sec id="module-types" title="Module types" desc="The kit ships a fixed menu of module types. Each declares default views and a built-in renderer. See the dedicated Module Types page for the full catalogue.">
        <div className="flex flex-wrap gap-2">
          {['Entity', 'Pipeline', 'Dashboard', 'Live Monitoring', 'Reports', 'Inbox', 'Settings', 'Calendar', 'Forms'].map((m) => (
            <span key={m} className="rounded-full border border-border bg-secondary px-3 py-1 text-body-sm font-medium text-secondary-foreground">
              {m}
            </span>
          ))}
        </div>
      </Sec>

      <Sec id="views" title="Views" desc="A module exposes one or more views. The same data, re-presented for monitoring, planning, scheduling, or analysis.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['List', 'Dense table of records — the default for Entity modules.'],
            ['Kanban', 'Work moving through stages — the default for Pipeline modules.'],
            ['Calendar', 'Events on a month grid — scheduling.'],
            ['Map', 'Geo-located records or live activity.'],
            ['Hybrid', 'List + Map side by side.'],
            ['Dashboard', 'KPI tiles and charts — centralised in a Dashboard module.'],
          ].map(([k, d]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-4">
              <div className="text-body-md font-semibold text-foreground">{k}</div>
              <p className="mt-1 text-body-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Sec>
    </div>
  );
}

function AppModuleList({ app, note }: { app: typeof workshopApp; note: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-1 text-body-md font-semibold text-foreground">{app.brand.name}</div>
      <div className="mb-3 text-caption text-muted-foreground">{note}</div>
      <div className="flex flex-col gap-1.5">
        {app.modules.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5">
            <span className="text-body-sm font-medium text-foreground">{m.label}</span>
            <span className="text-caption uppercase tracking-wide text-muted-foreground">{m.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
