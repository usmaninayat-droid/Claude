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
  { id:'CRT769012', name:'Lot 1 — Abu Dhabi',      lot:'Lot 1', contractor:'BEEAH', expiresDays:45,  status:'ongoing',  m:{ workforce:110, vehicles:95,  equipment:60,  bins:118 } },
  { id:'CRT769012', name:'Lot 2 — Al Ain',         lot:'Lot 1', contractor:'BEEAH', expiresDays:12,  status:'ongoing',  m:{ workforce:80,  vehicles:40,  equipment:100, bins:120 }, key:'c2' },
  { id:'CRT769012', name:'Lot 3 — Al Dhafra',      lot:'Lot 1', contractor:'BEEAH', expiresDays:210, status:'ongoing',  m:{ workforce:120, vehicles:115, equipment:110, bins:119 }, key:'c3' },
  { id:'CRT769012', name:'Lot 7 — Mussafah',       lot:'Lot 1', contractor:'BEEAH', expiresDays:30,  status:'ongoing',  m:{ workforce:88,  vehicles:72,  equipment:65,  bins:100 }, key:'c4' },
  { id:'CRT769012', name:'Lot 8 — Yas Island',     lot:'Lot 1', contractor:'BEEAH', expiresDays:18,  status:'expiring', m:{ workforce:60,  vehicles:50,  equipment:40,  bins:80  }, key:'c5' },
  { id:'CRT769012', name:'Lot 9 — Saadiyat',       lot:'Lot 1', contractor:'BEEAH', expiresDays:150, status:'ongoing',  m:{ workforce:118, vehicles:120, equipment:112, bins:120 }, key:'c6' },
  { id:'CRT769012', name:'Lot 4 — Abu Dhabi City', lot:'Lot 1', contractor:'BEEAH', expiresDays:8,   status:'expiring', m:{ workforce:70,  vehicles:55,  equipment:45,  bins:90  }, key:'c7' },
  { id:'CRT769012', name:'Lot 5 — Western Region', lot:'Lot 1', contractor:'BEEAH', expiresDays:null,status:'draft',    m:{ workforce:0,   vehicles:0,   equipment:0,   bins:0   }, key:'c8' },
  { id:'CRT769012', name:'Lot 6 — Khalifa City',   lot:'Lot 1', contractor:'BEEAH', expiresDays:95,  status:'ongoing',  m:{ workforce:102, vehicles:98,  equipment:90,  bins:110 }, key:'c9' },
  { id:'CRT769012', name:'Lot 10 — Al Shamkha',    lot:'Lot 1', contractor:'BEEAH', expiresDays:-3,  status:'expired',  m:{ workforce:40,  vehicles:35,  equipment:20,  bins:50  }, key:'c10' },
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
  { tint:'info',     label:'Total Contract',      calc:cs => cs.length },
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
  document.getElementById('cmGrid').innerHTML = rows.length ? rows.map(cardHTML).join('') : '<div class="cm-empty">No contracts match your search.</div>';
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
  { key:'bins',        n:'STEP 7',     label:'Add Bins',                      icon:'trash-03' },
  { key:'service',     n:'STEP 8',     label:'Service & Frequency Selection', icon:'coins-hand' },
  { key:'kpi',         n:'STEP 9',     label:'KPI Targets',                   icon:'target-04' },
  { key:'attachments', n:'STEP 10',    label:'Attachments',                   icon:'attachment-01' },
  { key:'summary',     n:'FINAL STEP', label:'Summary',                       icon:'align-left' },
];
/* Figma-rendered art (multi-fragment vectors captured as PNG at native size) */
const ART = { vehicles:'assets/art/empty-vehicles.png', equipment:'assets/art/empty-equipment.png', workforce:'assets/art/empty-workforce.png', bins:'assets/art/empty-bins.png' };
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
  service:  { t:'Add Services & Frequencies', s:'Add the services and there frequencies included in this plan.' },
};

