// @ts-check
import { describe, it, expect } from 'vitest';
import { validateOp, applyOp, OP_TYPES, PLACEMENT_REGIONS } from '../lib/ops.mjs';
import { deepClone, stableStringify } from '../lib/blueprint.mjs';

/** Minimal blueprint fixture exercising every region. */
function bp() {
  return {
    kind: 'entity',
    code: 'x/y',
    name: 'Y',
    systemcolumns: [
      { id: 'fld_title', col: 'title', name: 'Title', type: 'SmallText', required: true },
      { id: 'fld_a', col: 'systemcol1', name: 'Alpha', type: 'SmallText' },
    ],
    uiConfig: {
      statusList: [
        { id: 'sts_open', key: 'open', label: 'Open', color: '#000000' },
        { id: 'sts_done', key: 'done', label: 'Done', color: '#111111' },
      ],
      kanbanCard: {
        header: [{ id: 'fld_title', col: 'title', order: 1, pos: 'left' }],
        body: [{ id: 'fld_a', col: 'systemcol1', order: 1, pos: 'left' }],
        footer: [],
      },
      profile: {
        title: { id: 'fld_title', col: 'title', pos: 'left' },
        details: [{ id: 'fld_a', col: 'systemcol1', pos: 'left', order: 1 }],
        sections: [],
        rightPanel: {
          type: 'tab',
          tabs: [
            { id: 'tab_x', key: 'x', title: 'X', order: 1, component: { name: 'CX' } },
            { id: 'tab_y', key: 'y', title: 'Y', order: 2, component: { name: 'CY' } },
          ],
        },
      },
    },
    listcolumns: [
      { id: 'fld_title', col: 'title', component: { name: 'TextView' } },
      { id: 'fld_a', col: 'systemcol1', component: { name: 'TextView' } },
    ],
  };
}

const apply = (op) => { const b = bp(); const eff = applyOp(b, op); return { b, eff }; };

describe('applyOp — one per op family', () => {
  it('addField inserts after a stable id', () => {
    const { b } = apply({ opId: 'o', op: 'addField', after: 'fld_title', field: { id: 'fld_new', col: 'systemcol9', name: 'New', type: 'SmallText' } });
    expect(b.systemcolumns.map((c) => c.id)).toEqual(['fld_title', 'fld_new', 'fld_a']);
  });
  it('addField appends when no after', () => {
    const { b } = apply({ opId: 'o', op: 'addField', field: { id: 'fld_z', col: 'systemcol9', name: 'Z', type: 'SmallText' } });
    expect(b.systemcolumns.at(-1).id).toBe('fld_z');
  });
  it('hideField removes the list placement, keeps the definition', () => {
    const { b, eff } = apply({ opId: 'o', op: 'hideField', id: 'fld_a' });
    expect(b.listcolumns.map((c) => c.id)).toEqual(['fld_title']);
    expect(b.systemcolumns.some((c) => c.id === 'fld_a')).toBe(true);
    expect(eff.touched).toEqual(['fld_a']);
  });
  it('setLabel renames a field', () => {
    const { b } = apply({ opId: 'o', op: 'setLabel', id: 'fld_a', label: 'Renamed' });
    expect(b.systemcolumns.find((c) => c.id === 'fld_a').name).toBe('Renamed');
  });
  it('setFieldProp writes an allowlisted prop; null deletes it', () => {
    const { b } = apply({ opId: 'o', op: 'setFieldProp', id: 'fld_a', prop: 'required', value: true });
    expect(b.systemcolumns.find((c) => c.id === 'fld_a').required).toBe(true);
    const b2 = bp(); applyOp(b2, { opId: 'o', op: 'setFieldProp', id: 'fld_title', prop: 'required', value: null });
    expect('required' in b2.systemcolumns[0]).toBe(false);
  });
  it('addStage / removeStage', () => {
    const { b } = apply({ opId: 'o', op: 'addStage', after: 'sts_open', stage: { id: 'sts_mid', key: 'mid', label: 'Mid', color: '#222222' } });
    expect(b.uiConfig.statusList.map((s) => s.id)).toEqual(['sts_open', 'sts_mid', 'sts_done']);
    const { b: b2, eff } = apply({ opId: 'o', op: 'removeStage', id: 'sts_done' });
    expect(b2.uiConfig.statusList.map((s) => s.id)).toEqual(['sts_open']);
    expect(eff.removed).toEqual(['sts_done']);
  });
  it('addTab bootstraps rightPanel when absent', () => {
    const b = bp();
    delete b.uiConfig.profile.rightPanel;
    applyOp(b, { opId: 'o', op: 'addTab', tab: { id: 'tab_new', key: 'n', title: 'N', order: 1, component: { name: 'CN' } } });
    expect(b.uiConfig.profile.rightPanel.tabs.map((t) => t.id)).toEqual(['tab_new']);
  });
  it('hideTab removes a tab', () => {
    const { b, eff } = apply({ opId: 'o', op: 'hideTab', id: 'tab_x' });
    expect(b.uiConfig.profile.rightPanel.tabs.map((t) => t.id)).toEqual(['tab_y']);
    expect(eff.removed).toEqual(['tab_x']);
  });
  it('reorderTabs reorders the exact set', () => {
    const { b } = apply({ opId: 'o', op: 'reorderTabs', ids: ['tab_y', 'tab_x'] });
    expect(b.uiConfig.profile.rightPanel.tabs.map((t) => t.id)).toEqual(['tab_y', 'tab_x']);
  });
});

