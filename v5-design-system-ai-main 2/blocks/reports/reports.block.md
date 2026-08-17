# Reports block — tabbed report tables

**Type:** `reports` · **Form:** TSX `ModuleConfig` (`reports.block.tsx` — to author).

## What it is
Browser-style tabbed report surface: a top-nav of report tabs (shrink/truncate, home icon), each
rendering a report table with RAG row tinting, an advanced-filter side sheet, a filters popup, and a
Subscribe/schedule sheet. Built-in reports can't be deleted; custom reports can.

## Anatomy
- Top-nav report tabs (browser-shrink behavior) + home.
- Report detail: KPI row (`ReportTable` header via `IconBadge`) + table with RAG tinting.
- Advanced filter side sheet · filters popup · Subscribe/schedule sheet · `SystemAlert` toasts.

## Adapt
Tab set, each report's columns + RAG rule, filter fields. Mark built-in vs custom (deletable).

## Compose
Splice the TSX `ModuleConfig` into the app. Reference: facilities-ops `reports.tsx`.
