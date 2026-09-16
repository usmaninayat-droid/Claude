/* IWMP · Contract Management — behaviour. Markup strings mirror the Figma
   anatomy documented in plan/run-2026-09-16-contract-management/specs/. */
'use strict';

/* ── Icon sprite (Figma-exported glyphs, normalised to currentColor) ─────── */
const SPR = 'assets/icons.svg#i-';
const ic = (name, size = 16, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="${SPR}${name}"/></svg>`;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ══════════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════════ */
const CONTRACTS = [
  { id:'PRJ769012', name:'Lot 1 — Abu Dhabi',      lot:'Lot 1', contractor:'BEEAH', expiresDays:45,  status:'ongoing',  m:{ workforce:110, vehicles:95,  equipment:60,  bins:118 } },
  { id:'PRJ769012', name:'Lot 2 — Al Ain',         lot:'Lot 1', contractor:'BEEAH', expiresDays:12,  status:'ongoing',  m:{ workforce:80,  vehicles:40,  equipment:100, bins:120 }, key:'c2' },
  { id:'PRJ769012', name:'Lot 3 — Al Dhafra',      lot:'Lot 1', contractor:'BEEAH', expiresDays:210, status:'ongoing',  m:{ workforce:120, vehicles:115, equipment:110, bins:119 }, key:'c3' },
  { id:'PRJ769012', name:'Lot 7 — Mussafah',       lot:'Lot 1', contractor:'BEEAH', expiresDays:30,  status:'ongoing',  m:{ workforce:88,  vehicles:72,  equipment:65,  bins:100 }, key:'c4' },
  { id:'PRJ769012', name:'Lot 8 — Yas Island',     lot:'Lot 1', contractor:'BEEAH', expiresDays:18,  status:'expiring', m:{ workforce:60,  vehicles:50,  equipment:40,  bins:80  }, key:'c5' },
  { id:'PRJ769012', name:'Lot 9 — Saadiyat',       lot:'Lot 1', contractor:'BEEAH', expiresDays:150, status:'ongoing',  m:{ workforce:118, vehicles:120, equipment:112, bins:120 }, key:'c6' },
  { id:'PRJ769012', name:'Lot 4 — Abu Dhabi City', lot:'Lot 1', contractor:'BEEAH', expiresDays:8,   status:'expiring', m:{ workforce:70,  vehicles:55,  equipment:45,  bins:90  }, key:'c7' },
  { id:'PRJ769012', name:'Lot 5 — Western Region', lot:'Lot 1', contractor:'BEEAH', expiresDays:null,status:'draft',    m:{ workforce:0,   vehicles:0,   equipment:0,   bins:0   }, key:'c8' },
  { id:'PRJ769012', name:'Lot 6 — Khalifa City',   lot:'Lot 1', contractor:'BEEAH', expiresDays:95,  status:'ongoing',  m:{ workforce:102, vehicles:98,  equipment:90,  bins:110 }, key:'c9' },
  { id:'PRJ769012', name:'Lot 10 — Al Shamkha',    lot:'Lot 1', contractor:'BEEAH', expiresDays:-3,  status:'expired',  m:{ workforce:40,  vehicles:35,  equipment:20,  bins:50  }, key:'c10' },
];
CONTRACTS.forEach((c, i) => { c.key = c.key || 'c' + (i + 1); });
const CAP = 120;
const METER = {
  workforce:{ icon:'users-02', label:'Workforce' }, vehicles:{ icon:'car-01', label:'Vehicles' },
  equipment:{ icon:'tool-02', label:'Equipment' },  bins:{ icon:'trash-03', label:'Bins' },
};
const fillClass = v => v / CAP < .55 ? 'bad' : v / CAP < .85 ? 'warn' : 'ok';

function meterHTML(key, v) {
  const m = METER[key];
  return `<div class="meter">
    <div class="m-head"><span class="m-name">${ic(m.icon, 20)}${m.label}</span><span class="m-val">${v}<span>/${CAP}</span></span></div>
    <div class="bar"><div class="fill ${fillClass(v)}" style="width:${Math.round(v / CAP * 100)}%"></div></div>
  </div>`;
}
function expiryHTML(c) {
  if (c.status === 'draft') return '';
  if (c.expiresDays < 0) return `<span class="exp warn">Expired ${Math.abs(c.expiresDays)} days ago</span>`;
  return `<span class="exp${c.expiresDays <= 15 ? ' warn' : ''}">Expires in ${c.expiresDays} days</span>`;
}
function cardHTML(c) {
  return `<div class="card" data-key="${c.key}">
    <div class="card-head">
      <div class="card-row1">
        <div class="card-title">${esc(c.name)}</div>
        <div class="card-right">${expiryHTML(c)}<span class="badge ${c.status}">${c.status}</span></div>
      </div>
      <div class="chips">
        <span class="chip id">${ic('hash-02', 12, 'r180')}${c.id}</span>
        <span class="chip esp"><span class="av">${c.contractor[0]}</span>${c.contractor}</span>
        <span class="chip lot">${ic('skew', 16)}${c.lot}</span>
      </div>
    </div>
    <div class="meters">
      <div class="mrow">${meterHTML('workforce', c.m.workforce)}${meterHTML('vehicles', c.m.vehicles)}</div>
      <div class="mrow">${meterHTML('equipment', c.m.equipment)}${meterHTML('bins', c.m.bins)}</div>
    </div>
  </div>`;
}
const KPIS = [
  { tint:'info',     label:'Total Project',      calc:cs => cs.length },
  { tint:'success',  label:'Active',              calc:cs => cs.filter(c => c.status === 'ongoing' || c.status === 'expiring').length },
  { tint:'warning',  label:'Expiring ≤ 120 days', calc:cs => cs.filter(c => c.status === 'expiring').length },
  { tint:'grayblue', label:'Drafts',              calc:cs => cs.filter(c => c.status === 'draft').length },
  { tint:'error',    label:'Expired',             calc:cs => cs.filter(c => c.status === 'expired').length },
];
function renderKpis() {
  document.getElementById('cmKpis').innerHTML = KPIS.map(k =>
    `<div class="kpi"><div class="kpi-av ${k.tint}">${ic('file-06', 22)}</div>
      <div class="kpi-txt"><div class="kpi-lbl">${k.label}</div><div class="kpi-val">${k.calc(CONTRACTS)}</div></div></div>`).join('');
}
let query = '';
function renderGrid() {
  const q = query.trim().toLowerCase();
  const rows = CONTRACTS.filter(c => !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.contractor.toLowerCase().includes(q));
  document.getElementById('cmGrid').innerHTML = rows.length ? rows.map(cardHTML).join('') : '<div class="cm-empty">No projects match your search.</div>';
}
document.getElementById('cmSearch').addEventListener('input', e => { query = e.target.value; renderGrid(); });
document.getElementById('cmCreate').addEventListener('click', () => openWizard());
document.getElementById('cmGrid').addEventListener('click', e => {
  const card = e.target.closest('.card'); if (!card) return;
  const c = CONTRACTS.find(x => x.key === card.dataset.key); if (c) openDetail(c);
});
renderKpis(); renderGrid();

/* ══════════════════════════════════════════════════════════════════════════
   WIZARD
   ══════════════════════════════════════════════════════════════════════════ */
const STEP_DEFS = [
  { key:'basic',       n:'STEP 1',     label:'Basic Info',                    icon:'list' },
  { key:'zone',        n:'STEP 2',     label:'Zone Selection',                icon:'marker-pin-04' },
  { key:'vehicles',    n:'STEP 3',     label:'Add Vehicles',                  icon:'truck-02' },
  { key:'equipment',   n:'STEP 5',     label:'Add Equipment',                 icon:'tool-02' },
  { key:'workforce',   n:'STEP 6',     label:'Add Workforce',                 icon:'users-02' },
  // Figma (Launch Pad 7205:11761) folds Add Bins + Services & Frequencies into
  // ONE "Service Lines" step and keeps the rail's own numbering (no STEP 7).
  { key:'service',     n:'STEP 8',     label:'Service Lines',                 icon:'coins-hand' },
  { key:'kpi',         n:'STEP 9',     label:'KPI Targets',                   icon:'target-04' },
  { key:'attachments', n:'STEP 10',    label:'Attachments',                   icon:'attachment-01' },
  { key:'summary',     n:'FINAL STEP', label:'Summary',                       icon:'align-left' },
];
/* Figma-rendered art (multi-fragment vectors captured as PNG at native size) */
const ART = { vehicles:'assets/art/empty-vehicles.png', equipment:'assets/art/empty-equipment.png', workforce:'assets/art/empty-workforce.png', bins:'assets/art/empty-bins.png', service:'assets/art/empty-services.png' };
const CAT = {
  vehicles: [
    { id:'compactor', name:'Compactor',   icon:'truck-02', art:'assets/art/veh-compactor.png', capacity:'(7–10 cbm) RCV',                  make:'Mercedes' },
    { id:'skip1',     name:'Skip Loader', icon:'truck-02', art:'assets/art/veh-skip.png',      capacity:'(20–25 cbm) – Side Loaders (SL)', make:'UD' },
    { id:'hook1',     name:'Hook Loader', icon:'truck-02', art:'assets/art/veh-hook.png',      capacity:'(20–25 cbm) RCV',                 make:'Mercedes' },
    { id:'loader',    name:'Loader',      icon:'truck-02', art:'assets/art/veh-loader.png',    capacity:'—',                               make:'UD' },
    { id:'skip2',     name:'Skip Loader', icon:'truck-02', art:'assets/art/veh-skip.png',      capacity:'(20–25 cbm) – Side Loaders (SL)', make:'UD' },
    { id:'hook2',     name:'Hook Loader', icon:'truck-02', art:'assets/art/veh-hook.png',      capacity:'—',                               make:'UD' },
  ],
  equipment: [
    { id:'rideon',  name:'Ride-On Precinct Vacuum Sweeping Machines', icon:'tool-02', art:'assets/art/eq-1.png', sq:true, make:'TBA' },
    { id:'towed',   name:'Towed Mechanical Broom Sweeper',           icon:'tool-02', art:'assets/art/eq-3.png', sq:true, make:'TBA' },
    { id:'litter',  name:'Litter Picker',                            icon:'tool-02', art:'assets/art/eq-2.png', sq:true, make:'TBA' },
    { id:'tools',   name:'Cleaner Tools',                            icon:'tool-02', art:'assets/art/eq-3.png', sq:true, make:'TBA' },
    { id:'machine', name:'Cleaner Machine',                          icon:'tool-02', art:'assets/art/eq-1.png', sq:true, make:'TBA' },
    { id:'suck',    name:'Cleaner Sucking Machine',                  icon:'tool-02', art:'assets/art/eq-3.png', sq:true, make:'TBA' },
  ],
  workforce: [
    { id:'supervisor', name:'Supervisor',      icon:'user-03',  art:'assets/art/wf-person.png', sq:true },
    { id:'sweepers',   name:'Sweepers',        icon:'users-02', art:'assets/art/wf-person.png', sq:true },
    { id:'litterp',    name:'Litter Pickers',  icon:'users-02', art:'assets/art/wf-person.png', sq:true },
    { id:'window',     name:'Window Washers',  icon:'users-02', art:'assets/art/wf-person.png', sq:true },
    { id:'street',     name:'Street Sweepers', icon:'users-02', art:'assets/art/wf-person.png', sq:true },
    { id:'drivers',    name:'Drivers',         icon:'users-02', art:'assets/art/wf-person.png', sq:true },
  ],
  bins: [
    { id:'b3', name:'3 CBM Bins', icon:'trash-03' }, { id:'b5', name:'5 CBM Bins', icon:'trash-03' }, { id:'b7', name:'7 CBM Bins', icon:'trash-03' },
    { id:'l240', name:'240 L Bins', icon:'trash-03' }, { id:'l660', name:'660 L Bins', icon:'trash-03' }, { id:'l1100', name:'1100 L Bins', icon:'trash-03' },
  ],
  service: [
    'Full Bin Collection','Bin Washing','Under Bin Washing','Bulky Waste Collection','Dead Animals Collection','Stuff Complaint','Green Waste Collection',
    'Lost Items in Bins','Recyclable Waste Collection','C&D Waste Removal','Between Buildings Cleaning','Litter Picking Service','Lost Items','Oil Spill',
    'Sweeping Sand Service','Open Areas Cleaning','Pedestrian Underpasses Cleaning','Pedestrian Bridge Cleaning','Walkways Cleaning','Mechanical Sweeping',
    'Bushes Removal','Manpower Allocation','Vehicle / Equipment Allocation','Collection & Transportation Services to Palaces','Safety Related','Negative Media Coverage',
  ].map((n, i) => ({ id:'svc' + i, name:n })),
};
const CFG_FIELDS = {
  vehicles:  [ { k:'qty', l:'Required Quantity', t:'number', d:'' }, { k:'year', l:'Minimum Manufacture Year', t:'number', d:'' } ],
  equipment: [ { k:'qty', l:'Required Quantity', t:'number', d:'' }, { k:'make', l:'Make', t:'text', d:'TBA' } ],
  workforce: [ { k:'qty', l:'Required Quantity', t:'number', d:'' }, { k:'exp', l:'Experience', t:'text', d:'' } ],
  bins:      [ { k:'qty', l:'Required Quantity', t:'number', d:'' } ],
};
const EMPTY_ILL = { vehicles:'truck-02', equipment:'tool-02', workforce:'users-02', bins:'trash-03', service:'coins-hand' };
const EMPTY_TXT = {
  vehicles: { t:'Add Required Vehicles', s:'Add the required types & number of vehicles' },
  equipment:{ t:'Add Equipment',         s:'Add the required types & number of equipment' },
  workforce:{ t:'Add Workforce',         s:'Add the required types & number of workforce' },
  bins:     { t:'Add Bin',               s:'Add the required types & number of bins' },
  service:  { t:'Add Service Lines',          s:'Add the service lines, their bins and collection frequency included in this plan.' },
};

let draft = null, wzIndex = 0;
function freshDraft() {
  return {
    // Basic Info opens EMPTY by default — every field renders in its idle
    // label-only state until the user fills it. `manager` has no form field
    // (it appears on the summary only) so it keeps a demo value for the
    // review screen.
    basic:{ title:'', ref:'', type:'', contractor:'', start:'', end:'', manager:'Syed Abdul', pm:'' },
    zones:['LOT-01'], vehicles:[], equipment:[], workforce:[], bins:[], services:[], kpis:[],
    attachments:[ { name:'ESP Agreement', meta:'Expiry Date: 24th Oct, 2028' }, { name:'ESP Company Info', meta:'' } ],
  };
}
const wizard = document.getElementById('cmWizard');
function openWizard() { draft = freshDraft(); wzIndex = 0; wizard.hidden = false; renderWizard(); }
function closeWizard() { wizard.hidden = true; closePicker(); }
document.getElementById('wzClose').addEventListener('click', closeWizard);

function renderSteps() {
  const out = [];
  STEP_DEFS.forEach((s, i) => {
    const state = i < wzIndex ? 'done' : i === wzIndex ? 'active' : 'pending';
    const marker = state === 'done' ? ic('check', 18)
      : state === 'active' ? `<span class="st-inner">${ic(s.icon, 16)}</span>`
      : ic(s.icon, 17.45);
    out.push(`<div class="step ${state}" data-i="${i}">
      <div class="st-marker">${marker}</div>
      <div class="st-text"><div class="st-n">${s.n}</div><div class="st-l">${s.label}</div></div>
    </div>`);
    if (i < STEP_DEFS.length - 1) out.push(`<div class="st-line${i < wzIndex ? ' done' : ''}"></div>`);
  });
  document.getElementById('wzSteps').innerHTML = out.join('');
}
function renderWizard() {
  closePicker();
  renderSteps();
  const step = STEP_DEFS[wzIndex];
  const R = STEP_RENDER[step.key]();
  document.getElementById('wzTitleRow').innerHTML =
    `<div><h3 class="wz-h">${R.title}</h3>${R.sub ? `<p class="wz-sub ${R.subClass || ''}">${R.sub}</p>` : ''}</div>${R.headRight || ''}`;
  const body = document.getElementById('wzBody');
  body.innerHTML = R.body; body.scrollTop = 0;
  const back = document.getElementById('wzBack');
  back.classList.toggle('ghost', wzIndex === 0);
  document.getElementById('wzNext').textContent = wzIndex === STEP_DEFS.length - 1 ? 'Create' : 'Save and Continue';
  if (R.after) R.after();
}
document.getElementById('wzBack').addEventListener('click', () => { if (wzIndex > 0) { wzIndex--; renderWizard(); } });
document.getElementById('wzNext').addEventListener('click', () => {
  if (wzIndex === STEP_DEFS.length - 1) { closeWizard(); toast('Project created'); return; }
  wzIndex++; renderWizard();
});
document.getElementById('wzSteps').addEventListener('click', e => {
  const el = e.target.closest('.step'); if (!el) return;
  const i = +el.dataset.i; if (i <= wzIndex) { wzIndex = i; renderWizard(); }
});

/* ── Step renderers ─────────────────────────────────────────────────────── */
const STEP_RENDER = {};

/* Field factory — Figma 56h anatomy. opts: req, opt, icon, clear, options(select), full, lblSize
   Empty (idle) state renders just the field's label at value-size, like a placeholder;
   the input/select reveals itself on focus or as soon as it carries a value. The
   `.f-lbl` on top + `.f-in` value below is the FILLED state (Figma Basic Info). */
function fieldHTML(k, label, val, { req, opt, icon, clear, options, full, lblMd, type = 'text', attrs = '' } = {}) {
  const empty = val === undefined || val === null || val === '';
  const lbl = `<span class="f-lbl${lblMd ? ' md' : ''}">${label}${req ? ' <b class="req">*</b>' : ''}${opt ? ' <span class="opt">(optional)</span>' : ''}</span>`;
  const control = options
    // A leading empty option is what makes a select's "no value" state real — without it the browser
    // picks the first option and the field reads as pre-selected even though `val` is empty.
    ? `<select class="f-sel" ${attrs} data-bk="${k}">${empty ? '<option value="" hidden></option>' : ''}${options.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
    : `<input class="f-in" ${attrs} data-bk="${k}" type="${type}" value="${esc(val)}">`;
  return `<label class="f${full ? ' span2' : ''}${empty ? ' f--empty' : ''}">
    ${icon ? ic(icon, 20, 'lead') : ''}
    <span class="f-col">${lbl}${control}</span>
    ${options ? ic('chevron-down', 12, 'trail') : ''}${clear ? ic('x', 12, 'clear') : ''}
  </label>`;
}

/* STEP 1 — Basic Info (2111:1925) */
STEP_RENDER.basic = () => {
  const b = draft.basic;
  return {
    title:'Basic Info',
    body:`<div class="form">
      ${fieldHTML('title', 'Project Title', b.title, { req:true })}
      ${fieldHTML('ref', 'Reference Number', b.ref, { req:true })}
      ${fieldHTML('type', 'Project Type', b.type, { req:true, options:['MSW Commercials','MSW Residential','C&D Waste','Green Waste','Bulk Collection'] })}
      ${fieldHTML('contractor', 'ESP', b.contractor, { req:true, options:['BEEAH','Tadweer','Dulsco','Averda'] })}
      ${fieldHTML('start', 'Start Date', b.start, { req:true, icon:'calendar', clear:true })}
      ${fieldHTML('end', 'End Date', b.end, { req:true, icon:'calendar' })}
      ${fieldHTML('pm', 'Program Manager', b.pm, { opt:true, icon:'user-03', full:true, lblMd:true, options:['Syed Abul','Ali Hassan','Reem Al Zaabi','Faisal Al Mansoori'] })}
    </div>`,
    after() {
      document.querySelectorAll('#wzBody [data-bk]').forEach(el => {
        const save = e => {
          draft.basic[e.target.dataset.bk] = e.target.value;
          e.target.closest('.f').classList.toggle('f--empty', e.target.value === '');
        };
        el.addEventListener('input', save); el.addEventListener('change', save);
      });
      document.querySelectorAll('#wzBody .f .clear').forEach(x => x.addEventListener('click', e => {
        e.preventDefault(); const inp = e.currentTarget.closest('.f').querySelector('.f-in');
        inp.value = ''; draft.basic[inp.dataset.bk] = '';
        inp.closest('.f').classList.add('f--empty');
        inp.focus();
      }));
    },
  };
};

/* STEP 2 — Zone Selection (2111:2185) — Figma map render + polygon, scaled to fit */
STEP_RENDER.zone = () => ({
  title:'Zone Selection',
  body:`<div class="map-frame" id="mapFrame">
    <div class="map-canvas" id="mapCanvas">
      <img class="map-img" src="assets/zone-map.png" alt="">
      <div class="map-poly"><img src="assets/zone-polygon.svg" alt=""></div>
    </div>
    <div class="zone-field">
      <span class="f-col"><span class="f-lbl md">Zone <b class="req">*</b></span>
        <span class="zone-chips">${draft.zones.map(z => `<span class="zchip" data-z="${z}">${z}${ic('x', 8)}</span>`).join('')}</span></span>
      ${ic('chevron-down', 12, 'trail')}
    </div>
    <button class="map-layers" type="button" aria-label="Map layers"><img src="assets/layers-thumb.png" alt="">${ic('layers-three-01', 20)}</button>
    <div class="map-ctl">
      <div class="map-zoom"><button type="button" aria-label="Zoom in">${ic('plus', 20)}</button><span class="div"></span><button type="button" aria-label="Zoom out">${ic('minus', 20)}</button></div>
      <button class="map-max" type="button" aria-label="Full screen">${ic('maximize-02', 20)}</button>
    </div>
  </div>`,
  after() {
    const frame = document.getElementById('mapFrame'), canvas = document.getElementById('mapCanvas');
    const fit = () => { const s = frame.clientWidth / 1358; canvas.style.transform = `scale(${s})`; frame.style.height = `${Math.round(766 * s)}px`; };
    fit(); window.addEventListener('resize', fit, { once:true });
    document.querySelectorAll('#wzBody .zchip .ic').forEach(x => x.addEventListener('click', e => {
      const z = e.currentTarget.closest('.zchip').dataset.z; draft.zones = draft.zones.filter(v => v !== z); renderWizard();
    }));
  },
});

/* Picker steps (3/5/6/7) — carry-forward skin, Figma re-skin in wave 5 */
const glyphOrArt = (o, size = 16) => o.art ? `<img src="${o.art}" alt=""${o.sq ? ' class="sq"' : ''}>` : ic(o.icon || 'tool-02', size);
const emptyState = (key) => {
  const et = EMPTY_TXT[key];
  const art = ART[key] ? `<div class="art"><img src="${ART[key]}" alt=""></div>` : `<div class="art fallback">${ic(EMPTY_ILL[key], 64)}</div>`;
  return `<div class="wz-empty">${art}<div class="txt"><div class="et">${et.t}</div><div class="es">${et.s}</div></div></div>`;
};
function pickerStep(key) {
  const items = draft[key];
  const headRight = `<button class="wz-addnew" type="button" data-pkopen="${key}">Add New${ic('chevron-down', 16)}</button>`;
  const body = !items.length
    ? emptyState(key)
    : items.map((it, idx) => {
        const cfg = CAT[key].find(c => c.id === it.id) || it;
        const fields = CFG_FIELDS[key].map(f =>
          `<label class="f"><span class="f-col"><span class="f-lbl md">${f.l}</span><input class="f-in" data-ci="${idx}" data-ck="${f.k}" type="${f.t}" value="${esc(it[f.k] ?? '')}"></span>${ic('chevron-down', 12, 'trail')}</label>`).join('');
        return `<div class="wz-cfg">
          <div class="c-head"><div class="c-name">${glyphOrArt(cfg, 20)}${esc(cfg.name)}</div>
            <div class="c-actions"><span class="c-addfield">Add New Field${ic('chevron-down', 16)}</span><span class="c-remove" data-crm="${idx}" title="Remove">${ic('trash-03', 16)}</span></div></div>
          <div class="c-fields">${fields}</div>
        </div>`;
      }).join('');
  return {
    title: key === 'vehicles' ? 'Required Vehicles' : key === 'equipment' ? 'Required Equipment' : key === 'workforce' ? 'Required Workforce' : 'Required Bins',
    sub: (key === 'workforce' || key === 'bins') ? "Let's get started by filling in your program's core information." : '',
    headRight, body, after() { wirePicker(key); },
  };
}
STEP_RENDER.vehicles  = () => pickerStep('vehicles');
STEP_RENDER.equipment = () => pickerStep('equipment');
STEP_RENDER.workforce = () => pickerStep('workforce');
STEP_RENDER.bins      = () => pickerStep('bins');

let pickerState = null;
function wirePicker(key) {
  document.querySelectorAll(`[data-pkopen="${key}"]`).forEach(b => b.addEventListener('click', () => openPicker(key)));
  document.querySelectorAll('#wzBody [data-ci]').forEach(el => el.addEventListener('input', e => { draft[key][+e.target.dataset.ci][e.target.dataset.ck] = e.target.value; }));
  document.querySelectorAll('#wzBody [data-crm]').forEach(el => el.addEventListener('click', e => { draft[key].splice(+e.currentTarget.dataset.crm, 1); renderWizard(); }));
}
/* Per-step popup anatomy from Figma: bins (2111:3646) has title only — no search, no row icons */
const PICKER_UI = {
  vehicles:{ title:true, search:true, icon:true }, equipment:{ title:true, search:true, icon:true },
  workforce:{ title:true, search:true, icon:true }, bins:{ title:true, search:false, icon:false }, service:{ title:true, search:true, icon:false },
};
const draftItems = key => key === 'service' ? draft.services : draft[key];
function openPicker(key) {
  closePicker();
  pickerState = { key, sel:new Set(draftItems(key).map(i => i.id)), q:'' };
  const wrap = document.createElement('div'); wrap.className = 'wz-picker'; wrap.id = 'wzPicker';
  document.querySelector('.wz-main').appendChild(wrap);
  document.querySelectorAll(`[data-pkopen="${key}"]`).forEach(b => b.classList.add('open'));
  drawPicker(CAT[key], key === 'service' ? 'Select Services' : 'Select Assets');
}
function drawPicker(catalog, label) {
  const wrap = document.getElementById('wzPicker'); if (!wrap) return;
  const ui = PICKER_UI[pickerState.key]; const q = pickerState.q.toLowerCase();
  const rows = catalog.filter(o => !q || o.name.toLowerCase().includes(q));
  wrap.innerHTML = `<div class="pk-body">
    ${ui.title ? `<div class="pk-t">${label}</div>` : ''}
    ${ui.search ? `<div class="pk-search">${ic('search-refraction', 16)}<input id="pkSearch" placeholder="Search anything here" value="${esc(pickerState.q)}" aria-label="Search"></div>` : ''}
    <div class="pk-h"><span class="pk-sel">Selected ${label.split(' ')[1]}</span><span class="pk-all" id="pkAll" role="button">Select All</span></div>
    <div class="pk-list">${rows.map(o => `<div class="wz-opt ${pickerState.sel.has(o.id) ? 'on' : ''}" data-oid="${o.id}" role="checkbox" aria-checked="${pickerState.sel.has(o.id)}">
      <span class="ck">${ic('check-bold', 12)}</span>${ui.icon && (o.icon || o.art) ? `<span class="oi">${glyphOrArt(o, 16)}</span>` : ''}<span class="oname">${esc(o.name)}</span></div>`).join('')}</div>
    </div>
    <div class="pk-foot"><button class="pk-cancel" id="pkCancel" type="button">Cancel</button><button class="pk-add" id="pkAdd" type="button">Add</button></div>`;
  const srch = wrap.querySelector('#pkSearch');
  if (srch) { srch.addEventListener('input', e => { pickerState.q = e.target.value; drawPicker(catalog, label); }); srch.focus(); srch.setSelectionRange(srch.value.length, srch.value.length); }
  wrap.querySelectorAll('[data-oid]').forEach(el => el.addEventListener('click', () => {
    const id = el.dataset.oid; pickerState.sel.has(id) ? pickerState.sel.delete(id) : pickerState.sel.add(id); drawPicker(catalog, label);
  }));
  wrap.querySelector('#pkAll').addEventListener('click', () => { catalog.forEach(o => pickerState.sel.add(o.id)); drawPicker(catalog, label); });
  wrap.querySelector('#pkCancel').addEventListener('click', closePicker);
  wrap.querySelector('#pkAdd').addEventListener('click', () => commitPicker(catalog));
}
function closePicker() {
  const p = document.getElementById('wzPicker'); if (p) p.remove(); pickerState = null;
  document.querySelectorAll('.wz-addnew.open').forEach(b => b.classList.remove('open'));
}
function commitPicker(catalog) {
  const key = pickerState.key, chosen = catalog.filter(o => pickerState.sel.has(o.id));
  if (key === 'service') draft.services = chosen.map(o => ({ id:o.id, name:o.name, freq: (draft.services.find(s => s.id === o.id) || {}).freq }));
  else { const existing = new Map(draft[key].map(i => [i.id, i])); draft[key] = chosen.map(o => existing.get(o.id) || { id:o.id, ...Object.fromEntries(CFG_FIELDS[key].map(f => [f.k, f.d])) }); }
  closePicker(); renderWizard();
}

/* STEP 8 — Service Lines (Launch Pad 7205:11761): one card per service line —
   row 1: Bin Type · Required Quantity · Waste Type
   row 2: Action (plus-square) · Frequency (clock-fast-forward) · Collection days pills */
const svcSelect = (i, key, label, icon, val, options, chev = 'chevron-down') =>
  `<label class="f">${icon ? ic(icon, 20, 'lead') : ''}<span class="f-col"><span class="f-lbl md">${label}</span>
    <select class="f-sel" data-si="${i}" data-sk="${key}">${options.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></span>${ic(chev, 12, 'trail')}</label>`;
const svcInput = (i, key, label, val) =>
  `<label class="f"><span class="f-col"><span class="f-lbl md">${label}</span>
    <input class="f-in" type="text" inputmode="numeric" data-si="${i}" data-sk="${key}" value="${esc(val)}"></span></label>`;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WASTE_TYPES = ['Recyclable', 'Non-Recycleable', 'Mixed', 'Green Waste', 'Bulky'];
const FREQUENCIES = ['Daily', '2x weekly', '3x weekly', 'Weekly', 'Fortnightly', 'Monthly'];
STEP_RENDER.service = () => {
  const items = draft.services;
  const headRight = `<button class="wz-addnew" type="button" data-pkopen="service">Add Service${ic('chevron-down', 16)}</button>`;
  const body = !items.length
    ? emptyState('service')
    : items.map((s, i) => {
        s.bin = s.bin || CAT.bins[0].name; s.qty = s.qty ?? '20'; s.waste = s.waste || 'Non-Recycleable';
        s.action = s.action || 'Scheduled'; s.frequency = s.frequency || '3x weekly';
        if (!s.days) s.days = ['Mon', 'Wed', 'Fri'];
        const row1 = [
          svcSelect(i, 'bin', 'Bin Type', null, s.bin, CAT.bins.map(b => b.name)),
          svcInput(i, 'qty', 'Required Quantity', s.qty),
          svcSelect(i, 'waste', 'Waste Type', null, s.waste, WASTE_TYPES),
        ];
        const row2 = [
          svcSelect(i, 'action', 'Action', 'plus-square', s.action, ['Scheduled', 'Adhoc']),
          svcSelect(i, 'frequency', 'Frequency', 'clock-fast-forward', s.frequency, FREQUENCIES),
          `<div class="days"><span class="days-l">Collection days</span><div class="days-row">${DAYS.map(d =>
            `<button type="button" class="day${s.days.includes(d) ? ' on' : ''}" data-si="${i}" data-day="${d}" aria-pressed="${s.days.includes(d)}">${d}</button>`).join('')}</div></div>`,
        ];
        return `<div class="svc-card">
          <div class="c-head"><div class="c-name">${esc(s.name)}</div><span class="c-remove" data-srm="${i}" title="Remove">${ic('trash-03', 16)}</span></div>
          <div class="c-fields">${row1.join('')}</div>
          <div class="c-fields top">${row2.join('')}</div>
        </div>`;
      }).join('');
  return { title:'Service Lines', sub:"Let's get started by filling in your program's core information.", headRight, body,
    after() {
      wirePicker('service');
      document.querySelectorAll('#wzBody [data-si][data-sk]').forEach(el => {
        const save = e => { draft.services[+e.target.dataset.si][e.target.dataset.sk] = e.target.value; };
        el.addEventListener('change', save); el.addEventListener('input', save);
      });
      document.querySelectorAll('#wzBody .day').forEach(el => el.addEventListener('click', e => {
        const svc = draft.services[+e.currentTarget.dataset.si], d = e.currentTarget.dataset.day;
        // Keep weekday order stable regardless of click order.
        svc.days = svc.days.includes(d) ? svc.days.filter(x => x !== d) : DAYS.filter(x => x === d || svc.days.includes(x));
        const on = svc.days.includes(d);
        e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', String(on));
      }));
      document.querySelectorAll('#wzBody [data-srm]').forEach(el => el.addEventListener('click', e => { draft.services.splice(+e.currentTarget.dataset.srm, 1); renderWizard(); }));
    } };
};

/* STEP 9 — KPI Targets */
const KPI_SEED = [
  { code:'2.1', tag:'SOLID WASTE COLLECTION & TRANSPORTATION SERVICES', name:'MSW Collection', rectifiable:'Yes', unit:'Every Second Day',
    indicator:'Percentage of bins emptied as scheduled for all services, as detailed in Schedule 5 Volume 2; a) Household waste, b) Recyclable waste.', mode:'fixed', target:90 },
  { code:'2.2', tag:'SOLID WASTE COLLECTION & TRANSPORTATION SERVICES', name:'Bulky Waste Collection', rectifiable:'Yes', unit:'Daily within 20m of container for residential / commercial / Industrial area',
    indicator:'Percentage of bulky waste found within 20m of Container removed within specified timeframe.', mode:'yearly', target:90, inc:5 },
  { code:'2.4', tag:'SOLID WASTE COLLECTION & TRANSPORTATION SERVICES', name:'C & D Waste Collection', rectifiable:'Yes', unit:'Daily',
    indicator:'Percentage of Service areas collected within specified timeframe.', mode:'manual', years:[90,92,94,97,100] },
];
/* KPI Targets (2111:4159 / card 2111:4283) */
function kpiValues(k) {
  return k.mode === 'fixed' ? [0,1,2,3,4].map(() => k.target)
    : k.mode === 'yearly' ? [0,1,2,3,4].map(i => Math.min(100, k.target + k.inc * i))
    : (k.years || [90,90,90,90,90]).map(v => Math.min(100, v));
}
function kpiPreview(k) {
  return `<div class="kprev"><div class="div"></div>
    <div class="kp-h"><b>5-year preview</b><span>Capped at 100%</span></div>
    <div class="kbars">${kpiValues(k).map((v, i) => `<div class="kbar${v >= 100 ? ' full' : ''}"><span class="v">${v}%</span><div class="track"><i style="height:${Math.round(72 * Math.max(0, Math.min(100, v)) / 100)}px"></i></div><span class="y">Year ${i + 1}</span></div>`).join('')}</div>
  </div>`;
}
/* 57h stepper field: target icon · label 12 / value 14 · stacked chevrons (Figma 2111:4306) */
const stepField = (label, val, attrs) => `<label class="kf">${ic('target-03', 20, 'lead')}<span class="f-col"><span class="f-lbl">${label}</span><input class="f-in" type="text" inputmode="numeric" value="${val}%" ${attrs}></span>
  <span class="kf-ud">${ic('chevron-down', 12, 'r180 ud-up')}${ic('chevron-down', 12, 'ud-down')}</span></label>`;
function kpiCard(k, idx) {
  const tab = (m, label) => `<button class="ktab${k.mode === m ? ' on' : ''}" type="button" data-ki="${idx}" data-km="${m}">${label}</button>`;
  let controls;
  if (k.mode === 'fixed') controls = `<div class="kctl">${stepField('KPI Target', k.target, `data-ki="${idx}" data-kf="target"`)}</div>`;
  else if (k.mode === 'yearly') controls = `<div class="kctl">${stepField('Baseline yield (Year 1)', k.target, `data-ki="${idx}" data-kf="target"`)}
      <label class="f">${ic('trend-up-01', 20, 'lead')}<span class="f-col"><span class="f-lbl md">Yearly Increase</span>
        <select class="f-sel" data-ki="${idx}" data-kinc>${[1,2,3,5,10].map(n => `<option value="${n}"${n === k.inc ? ' selected' : ''}>+${n}%/year</option>`).join('')}</select></span>${ic('chevron-down', 12, 'trail')}</label></div>`;
  else controls = `<div class="kctl">${(k.years || []).map((v, y) => stepField(`Year ${y + 1}`, v, `data-ki="${idx}" data-ky="${y}"`)).join('')}</div>`;
  return `<div class="kpi-card">
    <div class="kchips"><span class="kchip code">${ic('hash-02', 16, 'r180')}${k.code}</span><span class="kchip tag">${ic('tag-01', 16)}${esc(k.tag)}</span></div>
    <div class="ktitle">${esc(k.name)}</div>
    <div class="kmeta"><div>Rectifiable:&nbsp; <b>${esc(k.rectifiable)}</b></div><div>Reporting Unit:&nbsp; <b>${esc(k.unit)}</b></div><div>Performance Indicator:&nbsp; <b>${esc(k.indicator)}</b></div></div>
    <div class="ktabs">${tab('fixed', 'Fixed')}${tab('yearly', 'Yearly Increase')}${tab('manual', 'Manual')}</div>
    ${controls}
    ${kpiPreview(k)}
  </div>`;
}
STEP_RENDER.kpi = () => {
  if (!draft.kpis.length) draft.kpis = JSON.parse(JSON.stringify(KPI_SEED));
  return {
    title:'KPI Targets', sub:'Define and configure KPI targets that align with your required standards. These targets help measure performance against benchmarks, ensure compliance.',
    headRight:`<button class="wz-addnew" type="button">Add New${ic('chevron-down', 16)}</button>`,
    body:`<div class="wz-hint">${ic('sparkle', 20)}<span>KPIs have been smartly added based on your previous selections. Review and adjust them as per your preferences.</span></div>
      <div class="kpi-grid">${draft.kpis.map(kpiCard).join('')}</div>`,
    after() {
      const num = s => Math.max(0, Math.min(100, parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0));
      document.querySelectorAll('#wzBody [data-km]').forEach(el => el.addEventListener('click', e => { draft.kpis[+e.currentTarget.dataset.ki].mode = e.currentTarget.dataset.km; renderWizard(); }));
      document.querySelectorAll('#wzBody [data-kf]').forEach(el => el.addEventListener('change', e => { draft.kpis[+e.target.dataset.ki].target = num(e.target.value); renderWizard(); }));
      document.querySelectorAll('#wzBody [data-ky]').forEach(el => el.addEventListener('change', e => { draft.kpis[+e.target.dataset.ki].years[+e.target.dataset.ky] = num(e.target.value); renderWizard(); }));
      document.querySelectorAll('#wzBody [data-kinc]').forEach(el => el.addEventListener('change', e => { draft.kpis[+e.target.dataset.ki].inc = +e.target.value; renderWizard(); }));
      document.querySelectorAll('#wzBody .kf-ud .ic').forEach(el => el.addEventListener('click', e => {
        e.preventDefault(); const inp = e.currentTarget.closest('.kf').querySelector('input');
        inp.value = num(inp.value) + (e.currentTarget.classList.contains('ud-up') ? 1 : -1) + '%';
        inp.dispatchEvent(new Event('change', { bubbles:true }));
      }));
    },
  };
};

/* STEP 10 — Attachments (2111:4484) */
STEP_RENDER.attachments = () => ({
  title:'Upload Attachments', sub:'Upload any supporting documents for the project here', subClass:'sm',
  body:`<label class="drop">${ic('upload-cloud-01', 24)}<span>Drop files to attach or <b>browse</b></span><input type="file" multiple hidden id="attFile"></label>
    <div class="att-list">${draft.attachments.map((a, i) => `<div class="att-row">
      <div class="att-l"><img src="assets/art/pdf.png" alt="PDF"><div class="att-t"><div class="att-n">${esc(a.name)}</div>${a.meta ? `<div class="att-m">${esc(a.meta)}</div>` : ''}</div></div>
      <div class="att-a"><button type="button" data-areup="${i}">Re-upload</button><button type="button" class="rm" data-arm="${i}">Remove</button></div>
    </div>`).join('')}</div>`,
  after() {
    document.querySelectorAll('#wzBody [data-arm]').forEach(el => el.addEventListener('click', e => { draft.attachments.splice(+e.currentTarget.dataset.arm, 1); renderWizard(); }));
    document.querySelectorAll('#wzBody [data-areup]').forEach(el => el.addEventListener('click', () => toast('Choose a file to replace the attachment')));
    const file = document.getElementById('attFile');
    if (file) file.addEventListener('change', e => {
      for (const f of e.target.files) draft.attachments.push({ name: f.name.replace(/\.[^.]+$/, ''), meta: `Uploaded ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}` });
      renderWizard();
    });
  },
});

/* FINAL — Summary (2111:4992) */
const SUM_ICON = { vehicles:'truck-02', equipment:'tool-02', workforce:'users-02', bins:'trash-03' };
const sumSection = (t, inner, { right = '', tight = false } = {}) => `<section class="sum-sec"><div class="sum-h${tight ? ' tight' : ''}"><span>${t}</span>${right}</div>${inner}</section>`;
/* cols: [{h, w}] — first column is the `#` column (Medium 12) */
function sumTable(cols, rows, cls = '') {
  const tpl = cols.map(c => c.w).join(' ');
  return `<div class="stbl ${cls}"><div class="sth" style="grid-template-columns:${tpl}">${cols.map(c => `<span>${c.h}</span>`).join('')}</div>
    <div class="stb">${rows.map(r => `<div class="str" style="grid-template-columns:${tpl}">${r.map((c, i) => `<span class="${i === 0 ? 'n' : ''}">${c}</span>`).join('')}</div>`).join('')}</div></div>`;
}
const kv = (k, v) => `<div class="kv"><span class="k">${k}</span><span class="v">${esc(v || '—')}</span></div>`;
STEP_RENDER.summary = () => {
  const b = draft.basic;
  const basicGrid = `<div class="sum-grid"><div>${kv('Project Title', b.title)}${kv('Project Type', b.type)}${kv('Start Date', b.start)}${kv('Project Manager', b.manager)}</div>
    <div>${kv('Reference Number', b.ref)}${kv('ESP', b.contractor)}${kv('End Date', b.end)}${kvr('Program Manager', b.pm)}</div></div>`;
  const typeCell = (key, name) => `${ic(SUM_ICON[key], 16)}${esc(name)}`;
  const rowsOf = (key, map) => draft[key].map((it, i) => { const c = CAT[key].find(x => x.id === it.id) || it; return map(i + 1, c, it); });
  const none = (n, msg) => [[ '—', msg, ...Array(n - 2).fill('—') ]];
  const vehRows = rowsOf('vehicles', (n, c, it) => [String(n), typeCell('vehicles', c.name), esc(c.capacity || '—'), esc(c.make || '—'), esc(it.qty || '—')]);
  const eqpRows = rowsOf('equipment', (n, c, it) => [String(n), typeCell('equipment', c.name), esc(it.make || c.make || 'TBA'), esc(it.qty || '—')]);
  const wfRows  = rowsOf('workforce', (n, c, it) => [String(n), typeCell('workforce', c.name), esc(it.exp || '—'), esc(it.qty || '—')]);
  const lot = `${kv('Project Title', b.title || 'Lot 1, Abu Dhabi')}
    <div class="sum-map"><div class="map-frame" id="sumMapFrame"><div class="map-canvas" id="sumMapCanvas"><img class="map-img" src="assets/zone-map.png" alt=""><div class="map-poly"><img src="assets/zone-polygon.svg" alt=""></div></div>
      <button class="map-layers" type="button" aria-label="Map layers"><img src="assets/layers-thumb.png" alt="">${ic('layers-three-01', 20)}</button>
      <div class="map-ctl"><div class="map-zoom"><button type="button" aria-label="Zoom in">${ic('plus', 20)}</button><span class="div"></span><button type="button" aria-label="Zoom out">${ic('minus', 20)}</button></div><button class="map-max" type="button" aria-label="Full screen">${ic('maximize-02', 20)}</button></div>
    </div></div>`;
  // Service Lines — mirrors the step's card fields one row per service line.
  const slRows = draft.services.length
    ? draft.services.map((s, i) => [String(i + 1), `${ic('trash-03', 16)}${esc(s.name)}`, esc(s.bin || '—'), esc(s.qty || '—'), esc(s.waste || '—'), esc(s.action || 'Scheduled'), esc(s.frequency || 'Daily'), esc((s.days || []).join(' · ') || '—')])
    : none(8, 'No service lines added');
  const kpiTarget = k => k.mode === 'yearly' ? `${k.target}% → 100% (+${k.inc}%/yr)` : k.mode === 'manual' ? `${k.years[0]}% → ${k.years[4]}% · per yr` : `${k.target}%`;
  const kpiRows = draft.kpis.map(k => [k.code, esc(`${k.name}: ${k.indicator}`), esc(k.unit.length > 20 ? 'Daily' : k.unit), esc(k.rectifiable), kpiTarget(k)]);
  const atts = `<div class="sum-atts">${draft.attachments.map(a => `<div class="att-row"><div class="att-l"><img src="assets/art/pdf.png" alt="PDF"><div class="att-t"><div class="att-n">${esc(a.name)}</div>${a.meta ? `<div class="att-m">${esc(a.meta)}</div>` : ''}</div></div></div>`).join('')}</div>`;
  const W = { n:'34px', q:'173px' };
  return {
    title:'Project Summary', sub:'Review all the core requirements for this project.',
    body:`<div class="sum">
      ${sumSection('Basic Info', basicGrid)}
      ${sumSection('Lot Selection', lot)}
      ${sumSection('Required Vehicle', sumTable([{ h:'#', w:W.n }, { h:'Type', w:'406fr' }, { h:'Capacity', w:'306fr' }, { h:'Make', w:'406fr' }, { h:'Required Quantity', w:W.q }], vehRows.length ? vehRows : none(5, 'No vehicles added')), { tight:true })}
      ${sumSection('Required Equipment', sumTable([{ h:'#', w:W.n }, { h:'Type', w:'1fr' }, { h:'Make', w:'1fr' }, { h:'Required Quantity', w:W.q }], eqpRows.length ? eqpRows : none(4, 'No equipment added')), { tight:true })}
      ${sumSection('Required Workforce', sumTable([{ h:'#', w:W.n }, { h:'Type', w:'1fr' }, { h:'Experience', w:'1fr' }, { h:'Required Quantity', w:W.q }], wfRows.length ? wfRows : none(4, 'No workforce added')), { tight:true })}
      ${sumSection('Service Lines', sumTable([{ h:'#', w:W.n }, { h:'Service', w:'1fr' }, { h:'Bin Type', w:'150px' }, { h:'Qty', w:'80px' }, { h:'Waste Type', w:'160px' }, { h:'Action', w:'120px' }, { h:'Frequency', w:'130px' }, { h:'Collection Days', w:'230px' }], slRows), { tight:true })}
      ${sumSection('KPI Target', sumTable([{ h:'#', w:'44px' }, { h:'Performance Indicator', w:'1fr' }, { h:'Reporting Unit', w:'162px' }, { h:'Rectifiable', w:'162px' }, { h:'KPI Target', w:'190px' }], kpiRows), { tight:true })}
      ${sumSection('Attachments', atts)}
    </div>`,
    after() {
      const frame = document.getElementById('sumMapFrame'), canvas = document.getElementById('sumMapCanvas');
      if (frame) { const s = frame.clientWidth / 1358, dy = (766 * s - 400) / 2; canvas.style.transform = `translateY(${-dy}px) scale(${s})`; }
    },
  };
};

function toast(msg) { const t = document.createElement('div'); t.className = 'cm-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ══════════════════════════════════════════════════════════════════════════
   CONTRACT DETAILS (2303:2988) · Timeline drawer (2303:3679) · Raw Data (2303:4514)
   Charts are hand-drawn SVG so every stroke, tick and gap matches the Figma
   frames; sizes are measured from the live container after render.
   ══════════════════════════════════════════════════════════════════════════ */
const C = { green:'#22c882', success:'#12b76a', amber:'#f79009', yellow:'#ffd762', red:'#f04438', blue:'#0072d6', azure:'#3b82f6', teal:'#12b5b0', indigo:'#1d4ed8', magenta:'#d946ef', orange:'#f97316', ink:'#1d2939', g200:'#eaecf0', g300:'#d0d5dd', g500:'#667085' };
const detail = document.getElementById('cmDetail');
const dtWrap = document.getElementById('dtWrap');
const dtDrawer = document.getElementById('dtDrawer'), dtPanel = document.getElementById('dtPanel');
let currentContract = null;

document.getElementById('dtBack').addEventListener('click', () => { closeDrawer(); detail.hidden = true; document.getElementById('cmApp').hidden = false; });
document.getElementById('dtTimeline').addEventListener('click', () => openDrawer('timeline'));
document.getElementById('dtScrim').addEventListener('click', closeDrawer);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !dtDrawer.hidden) closeDrawer(); });
window.addEventListener('resize', () => { if (!detail.hidden && currentContract) drawCharts(); });

