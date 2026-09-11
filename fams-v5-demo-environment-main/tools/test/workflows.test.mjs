// @ts-check
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../lib/yaml-lite.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wf = (name) => parseYaml(readFileSync(join(ROOT, '.github', 'workflows', name), 'utf8'));

describe('workflow YAML is valid + well-formed', () => {
  it('yaml-lite rejects tabs and unterminated quotes (the linter is real)', () => {
    expect(() => parseYaml('a:\n\tb: 1')).toThrow(/tab/);
    expect(() => parseYaml('a: "oops')).toThrow(/unterminated/);
  });

  it('check.yml parses and keeps its structure', () => {
    const doc = wf('check.yml');
    expect(doc.name).toBe('check');
    expect(doc.jobs.check['runs-on']).toBe('ubuntu-latest');
    expect(Array.isArray(doc.jobs.check.steps)).toBe(true);
  });

  it('capture.yml parses and implements the decision #17 triggers + ladder', () => {
    const doc = wf('capture.yml');
    expect(doc.name).toBe('capture');
    // Triggers: PR review submitted + issue_comment created (the /capture path).
    expect(doc.on.pull_request_review.types).toContain('submitted');
    expect(doc.on.issue_comment.types).toContain('created');
    // Least-privilege perms to commit + comment.
    expect(doc.permissions.contents).toBe('write');
    expect(doc.permissions['pull-requests']).toBe('write');
    // Runs the unit-tested core entry.
    const steps = doc.jobs.capture.steps;
    const runs = steps.map((s) => s.run).filter(Boolean).join('\n');
    expect(runs).toMatch(/tools\/capture-action\.mjs/);
    expect(runs).toMatch(/gh pr comment/); // never silent
  });
});
