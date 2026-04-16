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
    store.atenciones  = atenciones || [];
    store.estudiantes = estudiantes || [];
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
  // Ocultar todas las páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  // Mostrar página seleccionada
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  
  // Activar navegación
  const navEl = document.querySelector('[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');
  
  // Actualizar breadcrumb
  const breadcrumb = document.getElementById('breadcrumb-text');
  if (breadcrumb) breadcrumb.textContent = pageLabels[page] || page;
  
  // Renderizar contenido específico
  switch(page) {
    case 'historial': renderHistorial(); break;
    case 'citas':     cargarYRenderCitas(); break;
    case 'reportes':  renderReportes(); break;
    case 'nuevo':     resetNuevaAtencion(); break;
    case 'config':    cargarConfig(); break;
  }
  
  // Limpiar búsqueda
  const searchInput = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  if (searchInput) searchInput.value = '';
  if (searchResults) searchResults.style.display = 'none';
}

// Event listeners para navegación
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
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
  let h = 0; 
  for (let c of (nombre||'')) h = (h * 31 + c.charCodeAt(0)) % cols.length;
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

function capitalize(s) { 
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; 
}

async function validarHorarioUnico(fecha, hora) {
  try {
    const fechahora = `${fecha}T${hora}:00`;
    const response = await fetch(`${API}/atenciones/check-horario?fechahora=${fechahora}`);
    const data = await response.json();
    return data.disponible; // true si está disponible, false si ya existe
  } catch (err) {
    console.error('Error validando horario:', err);
    return false;
  }
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function toast(msg, tipo = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${tipo}`;
  toastEl.textContent = msg;
  container.appendChild(toastEl);
  
  setTimeout(() => {
    if (toastEl.parentNode) toastEl.remove();
  }, 3000);
}

// ═══════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
  
  if (id === 'modal-cita') {
    const fechaEl = document.getElementById('mc-fecha');
    if (fechaEl) fechaEl.value = hoy();
    actualizarSelectEstudiantes();
    cargarMotivosEnSelect('mc-motivo');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// Event listeners para modals
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { 
      if (e.target === overlay) overlay.classList.remove('open'); 
    });
  });
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
    if (!sel) return motivos || [];
    
    sel.innerHTML = '<option value="">-- Selecciona --</option>' +
      (motivos || []).map(m => 
        `<option value="${m.idmotivo}">${m.descripcion || m.nombre || 'Motivo ' + m.idmotivo}</option>`
      ).join('');
    return motivos || [];
  } catch (err) { 
    console.error('Error cargando motivos:', err);
    return []; 
  }
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  const now = new Date();
  const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  
  const fechaHoyEl = document.getElementById('fecha-hoy');
  const fechaCitasEl = document.getElementById('fecha-citas-hoy');
  if (fechaHoyEl) fechaHoyEl.textContent = dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()] + ' de ' + now.getFullYear() + ' · Bienvenida';
  if (fechaCitasEl) fechaCitasEl.textContent = 'Hoy, ' + now.getDate() + ' de ' + meses[now.getMonth()];

  const pendientes = store.atenciones.filter(a => a.estado === 'pendiente').length;

  const statElements = {
    'stat-registros': store.estudiantes.length,
    'stat-citas': pendientes,
    'stat-pacientes': store.estudiantes.length,
    'stat-reportes': store.reportes,
    'stat-reg-delta': '↑ ' + store.estudiantes.length + ' registros',
    'stat-cita-delta': '↑ ' + pendientes + ' pendientes',
    'badge-historial': store.estudiantes.length,
    'badge-citas': pendientes
  };

  Object.entries(statElements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const apptEl = document.getElementById('appt-list-dash');
  if (apptEl) {
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
  }

  const actEl = document.getElementById('activity-feed');
  if (actEl) {
    actEl.innerHTML = store.actividad.slice(0, 5).map(a =>
      `<div class="activity-item">
        <div class="act-dot c-${a.tipo}">${a.icon}</div>
        <div class="act-body">
          <div class="act-text">${a.texto}</div>
          <div class="act-time">${a.tiempo}</div>
        </div>
      </div>`
    ).join('');
  }

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
  const container = document.getElementById(id);
  if (!container) return;
  
  container.innerHTML = items.map(i =>
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
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';
  
  try {
    const lista = store.estudiantes.length > 0 ? store.estudiantes : await apiFetch(`${API}/estudiantes`);
    store.estudiantes = lista || [];
    
    const filtrados = lista.filter(p => {
      const f = filtro.toLowerCase();
      return !f || 
        (p.nombres + ' ' + p.apellidos).toLowerCase().includes(f) || 
        p.codigomatricula?.toLowerCase().includes(f);
    });
    
    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="es-icon">📭</div><div class="es-text">No se encontraron registros</div></div></td></tr>';
      return;
    }
    
    tbody.innerHTML = filtrados.map(p =>
      `<tr onclick="verEstudiante(${p.idestudiante})">
        <td><div class="td-name"><div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}">${initials(p.nombres+' '+p.apellidos)}</div>${p.nombres} ${p.apellidos}</div></td>
        <td>${p.codigomatricula || '—'}</td>
        <td>${p.telefono || '—'}</td>
        <td>${p.condicion || '—'}</td>
        <td>${fmtFecha(p.fechanac)}</td>
        <td><span class="appt-badge c-teal">${p.genero || '—'}</span></td>
      </tr>`
    ).join('');
  } catch (err) {
    console.error('Error renderizando historial:', err);
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="es-icon">⚠️</div><div class="es-text">Error cargando datos</div></div></td></tr>';
  }
}

function filterHistorial() {
  const searchEl = document.getElementById('hist-search');
  if (searchEl) renderHistorial(searchEl.value);
}

function verEstudiante(id) {
  const p = store.estudiantes.find(x => x.idestudiante == id);
  if (!p) return;
  
  const tituloEl = document.getElementById('mp-titulo');
  const bodyEl = document.getElementById('mp-body');
  if (!tituloEl || !bodyEl) return;
  
  tituloEl.textContent = p.nombres + ' ' + p.apellidos;
  bodyEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">Matrícula</div><div style="font-size:14px;font-weight:500;">${p.codigomatricula || '—'}</div></div>
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
    store.atenciones = data || [];
    renderCitas();
  } catch (err) {
    console.error('Error cargando atenciones:', err);
    renderCitas(); // Renderiza con datos existentes
  }
}

function renderCitas() {
  const tbody = document.getElementById('citas-tbody');
  if (!tbody) return;
  
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
    const atencion = store.atenciones.find(a => a.idatencion == id);
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
    const atencion = store.atenciones.find(a => a.idatencion == id);
    if (!atencion) return;
    
    await apiFetch(`${API}/atenciones/${id}`, { method: 'DELETE' });
    agregarActividad('rose', '🔒', `Atención de <strong>${atencion.paciente}</strong> cerrada`, 'Ahora');
    await cargarYRenderCitas();
    renderDashboard();
    toast('Atención cerrada correctamente', 'warning');
  } catch (err) {
    console.error('Error cerrando atención:', err);
  }
}

function verAtencionDetalle(id) {
  const a = store.atenciones.find(x => x.idatencion == id);
  if (!a) return;
  toast(`${a.paciente} · ${fmtFecha(a.fechahora)} ${fmtHora(a.fechahora)}`, 'info');
}

// ═══════════════════════════════════════════════
// GUARDAR SESIÓN (modal de atenciones existentes)
// ═══════════════════════════════════════════════
async function guardarCita() {
  const idestudiante  = document.getElementById('mc-paciente')?.value?.trim();
  const fecha         = document.getElementById('mc-fecha')?.value;
  const hora          = document.getElementById('mc-hora')?.value?.trim();
  const tipo          = document.getElementById('mc-tipo')?.value;
  const estado        = document.getElementById('mc-estado')?.value?.toLowerCase();
  const prioridadEl   = document.getElementById('mc-prioridad');
  const nivelatencion = prioridadEl?.value === 'alta' ? 'grave'
                      : prioridadEl?.value === 'media' ? 'moderado' : 'leve';

  if (!idestudiante || !fecha || !hora) {
    toast('Completa los campos obligatorios', 'warning');
    return;
  }

  const disponible = await validarHorarioUnico(fecha, hora);
  if (!disponible) {
    toast('❌ Este horario ya está ocupado. Elige otra hora.', 'warning');
    document.getElementById('mc-hora').focus();
    return;
  }

  let idmotivo = 1;
  try {
    const motivos = await apiFetch(`${API}/motivosconsulta`);
    const selMotivo = document.getElementById('mc-motivo')?.value;
    idmotivo = selMotivo ? parseInt(selMotivo) : (motivos[0]?.idmotivo || 1);
  } catch (_) {}

  const fechahora = `${fecha}T${hora}:00`;

  try {
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante: parseInt(idestudiante),
        fechahora, 
        nivelatencion, 
        idmotivo, 
        estado: estado || 'pendiente',
        grado: document.getElementById('mc-grado')?.value || null,
        seccion: null,
        observaciones: document.getElementById('mc-observaciones')?.value || tipo,
        idespecialista: null,
        idprofesor: null
      })
    });

    const est = store.estudiantes.find(e => e.idestudiante == parseInt(idestudiante));
    const nombre = est ? `${est.nombres} ${est.apellidos}` : 'Estudiante';
    agregarActividad('teal', '📅', `Sesión agendada para <strong>${nombre}</strong>`, 'Ahora');
    
    closeModal('modal-cita');
    await cargarDatos();
    renderCitas();
    toast('✅ Sesión registrada correctamente');
  } catch (err) {
    console.error('Error guardando sesión:', err);
    toast('Error al guardar. Intenta de nuevo.', 'warning');
  }
}

// ═══════════════════════════════════════════════
// NUEVA ATENCIÓN — PASO A PASO
// ═══════════════════════════════════════════════
function resetNuevaAtencion() {
  // Limpiar paso 1
  ['na-nombres','na-apellidos','na-matricula','na-telefono','na-fechanac','na-grado','na-condicion']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    
  const generoEl = document.getElementById('na-genero');
  if (generoEl) generoEl.value = '';
  
  // Limpiar paso 2
  ['na-fecha','na-hora','na-observaciones'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  const fechaEl = document.getElementById('na-fecha');
  if (fechaEl) fechaEl.value = hoy();
  
  const nivelEl = document.getElementById('na-nivel');
  if (nivelEl) nivelEl.value = 'moderado';
  
  // Mostrar paso 1, ocultar paso 2
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  if (paso1) paso1.style.display = '';
  if (paso2) paso2.style.display = 'none';
  
  // Indicadores
  const ind1 = document.getElementById('paso-ind-1');
  const ind2 = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');
  if (ind1) ind1.className = 'paso-item active';
  if (ind2) ind2.className = 'paso-item';
  if (linea) linea.className = 'paso-linea';
  
  // Cargar motivos
  cargarMotivosEnSelect('na-motivo');
}

function irPaso2() {
  const nombresEl = document.getElementById('na-nombres');
  const apellidosEl = document.getElementById('na-apellidos');
  
  const nombres   = nombresEl?.value?.trim();
  const apellidos = apellidosEl?.value?.trim();

  if (!nombres || !apellidos) {
    toast('Completa los campos obligatorios: nombres y apellidos', 'warning');
    return;
  }

  // Actualizar indicadores visuales
  const ind1 = document.getElementById('paso-ind-1');
  const ind2 = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');
  const subtitulo = document.getElementById('paso2-subtitulo');
  
  if (ind1) ind1.className = 'paso-item done';
  if (ind2) ind2.className = 'paso-item active';
  if (linea) linea.className = 'paso-linea done';
  if (subtitulo) subtitulo.textContent = `Estudiante: ${nombres} ${apellidos}`;

  // Mostrar/ocultar pasos
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  if (paso1) paso1.style.display = 'none';
  if (paso2) paso2.style.display = '';

  // Scroll al inicio
  const content = document.querySelector('.content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function volverPaso1() {
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  const ind1 = document.getElementById('paso-ind-1');
  const ind2 = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');
  
  if (paso1) paso1.style.display = '';
  if (paso2) paso2.style.display = 'none';
  if (ind1) ind1.className = 'paso-item active';
  if (ind2) ind2.className = 'paso-item';
  if (linea) linea.className = 'paso-linea';
}

async function guardarNuevaAtencion() {
  const nombres    = document.getElementById('na-nombres')?.value?.trim();
  const apellidos  = document.getElementById('na-apellidos')?.value?.trim();
  const telefono   = document.getElementById('na-telefono')?.value?.trim();
  const fechanac   = document.getElementById('na-fechanac')?.value;
  const genero     = document.getElementById('na-genero')?.value;
  const grado      = document.getElementById('na-grado')?.value?.trim();
  const condicion  = document.getElementById('na-condicion')?.value?.trim();
  const idmotivoSel= document.getElementById('na-motivo')?.value;
  const nivelatencion = document.getElementById('na-nivel')?.value;
  const fecha      = document.getElementById('na-fecha')?.value;
  const hora       = document.getElementById('na-hora')?.value;
  const observaciones = document.getElementById('na-observaciones')?.value?.trim();

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
        telefono: telefono || null,
        fechanac: fechanac || null,
        genero: genero || null,
        condicion: condicion || null,
      })
    });

    const idestudiante = nuevoEst.idestudiante || nuevoEst.id;
    agregarActividad('purple', '👤', `Estudiante <strong>${nombres} ${apellidos}</strong> registrado`, 'Ahora');

    // 2. Registrar primera sesión
    const fechahora = `${fecha}T${hora}:00`;
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

    // 3. Recargar datos y navegar
    await cargarDatos();
    toast(`✓ ${nombres} ${apellidos} registrado con primera sesión`);
    navigateTo('historial');

  } catch (err) {
    console.error('Error en nueva atención:', err);
    toast('Error al registrar. Verifica los datos.', 'warning');
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

  const statsEl = document.getElementById('rep-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon c-purple">👥</div><div class="stat-body"><div class="stat-value">${total}</div><div class="stat-label">Total estudiantes</div></div></div>
      <div class="stat-card"><div class="stat-icon c-teal">✅</div><div class="stat-body"><div class="stat-value">${activos}</div><div class="stat-label">Atenciones activas</div></div></div>
      <div class="stat-card"><div class="stat-icon c-amber">⏳</div><div class="stat-body"><div class="stat-value">${pend}</div><div class="stat-label">Pendientes</div></div></div>
      <div class="stat-card"><div class="stat-icon c-rose">📊</div><div class="stat-body"><div class="stat-value">${cerrados}</div><div class="stat-label">Cerradas</div></div></div>`;
  }

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const vals  = new Array(12).fill(0);
  store.atenciones.forEach(a => {
    if (a.fechahora) {
      const mes = new Date(a.fechahora).getMonth();
      vals[mes]++;
    }
  });
  
  const max = Math.max(...vals, 1);
  const chartEl = document.getElementById('chart-area');
  if (chartEl) {
    chartEl.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:12px;height:120px;">
        ${meses.map((m,i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-secondary);">${vals[i]}</div>
            <div style="width:100%;background:${vals[i]>0?'var(--accent)':'var(--accent-soft)'};border-radius:6px 6px 0 0;height:${Math.round((vals[i]/max)*90)+10}px;transition:height .5s ease;"></div>
            <div style="font-size:11px;color:var(--text-muted);">${m}</div>
          </div>`).join('')}
      </div>`;
  }

  renderProgBars('rep-prog', [
    { label:'Tasa de atención activa',  val: Math.round(activos / Math.max(store.atenciones.length,1)*100), color:'var(--teal)' },
    { label:'Cobertura de estudiantes', val: Math.min(Math.round(total/20*100),100), color:'var(--accent)' },
    { label:'Atenciones cerradas',      val: Math.round(cerrados / Math.max(store.atenciones.length,1)*100), color:'var(--amber)' },
  ]);
}

async function generarReporte() {
  if (typeof window.jspdf === 'undefined') {
    toast('jsPDF no está cargado. Verifica la librería.', 'warning');
    return;
  }

  const { jsPDF } = window.jspdf;
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const conteoMeses = new Array(12).fill(0);
  
  store.atenciones.forEach(a => {
    if (a.fechahora) conteoMeses[new Date(a.fechahora).getMonth()]++;
  });

  const canvas = document.getElementById('graficoPDF');
  if (!canvas) {
    toast('Canvas no encontrado para generar gráfico', 'warning');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (window.miGrafico) window.miGrafico.destroy();
  
  window.miGrafico = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{ 
        label: 'Atenciones por mes', 
        data: conteoMeses, 
        borderColor: '#6366f1', 
        backgroundColor: 'rgba(99,102,241,0.2)', 
        tension: 0.4, 
        fill: true, 
        pointRadius: 4, 
        pointBackgroundColor: '#6366f1' 
      }]
    },
    options: { 
      responsive: false, 
      plugins: { legend: { display: true } }, 
      scales: { y: { beginAtZero: true } } 
    }
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
  const configFields = {
    'cfg-nombre': 'nombre',
    'cfg-psicologo': 'psicologo',
    'cfg-tel': 'tel',
    'cfg-email': 'email',
    'cfg-dir': 'dir'
  };
  
  Object.entries(configFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = store.config[key] || '';
  });
}

