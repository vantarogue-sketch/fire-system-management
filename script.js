/* ==========================================================
   Fire Station Incident Management System
   State lives in one object (db) saved to LocalStorage.
   Every change -> save() -> renderAll(), so all pages stay in sync.
   ========================================================== */
const KEY = 'fsims_v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = m => new Date(Date.now() - m * 60000).toISOString();
const fmt = d => d ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const badge = s => `<span class="badge b-${esc(s)}">${esc(s)}</span>`;
const TYPES = ['Structure Fire', 'Vehicle Fire', 'Wildfire', 'Gas Leak', 'Rescue', 'Medical Emergency', 'Hazmat'];
const SEV = ['Low', 'Medium', 'High', 'Critical'];
const STATUS = ['Reported', 'Dispatched', 'On Scene', 'Resolved'];
const SEV_COLOR = { Low: '#1f9d55', Medium: '#e0a000', High: '#e8590c', Critical: '#d62828' };

/* ---------- Seed data ---------- */
function seed() {
  const inc = (n, type, loc, rep, con, sev, status, mins, desc, extra = {}) => ({ id: 'INC-' + n, type, location: loc, reporter: rep, contact: con, severity: sev, status, desc, created: ago(mins), vehicleId: null, crew: [], dispatchTime: null, responseMin: null, ...extra });
  return {
    counter: 1008,
    incidents: [
      inc(1001, 'Structure Fire', '14 Market Road, Phagwara', 'Ravi Kumar', '9876500011', 'Critical', 'Reported', 6, 'Smoke from 2nd floor of a shop.'),
      inc(1002, 'Gas Leak', '22 Model Town', 'Anita Sharma', '9876500022', 'High', 'Reported', 18, 'Strong LPG smell in kitchen.'),
      inc(1003, 'Vehicle Fire', 'GT Road near Bus Stand', 'Gurpreet Singh', '9876500033', 'Medium', 'On Scene', 55, 'Truck engine on fire.', { vehicleId: 'FV-02', crew: ['E-103', 'E-104'], dispatchTime: ago(48), responseMin: 7 }),
      inc(1004, 'Rescue', 'Canal Bridge, Sector 5', 'Manoj Verma', '9876500044', 'High', 'Dispatched', 30, 'Person stranded on a ledge.', { vehicleId: 'FV-01', crew: ['E-101', 'E-102'], dispatchTime: ago(24), responseMin: 6 }),
      inc(1005, 'Structure Fire', 'Industrial Area Phase 2', 'Suresh Jain', '9876500055', 'Critical', 'Resolved', 300, 'Factory warehouse fire.', { vehicleId: 'FV-03', responseMin: 9, dispatchTime: ago(291) }),
      inc(1006, 'Wildfire', 'Fields near Rawalpindi Village', 'Harjit Kaur', '9876500066', 'Low', 'Resolved', 1500, 'Crop stubble fire.', { responseMin: 14, dispatchTime: ago(1486) }),
      inc(1007, 'Hazmat', 'Chemical Store, Old Mandi', 'Deepak Mehta', '9876500077', 'Medium', 'Resolved', 2900, 'Leaking chemical drums.', { responseMin: 11, dispatchTime: ago(2889) })
    ],
    vehicles: [
      { id: 'FV-01', name: 'Water Tender', reg: 'PB-37-F-1101', station: 'Station 7', status: 'Dispatched' },
      { id: 'FV-02', name: 'Fire Engine', reg: 'PB-37-F-1102', station: 'Station 7', status: 'Dispatched' },
      { id: 'FV-03', name: 'Aerial Ladder', reg: 'PB-37-F-1103', station: 'Station 7', status: 'Available' },
      { id: 'FV-04', name: 'Fire Engine', reg: 'PB-37-F-1104', station: 'Station 3', status: 'Available' },
      { id: 'FV-05', name: 'Rescue Tender', reg: 'PB-37-F-1105', station: 'Station 3', status: 'Maintenance' },
      { id: 'FV-06', name: 'Foam Tender', reg: 'PB-37-F-1106', station: 'Station 7', status: 'Available' }
    ],
    crew: [
      { id: 'E-101', name: 'Karan Singh', role: 'Captain', phone: '9811100001', status: 'On Duty' },
      { id: 'E-102', name: 'Amit Das', role: 'Firefighter', phone: '9811100002', status: 'On Duty' },
      { id: 'E-103', name: 'Rohit Sethi', role: 'Lieutenant', phone: '9811100003', status: 'On Duty' },
      { id: 'E-104', name: 'Naveen Gill', role: 'Driver/Operator', phone: '9811100004', status: 'On Duty' },
      { id: 'E-105', name: 'Pooja Thakur', role: 'Paramedic', phone: '9811100005', status: 'Available' },
      { id: 'E-106', name: 'Vikram Rana', role: 'Firefighter', phone: '9811100006', status: 'Available' },
      { id: 'E-107', name: 'Simran Bedi', role: 'Firefighter', phone: '9811100007', status: 'Available' },
      { id: 'E-108', name: 'Harry Dhillon', role: 'Driver/Operator', phone: '9811100008', status: 'Off Duty' }
    ],
    notes: [
      { t: 'New CRITICAL incident INC-1001 reported', time: ago(6), read: false },
      { t: 'Vehicle FV-05 sent to maintenance', time: ago(120), read: false }
    ]
  };
}
let db = JSON.parse(localStorage.getItem(KEY) || 'null') || seed();
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const vehicle = id => db.vehicles.find(v => v.id === id);
const member = id => db.crew.find(c => c.id === id);
const crewNames = ids => ids.map(i => member(i)?.name).filter(Boolean).join(', ') || '—';
const vehicleCrew = id => { const i = db.incidents.find(x => x.vehicleId === id && x.status !== 'Resolved'); return i ? crewNames(i.crew) : '—'; };

