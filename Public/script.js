// ═══════════════════════════════════════════════
// API BASE
// ═══════════════════════════════════════════════
const API = 'http://localhost:3000/api';

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
  } catch (err) {
    toast('Error de conexión: ' + err.message, 'warning');
    throw err;
  }
}

// ═══════════════════════════════════════════════
// DATA STORE
// ═══════════════════════════════════════════════
let store = {
  atenciones: [],
  estudiantes: [],
  actividad: [
    { tipo:'purple', icon:'📝', texto:'Sistema iniciado correctamente', tiempo:'Ahora' },
  ],
  reportes: 0,
  config: { nombre:'Consultorio PsiControl', psicologo:'Dra. Ana López', tel:'', email:'', dir:'' }
};

let citaFiltro = 'todas';

// ═══════════════════════════════════════════════
// CARGAR DATOS INICIALES
// ═══════════════════════════════════════════════
async function cargarDatos() {
  try {
    const [atenciones, estudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes`)
    ]);
    store.atenciones  = atenciones;
    store.estudiantes = estudiantes;
    renderDashboard();
    actualizarSelectEstudiantes();
  } catch (err) {
    console.error('Error cargando datos iniciales:', err);
  }
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
const pageLabels = {
  dashboard: 'Dashboard',
  historial: 'Historial de registros',
  citas:     'Atenciones',
  nuevo:     'Nueva atención',
  reportes:  'Reportes',
  config:    'Configuración'
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const navEl = document.querySelector('[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');
  document.getElementById('breadcrumb-text').textContent = pageLabels[page] || page;
  if (page === 'historial') renderHistorial();
  if (page === 'citas')     cargarYRenderCitas();
  if (page === 'reportes')  renderReportes();
  if (page === 'nuevo')     resetNuevaAtencion();
  if (page === 'config')    cargarConfig();
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
  const d = new Date(iso);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
}

function fmtHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function colorAvatar(nombre) {
  const cols = ['bg-purple','bg-teal','bg-amber','bg-rose','bg-slate'];
  let h = 0; for (let c of (nombre||'')) h = (h * 31 + c.charCodeAt(0)) % cols.length;
  return cols[h];
}

function initials(nombre) {
  const p = (nombre||'').trim().split(' ');
  return (p[0]?.[0] || '') + (p[1]?.[0] || '');
}

function estadoBadge(e) {
  const m = { activo:'c-teal', pendiente:'c-amber', cerrado:'c-rose', derivado:'c-rose' };
  return '<span class="appt-badge ' + (m[e] || 'c-amber') + '">' + capitalize(e) + '</span>';
}

function nivelBadge(n) {
  const map = { leve:'🟢', moderado:'🟡', grave:'🔴' };
  return `<span title="${n}">${map[n] || '⚪'}</span>`;
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
    actualizarSelectEstudiantes();
    cargarMotivosEnSelect('mc-motivo');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// Actualiza el <select> de estudiantes en el modal de sesión
function actualizarSelectEstudiantes() {
  const sel = document.getElementById('mc-paciente');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>' +
    store.estudiantes.map(e =>
      `<option value="${e.idestudiante}">${e.nombres} ${e.apellidos} — ${e.codigomatricula}</option>`
    ).join('');
}

// Carga motivos de consulta en cualquier select dado su id
async function cargarMotivosEnSelect(selectId) {
  try {
    const motivos = await apiFetch(`${API}/motivosconsulta`);
    const sel = document.getElementById(selectId);
    if (!sel) return motivos;
    sel.innerHTML = '<option value="">-- Selecciona --</option>' +
      motivos.map(m => `<option value="${m.idmotivo}">${m.descripcion || m.nombre || 'Motivo ' + m.idmotivo}</option>`).join('');
    return motivos;
  } catch (_) { return []; }
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  const now = new Date();
  const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('fecha-hoy').textContent = dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()] + ' de ' + now.getFullYear() + ' · Bienvenida';
  document.getElementById('fecha-citas-hoy').textContent = 'Hoy, ' + now.getDate() + ' de ' + meses[now.getMonth()];

  const pendientes = store.atenciones.filter(a => a.estado === 'pendiente').length;

  document.getElementById('stat-registros').textContent  = store.estudiantes.length;
  document.getElementById('stat-citas').textContent      = pendientes;
  document.getElementById('stat-pacientes').textContent  = store.estudiantes.length;
  document.getElementById('stat-reportes').textContent   = store.reportes;
  document.getElementById('stat-reg-delta').textContent  = '↑ ' + store.estudiantes.length + ' registros';
  document.getElementById('stat-cita-delta').textContent = '↑ ' + pendientes + ' pendientes';

  document.getElementById('badge-historial').textContent = store.estudiantes.length;
  document.getElementById('badge-citas').textContent     = pendientes;

  const apptEl = document.getElementById('appt-list-dash');
  const recientes = store.atenciones.slice(0, 4);
  if (recientes.length === 0) {
    apptEl.innerHTML = '<div class="empty-state"><div class="es-icon">📅</div><div class="es-text">No hay atenciones registradas</div></div>';
  } else {
    apptEl.innerHTML = recientes.map(a => {
      const hora = fmtHora(a.fechahora);
      const [h, m] = hora.split(':');
      const period = parseInt(h) < 12 ? 'am' : 'pm';
      const hr = parseInt(h) > 12 ? String(parseInt(h)-12).padStart(2,'0') + ':' + m : hora;
      return `<div class="appt-item" onclick="verAtencionDetalle(${a.idatencion})">
        <div class="appt-time"><div class="appt-hour">${hr}</div><div class="appt-period">${period}</div></div>
        <div class="appt-divider"></div>
        <div class="appt-avatar ${colorAvatar(a.paciente)}">${initials(a.paciente)}</div>
        <div class="appt-info">
          <div class="appt-name">${a.paciente}</div>
          <div class="appt-type">${a.motivoconsulta} · ${a.nivelatencion}</div>
        </div>
        ${estadoBadge(a.estado)}
      </div>`;
    }).join('');
  }

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

  const total = store.atenciones.length || 1;
  const conf  = store.atenciones.filter(a => a.estado === 'activo').length;
  const asist = Math.round((conf / total) * 100);
  renderProgBars('prog-wrap', [
    { label:'Atenciones activas',      val: asist, color:'var(--teal)' },
    { label:'Registros completados',   val: Math.min(Math.round(store.estudiantes.length / 20 * 100), 100), color:'var(--accent)' },
    { label:'Satisfacción general',    val: 91,    color:'var(--amber)' },
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
async function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';
  try {
    const lista = await apiFetch(`${API}/estudiantes`);
    store.estudiantes = lista;
    const filtrados = lista.filter(p => {
      const f = filtro.toLowerCase();
      return !f || (p.nombres + ' ' + p.apellidos).toLowerCase().includes(f) || p.codigomatricula.toLowerCase().includes(f);
    });
    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="es-icon">📭</div><div class="es-text">No se encontraron registros</div></div></td></tr>';
      return;
    }
    tbody.innerHTML = filtrados.map(p =>
      `<tr onclick="verEstudiante(${p.idestudiante})">
        <td><div class="td-name"><div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}">${initials(p.nombres+' '+p.apellidos)}</div>${p.nombres} ${p.apellidos}</div></td>
        <td>${p.codigomatricula}</td>
        <td>${p.telefono || '—'}</td>
        <td>${p.condicion || '—'}</td>
        <td>${fmtFecha(p.fechanac)}</td>
        <td><span class="appt-badge c-teal">${p.genero || '—'}</span></td>
      </tr>`
    ).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="es-icon">⚠️</div><div class="es-text">Error cargando datos</div></div></td></tr>';
  }
}

function filterHistorial() {
  renderHistorial(document.getElementById('hist-search').value);
}

function verEstudiante(id) {
  const p = store.estudiantes.find(x => x.idestudiante === id);
  if (!p) return;
  document.getElementById('mp-titulo').textContent = p.nombres + ' ' + p.apellidos;
  document.getElementById('mp-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Matrícula</div><div style="font-size:14px;font-weight:500;">${p.codigomatricula}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Teléfono</div><div style="font-size:14px;font-weight:500;">${p.telefono || '—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Género</div><div style="font-size:14px;font-weight:500;">${p.genero || '—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Fecha nacimiento</div><div style="font-size:14px;font-weight:500;">${fmtFecha(p.fechanac)}</div></div>
      <div style="grid-column:1/-1"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Condición</div><div style="font-size:14px;font-weight:500;">${p.condicion || '—'}</div></div>
    </div>
    <div style="margin-top:20px;display:flex;gap:8px;">
      <button class="btn-secondary" onclick="closeModal('modal-paciente')">Cerrar</button>
    </div>`;
  openModal('modal-paciente');
}

// ═══════════════════════════════════════════════
// ATENCIONES
// ═══════════════════════════════════════════════
async function cargarYRenderCitas() {
  try {
    const data = await apiFetch(`${API}/atenciones`);
    store.atenciones = data;
    renderCitas();
  } catch (err) {
    console.error('Error cargando atenciones:', err);
  }
}

function renderCitas() {
  const tbody = document.getElementById('citas-tbody');
  const lista = citaFiltro === 'todas'
    ? store.atenciones
    : store.atenciones.filter(a => a.estado === citaFiltro);

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">No hay atenciones para mostrar</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(a =>
    `<tr>
      <td>${fmtFecha(a.fechahora)}</td>
      <td style="font-weight:600;">${fmtHora(a.fechahora)}</td>
      <td>${a.motivoconsulta || '—'}</td>
      <td>${a.grado || '—'} ${a.seccion || ''}</td>
      <td>${nivelBadge(a.nivelatencion)}</td>
      <td>${estadoBadge(a.estado)}</td>
      <td><div class="td-name"><div class="td-avatar ${colorAvatar(a.paciente)}">${initials(a.paciente)}</div>${a.paciente}</div></td>
      <td>
        <div class="td-actions">
          ${a.estado !== 'activo' ? `<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--teal);border-color:var(--teal);" onclick="confirmarAtencion(${a.idatencion})">Confirmar</button>` : ''}
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="cerrarAtencion(${a.idatencion})">Cerrar</button>
        </div>
      </td>
    </tr>`
  ).join('');
}

function filterCitas(tipo) {
  citaFiltro = tipo;
  renderCitas();
}

async function confirmarAtencion(id) {
  try {
    const atencion = store.atenciones.find(a => a.idatencion === id);
    if (!atencion) return;
    await apiFetch(`${API}/atenciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...atencion, estado: 'activo' })
    });
    agregarActividad('teal', '✅', `Atención de <strong>${atencion.paciente}</strong> confirmada`, 'Ahora');
    await cargarYRenderCitas();
    renderDashboard();
    toast('Atención confirmada correctamente');
  } catch (err) {
    console.error('Error confirmando atención:', err);
  }
}

