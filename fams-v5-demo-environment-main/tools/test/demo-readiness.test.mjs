// @ts-check
// Pins the three metadata/content defects the demo-readiness UX pass (step 2b)
// filed as P1 DEMO-BLOCKING, so they cannot silently come back.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../lib/repo.mjs';

const ROOT = REPO_ROOT;
const read = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

describe('demo readiness — A1: the ID column never shows its raw schema type', () => {
  // `uniqueidentifier` was the visible first column header on every entity
  // register. The pipeline modules already do this right ("Task ID"/"Deal ID").
  const REGISTERS = [
    ['fams/asset', 'Vehicle ID'],
    ['fams/workforce', 'Employee ID'],
    ['fams/contact-person', 'Contact ID'],
    ['fams/company', 'Company ID'],
    ['fams/product-service', 'Product ID'],
  ];

  it.each(REGISTERS)('%s labels its uniqueidentifier column "%s"', (mod, label) => {
    const bp = read(`resolved/${mod}.blueprint.json`);
    const col = bp.listcolumns.find((c) => c.col === 'uniqueidentifier');
    expect(col).toBeTruthy();
    expect(col.name).toBe(label);
  });

  it('no resolved blueprint renders a raw type name as a list-column label', () => {
    for (const [mod] of REGISTERS) {
      for (const c of read(`resolved/${mod}.blueprint.json`).listcolumns) {
        expect(c.name ?? '').not.toBe('uniqueidentifier');
      }
    }
  });
});

describe('demo readiness — A2: every entity profile has a right-panel tab set', () => {
  // PM declared `profile.sections` but no `profile.rightPanel`; the Entity
  // Detail pane builds its tabs from `rightPanel.tabs` alone, so it rendered
  // the bare "No sections available." fallback with zero tabs.
  it('preventive-maintenance declares Overview / Details / Linked', () => {
    const profile = read('resolved/fams/preventive-maintenance.blueprint.json').uiConfig.profile;
    expect(profile.rightPanel?.type).toBe('tab');
    expect(profile.rightPanel.tabs.map((t) => t.title)).toEqual(['Overview', 'Details', 'Linked']);
  });

  it('a module that authors profile sections also authors a right panel to show them in', () => {
    const offenders = [];
    for (const mod of ['fams/asset', 'fams/workforce', 'fams/company', 'fams/contact-person',
      'fams/product-service', 'fams/preventive-maintenance']) {
      const profile = read(`resolved/${mod}.blueprint.json`).uiConfig?.profile;
      if (profile?.sections?.length && !profile.rightPanel?.tabs?.length) offenders.push(mod);
    }
    expect(offenders).toEqual([]);
  });
});

describe('demo readiness — A3: no stock photography on municipal waste tickets', () => {
  it('pipelines seeds no Cover Image values', () => {
    const rows = read('core/modules/pipelines/seeds/pipelines.seed.json');
    const list = Array.isArray(rows) ? rows : rows.records ?? [];
    // `systemcol10` is `fld_pl_cover` ("Cover Image") — the Kanban card cover.
    expect(list.filter((r) => r.systemcol10 != null)).toEqual([]);
  });

  it('no Kanban card cover anywhere points at a random-image service', () => {
    const raw = readFileSync(join(ROOT, 'core/modules/pipelines/seeds/pipelines.seed.json'), 'utf8');
    expect(raw).not.toMatch(/"systemcol10":\s*"https:\/\/picsum/);
  });
});