/* ---------- UI helpers ---------- */
function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 3000);
}
function note(t) { db.notes.unshift({ t, time: new Date().toISOString(), read: false }); db.notes = db.notes.slice(0, 30); }
function openModal(title, html) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; $('#overlay').hidden = false; }
const closeModal = () => { $('#overlay').hidden = true; $('#mBody').innerHTML = ''; };
function confirmBox(msg, onYes, label = 'Confirm') {
  openModal('Please confirm', `<p style="margin-bottom:16px">${esc(msg)}</p><div class="actions" style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-act="close">Cancel</button><button class="btn red" id="yes">${label}</button></div>`);
  $('#yes').onclick = () => { closeModal(); onYes(); };
}
const empty = (icon, msg) => `<div class="empty"><i class="fa-solid ${icon}"></i>${msg}</div>`;
const table = (heads, rows, emptyMsg) => rows.length
  ? `<table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
  : empty('fa-folder-open', emptyMsg);

/* Generic form modal: fields = [name,label,type,options,required,full] */
function openForm(title, fields, vals, onSave) {
  const input = ([n, l, t, o, req, full]) => {
    const v = esc(vals[n] ?? '');
    let el;
    if (t === 'select') el = `<select name="${n}" ${req ? 'required' : ''}>${o.map(x => `<option ${x === vals[n] ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    else if (t === 'textarea') el = `<textarea name="${n}" rows="3" ${req ? 'required' : ''}>${v}</textarea>`;
    else el = `<input name="${n}" type="${t}" value="${v}" ${req ? 'required' : ''} ${t === 'tel' ? 'pattern="[0-9+ \\-]{7,15}" title="7-15 digits"' : ''}>`;
    return `<label class="${full ? 'full' : ''}">${l}${el}</label>`;
  };
  openModal(title, `<form class="form" id="f" novalidate>${fields.map(input).join('')}<div class="actions"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn red">Save</button></div></form>`);
  $('#f').onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkValidity()) { f.reportValidity(); return toast('Please fix the highlighted fields', true); }
    const data = Object.fromEntries(new FormData(f));
    Object.keys(data).forEach(k => data[k] = data[k].trim());
    if (fields.some(x => x[4] && !data[x[0]])) return toast('Required fields cannot be blank', true);
    onSave(data); closeModal();
  };
}
const commit = () => { save(); renderAll(); };

/* ---------- Business logic ---------- */
/* Releases the vehicle and crew of an incident back to the pool */
function release(inc) {
  const v = vehicle(inc.vehicleId); if (v && v.status === 'Dispatched') v.status = 'Available';
  inc.crew.forEach(id => { const m = member(id); if (m) m.status = 'Available'; });
}
function setStatus(inc, s) {
  inc.status = s;
  if (s === 'Resolved') release(inc);
  note(`${inc.id} is now ${s}`);
}