async function cerrarAtencion(id) {
  if (!confirm('¿Cerrar esta atención?')) return;
  try {
    const atencion = store.atenciones.find(a => a.idatencion === id);
    await apiFetch(`${API}/atenciones/${id}`, { method: 'DELETE' });
    agregarActividad('rose', '🔒', `Atención de <strong>${atencion?.paciente}</strong> cerrada`, 'Ahora');
    await cargarYRenderCitas();
    renderDashboard();
    toast('Atención cerrada correctamente', 'warning');
  } catch (err) {
    console.error('Error cerrando atención:', err);
  }
}

function verAtencionDetalle(id) {
  const a = store.atenciones.find(x => x.idatencion === id);
  if (!a) return;
  toast(`${a.paciente} · ${fmtFecha(a.fechahora)} ${fmtHora(a.fechahora)}`, 'info');
}

// ═══════════════════════════════════════════════
// GUARDAR SESIÓN (modal de atenciones existentes)
// ═══════════════════════════════════════════════
async function guardarCita() {
  const idestudiante  = document.getElementById('mc-paciente').value.trim();
  const fecha         = document.getElementById('mc-fecha').value;
  const hora          = document.getElementById('mc-hora').value.trim();
  const tipo          = document.getElementById('mc-tipo').value;
  const estado        = document.getElementById('mc-estado').value.toLowerCase();
  const nivelatencion = document.getElementById('mc-prioridad').value === 'alta' ? 'grave'
                      : document.getElementById('mc-prioridad').value === 'media' ? 'moderado' : 'leve';

  if (!idestudiante || !fecha || !hora) {
    toast('Completa los campos obligatorios', 'warning');
    return;
  }

  let idmotivo = 1;
  try {
    const motivos = await apiFetch(`${API}/motivosconsulta`);
    const selMotivo = document.getElementById('mc-motivo').value;
    idmotivo = selMotivo ? parseInt(selMotivo) : (motivos[0]?.idmotivo || 1);
  } catch (_) {}

  const fechahora = `${fecha} ${hora}:00`;

  try {
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante: parseInt(idestudiante),
        fechahora, nivelatencion, idmotivo, estado,
        grado: document.getElementById('mc-grado').value || null,
        seccion: null,
        observaciones: document.getElementById('mc-observaciones').value || tipo,
        idespecialista: null,
        idprofesor: null
      })
    });

    const est = store.estudiantes.find(e => e.idestudiante === parseInt(idestudiante));
    const nombre = est ? `${est.nombres} ${est.apellidos}` : 'Estudiante';
    agregarActividad('teal', '📅', `Sesión agendada para <strong>${nombre}</strong>`, 'Ahora');
    closeModal('modal-cita');
    await cargarDatos();
    renderCitas();
    toast('Sesión registrada correctamente');
  } catch (err) {
    console.error('Error guardando sesión:', err);
  }
}