/* ── Deterministic demo series ──────────────────────────────────────────── */
const wob = (i, a, b) => Math.sin(i * a) * b + Math.cos(i * a * 1.7) * b * .5;
const DAILY = Array.from({ length: 42 }, (_, i) => Math.round((81 - i * .52 + wob(i, .9, 2.2)) * 10) / 10);
const FIVE = [
  { c:C.green,   d:Array.from({ length: 48 }, (_, i) => 45 + i * .36 + wob(i, .7, 1.4)) },
  { c:C.magenta, d:Array.from({ length: 48 }, (_, i) => 32 + i * .24 + wob(i, .8, 1.2)) },
  { c:C.orange,  d:Array.from({ length: 48 }, (_, i) => 10 + i * .6 + wob(i, .75, 2.4)) },
  { c:C.indigo,  d:Array.from({ length: 48 }, (_, i) => 65 + i * .6 + wob(i, .55, 2.6)) },
  { c:C.ink,     d:Array.from({ length: 48 }, (_, i) => 88 + i * .22 + wob(i, .6, .5)) },
];
const KPI_BARS = [ { l:'MSW Collection', a:76, t:88 }, { l:'Bulky Waste Collection', a:70, t:95 }, { l:'C & D Waste Collection', a:79, t:87 } ];
const SVC_ROWS = [
  { n:'Solid Waste Collection & Transportation Services', f:'Daily',       pc:'96%', s:81.1, w:92.0, on:648, late:120, miss:110 },
  { n:'Green & Bulky Waste Collection',                   f:'Daily',       pc:'97%', s:77.6, w:92.0, on:648, late:120, miss:110 },
  { n:'Bin Washing',                                      f:'Weekly . 3X', pc:'88%', s:81.1, w:96.3, on:648, late:120, miss:110 },
  { n:'Dead Animals Collection',                          f:'Ad-hoc 24h',  pc:'96%', s:81.1, w:93.6, on:648, late:120, miss:110 },
  { n:'Bin Maintenance',                                  f:'Ad-hoc 24h',  pc:'92%', s:77.5, w:89.8, on:648, late:120, miss:110 },
];
const DONUTS = [
  { t:'Vehicle Type Breakdown',   n:121, u:'Vehicles',  vis:[.5,.36,.14], seg:[ ['Compactor', 73, C.azure], ['Bin Washer', 43, C.teal], ['Tipper Trucks', 5, C.amber] ] },
  { t:'Workforce Type Breakdown', n:121, u:'Workforce', vis:[.5,.36,.14], seg:[ ['Drivers', 73, C.azure], ['Helpers', 43, C.teal], ['Supervisors', 5, C.amber] ] },
  { t:'Equipment Type Breakdown', n:121, u:'Approved',  vis:[.5,.36,.14], seg:[ ['Equip1', 12, C.azure], ['Equip2', 43, C.teal], ['Equip3', 5, C.amber] ] },
  { t:'Bin Type Breakdown',       n:121, u:'Approved',  vis:[.62,.38], seg:[ ['240L', 73, C.azure], ['1100L', 43, C.teal] ] },
];
const TIMELINE = [
  { day:'22 JUN , 2026', items:[
    { av:{ icon:'plus' }, who:'ZAYD FARSI', act:'Created Project.', tm:'11:20 pm' },
    { av:{ icon:'edit-02' }, who:'Tadweer Amin', act:'Update Description', tm:'11:20 pm' },
    { av:{ img:'assets/art/avatar-khalid.png' }, who:'KHALID AL-MANSOORI', act:'Update Status', from:['Draft', '#4e5ba6'], to:['Scheduled', C.amber], tm:'01:24 am' } ] },
  { day:'23 JUN , 2026', items:[
    { av:{ img:'assets/art/avatar-ali.png' }, who:'Muhammad Ali', act:'Update Status', from:['Scheduled', C.amber], to:['Ongoing', C.azure], tm:'01:24 am' },
    { av:{ img:'assets/art/avatar-ali.png' }, who:'Muhammad Ali', act:'Update Status', from:['Ongoing', C.azure], to:['Shift Ended', C.magenta], tm:'01:24 am' },
    { av:{ img:'assets/art/avatar-khalid.png' }, who:'KHALID AL-MANSOORI', act:'Resolved Uncollected Bins', tm:'04:24 am', msg:'These 160 Bins are collected but not marked as collected in the system. I confirm it with driver. Vehicle RFID reader was break down during the collection. Driver already reported the issue.' },
    { av:{ img:'assets/art/avatar-khalid.png' }, who:'KHALID AL-MANSOORI', act:'Update Status', from:['Shift Ended', C.magenta], to:['Completed', C.success], tm:'04:25 am' } ] },
];
const DRIVERS = ['Ali Raza','Bina Khan','Cyrus Patel','Danish Alli','Ehsan Malik','Farah Noor','Gulzar Ahmed','Hasseb Asad','Ibrahim Khan','Jasmine Tariq','Kareem Shah','Laila Hussain','M. Farooq','Nadeem Saeed','Omar Yasin','Parvez Iqbal'];
const PLANS = ['Bin Collection Golden Mall','Bin Collection Central Park','Bin Collection Riverfront Plaza','Bin Collection Eastside Market','Bin Collection West End Theatre','Oakwood Community Center','Bin Collection Pine Hill Park','Bin Collection Sunset Boulevard','Bin Collection Maple Avenue','Bin Collection Lakeside Resort','Bin Collection City Square','Downtown Arts District','Bin Collection Heritage Museum','Bin Collection Tech Hub','Bin Collection Sports Complex','Bin Collection Harbour View'];
const DOCS = [ { name:'ESP Agreement', meta:'Expiry Date: 24th Oct, 2028' }, { name:'ESP Company Info', meta:'Expiry Date: 12 Apr, 2026' } ];
const AV_STYLE = i => i % 3 === 1 ? 'img' : i % 3 === 2 ? 'c' : 'l';   /* photo · coloured initial · plain initial */