describe('validateOp — rejections', () => {
  it('rejects an unknown op type', () => {
    expect(validateOp({ opId: 'o', op: 'frobnicate' }, bp())[0]).toMatch(/unknown op type "frobnicate"/);
  });
  it('rejects a missing opId', () => {
    expect(validateOp({ op: 'hideField', id: 'fld_a' }, bp()).join()).toMatch(/missing string "opId"/);
  });
  it('names the op + id when a stable id is missing (setLabel)', () => {
    const errs = validateOp({ opId: 'o', op: 'setLabel', id: 'fld_ghost', label: 'x' }, bp());
    expect(errs.join()).toMatch(/setLabel \(o\): references missing field id "fld_ghost"/);
  });
  it('rejects hideField on an unknown list id', () => {
    expect(validateOp({ opId: 'o', op: 'hideField', id: 'nope' }, bp()).join()).toMatch(/missing list-column id "nope"/);
  });
  it('rejects addField when id already exists', () => {
    expect(validateOp({ opId: 'o', op: 'addField', field: { id: 'fld_a', col: 'c', name: 'n', type: 'SmallText' } }, bp()).join()).toMatch(/already exists/);
  });
  it('rejects setFieldProp for a prop outside the allowlist', () => {
    expect(validateOp({ opId: 'o', op: 'setFieldProp', id: 'fld_a', prop: 'type', value: 'x' }, bp()).join()).toMatch(/not in allowlist/);
  });
  it('rejects addField with a missing "after" id', () => {
    expect(validateOp({ opId: 'o', op: 'addField', after: 'fld_ghost', field: { id: 'fld_n', col: 'c', name: 'n', type: 'SmallText' } }, bp()).join()).toMatch(/"after" references missing field id "fld_ghost"/);
  });
  it('rejects reorderTabs whose id set does not match', () => {
    expect(validateOp({ opId: 'o', op: 'reorderTabs', ids: ['tab_x'] }, bp()).join()).toMatch(/must be exactly the current tab set/);
  });
  it('accepts a valid op (no errors)', () => {
    expect(validateOp({ opId: 'o', op: 'setLabel', id: 'fld_a', label: 'ok' }, bp())).toEqual([]);
  });
  it('OP_TYPES covers all ten families', () => {
    expect([...OP_TYPES].sort()).toEqual(['addField', 'addStage', 'addTab', 'hideField', 'hideTab', 'placeField', 'removeStage', 'reorderTabs', 'setFieldProp', 'setLabel']);
  });
});