/* ---------- Incidents ---------- */
const incFields = (editing) => [
  ['type', 'Incident type', 'select', TYPES, true], ['severity', 'Severity', 'select', SEV, true],
  ['location', 'Location / address', 'text', null, true, true],
  ['reporter', 'Reporter name', 'text', null, true], ['contact', 'Reporter contact', 'tel', null, true],
  ['status', 'Status', 'select', STATUS, true], ['desc', 'Description', 'textarea', null, true, true]
];
function incidentForm(inc) {
  openForm(inc ? 'Edit ' + inc.id : 'Report new incident', incFields(), inc || { severity: 'Medium', status: 'Reported' }, d => {
    if (inc) {
      const prev = inc.status; Object.assign(inc, d);
      if (d.status !== prev) setStatus(inc, d.status);
      toast('Incident updated');
    } else {
      const n = { id: 'INC-' + db.counter++, ...d, created: new Date().toISOString(), vehicleId: null, crew: [], dispatchTime: null, responseMin: null };
      db.incidents.unshift(n); note(`New ${n.severity.toUpperCase()} incident ${n.id} reported`); toast('Incident ' + n.id + ' reported');
    }
    commit();
  });
}
function viewIncident(id) {
  const i = db.incidents.find(x => x.id === id), v = vehicle(i.vehicleId);
  const row = (k, val) => `<dt>${k}</dt><dd>${val}</dd>`;
  openModal(i.id + ' details', `<dl class="detail">${row('Type', esc(i.type))}${row('Severity', badge(i.severity))}${row('Status', badge(i.status))}${row('Location', esc(i.location))}${row('Reporter', esc(i.reporter) + ' (' + esc(i.contact) + ')')}${row('Reported', fmt(i.created))}${row('Vehicle', v ? esc(v.name + ' · ' + v.id) : '—')}${row('Crew', esc(crewNames(i.crew)))}${row('Dispatched', fmt(i.dispatchTime))}${row('Description', esc(i.desc))}</dl>`);
}
function renderIncidents() {
  const q = $('#incSearch').value.toLowerCase(), s = $('#incSev').value, st = $('#incStatus').value;
  const list = db.incidents.filter(i => (!q || [i.id, i.type, i.location].some(x => x.toLowerCase().includes(q))) && (!s || i.severity === s) && (!st || i.status === st));
  $('#incTable').innerHTML = table(['ID', 'Type', 'Location', 'Severity', 'Status', 'Reported', 'Actions'], list.map(i => `<tr><td><b>${i.id}</b></td><td>${esc(i.type)}</td><td>${esc(i.location)}</td><td>${badge(i.severity)}</td><td>${badge(i.status)}</td><td>${fmt(i.created)}</td>
    <td><button class="btn sm" data-act="view" data-id="${i.id}"><i class="fa-solid fa-eye"></i></button><button class="btn sm" data-act="edit-inc" data-id="${i.id}"><i class="fa-solid fa-pen"></i></button><button class="btn sm" data-act="del-inc" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`), 'No incidents match your search. Clear the filters or report a new incident.');
}