let draft = null, wzIndex = 0;
function freshDraft() {
  return {
    basic:{ title:'Lot 1 Contract', ref:'123', type:'MSW Commercials', contractor:'BEEAH', start:'10-12-2024', end:'10-12-2029', manager:'Syed Abdul', pm:'Syed Abul' },
    zones:['LOT-01'], vehicles:[], equipment:[], workforce:[], bins:[], services:[], kpis:[],
    attachments:[ { name:'ESP Physical Contract', meta:'Expiry Date: 24th Oct, 2028' }, { name:'ESP Company Info', meta:'' } ],
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
    `<div><h3 class="wz-h">${R.title}</h3>${R.sub ? `<p class="wz-sub">${R.sub}</p>` : ''}</div>${R.headRight || ''}`;
  const body = document.getElementById('wzBody');
  body.innerHTML = R.body; body.scrollTop = 0;
  const back = document.getElementById('wzBack');
  back.classList.toggle('ghost', wzIndex === 0);
  document.getElementById('wzNext').textContent = wzIndex === STEP_DEFS.length - 1 ? 'Create' : 'Save and Continue';
  if (R.after) R.after();
}
document.getElementById('wzBack').addEventListener('click', () => { if (wzIndex > 0) { wzIndex--; renderWizard(); } });
document.getElementById('wzNext').addEventListener('click', () => {
  if (wzIndex === STEP_DEFS.length - 1) { closeWizard(); toast('Contract created'); return; }
  wzIndex++; renderWizard();
});
document.getElementById('wzSteps').addEventListener('click', e => {
  const el = e.target.closest('.step'); if (!el) return;
  const i = +el.dataset.i; if (i <= wzIndex) { wzIndex = i; renderWizard(); }
});

/* ── Step renderers ─────────────────────────────────────────────────────── */
const STEP_RENDER = {};

/* Field factory — Figma 56h anatomy. opts: req, opt, icon, clear, options(select), full, lblSize */
function fieldHTML(k, label, val, { req, opt, icon, clear, options, full, lblMd, type = 'text', attrs = '' } = {}) {
  const lbl = `<span class="f-lbl${lblMd ? ' md' : ''}">${label}${req ? ' <b class="req">*</b>' : ''}${opt ? ' <span class="opt">(optional)</span>' : ''}</span>`;
  const control = options
    ? `<select class="f-sel" ${attrs} data-bk="${k}">${options.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`
    : `<input class="f-in" ${attrs} data-bk="${k}" type="${type}" value="${esc(val)}">`;
  return `<label class="f${full ? ' span2' : ''}">
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
      ${fieldHTML('title', 'Contract Title', b.title, { req:true })}
      ${fieldHTML('ref', 'Reference Number', b.ref, { req:true })}
      ${fieldHTML('type', 'Contract Type', b.type, { req:true, options:['MSW Commercials','MSW Residential','C&D Waste','Green Waste','Bulk Collection'] })}
      ${fieldHTML('contractor', 'Contractor', b.contractor, { req:true, options:['BEEAH','Tadweer','Dulsco','Averda'] })}
      ${fieldHTML('start', 'Start Date', b.start, { req:true, icon:'calendar', clear:true })}
      ${fieldHTML('end', 'End Date', b.end, { req:true, icon:'calendar' })}
      ${fieldHTML('pm', 'Project Manger', b.pm, { opt:true, icon:'user-03', full:true, lblMd:true, options:['Syed Abul','Ali Hassan','Reem Al Zaabi','Faisal Al Mansoori'] })}
    </div>`,
    after() {
      document.querySelectorAll('#wzBody [data-bk]').forEach(el => {
        const save = e => { draft.basic[e.target.dataset.bk] = e.target.value; };
        el.addEventListener('input', save); el.addEventListener('change', save);
      });
      document.querySelectorAll('#wzBody .f .clear').forEach(x => x.addEventListener('click', e => {
        e.preventDefault(); const inp = e.currentTarget.closest('.f').querySelector('.f-in'); inp.value = ''; draft.basic[inp.dataset.bk] = ''; inp.focus();
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
function openPicker(key) {
  closePicker();
  pickerState = { key, sel:new Set(draft[key].map(i => i.id)), q:'' };
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

/* STEP 8 — Services & Frequencies */
STEP_RENDER.service = () => {
  const items = draft.services;
  const headRight = `<button class="wz-addnew" type="button" data-pkopen="service">Add New${ic('chevron-down', 16)}</button>`;
  const body = !items.length
    ? emptyState('service')
    : `<div class="tbl"><div class="th" style="grid-template-columns:50px 1fr 320px"><span>#</span><span>Service</span><span>Frequency</span></div>
      ${items.map((s, i) => `<div class="tr" style="grid-template-columns:50px 1fr 320px">
        <span style="font-weight:600">${i + 1}</span><span style="font-weight:600;color:var(--g900)">${esc(s.name)}</span>
        <label class="f" style="height:44px"><span class="f-col"><select class="f-sel" data-si="${i}">${['Daily','3x Weekly','Weekly','Monthly','On Demand / Adhoc'].map(o => `<option${o === (s.freq || 'Daily') ? ' selected' : ''}>${o}</option>`).join('')}</select></span>${ic('chevron-down', 12, 'trail')}</label>
      </div>`).join('')}</div>`;
  return { title:'Services and Frequencies', sub:"Let's get started by filling in your program's core information.", headRight, body,
    after() { wirePicker('service'); document.querySelectorAll('#wzBody [data-si]').forEach(el => el.addEventListener('change', e => { draft.services[+e.target.dataset.si].freq = e.target.value; })); } };
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
function kpiPreview(k) {
  const vals = k.mode === 'fixed' ? [0,1,2,3,4].map(() => k.target) : k.mode === 'yearly' ? [0,1,2,3,4].map(i => Math.min(100, k.target + k.inc * i)) : (k.years || [90,90,90,90,90]).map(v => Math.min(100, v));
  return `<div style="margin-top:16px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--g500);margin-bottom:8px"><span style="font-weight:600">5-year preview</span><span>Capped at 100%</span></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;align-items:end;height:120px">
    ${vals.map((v, i) => { const cap = v >= 100; return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">
      <span style="font-size:12px;font-weight:600;color:${cap ? 'var(--primary)' : 'var(--g700)'}">${v}%</span>
      <div style="width:100%;height:${Math.max(8, v)}%;border-radius:6px;background:${cap ? 'var(--primary)' : 'rgba(34,200,130,.35)'}"></div>
      <span style="font-size:11px;color:var(--g500)">Year ${i + 1}</span></div>`; }).join('')}</div></div>`;
}
const numField = (label, val, attrs) => `<label class="f kpi-num"><span class="f-col"><span class="f-lbl">${label}</span><input class="f-in" type="number" value="${val}" ${attrs}></span>
  <span class="kpi-ud">${ic('chevron-down', 9, 'r180 ud-up')}${ic('chevron-down', 9, 'ud-down')}</span></label>`;
function kpiCard(k, idx) {
  const seg = (m, label) => `<button class="kpi-seg${k.mode === m ? ' on' : ''}" data-ki="${idx}" data-km="${m}">${label}</button>`;
  let controls;
  if (k.mode === 'fixed') controls = numField('KPI Target', k.target, `data-ki="${idx}" data-kf="target"`);
  else if (k.mode === 'yearly') controls = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${numField('Baseline yield (Year 1)', k.target, `data-ki="${idx}" data-kf="target"`)}
      <label class="f"><span class="f-col"><span class="f-lbl">Yearly Increase</span><input class="f-in" type="text" value="+${k.inc}%/year" data-ki="${idx}" data-kf="inc"></span></label></div>`;
  else controls = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${(k.years || []).map((v, y) => numField(`Year ${y + 1}`, v, `data-ki="${idx}" data-ky="${y}"`)).join('')}</div>`;
  return `<div style="border:1px solid var(--g200);border-radius:6px;padding:18px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="chip id">${ic('hash-02', 12, 'r180')}${k.code}</span>
      <span style="font-size:11px;font-weight:600;color:var(--g500);text-transform:uppercase">${k.tag}</span></div>
    <div style="font-size:16px;font-weight:700;color:var(--g900);margin-bottom:12px">${k.name}</div>
    <div style="background:var(--g50);border-radius:4px;padding:12px 14px;font-size:12px;color:var(--g700);line-height:20px;margin-bottom:14px">
      <div><b>Rectifiable:</b> ${k.rectifiable}</div><div><b>Reporting Unit:</b> ${k.unit}</div><div><b>Performance Indicator:</b> ${esc(k.indicator)}</div></div>
    <div class="kpi-segs">${seg('fixed', 'Fixed')}${seg('yearly', 'Yearly Increase')}${seg('manual', 'Manual')}</div>
    <div style="margin-top:14px">${controls}</div>${kpiPreview(k)}
  </div>`;
}
STEP_RENDER.kpi = () => {
  if (!draft.kpis.length) draft.kpis = JSON.parse(JSON.stringify(KPI_SEED));
  return {
    title:'KPI Targets', sub:'Define and configure KPI targets that align with your required standards. These targets help measure performance against benchmarks, ensure compliance.',
    headRight:`<button class="wz-addnew" type="button">Add New${ic('chevron-down', 16)}</button>`,
    body:`<div class="wz-hint">${ic('target-04', 16)}KPIs have been smartly added based on your previous selections. Review and adjust them as per your preferences.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">${draft.kpis.map(kpiCard).join('')}</div>`,
    after() {
      document.querySelectorAll('#wzBody [data-km]').forEach(el => el.addEventListener('click', e => { draft.kpis[+e.currentTarget.dataset.ki].mode = e.currentTarget.dataset.km; renderWizard(); }));
      document.querySelectorAll('#wzBody [data-kf]').forEach(el => el.addEventListener('input', e => { const k = draft.kpis[+e.target.dataset.ki]; k[e.target.dataset.kf] = e.target.dataset.kf === 'inc' ? e.target.value : +e.target.value || 0; if (e.target.dataset.kf !== 'inc') renderWizard(); }));
      document.querySelectorAll('#wzBody [data-ky]').forEach(el => el.addEventListener('input', e => { draft.kpis[+e.target.dataset.ki].years[+e.target.dataset.ky] = +e.target.value || 0; renderWizard(); }));
      document.querySelectorAll('#wzBody .kpi-ud .ic').forEach(el => el.addEventListener('click', e => {
        e.preventDefault(); const inp = e.currentTarget.closest('.kpi-num').querySelector('input');
        inp.value = Math.max(0, Math.min(100, (+inp.value || 0) + (e.currentTarget.classList.contains('ud-up') ? 1 : -1)));
        inp.dispatchEvent(new Event('input', { bubbles:true }));
      }));
    },
  };
};

/* STEP 10 — Attachments */
STEP_RENDER.attachments = () => ({
  title:'Upload Attachments', sub:'Upload any supporting documents for the contract here',
  body:`<div style="border:1.5px dashed var(--g300);border-radius:6px;padding:22px;text-align:center;color:var(--g500);font-size:14px;font-weight:500;margin-bottom:16px">
    ${ic('attachment-01', 16)} &nbsp;Drop files to attach or <b style="color:var(--primary)">browse</b></div>
    ${draft.attachments.map((a, i) => `<div style="display:flex;align-items:center;gap:14px;border:1px solid var(--g200);border-radius:6px;padding:16px;margin-bottom:12px">
      <span class="pdf">PDF</span><div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--g900)">${esc(a.name)}</div>${a.meta ? `<div style="font-size:12px;color:var(--g500)">${esc(a.meta)}</div>` : ''}</div>
      <a style="color:var(--info);font-size:13px;font-weight:600;cursor:pointer">Re-upload</a><a style="color:var(--error);font-size:13px;font-weight:600;cursor:pointer" data-arm="${i}">Remove</a></div>`).join('')}`,
  after() { document.querySelectorAll('#wzBody [data-arm]').forEach(el => el.addEventListener('click', e => { draft.attachments.splice(+e.currentTarget.dataset.arm, 1); renderWizard(); })); },
});

/* FINAL — Summary */
function sumTable(head, rows) {
  const cols = head.map(() => '1fr').join(' ');
  return `<div class="tbl"><div class="th" style="grid-template-columns:${cols}">${head.map(h => `<span>${h}</span>`).join('')}</div>
    ${rows.map(r => `<div class="tr" style="grid-template-columns:${cols}">${r.map(c => `<span>${esc(c)}</span>`).join('')}</div>`).join('')}</div>`;
}
const sumSection = (t, inner) => `<div class="sum-sec"><div class="sum-t">${t}</div>${inner}</div>`;
const SVC_TAGS = ['Residential MSW Collection','Non-Residential MSW Collection','Non-Residential MSW Collection','Residential MSW Collection','Non-Residential MSW Collection','Non-Residential MSW Collection'];
STEP_RENDER.summary = () => {
  const b = draft.basic;
  const bi = [['Contract Title', b.title || '—'], ['Reference Number', b.ref || '—'], ['Contract Type', b.type], ['ESP', b.contractor], ['Start Date', b.start || '—'], ['End Date', b.end || '—'], ['Contract Manager', b.manager || '—'], ['Project Manager', b.pm || '—']];
  const basicGrid = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 40px;margin-bottom:8px">${bi.map(([k, v]) => `<div style="display:grid;grid-template-columns:180px 1fr;font-size:13px"><span style="color:var(--g500)">${k}</span><span style="font-weight:600;color:var(--g900)">${esc(v)}</span></div>`).join('')}</div>`;
  const rowsOf = (key, map) => draft[key].map((it, i) => { const c = CAT[key].find(x => x.id === it.id) || it; return map(i + 1, c, it); });
  const vehRows = rowsOf('vehicles', (n, c, it) => [String(n), c.name, c.capacity || '—', c.make || '—', it.qty || '—']);
  const eqpRows = rowsOf('equipment', (n, c, it) => [String(n), c.name, it.make || c.make || 'TBA', it.qty || '—']);
  const wfRows  = rowsOf('workforce', (n, c, it) => [String(n), c.name, it.exp || '—', it.qty || '—']);
  const binRows = rowsOf('bins', (n, c, it) => [String(n), c.name, it.qty || '—']);
  const zoneMap = `<div class="map-frame" id="sumMapFrame" style="border-radius:6px"><div class="map-canvas" id="sumMapCanvas"><img class="map-img" src="assets/zone-map.png" alt=""><div class="map-poly"><img src="assets/zone-polygon.svg" alt=""></div></div>
    <div class="zone-field" style="width:auto;min-width:320px"><span class="f-col"><span class="f-lbl md">Contract Title</span><span class="f-in static" style="pointer-events:none">${esc(b.title || 'Lot 1, Abu Dhabi')}</span></span></div></div>`;
  const svcTagRows = draft.services.length
    ? `<div class="tbl"><div class="th" style="grid-template-columns:50px 1fr 260px"><span>#</span><span>Service</span><span>Tags</span></div>${draft.services.map((s, i) => `<div class="tr" style="grid-template-columns:50px 1fr 260px"><span>${i + 1}</span><span style="font-weight:600;color:var(--g900)">${esc(s.name)}</span><span><span class="chip id" style="background:var(--tint-warning);color:#b54708">${esc(SVC_TAGS[i % SVC_TAGS.length])}</span></span></div>`).join('')}</div>`
    : sumTable(['#','Service','Tags'], [['—','No services added','—']]);
  const svcFreqRows = sumTable(['#','Service','Specified Operation','Action','Frequency'], draft.services.length ? draft.services.map((s, i) => [String(i + 1), s.name, i % 2 ? 'Residential Recyclable MSW Collection' : 'Residential Non-Recyclable MSW Collection', 'Scheduled', s.freq || 'Daily']) : [['—','No services','—','—','—']]);
  return {
    title:'Contract Summary', sub:'Review all the core requirements for this contract.',
    body:`${sumSection('Basic Info', basicGrid)}${sumSection('Lot Selection', zoneMap)}
      ${sumSection('Required Vehicles', sumTable(['#','Type','Capacity','Make','Required Quantity'], vehRows.length ? vehRows : [['—','No vehicles added','—','—','—']]))}
      ${sumSection('Required Equipment', sumTable(['#','Type','Make','Required Quantity'], eqpRows.length ? eqpRows : [['—','No equipment added','—','—']]))}
      ${sumSection('Required Workforce', sumTable(['#','Type','Experience','Required Quantity'], wfRows.length ? wfRows : [['—','No workforce added','—','—']]))}
      ${sumSection('Required Bins', sumTable(['#','Type','Required Quantity'], binRows.length ? binRows : [['—','No bins added','—']]))}
      ${sumSection('Services', svcTagRows)}${sumSection('Services & Frequencies', svcFreqRows)}
      ${sumSection('KPI Target', sumTable(['#','Performance Indicator','Reporting Unit','Rectifiable','KPI Target'], draft.kpis.map(k => [k.code, k.name, k.unit && k.unit.length > 28 ? k.unit.slice(0, 28) + '…' : (k.unit || 'Daily'), k.rectifiable, k.mode === 'yearly' ? `${k.target}% → 100% (+${k.inc}%/yr)` : k.mode === 'manual' ? (k.years ? k.years[0] : 0) + '%' : k.target + '%'])))}
      ${sumSection('Attachments', draft.attachments.map(a => `<div style="display:inline-flex;align-items:center;gap:10px;border:1px solid var(--g200);border-radius:6px;padding:12px 16px;margin:0 12px 8px 0"><span class="pdf" style="width:30px;height:38px">PDF</span><div><div style="font-size:13px;font-weight:600">${esc(a.name)}</div>${a.meta ? `<div style="font-size:11px;color:var(--g500)">${esc(a.meta)}</div>` : ''}</div></div>`).join(''))}`,
    after() {
      const frame = document.getElementById('sumMapFrame'), canvas = document.getElementById('sumMapCanvas');
      if (frame) { const s = frame.clientWidth / 1358; canvas.style.transform = `scale(${s})`; frame.style.height = `${Math.round(766 * s * .45)}px`; }
    },
  };
};

function toast(msg) { const t = document.createElement('div'); t.className = 'cm-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ══════════════════════════════════════════════════════════════════════════
   CONTRACT DETAIL (Wave 7 re-skin pending — Chart.js carry-forward)
   ══════════════════════════════════════════════════════════════════════════ */
const COLORS = { green:'#22c882', amber:'#f79009', red:'#f04438', blue:'#0072d6', teal:'#12b5b0', purple:'#9e77ed', line:'#eaecf0', ink3:'#667085' };
let dtCharts = [];
function killCharts() { dtCharts.forEach(c => { try { c.destroy(); } catch (e) {} }); dtCharts = []; }
const detail = document.getElementById('cmDetail');
document.getElementById('dtBack').addEventListener('click', () => { killCharts(); detail.hidden = true; document.getElementById('cmApp').hidden = false; });
const tileHTML = (icon, tint, label, value) => `<div class="dt-tile"><div class="ti" style="background:${tint}22;color:${tint}">${ic(icon, 16)}</div><div><div class="tl">${label}</div><div class="tv">${value}</div></div></div>`;
function gaugeSVG(pct) {
  const r = 54, c = Math.PI * r, off = c * (1 - pct / 100), col = pct >= 80 ? COLORS.green : pct >= 60 ? COLORS.amber : COLORS.red;
  return `<svg width="150" height="90" viewBox="0 0 150 90"><path d="M15 82 A60 60 0 0 1 135 82" fill="none" stroke="#f2f4f7" stroke-width="14" stroke-linecap="round"/><path d="M15 82 A60 60 0 0 1 135 82" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
}
function openDetail(c) {
  killCharts(); document.getElementById('cmApp').hidden = true; detail.hidden = false;
  document.getElementById('dtCrumb').innerHTML = `01 · <b>${c.id}</b> · <b>${esc(c.name)} Contract</b>`;
  const compliance = 81;
  document.getElementById('dtWrap').innerHTML = `
    <div class="dt-topgrid">
      <div class="dt-gauge">${gaugeSVG(compliance)}<div class="g-val">${compliance}%</div><div class="g-lbl">Overall Compliance</div></div>
      ${tileHTML('car-01', COLORS.blue, 'Number Of Vehicle', `${c.m.vehicles}<span class="max">/120</span>`)}
      ${tileHTML('users-02', COLORS.green, 'Number Of Workforce', `${c.m.workforce}<span class="max">/120</span>`)}
      ${tileHTML('tool-02', COLORS.amber, 'Number Of Equipment', `${c.m.equipment}<span class="max">/120</span>`)}
      ${tileHTML('list', COLORS.purple, 'Number Of Plans', `100<span class="max">/120</span>`)}
      ${tileHTML('coins-hand', COLORS.teal, 'Number Of Services', '05')}
      ${tileHTML('target-04', COLORS.red, 'Number Of KPIs', '05')}
    </div>
    <div class="dt-strip">
      ${tileHTML('calendar', COLORS.blue, 'Days Remaining', c.expiresDays > 0 ? `${c.expiresDays} Days` : '—')}
      ${tileHTML('target-04', COLORS.purple, 'Service Compliance', '62%')}
      ${tileHTML('calendar', COLORS.green, 'Start & End Date', '24 Nov 2024 – 10 Nov 2028')}
    </div>
    <div class="dt-2col">
      <div class="dt-card"><div class="dc-h">${ic('file-06', 16)}Contractor Details</div>
        <div class="dt-kv"><span class="k">Contractor</span><span class="v"><span class="av" style="width:16px;height:16px;border-radius:8px;background:var(--esp-blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">B</span>${c.contractor}</span></div>
        <div class="dt-kv"><span class="k">Contact Person</span><span class="v">Saad Bin Usman</span></div>
        <div class="dt-kv"><span class="k">Email</span><span class="v">saad.beih@gmail.com</span></div>
        <div class="dt-kv"><span class="k">Contact Phone</span><span class="v">+971 50 123 4567</span></div>
        <div class="dt-kv"><span class="k">Project Manager</span><span class="v">${ic('user-03', 14)}Syed Abul</span></div>
      </div>
      <div class="dt-card"><div class="dc-h">${ic('target-04', 16)}Daily Plans Compliance vs Required Baseline</div><div class="dt-chart"><canvas id="dtDaily"></canvas></div></div>
    </div>
    <div class="dt-card"><div class="dc-h">${ic('target-04', 16)}KPI Targets — Target vs Achieved</div><div class="dt-chart"><canvas id="dtKpi"></canvas></div></div>
    <div class="dt-card"><div class="dc-h">${ic('coins-hand', 16)}Service Coverage &amp; Frequencies Compliance</div><div class="dt-chart tall"><canvas id="dtService"></canvas></div></div>
    <div class="dt-card"><div class="dc-h">${ic('calendar', 16)}5-Years Plan Compliance</div><div class="dt-chart tall"><canvas id="dt5yr"></canvas></div></div>
    <div class="dt-3col">${['Vehicle','Workforce','Equipment'].map((t, i) => `<div class="dt-card"><div class="dc-h">${ic('list', 16)}${t} Type Breakdown</div><div class="dt-donut"><canvas id="dtDonut${i}"></canvas></div></div>`).join('')}</div>
    <div class="dt-3col">
      <div class="dt-card"><div class="dc-h">${ic('trash-03', 16)}Bin Type Breakdown</div><div class="dt-donut"><canvas id="dtDonut3"></canvas></div></div>
      <div class="dt-card" style="grid-column:2/-1"><div class="dc-h">${ic('attachment-01', 16)}Attached Documents</div>
        <div class="dt-doclist">
          <div class="dt-doc"><span class="pdf">PDF</span><div><div style="font-weight:600">ESP Physical Contract</div><div style="font-size:12px;color:var(--g500)">Expiry Date: 24 Oct, 2028</div></div></div>
          <div class="dt-doc"><span class="pdf">PDF</span><div><div style="font-weight:600">ESP Company Info</div><div style="font-size:12px;color:var(--g500)">Uploaded 12 Oct, 2024</div></div></div>
        </div></div>
    </div>`;
  if (window.Chart) buildDetailCharts();
  detail.scrollTop = 0;
}
function buildDetailCharts() {
  const grid = { color:COLORS.line }, noGrid = { display:false }, legend = { position:'bottom', labels:{ boxWidth:10, usePointStyle:true, pointStyle:'circle' } };
  const days = Array.from({ length:30 }, (_, i) => `${i + 1}`);
  dtCharts.push(new Chart(document.getElementById('dtDaily'), { type:'line', data:{ labels:days, datasets:[
    { label:'Compliance', data:days.map((_, i) => 92 - i * .3 + Math.sin(i) * 2), borderColor:COLORS.amber, backgroundColor:'rgba(247,144,9,.10)', fill:true, tension:.4, pointRadius:0, borderWidth:2 },
    { label:'Baseline', data:days.map(() => 95), borderColor:COLORS.ink3, borderDash:[6,6], pointRadius:0, borderWidth:1.5 } ] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ grid, min:0, max:100, ticks:{ stepSize:25 } }, x:{ grid:noGrid, ticks:{ maxTicksLimit:8 } } } } }));
  dtCharts.push(new Chart(document.getElementById('dtKpi'), { type:'bar', data:{ labels:['MSW Collection','Bulky Waste Collection','C & D Waste Collection'], datasets:[
    { label:'Target', data:[100,90,90], backgroundColor:'rgba(34,200,130,.20)', borderRadius:4, barThickness:14 }, { label:'Achieved', data:[92,78,60], backgroundColor:COLORS.amber, borderRadius:4, barThickness:14 } ] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend }, scales:{ x:{ grid, min:0, max:100, ticks:{ callback:v => v + '%' } }, y:{ grid:noGrid } } } }));
  dtCharts.push(new Chart(document.getElementById('dtService'), { type:'bar', data:{ labels:['Solid Waste Collection','On-Time','Green & Bulky Waste','Bin Washing','Recyclable','Dead Animals'], datasets:[
    { label:'On-Time', data:[85,90,72,95,88,80], backgroundColor:COLORS.green, borderRadius:{ topLeft:4, bottomLeft:4 }, barThickness:16, stack:'s' },
    { label:'Late', data:[10,7,18,3,8,12], backgroundColor:COLORS.amber, barThickness:16, stack:'s' },
    { label:'Missed', data:[5,3,10,2,4,8], backgroundColor:COLORS.red, borderRadius:{ topRight:4, bottomRight:4 }, barThickness:16, stack:'s' } ] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend }, scales:{ x:{ grid, max:100, stacked:true }, y:{ grid:noGrid, stacked:true } } } }));
  const months = Array.from({ length:24 }, (_, i) => `M${i + 1}`);
  dtCharts.push(new Chart(document.getElementById('dt5yr'), { type:'line', data:{ labels:months, datasets:[COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple, COLORS.red].map((col, s) => ({ label:`Series ${s + 1}`, borderColor:col, backgroundColor:col, pointRadius:0, borderWidth:2, tension:.4, data:months.map((_, i) => 60 + s * 8 + Math.sin(i / 3 + s) * 5 + i * .4) })) },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top', align:'end', labels:{ boxWidth:10, usePointStyle:true, pointStyle:'circle' } } }, scales:{ y:{ grid, min:40, max:110 }, x:{ grid:noGrid, ticks:{ maxTicksLimit:8 } } } } }));
  [ { labels:['Compactor','Skip Loader','Tipper Truck'], data:[60,40,21], cols:[COLORS.green, COLORS.blue, COLORS.amber] },
    { labels:['Drivers','Helpers','Supervisors'], data:[70,35,16], cols:[COLORS.blue, COLORS.green, COLORS.amber] },
    { labels:['Sweeper','Broom','Loader'], data:[55,40,26], cols:[COLORS.purple, COLORS.green, COLORS.blue] },
    { labels:['3 CBM','5 CBM','7 CBM'], data:[60,41,20], cols:[COLORS.blue, COLORS.green, COLORS.amber] } ].forEach((d, i) => {
    dtCharts.push(new Chart(document.getElementById('dtDonut' + i), { type:'doughnut', data:{ labels:d.labels, datasets:[{ data:d.data, backgroundColor:d.cols, borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ boxWidth:8, usePointStyle:true, pointStyle:'circle', font:{ size:10 } } } } },
      plugins:[{ id:'ctr' + i, afterDraw(ch) { const { ctx, chartArea } = ch; const x = (chartArea.left + chartArea.right) / 2, y = (chartArea.top + chartArea.bottom) / 2;
        ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#1d2939'; ctx.font = '700 22px Gilroy,Inter,sans-serif'; ctx.fillText('121', x, y - 2);
        ctx.fillStyle = '#667085'; ctx.font = '500 10px Gilroy,Inter,sans-serif'; ctx.fillText('Total', x, y + 14); ctx.restore(); } }] }));
  });
}
