// ═══════════════════════════════════════════════
// DATA STORE
// ═══════════════════════════════════════════════
let store = {
  pacientes: [
    { id:1, nombres:'María', apellidos:'Ríos', edad:28, tel:'987 654 001', email:'maria@email.com', motivo:'Ansiedad generalizada', notas:'Sin antecedentes relevantes.', fecha:'2026-03-10', estado:'Activo' },
    { id:2, nombres:'Juan', apellidos:'Pacheco', edad:35, tel:'987 654 002', email:'juan@email.com', motivo:'Estrés laboral', notas:'Primera consulta.', fecha:'2026-03-15', estado:'Activo' },
    { id:3, nombres:'Lucía', apellidos:'Sarmiento', edad:42, tel:'987 654 003', email:'lucia@email.com', motivo:'Depresión leve', notas:'Evaluación pendiente.', fecha:'2026-03-20', estado:'Activo' },
    { id:4, nombres:'Carlos', apellidos:'Rojas', edad:31, tel:'987 654 004', email:'carlos@email.com', motivo:'Terapia cognitiva', notas:'Sesiones semanales.', fecha:'2026-03-22', estado:'Activo' },
  ],
  citas: [
    { id:1, paciente:'María Ríos', tipo:'Sesión de seguimiento', fecha:'2026-03-31', hora:'09:00', duracion:'50 min', estado:'confirmada' },
    { id:2, paciente:'Juan Pacheco', tipo:'Primera consulta', fecha:'2026-03-31', hora:'11:30', duracion:'60 min', estado:'pendiente' },
    { id:3, paciente:'Lucía Sarmiento', tipo:'Evaluación psicológica', fecha:'2026-03-31', hora:'15:00', duracion:'90 min', estado:'confirmada' },
    { id:4, paciente:'Carlos Rojas', tipo:'Terapia cognitiva', fecha:'2026-03-31', hora:'17:00', duracion:'50 min', estado:'por confirmar' },
  ],
  actividad: [
    { tipo:'purple', icon:'📝', texto:'Registro nuevo creado para <strong>María Ríos</strong>', tiempo:'Hace 15 minutos' },
    { tipo:'teal',   icon:'✅', texto:'Cita de <strong>Juan Pacheco</strong> confirmada',        tiempo:'Hace 1 hora' },
    { tipo:'amber',  icon:'📊', texto:'Reporte mensual de <strong>marzo</strong> generado',      tiempo:'Hace 3 horas' },
    { tipo:'rose',   icon:'⚠️', texto:'<strong>Carlos Rojas</strong> no confirmó su cita',       tiempo:'Ayer, 17:00' },
    { tipo:'purple', icon:'👤', texto:'Nuevo paciente <strong>Lucía Sarmiento</strong> registrado', tiempo:'Ayer, 10:30' },
  ],
  nextId: 5,
  reportes: 3,
  config: { nombre:'Consultorio PsiControl', psicologo:'Dra. Ana López', tel:'', email:'', dir:'' }
};

let citaFiltro = 'todas';

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
const pageLabels = { dashboard:'Dashboard', historial:'Historial de registros', citas:'Citas', nuevo:'Nuevo registro', reportes:'Reportes', config:'Configuración' };

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const navEl = document.querySelector('[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');
  document.getElementById('breadcrumb-text').textContent = pageLabels[page] || page;
  if (page === 'historial') renderHistorial();
  if (page === 'citas') renderCitas();
  if (page === 'reportes') renderReportes();
  if (page === 'nuevo') { limpiarFormulario(); document.getElementById('f-fecha').value = hoy(); }
  if (page === 'config') cargarConfig();
  document.getElementById('global-search').value = '';
  document.getElementById('search-results').style.display = 'none';
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function hoy() {
  return new Date().toISOString().split('T')[0];
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return d + ' ' + meses[parseInt(m)-1] + ' ' + y;
}

function colorAvatar(nombre) {
  const cols = ['bg-purple','bg-teal','bg-amber','bg-rose','bg-slate'];
  let h = 0; for (let c of nombre) h = (h * 31 + c.charCodeAt(0)) % cols.length;
  return cols[h];
}

function initials(nombre) {
  const p = nombre.trim().split(' ');
  return (p[0]?.[0] || '') + (p[1]?.[0] || '');
}

