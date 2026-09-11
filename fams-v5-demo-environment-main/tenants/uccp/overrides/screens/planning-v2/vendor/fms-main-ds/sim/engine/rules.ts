import type {
  Condition, PipelineRules, ResolvedPermissions, UserContext, EntityRecord,
} from './types';

/**
 * Pipeline rules evaluator — faithful to the backend's JSONLogic engine, but a
 * SAFE interpreter (no `eval()`; the production engine uses eval(), flagged as
 * a risk — fixed here).
 *
 * Supports combinators $and/$or; leaf ops $in/$eq/$ne; path refs "$.user.<k>"
 * and "$.task.<k>". `resolvePermissions()` produces the same object the real
 * frontend consumes, so dropdowns/field-edit/row-visibility match production.
 */

type EvalScope = { user: UserContext; task?: EntityRecord };

function resolvePath(path: string, scope: EvalScope): unknown {
  const clean = path.replace(/^\$\./, '');
  const [root, ...rest] = clean.split('.');
  let cur: unknown = root === 'user' ? scope.user : root === 'task' ? scope.task : undefined;
  for (const key of rest) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

export function evalCondition(cond: Condition | undefined, scope: EvalScope): boolean {
  if (cond == null) return true;
  if ('$and' in cond) return (cond.$and as Condition[]).every((c) => evalCondition(c, scope));
  if ('$or' in cond) return (cond.$or as Condition[]).some((c) => evalCondition(c, scope));

  for (const [path, op] of Object.entries(cond)) {
    const actual = resolvePath(path, scope);
    const operator = op as { $in?: unknown[]; $eq?: unknown; $ne?: unknown };
    if ('$in' in operator) {
      const allowed = new Set(asArray(operator.$in));
      if (!asArray(actual).some((a) => allowed.has(a))) return false;
    }
    if ('$eq' in operator && actual !== operator.$eq) return false;
    if ('$ne' in operator && actual === operator.$ne) return false;
  }
  return true;
}

export function resolvePermissions(
  rules: PipelineRules, user: UserContext, task?: EntityRecord,
): ResolvedPermissions {
  const scope: EvalScope = { user, task };

  const transitionRules: Record<string, boolean> = {};
  for (const [from, targets] of Object.entries(rules.transitions ?? {})) {
    for (const to of targets) {
      const key = `${from}->${to}`;
      transitionRules[key] = evalCondition(rules.transition_rules?.[key], scope);
    }
  }

  const fieldRules: Record<string, { view: boolean; update: boolean }> = {};
  for (const [col, r] of Object.entries(rules.field_rules ?? {})) {
    fieldRules[col] = { view: evalCondition(r.view, scope), update: evalCondition(r.update, scope) };
  }

  const statusRules: Record<string, { view: boolean }> = {};
  for (const [key, r] of Object.entries(rules.status_rules ?? {})) {
    statusRules[key] = { view: evalCondition(r.view, scope) };
  }

  return { fieldRules, statusRules, transitionRules };
}

export function isTaskVisible(rules: PipelineRules, user: UserContext, task: EntityRecord): boolean {
  const conds = rules.task_rules?.view;
  if (!conds || conds.length === 0) return true;
  return conds.some((c) => evalCondition(c, { user, task }));
}

export function allowedTransitions(
  rules: PipelineRules, user: UserContext, task: EntityRecord,
): string[] {
  const from = task.status ?? '';
  const perms = resolvePermissions(rules, user, task);
  return (rules.transitions?.[from] ?? []).filter((to) => perms.transitionRules[`${from}->${to}`]);
}