/* ---------- Dispatch ---------- */
function renderDispatch() {
  const pend = db.incidents.filter(i => i.status === 'Reported');
  const free = db.vehicles.filter(v => v.status === 'Available');
  const crew = db.crew.filter(c => c.status === 'Available');
  $('#pending').innerHTML = pend.length ? pend.map(i => `<div class="pend" data-inc="${i.id}">
    <div class="pend-head"><b>${i.id}</b>${badge(i.severity)}<span>${esc(i.type)} — ${esc(i.location)}</span></div>
    <div class="pend-grid">
      <select class="veh"><option value="">Select fire engine…</option>${free.map(v => `<option value="${v.id}">${esc(v.name)} (${v.id})</option>`).join('')}</select>
      <div class="crew-pick">${crew.length ? crew.map(c => `<label><input type="checkbox" value="${c.id}">${esc(c.name)} <small>${esc(c.role)}</small></label>`).join('') : '<span class="muted">No crew available</span>'}</div>
      <button class="btn red" data-act="dispatch" data-id="${i.id}"><i class="fa-solid fa-tower-broadcast"></i>Dispatch</button>
    </div></div>`).join('') : empty('fa-circle-check', 'No pending incidents. All reports have been dispatched.');
  const act = db.incidents.filter(i => i.status === 'Dispatched' || i.status === 'On Scene');
  $('#active').innerHTML = table(['Incident', 'Vehicle', 'Crew', 'Dispatched', 'Status', 'Next step'], act.map(i => {
    const nxt = STATUS[STATUS.indexOf(i.status) + 1];
    return `<tr><td><b>${i.id}</b><br><small>${esc(i.type)}</small></td><td>${esc(vehicle(i.vehicleId)?.name || '—')} (${i.vehicleId})</td><td>${esc(crewNames(i.crew))}</td><td>${fmt(i.dispatchTime)}</td><td>${badge(i.status)}</td>
    <td><button class="btn sm red" data-act="advance" data-id="${i.id}">Mark ${nxt}</button></td></tr>`;
  }), 'No active dispatches right now.');
}
function dispatchIncident(id) {
  const card = $(`.pend[data-inc="${id}"]`), vid = $('.veh', card).value, picked = $$('input:checked', card).map(c => c.value);
  const v = vehicle(vid);
  // Guard: block vehicles that are dispatched or under maintenance
  if (!v) return toast('Select a fire engine first', true);
  if (v.status !== 'Available') return toast(`${v.id} is ${v.status} and cannot be assigned`, true);
  if (!picked.length) return toast('Assign at least one crew member', true);
  const inc = db.incidents.find(i => i.id === id);
  Object.assign(inc, { vehicleId: vid, crew: picked, status: 'Dispatched', dispatchTime: new Date().toISOString() });
  inc.responseMin = Math.max(1, Math.round((new Date(inc.dispatchTime) - new Date(inc.created)) / 60000)) + 4; // simulated travel time
  v.status = 'Dispatched'; picked.forEach(c => member(c).status = 'On Duty');
  note(`${v.name} ${v.id} dispatched to ${id}`); toast(`${v.id} dispatched to ${id}`); commit();
}