function estadoBadge(e) {
  const m = { confirmada:'c-teal', pendiente:'c-amber', 'por confirmar':'c-rose' };
  return '<span class="appt-badge ' + (m[e] || 'c-amber') + '">' + capitalize(e) + '</span>';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function toast(msg, tipo = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ═══════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-cita') {
    document.getElementById('mc-fecha').value = hoy();
    actualizarDatalist();
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

function actualizarDatalist() {
  const dl = document.getElementById('pacientes-list');
  dl.innerHTML = store.pacientes.map(p => '<option value="' + p.nombres + ' ' + p.apellidos + '">').join('');
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  // fecha
  const now = new Date();
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('fecha-hoy').textContent = dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()] + ' de ' + now.getFullYear() + ' · Bienvenida, Ana';
  document.getElementById('fecha-citas-hoy').textContent = 'Hoy, ' + now.getDate() + ' de ' + meses[now.getMonth()];

  // stats
  document.getElementById('stat-registros').textContent = store.pacientes.length;
  document.getElementById('stat-citas').textContent = store.citas.filter(c => c.estado !== 'confirmada').length;
  document.getElementById('stat-pacientes').textContent = store.pacientes.filter(p => p.estado === 'Activo').length;
  document.getElementById('stat-reportes').textContent = store.reportes;
  document.getElementById('stat-reg-delta').textContent = '↑ ' + store.pacientes.length + ' registros';
  document.getElementById('stat-cita-delta').textContent = '↑ ' + store.citas.filter(c => c.fecha === hoy()).length + ' hoy';

  // badges nav
  document.getElementById('badge-historial').textContent = store.pacientes.length;
  document.getElementById('badge-citas').textContent = store.citas.filter(c => c.estado !== 'confirmada').length;

  // appointment list
  const apptEl = document.getElementById('appt-list-dash');
  const citasHoy = store.citas.slice(0, 4);
  if (citasHoy.length === 0) {
    apptEl.innerHTML = '<div class="empty-state"><div class="es-icon">📅</div><div class="es-text">No hay citas registradas</div></div>';
  } else {
    apptEl.innerHTML = citasHoy.map(c => {
      const [h, m] = c.hora.split(':');
      const period = parseInt(h) < 12 ? 'am' : 'pm';
      const hr = parseInt(h) > 12 ? String(parseInt(h)-12).padStart(2,'0') + ':' + m : c.hora;
      return `<div class="appt-item" onclick="verCitaDetalle(${c.id})">
        <div class="appt-time"><div class="appt-hour">${hr}</div><div class="appt-period">${period}</div></div>
        <div class="appt-divider"></div>
        <div class="appt-avatar ${colorAvatar(c.paciente)}">${initials(c.paciente)}</div>
        <div class="appt-info">
          <div class="appt-name">${c.paciente}</div>
          <div class="appt-type">${c.tipo} · ${c.duracion}</div>
        </div>
        ${estadoBadge(c.estado)}
      </div>`;
    }).join('');
  }

  // activity feed
  const actEl = document.getElementById('activity-feed');
  actEl.innerHTML = store.actividad.slice(0, 5).map(a =>
    `<div class="activity-item">
      <div class="act-dot c-${a.tipo}">${a.icon}</div>
      <div class="act-body">
        <div class="act-text">${a.texto}</div>
        <div class="act-time">${a.tiempo}</div>
      </div>
    </div>`
  ).join('');

  // progress bars
  const total = store.pacientes.length || 1;
  const conf = store.citas.filter(c => c.estado === 'confirmada').length;
  const asist = Math.round((conf / Math.max(store.citas.length, 1)) * 100);
  const completo = Math.min(Math.round((store.pacientes.length / 20) * 100), 100);
  renderProgBars('prog-wrap', [
    { label:'Asistencia a citas', val:asist, color:'var(--teal)' },
    { label:'Registros completados', val:completo, color:'var(--accent)' },
    { label:'Satisfacción general', val:91, color:'var(--amber)' },
  ]);
}

function renderProgBars(id, items) {
  document.getElementById(id).innerHTML = items.map(i =>
    `<div>
      <div class="prog-row"><span style="color:var(--text-secondary);">${i.label}</span><span style="font-weight:600;color:${i.color};">${i.val}%</span></div>
      <div class="prog-bar"><div class="prog-fill" style="width:${i.val}%;background:${i.color};"></div></div>
    </div>`
  ).join('');
}

// ═══════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════
function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  const lista = store.pacientes.filter(p => {
    const f = filtro.toLowerCase();
    return !f || (p.nombres + ' ' + p.apellidos).toLowerCase().includes(f) || p.motivo.toLowerCase().includes(f);
  });
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📭</div><div class="es-text">No se encontraron registros</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(p =>
    `<tr onclick="verPaciente(${p.id})">
      <td><div class="td-name"><div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}">${initials(p.nombres+' '+p.apellidos)}</div>${p.nombres} ${p.apellidos}</div></td>
      <td>${p.edad} años</td>
      <td>${p.tel || '—'}</td>
      <td>${p.motivo}</td>
      <td>${fmtFecha(p.fecha)}</td>
      <td><span class="appt-badge c-teal">${p.estado}</span></td>
      <td><button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation();eliminarPaciente(${p.id})">Eliminar</button></td>
    </tr>`
  ).join('');
}