// ═══════════════════════════════════════════════
// NUEVA ATENCIÓN — PASO A PASO
// ═══════════════════════════════════════════════

// Reinicia el formulario cuando se entra a la página
function resetNuevaAtencion() {
  // Limpiar paso 1
  ['na-nombres','na-apellidos','na-matricula','na-telefono',
   'na-fechanac','na-grado','na-condicion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('na-genero').value = '';
  // Limpiar paso 2
  ['na-fecha','na-hora','na-observaciones'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('na-fecha').value = hoy();
  document.getElementById('na-nivel').value = 'moderado';
  // Mostrar paso 1, ocultar paso 2
  document.getElementById('paso-1').style.display = '';
  document.getElementById('paso-2').style.display = 'none';
  // Indicadores
  document.getElementById('paso-ind-1').className = 'paso-item active';
  document.getElementById('paso-ind-2').className = 'paso-item';
  document.getElementById('paso-linea').className = 'paso-linea';
  // Cargar motivos en el select del paso 2
  cargarMotivosEnSelect('na-motivo');
}

// Pasar al paso 2 validando datos del estudiante
function irPaso2() {
  const nombres   = document.getElementById('na-nombres').value.trim();
  const apellidos = document.getElementById('na-apellidos').value.trim();

 if (!nombres || !apellidos) {
  toast('Completa los campos obligatorios: nombres y apellidos', 'warning');
  return;
}

  // Actualizar indicadores visuales
  document.getElementById('paso-ind-1').className = 'paso-item done';
  document.getElementById('paso-ind-2').className = 'paso-item active';
  document.getElementById('paso-linea').className = 'paso-linea done';

  // Mostrar nombre del estudiante en subtítulo
  document.getElementById('paso2-subtitulo').textContent =
    `Estudiante: ${nombres} ${apellidos}`;

  // Ocultar paso 1, mostrar paso 2
  document.getElementById('paso-1').style.display = 'none';
  document.getElementById('paso-2').style.display = '';

  // Scroll al inicio
  document.querySelector('.content').scrollTo({ top: 0, behavior: 'smooth' });
}

// Volver al paso 1
function volverPaso1() {
  document.getElementById('paso-1').style.display = '';
  document.getElementById('paso-2').style.display = 'none';
  document.getElementById('paso-ind-1').className = 'paso-item active';
  document.getElementById('paso-ind-2').className = 'paso-item';
  document.getElementById('paso-linea').className = 'paso-linea';
}

// Guardar estudiante + primera sesión
async function guardarNuevaAtencion() {
  const nombres    = document.getElementById('na-nombres').value.trim();
  const apellidos  = document.getElementById('na-apellidos').value.trim();
  const telefono   = document.getElementById('na-telefono').value.trim();
  const fechanac   = document.getElementById('na-fechanac').value;
  const genero     = document.getElementById('na-genero').value;
  const grado      = document.getElementById('na-grado').value.trim();
  const condicion  = document.getElementById('na-condicion').value.trim();

  const idmotivoSel   = document.getElementById('na-motivo').value;
  const nivelatencion = document.getElementById('na-nivel').value;
  const fecha         = document.getElementById('na-fecha').value;
  const hora          = document.getElementById('na-hora').value;
  const observaciones = document.getElementById('na-observaciones').value.trim();

  if (!fecha || !hora) {
    toast('Indica la fecha y hora de la primera sesión', 'warning');
    return;
  }
  if (!idmotivoSel) {
    toast('Selecciona el motivo de consulta', 'warning');
    return;
  }

  try {
    // 1. Registrar estudiante
    const nuevoEst = await apiFetch(`${API}/estudiantes`, {
      method: 'POST',
      body: JSON.stringify({
        nombres, apellidos,
        codigomatricula: null,
        telefono:  telefono  || null,
        fechanac:  fechanac  || null,
        genero:    genero    || null,
        condicion: condicion || null,
      })
    });

    const idestudiante = nuevoEst.idestudiante || nuevoEst.id;
    agregarActividad('purple', '👤', `Estudiante <strong>${nombres} ${apellidos}</strong> registrado`, 'Ahora');

    // 2. Registrar primera sesión
    const fechahora = `${fecha} ${hora}:00`;
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante: parseInt(idestudiante),
        fechahora,
        nivelatencion,
        idmotivo: parseInt(idmotivoSel),
        estado: 'pendiente',
        grado: grado || null,
        seccion: null,
        observaciones: observaciones || null,
        idespecialista: null,
        idprofesor: null
      })
    });

    agregarActividad('teal', '📅', `Primera sesión registrada para <strong>${nombres} ${apellidos}</strong>`, 'Ahora');

    // 3. Recargar datos y navegar al historial
    await cargarDatos();
    toast(`✓ ${nombres} ${apellidos} registrado con primera sesión`);
    navigateTo('historial');

  } catch (err) {
    console.error('Error en nueva atención:', err);
  }
}