function guardarConfig() {
  const configFields = {
    'cfg-nombre': 'nombre',
    'cfg-psicologo': 'psicologo',
    'cfg-tel': 'tel',
    'cfg-email': 'email',
    'cfg-dir': 'dir'
  };
  
  store.config = {};
  Object.entries(configFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) store.config[key] = el.value;
  });
  
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
let searchTimeout;
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performGlobalSearch(this.value, searchResults), 300);
    });
  }
});

function performGlobalSearch(q, searchResultsEl) {
  const query = q?.trim().toLowerCase() || '';
  if (!query) { 
    if (searchResultsEl) searchResultsEl.style.display = 'none'; 
    return; 
  }
  
  const res = store.estudiantes.filter(p =>
    (p.nombres + ' ' + p.apellidos).toLowerCase().includes(query) ||
    p.codigomatricula?.toLowerCase().includes(query)
  ).slice(0, 5);
  
  if (res.length === 0 || !searchResultsEl) { 
    searchResultsEl.style.display = 'none'; 
    return; 
  }
  
  searchResultsEl.innerHTML = res.map(p =>
    `<div class="search-result-item" onclick="verEstudiante(${p.idestudiante})">
      <div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}" style="width:28px;height:28px;font-size:10px;">${initials(p.nombres+' '+p.apellidos)}</div>
      <div>
        <div>${p.nombres} ${p.apellidos}</div>
        <div class="sr-sub">${p.codigomatricula}</div>
      </div>
    </div>`
  ).join('');
  
  searchResultsEl.style.display = 'block';
}