function filterHistorial() {
  renderHistorial(document.getElementById('hist-search').value);
}

function verPaciente(id) {
  const p = store.pacientes.find(x => x.id === id);
  if (!p) return;
  document.getElementById('mp-titulo').textContent = p.nombres + ' ' + p.apellidos;
  document.getElementById('mp-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Edad</div><div style="font-size:14px;font-weight:500;">${p.edad} años</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Teléfono</div><div style="font-size:14px;font-weight:500;">${p.tel || '—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Correo</div><div style="font-size:14px;font-weight:500;">${p.email || '—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Fecha de registro</div><div style="font-size:14px;font-weight:500;">${fmtFecha(p.fecha)}</div></div>
      <div style="grid-column:1/-1"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Motivo de consulta</div><div style="font-size:14px;font-weight:500;">${p.motivo}</div></div>
      <div style="grid-column:1/-1"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Notas</div><div style="font-size:13px;color:var(--text-secondary);">${p.notas || 'Sin notas.'}</div></div>
    </div>
    <div style="margin-top:20px;display:flex;gap:8px;">
      <button class="btn-secondary" onclick="closeModal('modal-paciente')">Cerrar</button>
    </div>`;
  openModal('modal-paciente');
}

function eliminarPaciente(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  store.pacientes = store.pacientes.filter(p => p.id !== id);
  renderHistorial(document.getElementById('hist-search').value);
  renderDashboard();
  toast('Registro eliminado', 'warning');
}

const days = [
  { key: 'lun', label: 'Lunes',     active: true,  from: '08:00', to: '17:00' },
  { key: 'mar', label: 'Martes',    active: true,  from: '08:00', to: '17:00' },
  { key: 'mie', label: 'Miércoles', active: true,  from: '08:00', to: '17:00' },
  { key: 'jue', label: 'Jueves',    active: true,  from: '08:00', to: '17:00' },
  { key: 'vie', label: 'Viernes',   active: true,  from: '08:00', to: '14:00' },
  { key: 'sab', label: 'Sábado',    active: false, from: '09:00', to: '12:00' },
  { key: 'dom', label: 'Domingo',   active: false, from: '09:00', to: '12:00' },
];

function buildSchedule() {
  const wrap = document.getElementById('schedule-rows');
  wrap.innerHTML = days.map((d, i) => `
    <div class="schedule-row" style="background:${i%2===0?'var(--bg)':'transparent'};border-radius:8px;padding:4px 0;">
      <span class="day-label">${d.label}</span>
      <input type="time" value="${d.from}" id="from-${d.key}"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <input type="time" value="${d.to}" id="to-${d.key}"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <div class="toggle-switch ${d.active?'on':''}" id="tog-${d.key}" onclick="toggleDay('${d.key}',${i})"></div>
    </div>
  `).join('');
}

function toggleDay(key, i) {
  days[i].active = !days[i].active;
  const tog = document.getElementById('tog-'+key);
  const from = document.getElementById('from-'+key);
  const to   = document.getElementById('to-'+key);
  tog.classList.toggle('on', days[i].active);
  const dis = !days[i].active;
  [from, to].forEach(el => {
    el.style.opacity = dis ? '.35' : '1';
    el.style.pointerEvents = dis ? 'none' : '';
  });
}

buildSchedule();

// ── TIPO DE PACIENTES ──
const patientTypes = [
  'Niños (4–12 años)', 'Adolescentes (13–17)', 'Adultos', 'Adultos mayores',
  'Parejas', 'Familias', 'Ansiedad y estrés', 'Depresión',
  'Trauma y PTSD', 'Trastornos alimentarios', 'TDAH', 'Habilidades sociales',
  'Duelo y pérdida', 'Adicciones', 'Orientación vocacional',
];
const selected = new Set([2, 6, 7]);

function buildTags() {
  const wrap = document.getElementById('patient-tags');
  
  // ✅ VERIFICACIÓN que evita el error
  if (!wrap) {
    console.warn('❌ Elemento #patient-tags no encontrado en el HTML');
    return;
  }
  
  wrap.innerHTML = patientTypes.map((t, i) => `
    <div class="tag-chip ${selected.has(i)?'selected':''}" onclick="toggleTag(${i}, this)">
      <span class="tag-dot"></span>${t}
    </div>
  `).join('');
}

function toggleTag(i, el) {
  if (selected.has(i)) { selected.delete(i); el.classList.remove('selected'); }
  else { selected.add(i); el.classList.add('selected'); }
}

buildTags();

// ═══════════════════════════════════════════════
// CITAS
// ═══════════════════════════════════════════════
function renderCitas() {
  const tbody = document.getElementById('citas-tbody');
  const lista = citaFiltro === 'todas' ? store.citas : store.citas.filter(c => c.estado === citaFiltro);
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">No hay citas para mostrar</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(c =>
    `<tr>
      <td><div class="td-name"><div class="td-avatar ${colorAvatar(c.paciente)}">${initials(c.paciente)}</div>${c.paciente}</div></td>
      <td>${fmtFecha(c.fecha)}</td>
      <td style="font-weight:600;">${c.hora}</td>
      <td>${c.tipo}</td>
      <td>${c.duracion}</td>
      <td>${estadoBadge(c.estado)}</td>
      <td>
        <div class="td-actions">
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="editarCita(${c.id})">Editar</button>
          ${c.estado !== 'confirmada' ? `<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--teal);border-color:var(--teal);" onclick="confirmarCita(${c.id})">Confirmar</button>` : ''}
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="eliminarCita(${c.id})">Cancelar</button>
        </div>
      </td>
    </tr>`
  ).join('');
}

function filterCitas(tipo) {
  citaFiltro = tipo;
  renderCitas();
}

function confirmarCita(id) {
  const c = store.citas.find(x => x.id === id);
  if (c) { c.estado = 'confirmada'; renderCitas(); renderDashboard(); toast('Cita confirmada para ' + c.paciente); }
}

function eliminarCita(id) {
  if (!confirm('¿Cancelar esta cita?')) return;
  store.citas = store.citas.filter(c => c.id !== id);
  renderCitas(); renderDashboard();
  toast('Cita cancelada', 'warning');
}

function verCitaDetalle(id) {
  const c = store.citas.find(x => x.id === id);
  if (!c) return;
  toast('Cita: ' + c.paciente + ' a las ' + c.hora, 'info');
}

function guardarCita() {
  const pac = document.getElementById('mc-paciente').value.trim();
  const fecha = document.getElementById('mc-fecha').value;
  const hora = document.getElementById('mc-hora').value.trim();
  if (!pac || !fecha || !hora) { toast('Completa los campos obligatorios', 'warning'); return; }
  const nueva = {
    id: store.nextId++,
    paciente: pac, tipo: document.getElementById('mc-tipo').value,
    fecha, hora, duracion: document.getElementById('mc-duracion').value,
    estado: document.getElementById('mc-estado').value.toLowerCase()
  };
  store.citas.push(nueva);
  agregarActividad('teal', '📅', 'Cita agendada para <strong>' + pac + '</strong>', 'Ahora');
  closeModal('modal-cita');
  renderDashboard();
  if (document.getElementById('page-citas').classList.contains('active')) renderCitas();
  toast('Cita agendada correctamente');
}

function editarCita(id) {
  const c = store.citas.find(x => x.id === id);
  if (!c) return;
  document.getElementById('ec-id').value       = c.id;
  document.getElementById('ec-paciente').value = c.paciente;
  document.getElementById('ec-tipo').value     = c.tipo;
  document.getElementById('ec-fecha').value    = c.fecha;
  document.getElementById('ec-hora').value     = c.hora;
  document.getElementById('ec-duracion').value = c.duracion;
  document.getElementById('ec-estado').value   = capitalize(c.estado);
  clearFieldErrors('ec-paciente','ec-fecha','ec-hora');
  openModal('modal-editar-cita');
}
// ═══════════════════════════════════════════════
// NUEVO REGISTRO
// ═══════════════════════════════════════════════
function guardarRegistro() {
  const nombres = document.getElementById('f-nombres').value.trim();
  const apellidos = document.getElementById('f-apellidos').value.trim();
  const edad = document.getElementById('f-edad').value.trim();
  const motivo = document.getElementById('f-motivo').value.trim();
  if (!nombres || !apellidos || !edad || !motivo) { toast('Completa los campos obligatorios (*)', 'warning'); return; }
  const nuevo = {
    id: store.nextId++,
    nombres, apellidos, edad,
    tel: document.getElementById('f-tel').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    motivo,
    notas: document.getElementById('f-notas').value.trim(),
    fecha: document.getElementById('f-fecha').value || hoy(),
    estado: 'Activo'
  };
  store.pacientes.push(nuevo);
  agregarActividad('purple', '👤', 'Nuevo paciente <strong>' + nombres + ' ' + apellidos + '</strong> registrado', 'Ahora');
  renderDashboard();
  limpiarFormulario();
  toast('Registro guardado correctamente');
  setTimeout(() => navigateTo('historial'), 800);
}

function limpiarFormulario() {
  ['f-nombres','f-apellidos','f-edad','f-tel','f-email','f-motivo','f-notas'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('f-fecha').value = hoy();
}

// ═══════════════════════════════════════════════
// REPORTES
// ═══════════════════════════════════════════════
function renderReportes() {
  const total = store.pacientes.length;
  const conf = store.citas.filter(c => c.estado === 'confirmada').length;
  const pend = store.citas.filter(c => c.estado === 'pendiente').length;

  document.getElementById('rep-stats').innerHTML = `
    <div class="stat-card"><div class="stat-icon c-purple">👥</div><div class="stat-body"><div class="stat-value">${total}</div><div class="stat-label">Total pacientes</div></div></div>
    <div class="stat-card"><div class="stat-icon c-teal">✅</div><div class="stat-body"><div class="stat-value">${conf}</div><div class="stat-label">Citas confirmadas</div></div></div>
    <div class="stat-card"><div class="stat-icon c-amber">⏳</div><div class="stat-body"><div class="stat-value">${pend}</div><div class="stat-label">Citas pendientes</div></div></div>
    <div class="stat-card"><div class="stat-icon c-rose">📊</div><div class="stat-body"><div class="stat-value">${store.reportes}</div><div class="stat-label">Reportes generados</div></div></div>`;

  // simple bar chart
  const meses = ['Ene','Feb','Mar','Abr','May','Jun'];
  const vals = [2, 5, 8, 3, total, 6];
  const max = Math.max(...vals);
  document.getElementById('chart-area').innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:12px;height:120px;">
      ${meses.map((m,i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);">${vals[i]}</div>
          <div style="width:100%;background:${i===4?'var(--accent)':'var(--accent-soft)'};border-radius:6px 6px 0 0;height:${Math.round((vals[i]/max)*90)+10}px;transition:height .5s ease;"></div>
          <div style="font-size:11px;color:var(--text-muted);">${m}</div>
        </div>`).join('')}
    </div>`;

  renderProgBars('rep-prog', [
    { label:'Tasa de asistencia', val: Math.round(conf / Math.max(store.citas.length,1)*100), color:'var(--teal)' },
    { label:'Nuevos pacientes este mes', val: Math.min(Math.round(total/10*100),100), color:'var(--accent)' },
    { label:'Citas completadas', val: Math.round(conf / Math.max(store.citas.length,1)*100), color:'var(--amber)' },
  ]);
}

function generarReporte() {
  const { jsPDF } = window.jspdf;

  // 📅 MESES
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const conteoMeses = new Array(12).fill(0);

  // 📊 CONTAR PERSONAS POR MES (usa citas o pacientes)
  store.citas.forEach(c => {
    if (c.fecha) {
      const mes = new Date(c.fecha).getMonth();
      conteoMeses[mes]++;
    }
  });

  // 🎨 CREAR GRÁFICO LINEAL
  const canvas = document.getElementById('graficoPDF');
  const ctx = canvas.getContext('2d');

  if (window.miGrafico) {
    window.miGrafico.destroy();
  }

  window.miGrafico = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{
        label: 'Personas por mes',
        data: conteoMeses,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.2)',
        tension: 0.4, // curva suave 🔥
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // ⏳ Esperar render
  setTimeout(() => {
    const imgData = canvas.toDataURL('image/png');

    const doc = new jsPDF();

    // HEADER
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Reporte Mensual", 20, 18);

    // SUBTEXTO
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Cantidad de personas por mes", 20, 45);

    // 📈 GRÁFICO
    doc.addImage(imgData, 'PNG', 15, 55, 180, 100);

    // FOOTER
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Sistema PsiControl - Análisis mensual", 20, 285);

    // 💾 GUARDAR
    doc.save("reporte_mensual.pdf");

    // 🔁 tu lógica
    store.reportes++;
    agregarActividad('amber', '📊', 'Reporte mensual generado', 'Ahora');
    renderDashboard();
    toast('Reporte mensual con gráfico generado 📈');
    navigateTo('reportes');

  }, 500);
}
// ═══════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════
function cargarConfig() {
  document.getElementById('cfg-nombre').value = store.config.nombre;
  document.getElementById('cfg-psicologo').value = store.config.psicologo;
  document.getElementById('cfg-tel').value = store.config.tel;
  document.getElementById('cfg-email').value = store.config.email;
  document.getElementById('cfg-dir').value = store.config.dir;
}

function guardarConfig() {
  store.config = {
    nombre: document.getElementById('cfg-nombre').value,
    psicologo: document.getElementById('cfg-psicologo').value,
    tel: document.getElementById('cfg-tel').value,
    email: document.getElementById('cfg-email').value,
    dir: document.getElementById('cfg-dir').value,
  };
  toast('Configuración guardada');
}
function agregarActividad(tipo, icon, texto, tiempo) {
  store.actividad.unshift({ tipo, icon, texto, tiempo });
  if (store.actividad.length > 20) store.actividad.pop();
}
const searchInput = document.getElementById('global-search');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  if (!q) { searchResults.style.display = 'none'; return; }
  const res = store.pacientes.filter(p => (p.nombres + ' ' + p.apellidos).toLowerCase().includes(q) || p.motivo.toLowerCase().includes(q)).slice(0, 5);
  if (res.length === 0) { searchResults.style.display = 'none'; return; }
  searchResults.innerHTML = res.map(p =>
    `<div class="search-result-item" onclick="verPaciente(${p.id}); searchInput.value=''; searchResults.style.display='none';">
      <div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}" style="width:28px;height:28px;font-size:10px;">${initials(p.nombres+' '+p.apellidos)}</div>
      <div>
        <div>${p.nombres} ${p.apellidos}</div>
        <div class="sr-sub">${p.motivo}</div>
      </div>
    </div>`
  ).join('');
  searchResults.style.display = 'block';
});

document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target)) {
    searchResults.style.display = 'none';
  }
});

// Fix inline onclick in search results
document.getElementById('search-results').addEventListener('click', function(e) {
  const item = e.target.closest('.search-result-item');
  if (!item) return;
  searchInput.value = '';
  searchResults.style.display = 'none';
});

// NOTIFICACIONES
document.getElementById('notif-btn').addEventListener('click', function() {
  const pend = store.citas.filter(c => c.estado !== 'confirmada');
  if (pend.length > 0) {
    toast(pend.length + ' cita(s) pendientes de confirmar', 'info');
    document.getElementById('notif-dot').style.display = 'none';
  } else {
    toast('No tienes notificaciones pendientes', 'info');
  }
});

renderDashboard();