// ═══════════════════════════════════════════════
// REPORTES
// ═══════════════════════════════════════════════
function renderReportes() {
  const total    = store.estudiantes.length;
  const activos  = store.atenciones.filter(a => a.estado === 'activo').length;
  const pend     = store.atenciones.filter(a => a.estado === 'pendiente').length;
  const cerrados = store.atenciones.filter(a => a.estado === 'cerrado').length;

  document.getElementById('rep-stats').innerHTML = `
    <div class="stat-card"><div class="stat-icon c-purple">👥</div><div class="stat-body"><div class="stat-value">${total}</div><div class="stat-label">Total estudiantes</div></div></div>
    <div class="stat-card"><div class="stat-icon c-teal">✅</div><div class="stat-body"><div class="stat-value">${activos}</div><div class="stat-label">Atenciones activas</div></div></div>
    <div class="stat-card"><div class="stat-icon c-amber">⏳</div><div class="stat-body"><div class="stat-value">${pend}</div><div class="stat-label">Pendientes</div></div></div>
    <div class="stat-card"><div class="stat-icon c-rose">📊</div><div class="stat-body"><div class="stat-value">${cerrados}</div><div class="stat-label">Cerradas</div></div></div>`;

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const vals  = new Array(12).fill(0);
  store.atenciones.forEach(a => {
    if (a.fechahora) vals[new Date(a.fechahora).getMonth()]++;
  });
  const max = Math.max(...vals, 1);
  document.getElementById('chart-area').innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:12px;height:120px;">
      ${meses.map((m,i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="font-size:11px;font-weight:600;color:var(--text-secondary);">${vals[i]}</div>
          <div style="width:100%;background:${vals[i]>0?'var(--accent)':'var(--accent-soft)'};border-radius:6px 6px 0 0;height:${Math.round((vals[i]/max)*90)+10}px;transition:height .5s ease;"></div>
          <div style="font-size:11px;color:var(--text-muted);">${m}</div>
        </div>`).join('')}
    </div>`;

  renderProgBars('rep-prog', [
    { label:'Tasa de atención activa',  val: Math.round(activos / Math.max(store.atenciones.length,1)*100), color:'var(--teal)' },
    { label:'Cobertura de estudiantes', val: Math.min(Math.round(total/20*100),100), color:'var(--accent)' },
    { label:'Atenciones cerradas',      val: Math.round(cerrados / Math.max(store.atenciones.length,1)*100), color:'var(--amber)' },
  ]);
}

function generarReporte() {
  const { jsPDF } = window.jspdf;
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const conteoMeses = new Array(12).fill(0);
  store.atenciones.forEach(a => {
    if (a.fechahora) conteoMeses[new Date(a.fechahora).getMonth()]++;
  });

  const canvas = document.getElementById('graficoPDF');
  const ctx = canvas.getContext('2d');
  if (window.miGrafico) window.miGrafico.destroy();
  window.miGrafico = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{ label: 'Atenciones por mes', data: conteoMeses, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.2)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#6366f1' }]
    },
    options: { responsive: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
  });

  setTimeout(() => {
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF();
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Reporte Mensual - PsiControl', 20, 18);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Atenciones por mes', 20, 45);
    doc.addImage(imgData, 'PNG', 15, 55, 180, 100);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Sistema PsiControl - Análisis mensual', 20, 285);
    doc.save('reporte_mensual.pdf');
    store.reportes++;
    agregarActividad('amber', '📊', 'Reporte mensual generado', 'Ahora');
    renderDashboard();
    toast('Reporte generado correctamente 📈');
    navigateTo('reportes');
  }, 500);
}