document.addEventListener('click', function(e) {
  const searchWrap = document.getElementById('search-wrap');
  const searchResults = document.getElementById('search-results');
  if (searchWrap && !searchWrap.contains(e.target) && searchResults) {
    searchResults.style.display = 'none';
  }
});

// ═══════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  const notifBtn = document.getElementById('notif-btn');
  const notifDot = document.getElementById('notif-dot');
  
  if (notifBtn) {
    notifBtn.addEventListener('click', function() {
      const pend = store.atenciones.filter(a => a.estado === 'pendiente');
      if (pend.length > 0) {
        toast(pend.length + ' atención(es) pendientes de confirmar', 'info');
        if (notifDot) notifDot.style.display = 'none';
      } else {
        toast('No tienes notificaciones pendientes', 'info');
      }
    });
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
      <input type="time" value="${d.from}" id="from-${d.key}" onchange="updateScheduleTime('${d.key}', 'from', this.value)" style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <input type="time" value="${d.to}" id="to-${d.key}" onchange="updateScheduleTime('${d.key}', 'to', this.value)" style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <div class="toggle-switch ${d.active?'on':''}" id="tog-${d.key}" onclick="toggleDay('${d.key}', ${i})"></div>
    </div>
  `).join('');
}

function updateScheduleTime(key, type, value) {
  const day = days.find(d => d.key === key);
  if (day) day[type] = value;
}

function toggleDay(key, i) {
  if (i >= days.length) return;
  
  days[i].active = !days[i].active;
  const tog  = document.getElementById('tog-'+key);
  const from = document.getElementById('from-'+key);
  const to   = document.getElementById('to-'+key);
  
  if (tog) tog.classList.toggle('on', days[i].active);
  [from, to].forEach(el => {
    if (el) {
      el.style.opacity = days[i].active ? '1' : '.35';
      el.style.pointerEvents = days[i].active ? '' : 'none';
    }
  });
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // Construir horario
  buildSchedule();
  
  // Cargar datos iniciales
  cargarDatos();
  
  // Navegar al dashboard por defecto
  navigateTo('dashboard');
  
  console.log('✅ PsiControl inicializado correctamente');
});