describe('placements — addField fans a field onto surfaces', () => {
  const newField = { id: 'fld_b', col: 'systemcol2', name: 'Beta', type: 'SmallText' };

  it('places into details after an existing placement (convention-consistent node)', () => {
    const { b } = apply({ opId: 'o', op: 'addField', field: newField, placements: { details: { after: 'fld_a' } } });
    const details = b.uiConfig.profile.details;
    expect(details.map((d) => d.id)).toEqual(['fld_a', 'fld_b']);
    expect(details.at(-1)).toEqual({ id: 'fld_b', col: 'systemcol2', order: 1, pos: 'left' });
  });

  it('places into list with a TextView component node', () => {
    const { b } = apply({ opId: 'o', op: 'addField', field: newField, placements: { list: { after: 'fld_title' } } });
    expect(b.listcolumns.map((c) => c.id)).toEqual(['fld_title', 'fld_b', 'fld_a']);
    expect(b.listcolumns[1]).toEqual({ id: 'fld_b', col: 'systemcol2', component: { name: 'TextView' } });
  });

  it('places into a kanbanCard region', () => {
    const { b } = apply({ opId: 'o', op: 'addField', field: newField, placements: { kanbanCard: { region: 'footer' } } });
    expect(b.uiConfig.kanbanCard.footer.map((c) => c.id)).toEqual(['fld_b']);
  });

  it('fans onto multiple surfaces at once', () => {
    const { b } = apply({ opId: 'o', op: 'addField', field: newField, placements: { details: { after: 'fld_a' }, list: {}, kanbanCard: { region: 'body', after: 'fld_a' } } });
    expect(b.uiConfig.profile.details.some((d) => d.id === 'fld_b')).toBe(true);
    expect(b.listcolumns.at(-1).id).toBe('fld_b'); // no after → append
    expect(b.uiConfig.kanbanCard.body.map((c) => c.id)).toEqual(['fld_a', 'fld_b']);
  });

  it('rejects a placement whose "after" target is missing (never silent)', () => {
    const errs = validateOp({ opId: 'o', op: 'addField', field: newField, placements: { details: { after: 'fld_ghost' } } }, bp());
    expect(errs.join()).toMatch(/placement "after" references missing details id "fld_ghost"/);
  });

  it('rejects an unknown kanbanCard region', () => {
    const errs = validateOp({ opId: 'o', op: 'addField', field: newField, placements: { kanbanCard: { region: 'sidebar' } } }, bp());
    expect(errs.join()).toMatch(/kanbanCard.region must be one of/);
  });
});

describe('placeField — places an EXISTING field', () => {
  it('places fld_a (already defined) into the footer after nothing → append', () => {
    const { b, eff } = apply({ opId: 'o', op: 'placeField', id: 'fld_a', region: 'kanbanCard.footer' });
    expect(b.uiConfig.kanbanCard.footer.map((c) => c.id)).toEqual(['fld_a']);
    expect(eff.touched).toEqual(['fld_a']);
  });

  it('places after an existing region node', () => {
    const { b } = apply({ opId: 'o', op: 'placeField', id: 'fld_title', region: 'details', after: 'fld_a' });
    expect(b.uiConfig.profile.details.map((d) => d.id)).toEqual(['fld_a', 'fld_title']);
  });

  it('rejects placing a field that is not defined', () => {
    expect(validateOp({ opId: 'o', op: 'placeField', id: 'fld_ghost', region: 'details' }, bp()).join())
      .toMatch(/references missing field id "fld_ghost"/);
  });

  it('rejects an unknown region', () => {
    expect(validateOp({ opId: 'o', op: 'placeField', id: 'fld_a', region: 'sidebar' }, bp()).join())
      .toMatch(/"region" must be one of/);
  });

  it('rejects placing a field already present in the region (no duplicate)', () => {
    expect(validateOp({ opId: 'o', op: 'placeField', id: 'fld_a', region: 'details' }, bp()).join())
      .toMatch(/already placed in details/);
  });

  it('rejects an "after" target missing from the region', () => {
    expect(validateOp({ opId: 'o', op: 'placeField', id: 'fld_title', region: 'details', after: 'fld_ghost' }, bp()).join())
      .toMatch(/placement "after" references missing details id "fld_ghost"/);
  });

  it('PLACEMENT_REGIONS lists the five surfaces', () => {
    expect([...PLACEMENT_REGIONS]).toEqual(['details', 'list', 'kanbanCard.header', 'kanbanCard.body', 'kanbanCard.footer']);
  });
});

describe('placements — determinism', () => {
  it('applying the same placement op twice yields byte-identical blueprints', () => {
    const op = { opId: 'o', op: 'addField', field: { id: 'fld_b', col: 'systemcol2', name: 'Beta', type: 'SmallText' }, placements: { details: { after: 'fld_a' }, kanbanCard: { region: 'body' } } };
    const a = bp(); applyOp(a, deepClone(op));
    const b = bp(); applyOp(b, deepClone(op));
    expect(stableStringify(a)).toBe(stableStringify(b));
  });
});