/* ── Small builders ─────────────────────────────────────────────────────── */
const card = (icon, title, body, cls = '', right = '') => `<section class="dcard ${cls}"><div class="dc-h"><div class="dc-t"><span class="dc-av">${ic(icon, 16)}</span><h3>${title}</h3></div>${right}</div>${body}</section>`;
const tile = (icon, tint, col, label, value, extra = '') => `<${extra ? 'button type="button"' : 'div'} class="tile${extra ? ' link' : ''}" ${extra}><span class="t-av" style="background:${tint};color:${col}">${ic(icon, 20)}</span><span class="t-txt"><span class="t-l">${label}</span><span class="t-v">${value}</span></span></${extra ? 'button' : 'div'}>`;
const kvr = (k, v) => `<div class="r"><span class="k">${k}</span><span class="v">${v}</span></div>`;
const fmt = n => n.toLocaleString('en-US');

/* Overall-compliance gauge 223×117 (2303:3033): red→amber sweep, olive + green segments, marker at value */
function gaugeSVG(pct) {
  const cx = 111.5, cy = 108, r = 96, sw = 22;
  const pt = (a) => { const t = Math.PI * (1 - a); return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; };
  const arc = (a0, a1) => { const [x0, y0] = pt(a0), [x1, y1] = pt(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const gap = .012, m = pt(pct / 100), ang = Math.PI * (1 - pct / 100), mi = [cx + (r - sw / 2 - 6) * Math.cos(ang), cy - (r - sw / 2 - 6) * Math.sin(ang)];
  return `<svg width="223" height="117" viewBox="0 0 223 117" aria-label="Overall compliance ${pct}%">
    <defs><linearGradient id="gA" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${C.red}"/><stop offset=".55" stop-color="${C.amber}"/><stop offset="1" stop-color="#fdb022"/></linearGradient>
    <linearGradient id="gB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8c72c"/><stop offset="1" stop-color="#7cc45a"/></linearGradient>
    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}"/><stop offset="1" stop-color="${C.success}"/></linearGradient></defs>
    <path d="${arc(0, .62 - gap)}" stroke="url(#gA)" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
    <path d="${arc(.62 + gap, .78 - gap)}" stroke="url(#gB)" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
    <path d="${arc(.78 + gap, 1)}" stroke="url(#gC)" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
    <g transform="translate(${mi[0].toFixed(1)} ${mi[1].toFixed(1)}) rotate(${(90 - pct / 100 * 180).toFixed(1)})"><path d="M0 -7 L7 5 L-7 5 Z" fill="${C.ink}"/></g>
    <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="36" font-weight="600" fill="${C.ink}">${pct}%</text>
  </svg>`;
}

/* Catmull-Rom → cubic bezier path through points */
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/* Daily Plans line chart (2303:3175): y label col 18 + gap 4 · ticks w40 gap 8 · x labels 16h px24 · "Date" pt8 */
function dailyChartSVG(w, h) {
  const yl = 22, tick = 48, xh = 16, xl = 26, top = 9;
  const L = yl + tick, R = w, T = top, B = h - xh - xl, PH = B - T;
  const y = v => T + PH * (1 - v / 100), xs = i => L + 24 + (R - L - 48) * i / (DAILY.length - 1);
  const pts = DAILY.map((v, i) => [xs(i), y(v)]);
  const line = smooth(pts), area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${B} L${pts[0][0].toFixed(1)} ${B} Z`;
  const days = ['8 July','9 July','10 July','11 July','12 July','13 July','14 July'];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="dArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.amber}" stop-opacity=".22"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></linearGradient></defs>
    <text class="axt" transform="translate(13 ${(T + B) / 2}) rotate(-90)" text-anchor="middle">Number of Resources</text>
    ${[100,80,60,40,20,0].map(v => `<text x="${yl + 40}" y="${y(v) + 4}" text-anchor="end">${v}</text><line x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}" stroke="${C.g200}"/>`).join('')}
    <path d="${area}" fill="url(#dArea)"/><path d="${line}" stroke="${C.amber}" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <line x1="${L}" x2="${R}" y1="${y(87)}" y2="${y(87)}" stroke="${C.teal}" stroke-width="2" stroke-dasharray="8 6"/>
    ${days.map((d, i) => `<text x="${L + 24 + (R - L - 48) * (i / 6)}" y="${B + 13}" text-anchor="middle">${d}</text>`).join('')}
    <text class="axl" x="${(L + R) / 2}" y="${h - 4}" text-anchor="middle">Date</text>
  </svg>`;
}

/* 5-Years Plan line chart (2303:3441): rotated "Compliance %" · 6 pct ticks · 12 month labels · 5 series */
function fiveYearSVG(w, h) {
  const T = 0, L = 18 + 48, R = w - 33, B = 228;
  const y = v => T + (B - T) * (1 - v / 100), xs = i => L + (R - L) * i / 47;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <text class="axl" transform="translate(9 ${(T + B) / 2}) rotate(-90)" text-anchor="middle">Compliance %</text>
    ${[100,80,60,40,20,0].map(v => `<text class="ax" x="${18 + 40}" y="${y(v) + 4}" text-anchor="end">${v ? v + '%' : '0'}</text><line x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}" stroke="${C.g200}"/>`).join('')}
    ${FIVE.map(s => `<path d="${smooth(s.d.map((v, i) => [xs(i), y(Math.min(100, v))]))}" stroke="${s.c}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`).join('')}
    ${Array.from({ length: 12 }, (_, i) => `<text class="ax" x="${L + 28 + (R - L - 56) * i / 11}" y="${B + 14}" text-anchor="middle">${i + 1}</text>`).join('')}
    <text class="axl" x="${(L + R) / 2}" y="${B + 40}" text-anchor="middle">Months</text>
  </svg>`;
}

/* KPI Targets — horizontal target-vs-achieved bars (2303:3209): label col 163 · dotted grid · 32px bars r6 */
function kpiBarsSVG(w, h) {
  const L = 163 + 2, R = w - 2, rows = KPI_BARS.length, RH = h / rows, x = v => L + (R - L) * v / 100;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${[0,20,40,60,80,100].map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="1" y2="${h - 1}" stroke="${C.g300}" stroke-dasharray="2 3"/>`).join('')}
    ${KPI_BARS.map((k, i) => { const cy = RH * i + RH / 2; return `
      <text class="lbl" x="${L - 6}" y="${cy + 4}" text-anchor="end">${esc(k.l)}</text>
      <line x1="${L}" x2="${R}" y1="${RH * (i + 1) - .5}" y2="${RH * (i + 1) - .5}" stroke="${C.g300}" stroke-dasharray="2 3"/>
      <rect x="${L}" y="${cy - 16}" width="${x(k.t) - L}" height="32" rx="6" fill="${C.yellow}" opacity=".16"/>
      <rect x="${L}" y="${cy - 16}" width="${x(k.a) - L}" height="32" rx="6" fill="${C.amber}" opacity=".8"/>`; }).join('')}
    <line x1="${L}" x2="${R}" y1=".5" y2=".5" stroke="${C.g300}" stroke-dasharray="2 3"/>
  </svg>
  <div class="kaxis" style="display:flex;justify-content:space-between;padding-left:${L + 17}px;font-size:12px;font-weight:600;color:rgba(0,0,0,.7);margin-top:2px">${[0,20,40,60,80,100].map(v => `<span>${v}</span>`).join('')}</div>`;
}

/* Donut 220 (2303:3486): 22px ring, 3° gaps, round caps, starts at −35° */
function donutSVG(seg, vis) {
  const total = seg.reduce((a, s) => a + s[1], 0), r = 98, sw = 22, cx = 110, cy = 110, gapDeg = 7;
  let a = 3; const paths = [];
  seg.forEach(([, v, col], i) => {
    const frac = vis ? vis[i] : v / total;
    const sweep = 360 * frac - gapDeg, a0 = a + gapDeg / 2, a1 = a0 + sweep;
    const p = d => { const t = (d - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; };
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    paths.push(`<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`);
    a += 360 * frac;
  });
  return `<svg width="220" height="220" viewBox="0 0 220 220">${paths.join('')}</svg>`;
}
const donutCard = d => card('pie-chart-01', d.t, `<div class="dc-b">
    <div class="donut">${donutSVG(d.seg, d.vis)}<div class="ctr"><div class="n">${d.n}</div><div class="u">${d.u}</div><div class="tr">${ic('arrow-up', 10)}20%</div></div></div>
    <div class="dlg">${d.seg.map(([l, v, c]) => `<span><i style="background:${c}"></i>${l}<em>${v}</em></span>`).join('')}</div>
  </div>`, 'dt-donut');

/* ── Page ───────────────────────────────────────────────────────────────── */
function openDetail(c) {
  currentContract = c; closeDrawer();
  document.getElementById('cmApp').hidden = true; detail.hidden = false;
  const lotNo = (c.lot || 'Lot 1').replace(/\D/g, '') || '1', area = c.name.split('—')[1]?.trim() || 'Abu Dhabi';
  document.getElementById('dtId').textContent = 'CRT' + c.id.replace(/\D/g, '').slice(-3);
  document.getElementById('dtTitle').textContent = `LOT ${lotNo}: ${area} Project`;
  document.getElementById('dtEsp').innerHTML = `<span class="av">${esc(c.contractor[0])}</span>${esc(c.contractor[0] + c.contractor.slice(1).toLowerCase())}`;
  document.getElementById('dtLot').innerHTML = `${ic('skew', 16)}Lot ${lotNo}`;
  const st = document.getElementById('dtStatus'); st.textContent = c.status === 'draft' ? 'Draft' : c.status === 'expired' ? 'Expired' : c.status === 'expiring' ? 'Expiring' : 'Active';
  st.style.background = c.status === 'draft' ? 'var(--g400)' : c.status === 'expired' ? 'var(--error)' : c.status === 'expiring' ? 'var(--warning)' : '';
  const days = c.expiresDays == null ? '—' : c.expiresDays < 0 ? 'Expired' : `${c.expiresDays} Days`;
  const raw = (k, t) => `data-raw="${k}" data-rawt="${t}"`;
  dtWrap.innerHTML = `
    <div class="dt-row">
      <section class="dcard dt-gauge">${gaugeSVG(81)}<div class="g-lbl">Overall Compliance</div></section>
      <div class="dt-tiles">
        <div class="dt-row">
          ${tile('truck-01', 'rgba(165,218,18,.09)', '#7fb50a', 'Number Of Vehicles', `${c.m.vehicles}/120`, raw('vehicles', 'Number of Vehicles'))}
          ${tile('users-02', 'rgba(34,200,130,.07)', C.green, 'Number Of Workforce', `${c.m.workforce}/120`, raw('workforce', 'Number of Workforce'))}
          ${tile('tool-02', 'rgba(234,16,96,.07)', '#ea1060', 'Number Of Equipment', `${c.m.equipment}/120`, raw('equipment', 'Number of Equipment'))}
        </div>
        <div class="dt-row">
          ${tile('file-06', 'rgba(149,75,175,.07)', '#954baf', 'Number Of Plans', '100/120', raw('plans', 'Number of Plans'))}
          ${tile('briefcase-01', 'rgba(0,114,214,.07)', C.blue, 'number of Services', '05')}
          ${tile('target-04', 'rgba(34,200,130,.07)', C.green, 'Number Of KPIs', '05')}
        </div>
      </div>
    </div>
    <div class="dt-row">
      ${tile('calendar', 'rgba(0,114,214,.07)', C.blue, 'Days Remaining', days)}
      ${tile('briefcase-01', 'rgba(149,75,175,.07)', '#954baf', 'Service Compliance', '82%')}
      <div class="tile date"><span class="t-av" style="background:rgba(254,200,75,.08);color:#f2a90a">${ic('calendar', 20)}</span><span class="t-txt"><span class="t-l">Start &amp; End Date</span><span class="t-v"><span>24 Nov, 2024</span><span>-</span><span>10 Nov, 2028</span></span></span></div>
    </div>
    <div class="dt-row">
      ${card('building-06', 'Contractor Details', `<div class="kvl">
        ${kvr('Contractor', `<span class="v img"><img src="assets/art/esp-avatar.png" alt="">${esc(c.contractor === 'BEEAH' ? 'ESP Contractor' : c.contractor)}</span>`)}
        ${kvr('Contact', `<span class="v"><span class="ini lav">S</span>Saad Bin Usman</span>`)}
        ${kvr('Contact’s Email', 'saad.bin12@gmail.com')}
        ${kvr('Contact’s Phone', '+971 50 123 4567')}
        ${kvr('Project Manager', `<span class="v"><span class="ini blu">S</span>Syed Ali</span>`)}
      </div>`, 'dt-half')}
      ${card('trend-up-01', 'Daily Plans Compliance vs Required Baseline', `<div class="dc-b chart" id="chDaily"></div>`, 'dt-half')}
    </div>
    ${card('pie-chart-01', 'KPI Targets — Target vs Achieved', `<div class="dc-b"><div class="chart" id="chKpi"></div><div class="foot">Percentage %</div></div>`, 'dt-kpi bd3')}
    ${card('horizontal-bar-chart-01', 'Service Coverage &amp; Frequencies Compliance', `<div class="dc-b"><div class="svc-rows">${SVC_ROWS.map(r => `<div class="svc-r">
        <div class="l1"><span class="nm">${esc(r.n)}<span>${esc(r.f)}</span></span><span class="pc">${r.pc}</span></div>
        <div class="bar3"><i class="e"></i><i class="w" style="left:9.2%;width:${(r.w - 9.2).toFixed(1)}%"></i><i class="s" style="width:${r.s}%"></i></div>
        <div class="l2"><span class="lg"><span><i style="background:${C.success}"></i>On Time<em>${r.on}</em></span><span><i style="background:${C.amber}"></i>Late<em>${r.late}</em></span><span><i style="background:${C.red}"></i>Missed<em>${r.miss}</em></span></span><span class="of">2,810 of 2,890 Schedules</span></div>
      </div>`).join('')}</div></div>`, 'dt-svc bd3')}
    ${card('target-04', '5-Years Plan Compliance', `<div class="legend">${FIVE.map((s, i) => `<span><i style="background:${s.c}"></i>Series ${i + 1}</span>`).join('')}</div><div class="dc-b chart" id="ch5yr"></div>`, 'dt-5yr')}
    <div class="dt-row">${DONUTS.slice(0, 3).map(donutCard).join('')}</div>
    <div class="dt-row"><div style="flex:1;display:flex">${donutCard(DONUTS[3])}</div><div style="flex:2"></div></div>
    ${card('file-05', 'Attached Documents', `<div class="dc-b">${DOCS.map(a => `<div class="doc"><img src="assets/art/pdf.png" alt="PDF"><div><div class="n">${esc(a.name)}</div><div class="m">${esc(a.meta || 'Expiry Date: 12 Apr, 2026')}</div></div></div>`).join('')}</div>`, 'dt-docs bd3')}`;
  dtWrap.querySelectorAll('[data-raw]').forEach(el => el.addEventListener('click', () => openDrawer('raw', { key: el.dataset.raw, title: el.dataset.rawt })));
  drawCharts();
  detail.scrollTop = 0; window.scrollTo(0, 0);
}
function drawCharts() {
  const d = document.getElementById('chDaily'); if (d) d.innerHTML = dailyChartSVG(d.clientWidth - 32, d.clientHeight - 32);
  const k = document.getElementById('chKpi'); if (k) k.innerHTML = kpiBarsSVG(k.clientWidth, 207);
  const f = document.getElementById('ch5yr'); if (f) f.innerHTML = fiveYearSVG(f.clientWidth - 24, f.clientHeight - 50);
}

/* ── Drawers ────────────────────────────────────────────────────────────── */
function closeDrawer() { dtDrawer.hidden = true; dtPanel.innerHTML = ''; dtPanel.className = 'dt-panel'; }
const closeBtn = `<button class="dt-close" type="button" data-close aria-label="Close">${ic('x', 24)}</button>`;
function openDrawer(kind, opts = {}) {
  dtDrawer.hidden = false;
  if (kind === 'timeline') { dtPanel.className = 'dt-panel tl-panel'; dtPanel.innerHTML = closeBtn + timelineHTML(); wireTimeline(); }
  else { dtPanel.className = 'dt-panel rd-panel'; dtPanel.innerHTML = closeBtn + rawDataHTML(opts); wireRaw(); }
  dtPanel.querySelector('[data-close]').addEventListener('click', closeDrawer);
}

/* Timeline (2303:4371) */
const badge = ([t, c], old) => `<span class="bg${old ? ' old' : ''}" style="background:${c}">${esc(t)}</span>`;
function entryHTML(e, last) {
  const av = e.av.img ? `<span class="av"><img src="${e.av.img}" alt=""></span>` : `<span class="av">${ic(e.av.icon, 14)}</span>`;
  const sts = e.from ? `<span class="sts">${badge(e.from, true)}${ic('arrow-narrow-right', 14)}${badge(e.to)}</span>` : '';
  return `<div class="tl-e${last ? ' last' : ''}"><span class="ln"></span><div class="box">
    <div class="hd"><div class="who">${av}<div class="txt"><span class="nm">${esc(e.who)}</span><span class="ac">${esc(e.act)}</span>${sts}</div></div><span class="tm">${e.tm}</span></div>
    ${e.msg ? `<div class="msg">${esc(e.msg)}</div>` : ''}
  </div></div>`;
}
function timelineHTML() {
  return `<div class="tl-tabs"><button type="button">Timeline</button></div>
    <div class="tl-body"><div class="tl-list" id="tlList">${TIMELINE.map(g => `<div class="tl-day"><b>${g.day}</b></div><div class="tl-entries">${g.items.map((e, i) => entryHTML(e, i === g.items.length - 1)).join('')}</div>`).join('')}</div>
    <form class="tl-foot" id="tlForm"><label class="tl-in"><input id="tlInput" placeholder="Write comment here" autocomplete="off">${ic('attachment-01', 16)}</label><button class="tl-send" type="submit" aria-label="Send">${ic('send-01', 20)}</button></form></div>`;
}
function wireTimeline() {
  const list = document.getElementById('tlList'); list.scrollTop = list.scrollHeight;
  document.getElementById('tlForm').addEventListener('submit', e => {
    e.preventDefault(); const inp = document.getElementById('tlInput'), txt = inp.value.trim(); if (!txt) return;
    const now = new Date(), tm = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }).toLowerCase();
    const day = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase().replace(/(\d{2}) (\w{3}) (\d{4})/, '$1 $2 , $3');
    let grp = TIMELINE[TIMELINE.length - 1]; if (grp.day !== day) { grp = { day, items:[] }; TIMELINE.push(grp); }
    grp.items.push({ av:{ img:'assets/art/avatar-khalid.png' }, who:'KHALID AL-MANSOORI', act:'Added Comment', tm, msg:txt });
    inp.value = ''; dtPanel.innerHTML = closeBtn + timelineHTML(); wireTimeline(); dtPanel.querySelector('[data-close]').addEventListener('click', closeDrawer);
  });
}

/* Raw Data (2303:5206): title 24/18 · toolbar · count · 7-column table 110|150|230|142|114|160|160 */
function rawRows(q) {
  return DRIVERS.map((d, i) => ({ v:'2342', d, plan:PLANS[i], i })).filter(r => !q || (r.d + ' ' + r.plan).toLowerCase().includes(q));
}
function rawDataHTML({ title = 'Number of Vehicles', q = '' } = {}) {
  const rows = rawRows(q);
  const avatar = (r) => AV_STYLE(r.i) === 'img' ? `<span class="av"><img src="assets/art/${r.i % 2 ? 'avatar-ali' : 'avatar-khalid'}.png" alt=""></span>` : AV_STYLE(r.i) === 'c' ? `<span class="av c" style="background:${C.blue}">${r.d[0]}</span>` : `<span class="av">${r.d[0]}</span>`;
  return `<div class="rd-inner">
    <div class="rd-h"><h2>${esc(title)}</h2><span>(Raw Data)</span></div>
    <div class="rd-tb"><div class="l"><label class="search">${ic('search-refraction', 16)}<input id="rdSearch" placeholder="Search anything here" value="${esc(q)}" autocomplete="off"></label><button class="iconbtn" type="button" aria-label="Filter">${ic('filter-funnel-01', 16)}</button></div><button class="dl" type="button" aria-label="Download">${ic('file-download-03', 16)}</button></div>
    <div class="rd-cnt">Showing ${q ? rows.length : 292} items</div>
    <div class="rd-tbl"><table><colgroup><col style="width:110px"><col style="width:150px"><col style="width:230px"><col style="width:142px"><col style="width:114px"><col style="width:160px"><col style="width:160px"></colgroup>
      <thead><tr><th>Vehicle</th><th>Driver</th><th>Plan</th><th>Service Type</th><th>Waste Type</th><th>Planned Time</th><th>Status</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><span class="cell"><img class="veh" src="assets/art/veh-compactor-40.png" alt="">${r.v}</span></td>
        <td><span class="cell">${avatar(r)}${esc(r.d)}</span></td>
        <td>${esc(r.plan)}</td>
        <td><span class="bdg"><img src="assets/art/bin-collection-filled.svg" alt="">Bin Collection</span></td>
        <td><span class="wt"><img src="assets/art/recyclable.svg" alt="">Recyclable</span></td>
        <td><span class="tm"><span>Start: 30 JUN | 13:20</span><span>End: 30 JUN | 16:00</span></span></td>
        <td class="stc"><span class="st">Active</span></td>
      </tr>`).join('')}</tbody></table></div>
  </div>`;
}
function wireRaw() {
  const s = document.getElementById('rdSearch');
  s.addEventListener('input', () => {
    const q = s.value.trim().toLowerCase(), title = dtPanel.querySelector('.rd-h h2').textContent;
    const rows = rawRows(q); dtPanel.querySelector('.rd-cnt').textContent = `Showing ${q ? rows.length : 292} items`;
    const tb = dtPanel.querySelector('tbody'); tb.innerHTML = rawDataHTML({ title, q }).match(/<tbody>([\s\S]*)<\/tbody>/)[1];
  });
  s.focus();
}