/* ---------- Vehicles & crew ---------- */
const vehFields = [['name', 'Vehicle name / type', 'text', null, true], ['reg', 'Registration number', 'text', null, true], ['station', 'Station', 'text', null, true], ['status', 'Status', 'select', ['Available', 'Dispatched', 'Maintenance'], true]];
function vehicleForm(v) {
  openForm(v ? 'Edit ' + v.id : 'Add vehicle', vehFields, v || { status: 'Available', station: 'Station 7' }, d => {
    if (v) { Object.assign(v, d); toast('Vehicle updated'); }
    else {
      if (db.vehicles.some(x => x.reg.toLowerCase() === d.reg.toLowerCase())) return toast('Registration already exists', true);
      const id = 'FV-' + String(db.vehicles.length + 1).padStart(2, '0'); db.vehicles.push({ id, ...d }); toast('Vehicle ' + id + ' added');
    }
    commit();
  });
}
function renderVehicles() {
  const q = $('#vehSearch').value.toLowerCase(), st = $('#vehStatus').value;
  const list = db.vehicles.filter(v => (!q || [v.id, v.name, v.reg, v.station].some(x => x.toLowerCase().includes(q))) && (!st || v.status === st));
  $('#vehTable').innerHTML = table(['ID', 'Vehicle', 'Registration', 'Station', 'Assigned crew', 'Status', 'Actions'], list.map(v => `<tr><td><b>${v.id}</b></td><td>${esc(v.name)}</td><td>${esc(v.reg)}</td><td>${esc(v.station)}</td><td>${esc(vehicleCrew(v.id))}</td><td>${badge(v.status)}</td>
    <td><button class="btn sm" data-act="edit-veh" data-id="${v.id}"><i class="fa-solid fa-pen"></i></button>
    <select class="vstat" data-id="${v.id}" style="width:auto;padding:4px">${['Available', 'Dispatched', 'Maintenance'].map(s => `<option ${s === v.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`), 'No vehicles found.');
}
const crewFields = [['name', 'Full name', 'text', null, true], ['emp', 'Employee ID', 'text', null, true], ['role', 'Role', 'select', ['Captain', 'Lieutenant', 'Firefighter', 'Driver/Operator', 'Paramedic'], true], ['phone', 'Contact number', 'tel', null, true], ['status', 'Availability', 'select', ['Available', 'On Duty', 'Off Duty'], true]];
function crewForm(c) {
  openForm(c ? 'Edit crew member' : 'Add crew member', crewFields, c ? { ...c, emp: c.id } : { status: 'Available' }, d => {
    if (db.crew.some(x => x.id === d.emp && x !== c)) return toast('Employee ID already exists', true);
    const rec = { id: d.emp, name: d.name, role: d.role, phone: d.phone, status: d.status };
    if (c) { db.incidents.forEach(i => i.crew = i.crew.map(x => x === c.id ? rec.id : x)); Object.assign(c, rec); toast('Crew updated'); } else { db.crew.push(rec); toast('Crew member added'); }
    commit();
  });
}
function renderCrew() {
  const q = $('#crewSearch').value.toLowerCase(), st = $('#crewStatus').value;
  const list = db.crew.filter(c => (!q || [c.id, c.name, c.role].some(x => x.toLowerCase().includes(q))) && (!st || c.status === st));
  const veh = id => { const i = db.incidents.find(x => x.status !== 'Resolved' && x.crew.includes(id)); return i ? i.vehicleId : '—'; };
  $('#crewTable').innerHTML = table(['Name', 'Employee ID', 'Role', 'Contact', 'Vehicle', 'Status', 'Actions'], list.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.id)}</td><td>${esc(c.role)}</td><td>${esc(c.phone)}</td><td>${veh(c.id)}</td><td>${badge(c.status)}</td><td><button class="btn sm" data-act="edit-crew" data-id="${c.id}"><i class="fa-solid fa-pen"></i></button></td></tr>`), 'No crew members found.');
}

/* ---------- Dashboard & reports ---------- */
const stat = (icon, n, label, c) => `<div class="stat" style="--c:${c}"><i class="fa-solid ${icon}"></i><div><strong>${n}</strong><span>${label}</span></div></div>`;
function sevBars(el) {
  const max = Math.max(1, ...SEV.map(s => db.incidents.filter(i => i.severity === s).length));
  $(el).innerHTML = SEV.map(s => { const n = db.incidents.filter(i => i.severity === s).length; return `<div class="bar"><span>${s}</span><div><i style="width:${n / max * 100}%;background:${SEV_COLOR[s]}"></i></div><b>${n}</b></div>`; }).join('');
}
const recentRows = list => list.map(i => `<tr><td><b>${i.id}</b></td><td>${esc(i.type)}</td><td>${esc(i.location)}</td><td>${badge(i.severity)}</td><td>${badge(i.status)}</td><td>${fmt(i.created)}</td></tr>`);
const H = ['ID', 'Type', 'Location', 'Severity', 'Status', 'Reported'];
function renderDashboard() {
  const I = db.incidents;
  $('#stats').innerHTML = stat('fa-fire', I.length, 'Total incidents', '#14202e') + stat('fa-siren-on fa-bell', I.filter(i => i.status === 'Dispatched' || i.status === 'On Scene').length, 'Active emergencies', '#d62828') +
    stat('fa-hourglass-half', I.filter(i => i.status === 'Reported').length, 'Awaiting dispatch', '#e08a00') + stat('fa-truck-droplet', db.vehicles.filter(v => v.status === 'Available').length, 'Available fire engines', '#1f9d55');
  sevBars('#sevChart');
  $('#timeline').innerHTML = [...I].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6).map(i => `<li><b>${i.id}</b> ${esc(i.type)} — ${i.status}<small>${fmt(i.created)} · ${esc(i.location)}</small></li>`).join('') || empty('fa-clock', 'No activity yet.');
  $('#recent').innerHTML = table(H, recentRows([...I].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 5)), 'No incidents yet. Use "Report incident" to add one.');
}
function renderReports() {
  const I = db.incidents, timed = I.filter(i => i.responseMin != null);
  const avg = timed.length ? (timed.reduce((s, i) => s + i.responseMin, 0) / timed.length).toFixed(1) + ' min' : 'N/A';
  $('#repStats').innerHTML = stat('fa-folder-open', I.length, 'Total incidents handled', '#14202e') + stat('fa-circle-check', I.filter(i => i.status === 'Resolved').length, 'Resolved', '#1f9d55') + stat('fa-stopwatch', avg, 'Avg. response time (simulated)', '#d62828');
  sevBars('#repSev');
  $('#history').innerHTML = table(H, recentRows([...I].sort((a, b) => new Date(b.created) - new Date(a.created))), 'No incident history available.');
}
function exportCSV() {
  if (!db.incidents.length) return toast('No incidents to export', true);
  const cols = ['id', 'type', 'location', 'reporter', 'contact', 'severity', 'status', 'created', 'vehicleId', 'dispatchTime', 'responseMin', 'desc'];
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [cols.join(',')].concat(db.incidents.map(i => cols.map(c => q(i[c])).join(','))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'incident-records.csv'; a.click();
  toast('CSV exported');
}

/* ---------- Notifications, clock, navigation ---------- */
function renderNotes() {
  const un = db.notes.filter(n => !n.read).length;
  $('#bellCount').textContent = un; $('#bellCount').hidden = !un;
  $('#notes').innerHTML = db.notes.length ? `<div style="display:flex;justify-content:space-between;padding:4px 6px"><b>Notifications</b><button class="btn sm ghost" data-act="clear-notes">Clear all</button></div>` + db.notes.map(n => `<div class="note">${esc(n.t)}<small>${fmt(n.time)}</small></div>`).join('') : empty('fa-bell-slash', 'You are all caught up.');
}
function renderAll() { renderDashboard(); renderIncidents(); renderDispatch(); renderVehicles(); renderCrew(); renderReports(); renderNotes(); }
function go(page) {
  $$('.page').forEach(p => p.hidden = p.id !== page);
  $$('.nav[data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  $('#pageTitle').textContent = $(`.nav[data-page="${page}"]`).textContent;
  $('#sidebar').classList.remove('open'); window.scrollTo(0, 0);
}
const tick = () => $('#clock').textContent = new Date().toLocaleString([], { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/* ---------- Event wiring (delegation) ---------- */
const actions = {
  menu: () => $('#sidebar').classList.toggle('open'),
  bell: () => { const n = $('#notes'); n.hidden = !n.hidden; if (!n.hidden) { db.notes.forEach(x => x.read = true); save(); renderNotes(); } },
  'clear-notes': () => { db.notes = []; commit(); },
  close: closeModal,
  'new-incident': () => incidentForm(),
  view: id => viewIncident(id),
  'edit-inc': id => incidentForm(db.incidents.find(i => i.id === id)),
  'del-inc': id => confirmBox(`Delete ${id}? This cannot be undone.`, () => { const i = db.incidents.find(x => x.id === id); if (i.status !== 'Resolved') release(i); db.incidents = db.incidents.filter(x => x !== i); toast(id + ' deleted'); commit(); }, 'Delete'),
  dispatch: id => dispatchIncident(id),
  advance: id => { const i = db.incidents.find(x => x.id === id), nxt = STATUS[STATUS.indexOf(i.status) + 1]; confirmBox(`Mark ${id} as ${nxt}?`, () => { setStatus(i, nxt); toast(`${id} → ${nxt}`); commit(); }); },
  'add-vehicle': () => vehicleForm(), 'edit-veh': id => vehicleForm(vehicle(id)),
  'add-crew': () => crewForm(), 'edit-crew': id => crewForm(member(id)),
  csv: exportCSV,
  reset: () => confirmBox('Reset all data back to the demo set?', () => { db = seed(); commit(); toast('Demo data restored'); }, 'Reset')
};
document.addEventListener('click', e => {
  const nav = e.target.closest('.nav[data-page]'); if (nav) return go(nav.dataset.page);
  const el = e.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) actions[el.dataset.act](el.dataset.id);
  if (!e.target.closest('#notes,[data-act="bell"]')) $('#notes').hidden = true;
  if (e.target.id === 'overlay') closeModal();
});
document.addEventListener('keydown', e => e.key === 'Escape' && closeModal());
['incSearch', 'incSev', 'incStatus'].forEach(i => $('#' + i).addEventListener('input', renderIncidents));
['vehSearch', 'vehStatus'].forEach(i => $('#' + i).addEventListener('input', renderVehicles));
['crewSearch', 'crewStatus'].forEach(i => $('#' + i).addEventListener('input', renderCrew));
// Changing a vehicle's status from the table (free crew if it is no longer dispatched)
document.addEventListener('change', e => {
  if (!e.target.classList.contains('vstat')) return;
  const v = vehicle(e.target.dataset.id);
  if (e.target.value === 'Available' && db.incidents.some(i => i.vehicleId === v.id && i.status !== 'Resolved')) { toast('Resolve its active incident first', true); return renderVehicles(); }
  v.status = e.target.value; note(`${v.id} status set to ${v.status}`); toast(`${v.id} is now ${v.status}`); commit();
});

renderAll(); tick(); setInterval(tick, 1000);