// ═══════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════
function cargarConfig() {
  document.getElementById('cfg-nombre').value    = store.config.nombre;
  document.getElementById('cfg-psicologo').value = store.config.psicologo;
  document.getElementById('cfg-tel').value       = store.config.tel;
  document.getElementById('cfg-email').value     = store.config.email;
  document.getElementById('cfg-dir').value       = store.config.dir;
}

function guardarConfig() {
  store.config = {
    nombre:     document.getElementById('cfg-nombre').value,
    psicologo:  document.getElementById('cfg-psicologo').value,
    tel:        document.getElementById('cfg-tel').value,
    email:      document.getElementById('cfg-email').value,
    dir:        document.getElementById('cfg-dir').value,
  };
  toast('Configuración guardada');
}

// ═══════════════════════════════════════════════
// ACTIVIDAD
// ═══════════════════════════════════════════════
function agregarActividad(tipo, icon, texto, tiempo) {
  store.actividad.unshift({ tipo, icon, texto, tiempo });
  if (store.actividad.length > 20) store.actividad.pop();
}

// ═══════════════════════════════════════════════
// BÚSQUEDA GLOBAL
// ═══════════════════════════════════════════════
const searchInput   = document.getElementById('global-search');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  if (!q) { searchResults.style.display = 'none'; return; }
  const res = store.estudiantes.filter(p =>
    (p.nombres + ' ' + p.apellidos).toLowerCase().includes(q) ||
    p.codigomatricula.toLowerCase().includes(q)
  ).slice(0, 5);
  if (res.length === 0) { searchResults.style.display = 'none'; return; }
  searchResults.innerHTML = res.map(p =>
    `<div class="search-result-item" onclick="verEstudiante(${p.idestudiante})">
      <div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}" style="width:28px;height:28px;font-size:10px;">${initials(p.nombres+' '+p.apellidos)}</div>
      <div>
        <div>${p.nombres} ${p.apellidos}</div>
        <div class="sr-sub">${p.codigomatricula}</div>
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

// ═══════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════
document.getElementById('notif-btn').addEventListener('click', function() {
  const pend = store.atenciones.filter(a => a.estado === 'pendiente');
  if (pend.length > 0) {
    toast(pend.length + ' atención(es) pendientes de confirmar', 'info');
    document.getElementById('notif-dot').style.display = 'none';
  } else {
    toast('No tienes notificaciones pendientes', 'info');
  }
});

// ═══════════════════════════════════════════════
// HORARIO
// ═══════════════════════════════════════════════
const days = [
  { key:'lun', label:'Lunes',     active:true,  from:'08:00', to:'17:00' },
  { key:'mar', label:'Martes',    active:true,  from:'08:00', to:'17:00' },
  { key:'mie', label:'Miércoles', active:true,  from:'08:00', to:'17:00' },
  { key:'jue', label:'Jueves',    active:true,  from:'08:00', to:'17:00' },
  { key:'vie', label:'Viernes',   active:true,  from:'08:00', to:'14:00' },
  { key:'sab', label:'Sábado',    active:false, from:'09:00', to:'12:00' },
  { key:'dom', label:'Domingo',   active:false, from:'09:00', to:'12:00' },
];

function buildSchedule() {
  const wrap = document.getElementById('schedule-rows');
  if (!wrap) return;
  wrap.innerHTML = days.map((d, i) => `
    <div class="schedule-row" style="background:${i%2===0?'var(--bg)':'transparent'};border-radius:8px;padding:4px 0;">
      <span class="day-label">${d.label}</span>
      <input type="time" value="${d.from}" id="from-${d.key}" style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <input type="time" value="${d.to}"   id="to-${d.key}"   style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <div class="toggle-switch ${d.active?'on':''}" id="tog-${d.key}" onclick="toggleDay('${d.key}',${i})"></div>
    </div>
  `).join('');
}

function toggleDay(key, i) {
  days[i].active = !days[i].active;
  const tog  = document.getElementById('tog-'+key);
  const from = document.getElementById('from-'+key);
  const to   = document.getElementById('to-'+key);
  tog.classList.toggle('on', days[i].active);
  [from, to].forEach(el => {
    el.style.opacity       = days[i].active ? '1' : '.35';
    el.style.pointerEvents = days[i].active ? '' : 'none';
  });
}

buildSchedule();

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
cargarDatos();