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
// CONSTANTE DE DURACIÓN DE SESIÓN (en minutos)
// ═══════════════════════════════════════════════
const DURACION_SESION_MIN = 30;
const DURACION_SESION_MS  = DURACION_SESION_MIN * 60 * 1000;

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
  dashboard:  'Dashboard',
  historial:  'Historial de registros',
  citas:      'Atenciones',
  nuevo:      'Nueva atención',
  reportes:   'Reportes',
  calendario: 'Calendario',
  config:     'Configuración',
  '404':      'Página no encontrada'
};

function navigateTo(page) {
  const paginasValidas = Object.keys(pageLabels).filter(k => k !== '404');
  const target = paginasValidas.includes(page) ? page : '404';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + target);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector('[data-page="' + target + '"]');
  if (navEl) navEl.classList.add('active');

  const breadcrumb = document.getElementById('breadcrumb-text');
  if (breadcrumb) breadcrumb.textContent = pageLabels[target] || target;

  if (target !== '404') {
    switch (target) {
      case 'historial':  renderHistorial();       break;
      case 'citas':      cargarYRenderCitas();    break;
      case 'reportes':   renderReportes();        break;
      case 'nuevo':      resetNuevaAtencion();    break;
      case 'config':     cargarConfig();          break;
      case 'calendario': renderCalendario();      break;
    }
  }

  const searchInput   = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');
  if (searchInput)   searchInput.value = '';
  if (searchResults) searchResults.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
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
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

function colorAvatar(nombre) {
  const cols = ['bg-purple','bg-teal','bg-amber','bg-rose','bg-slate'];
  let h = 0;
  for (let c of (nombre || '')) h = (h * 31 + c.charCodeAt(0)) % cols.length;
  return cols[h];
}

function initials(nombre) {
  const p = (nombre || '').trim().split(' ');
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

// ═══════════════════════════════════════════════
// VALIDACIÓN DNI
// ═══════════════════════════════════════════════
function validarDNI(dni) {
  if (!dni) return true;
  return /^\d{8}$/.test(dni.trim());
}

// ═══════════════════════════════════════════════
// BLOQUEAR FECHAS PASADAS EN INPUT DATE
// ═══════════════════════════════════════════════
function bloquearFechasPasadas(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.min = hoy();
}

// ═══════════════════════════════════════════════
// RESTRICCIÓN FECHA NACIMIENTO — SECUNDARIA
// Rango válido: 11 a 17 años cumplidos
// ═══════════════════════════════════════════════
function aplicarRestriccionFechaNac() {
  const el = document.getElementById('na-fechanac');
  if (!el) return;

  const hoyDate = new Date();

  // max: nació hace al menos 11 años (no puede ser menor de 11)
  const maxDate = new Date(hoyDate);
  maxDate.setFullYear(hoyDate.getFullYear() - 11);

  // min: nació hace no más de 17 años (no puede tener más de 17)
  const minDate = new Date(hoyDate);
  minDate.setFullYear(hoyDate.getFullYear() - 17);

  el.max = maxDate.toISOString().split('T')[0];
  el.min = minDate.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════
// VALIDACIÓN DE HORARIO
// ═══════════════════════════════════════════════
function slotBase(ms) {
  return Math.floor(ms / DURACION_SESION_MS) * DURACION_SESION_MS;
}

async function validarHorarioUnico(fecha, hora, idAtencionExcluir = null) {
  let atenciones;
  try {
    atenciones = await apiFetch(`${API}/atenciones`);
  } catch (err) {
    console.error('validarHorarioUnico: fallo al consultar API, se permite continuar', err);
    return true;
  }

  const nuevaMs   = new Date(`${fecha}T${hora}:00`).getTime();
  const nuevoSlot = slotBase(nuevaMs);

  const choca = (atenciones || []).some(a => {
    if (!a.fechahora)           return false;
    if (a.estado === 'cerrado') return false;
    if (idAtencionExcluir && String(a.idatencion) === String(idAtencionExcluir)) return false;
    const existSlot = slotBase(new Date(a.fechahora).getTime());
    return existSlot === nuevoSlot;
  });

  return !choca;
}

// ═══════════════════════════════════════════════
// GENERAR HORAS DISPONIBLES
// ═══════════════════════════════════════════════
function generarHorasDisponibles(fecha, idAtencionExcluir = null) {
  if (!fecha) return [];

  const horas = [];
  const ahora = new Date();
  const esHoy = fecha === hoy();

  for (let h = 8; h <= 17; h++) {
    for (let m of ['00', '30']) {
      if (h === 17 && m === '30') continue;

      const hora   = `${String(h).padStart(2,'0')}:${m}`;
      const slotMs = new Date(`${fecha}T${hora}:00`).getTime();

      if (esHoy && slotMs <= ahora.getTime()) continue;

      const nuevoSlot = slotBase(slotMs);

      const ocupado = store.atenciones.some(a => {
        if (!a.fechahora)           return false;
        if (a.estado === 'cerrado') return false;
        if (idAtencionExcluir && String(a.idatencion) === String(idAtencionExcluir)) return false;
        const existSlot = slotBase(new Date(a.fechahora).getTime());
        return existSlot === nuevoSlot;
      });

      if (!ocupado) horas.push(hora);
    }
  }

  return horas;
}

// ═══════════════════════════════════════════════
// GRADOS Y SECCIONES
// ═══════════════════════════════════════════════
const GRADOS    = ['1°','2°','3°','4°','5°'];
const SECCIONES = ['A','B','C','D'];

function buildGradoSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Grado --</option>' +
    GRADOS.map(g => `<option value="${g}">${g}</option>`).join('');
}

function buildSeccionSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Sección --</option>' +
    SECCIONES.map(s => `<option value="${s}">${s}</option>`).join('');
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
  setTimeout(() => { if (toastEl.parentNode) toastEl.remove(); }, 3000);
}

// ═══════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');

  if (id === 'modal-cita') {
    const fechaEl = document.getElementById('mc-fecha');
    if (fechaEl) {
      fechaEl.value = hoy();
      fechaEl.min   = hoy();
      actualizarHorasDisponibles(fechaEl.value);
    }
    actualizarSelectEstudiantes();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});

function actualizarSelectEstudiantes() {
  const sel = document.getElementById('mc-paciente');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>' +
    store.estudiantes.map(e => {
      const dni   = e.dni ? ` · DNI: ${e.dni}` : '';
      const label = `${e.codigomatricula || '—'} | ${e.nombres} ${e.apellidos}${dni}`;
      return `<option value="${e.idestudiante}">${label}</option>`;
    }).join('');
}

// ═══════════════════════════════════════════════
// HELPER GENÉRICO: actualizar select de horas
// ═══════════════════════════════════════════════
function actualizarHorasSelect(selectId, fecha, idExcluir = null) {
  const sel = document.getElementById(selectId);
  if (!sel || !fecha) return;
  const disponibles = generarHorasDisponibles(fecha, idExcluir);
  if (disponibles.length === 0) {
    sel.innerHTML = '<option value="">— Sin horarios disponibles —</option>';
  } else {
    sel.innerHTML = '<option value="">-- Selecciona hora --</option>' +
      disponibles.map(h => `<option value="${h}">${h}</option>`).join('');
  }
}

// ═══════════════════════════════════════════════
// MODAL CONFIRMACIÓN SEGUNDA CITA
// ═══════════════════════════════════════════════
function mostrarModalSegundaCita(callback) {
  let modal = document.getElementById('modal-segunda-cita');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-segunda-cita';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title">📅 ¿Agendar segunda cita?</div>
          <button class="modal-close" onclick="closeModal('modal-segunda-cita')">✕</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px;line-height:1.6;">
            El estudiante ha sido registrado con su primera sesión.<br>
            ¿Deseas agendar también una <strong>segunda cita</strong> ahora?
          </p>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn-secondary" id="btn-solo-primera" style="font-size:13px;">
              No, solo guardar la primera
            </button>
            <button class="btn-primary" id="btn-agendar-segunda" style="font-size:13px;">
              📅 Sí, agendar segunda cita
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  modal.classList.add('open');

  document.getElementById('btn-solo-primera').onclick = () => {
    modal.classList.remove('open');
    callback(false);
  };
  document.getElementById('btn-agendar-segunda').onclick = () => {
    modal.classList.remove('open');
    callback(true);
  };
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      callback(false);
    }
  };
}

// ═══════════════════════════════════════════════
// MODAL SEGUNDA CITA (formulario)
// ═══════════════════════════════════════════════
function abrirFormularioSegundaCita(idestudiante, nombreCompleto) {
  let modal = document.getElementById('modal-form-segunda-cita');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-form-segunda-cita';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <div class="modal-title">📅 Segunda cita</div>
          <button class="modal-close" onclick="closeModal('modal-form-segunda-cita')">✕</button>
        </div>
        <div class="modal-body">
          <div id="sc-subtitulo" style="font-size:13px;color:var(--text-muted);margin-bottom:16px;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="form-group">
              <label>Fecha *</label>
              <input type="date" id="sc-fecha">
            </div>
            <div class="form-group">
              <label>Hora *</label>
              <select id="sc-hora"><option value="">-- Selecciona hora --</option></select>
            </div>
            <div class="form-group full">
              <label>Motivo de consulta</label>
              <input type="text" id="sc-motivo" placeholder="Ej: Seguimiento, ansiedad, etc.">
            </div>
            <div class="form-group full">
              <label>Observaciones</label>
              <textarea id="sc-observaciones" placeholder="Observaciones..." style="min-height:60px;"></textarea>
            </div>
          </div>
          <div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn-secondary" onclick="closeModal('modal-form-segunda-cita')">Cancelar</button>
            <button class="btn-primary" id="btn-guardar-segunda">Guardar segunda cita</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const subtituloEl = document.getElementById('sc-subtitulo');
  if (subtituloEl) subtituloEl.textContent = `Estudiante: ${nombreCompleto}`;

  const fechaEl = document.getElementById('sc-fecha');
  if (fechaEl) {
    fechaEl.value = hoy();
    fechaEl.min   = hoy();
    fechaEl.onchange = () => actualizarHorasSelect('sc-hora', fechaEl.value);
    actualizarHorasSelect('sc-hora', fechaEl.value);
  }

  modal.classList.add('open');

  document.getElementById('btn-guardar-segunda').onclick = async () => {
    const fecha  = document.getElementById('sc-fecha')?.value;
    const hora   = document.getElementById('sc-hora')?.value;
    const motivo = document.getElementById('sc-motivo')?.value?.trim() || 'Segunda cita';
    const obs    = document.getElementById('sc-observaciones')?.value?.trim();

    if (!fecha || !hora) {
      toast('Indica la fecha y hora de la segunda cita', 'warning');
      return;
    }

    if (fecha < hoy()) {
      toast('No puedes agendar en una fecha pasada', 'warning');
      return;
    }

    const disponible = await validarHorarioUnico(fecha, hora);
    if (!disponible) {
      const libres = generarHorasDisponibles(fecha);
      const sugerencia = libres.length
        ? ` Próximo disponible: ${libres[0]}`
        : ' No hay horarios libres ese día.';
      toast(`❌ Horario ocupado.${sugerencia}`, 'warning');
      return;
    }

    try {
      const fechahora = `${fecha}T${hora}:00`;
      await apiFetch(`${API}/atenciones`, {
        method: 'POST',
        body: JSON.stringify({
          idestudiante: parseInt(idestudiante),
          fechahora,
          nivelatencion: 'moderado',
          idmotivo: 1,
          estado: 'pendiente',
          observaciones: obs || null,
        })
      });

      agregarActividad('teal', '📅', `Segunda cita registrada para <strong>${nombreCompleto}</strong>`, 'Ahora');
      toast(`✓ Segunda cita agendada para ${nombreCompleto}`);
      closeModal('modal-form-segunda-cita');
      await cargarDatos();
    } catch (err) {
      console.error(err);
      toast('Error al guardar segunda cita', 'warning');
    }
  };
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  const now   = new Date();
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const fechaHoyEl   = document.getElementById('fecha-hoy');
  const fechaCitasEl = document.getElementById('fecha-citas-hoy');
  if (fechaHoyEl)   fechaHoyEl.textContent   = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()} · Bienvenida`;
  if (fechaCitasEl) fechaCitasEl.textContent = `Hoy, ${now.getDate()} de ${meses[now.getMonth()]}`;

  const pendientes = store.atenciones.filter(a => a.estado === 'pendiente').length;

  const statElements = {
    'stat-registros':  store.estudiantes.length,
    'stat-citas':      pendientes,
    'stat-pacientes':  store.estudiantes.length,
    'stat-reportes':   store.reportes,
    'stat-reg-delta':  '↑ ' + store.estudiantes.length + ' registros',
    'stat-cita-delta': '↑ ' + pendientes + ' pendientes',
    'badge-historial': store.estudiantes.length,
    'badge-citas':     pendientes
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
        return `<div class="appt-item" onclick="verAtencionDetalle(${a.idatencion})">
          <div class="appt-time"><div class="appt-hour">${hora}</div></div>
          <div class="appt-divider"></div>
          <div class="appt-avatar ${colorAvatar(a.paciente)}">${initials(a.paciente)}</div>
          <div class="appt-info">
            <div class="appt-name">${a.paciente}</div>
            <div class="appt-type">${a.motivoconsulta || '—'} · ${a.nivelatencion || '—'}</div>
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
    { label:'Atenciones activas',    val: asist, color:'var(--teal)' },
    { label:'Registros completados', val: Math.min(Math.round(store.estudiantes.length / 20 * 100), 100), color:'var(--accent)' },
    { label:'Satisfacción general',  val: 91,    color:'var(--amber)' },
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

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';

  try {
    const lista = store.estudiantes.length > 0 ? store.estudiantes : await apiFetch(`${API}/estudiantes`);
    store.estudiantes = lista || [];

    const filtrados = filtro
      ? lista.filter(p => {
          const f = filtro.toLowerCase();
          const nombre = `${p.nombres} ${p.apellidos}`.toLowerCase();
          return nombre.includes(f) ||
            p.codigomatricula?.toLowerCase().includes(f) ||
            p.telefono?.includes(f) ||
            p.dni?.includes(f);
        })
      : lista;

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📭</div><div class="es-text">No se encontraron registros</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = filtrados.map(p =>
      `<tr class="hist-row" onclick="toggleHistorialPaciente(${p.idestudiante}, this)">
        <td>
          <div class="td-name">
            <div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}">${initials(p.nombres+' '+p.apellidos)}</div>
            ${p.nombres} ${p.apellidos}
          </div>
        </td>
        <td>${p.dni || '—'}</td>
        <td>${p.telefono || '—'}</td>
        <td>${p.condicion || '—'}</td>
        <td><span class="appt-badge c-teal">${p.genero || '—'}</span></td>
        <td>${fmtFecha(p.fechanac)}</td>
        <td>
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation();toggleHistorialPaciente(${p.idestudiante}, this.closest('tr'))">
            Ver historial
          </button>
        </td>
      </tr>
      <tr class="hist-detail-row" id="hist-detail-${p.idestudiante}" style="display:none;">
        <td colspan="7" style="padding:0;">
          <div class="hist-detail-panel" id="hist-detail-panel-${p.idestudiante}">
            <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">Cargando historial...</div>
          </div>
        </td>
      </tr>`
    ).join('');
  } catch (err) {
    console.error('Error renderizando historial:', err);
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">⚠️</div><div class="es-text">Error cargando datos</div></div></td></tr>';
  }
}

async function toggleHistorialPaciente(id, row) {
  const detailRow = document.getElementById(`hist-detail-${id}`);
  if (!detailRow) return;

  const isOpen = detailRow.style.display !== 'none';

  document.querySelectorAll('.hist-detail-row').forEach(r => r.style.display = 'none');
  document.querySelectorAll('.hist-row').forEach(r => r.classList.remove('hist-row-open'));

  if (isOpen) return;

  detailRow.style.display = '';
  row.classList.add('hist-row-open');

  await cargarHistorialPaciente(id);
}

async function cargarHistorialPaciente(id) {
  const panel = document.getElementById(`hist-detail-panel-${id}`);
  if (!panel) return;

  const p = store.estudiantes.find(x => x.idestudiante == id);
  if (!p) return;

  let atencionesEst = store.atenciones.filter(a => a.idestudiante == id);
  try {
    const todas = await apiFetch(`${API}/atenciones`);
    atencionesEst = (todas || []).filter(a => a.idestudiante == id);
  } catch (_) {}

  const motivoTexto = atencionesEst.length > 0
    ? (atencionesEst[0].motivoconsulta || atencionesEst[0].motivo || '—')
    : '—';

  panel.innerHTML = `
    <div class="hist-detail-content">
      <div class="hist-detail-header">
        <div class="hist-detail-avatar ${colorAvatar(p.nombres+p.apellidos)}">${initials(p.nombres+' '+p.apellidos)}</div>
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${p.nombres} ${p.apellidos}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Motivo principal: ${motivoTexto}</div>
        </div>
        <button class="btn-secondary" style="margin-left:auto;font-size:11px;padding:5px 12px;"
          onclick="document.getElementById('hist-detail-${id}').style.display='none';document.querySelector('.hist-row-open')?.classList.remove('hist-row-open')">
          Cerrar ✕
        </button>
      </div>

      <div class="hist-detail-grid">
        <div class="hist-info-block">
          <div class="hist-info-label">DNI</div>
          <div class="hist-info-value">${p.dni || '—'}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Teléfono</div>
          <div class="hist-info-value">${p.telefono || '—'}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Género</div>
          <div class="hist-info-value">${p.genero || '—'}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Fecha de nacimiento</div>
          <div class="hist-info-value">${fmtFecha(p.fechanac)}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Condición</div>
          <div class="hist-info-value">${p.condicion || '—'}</div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">
          Historial de atenciones (${atencionesEst.length})
        </div>
        ${atencionesEst.length === 0
          ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Sin atenciones registradas</div>'
          : `<div class="hist-atencion-list">
              ${atencionesEst.map(a => `
                <div class="hist-atencion-item">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="font-size:20px;">${a.estado === 'activo' ? '✅' : a.estado === 'pendiente' ? '⏳' : '🔒'}</div>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${fmtFecha(a.fechahora)} · ${fmtHora(a.fechahora)}</div>
                      <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                        ${a.motivoconsulta || '—'} · ${a.grado || '—'}${a.seccion ? ' ' + a.seccion : ''}
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    ${nivelBadge(a.nivelatencion)}
                    ${estadoBadge(a.estado)}
                  </div>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>`;
}

function filterHistorial() {
  const searchEl = document.getElementById('hist-search');
  if (searchEl) renderHistorial(searchEl.value);
}

function verEstudiante(id) {
  const p = store.estudiantes.find(x => x.idestudiante == id);
  if (!p) return;

  const tituloEl = document.getElementById('mp-titulo');
  const bodyEl   = document.getElementById('mp-body');
  if (!tituloEl || !bodyEl) return;

  tituloEl.textContent = `${p.nombres} ${p.apellidos}`;
  bodyEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;">DNI</div><div style="font-size:14px;font-weight:500;">${p.dni || '—'}</div></div>
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
    renderCitas();
  }
}

function renderCitas() {
  const tbody = document.getElementById('citas-tbody');
  if (!tbody) return;

  const base = store.atenciones.filter(a => a.estado !== 'cerrado');
  const lista = citaFiltro === 'todas'
    ? base
    : store.atenciones.filter(a => a.estado === citaFiltro);

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">No hay atenciones para mostrar</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(a =>
    `<tr id="atencion-row-${a.idatencion}">
      <td>${fmtFecha(a.fechahora)}</td>
      <td style="font-weight:600;">${fmtHora(a.fechahora)}</td>
      <td>${a.motivoconsulta || '—'}</td>
      <td>${a.grado || '—'}${a.seccion ? ' ' + a.seccion : ''}</td>
      <td>${nivelBadge(a.nivelatencion)}</td>
      <td>${estadoBadge(a.estado)}</td>
      <td>
        <div class="td-name">
          <div class="td-avatar ${colorAvatar(a.paciente)}">${initials(a.paciente)}</div>
          <div>
            <div>${a.paciente}</div>
            ${a.dni ? `<div style="font-size:11px;color:var(--text-muted);">DNI: ${a.dni}</div>` : ''}
          </div>
        </div>
      </td>
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
  if (!confirm('¿Cerrar esta atención? Se eliminará del listado.')) return;

  try {
    const atencion = store.atenciones.find(a => a.idatencion == id);
    if (!atencion) return;

    await apiFetch(`${API}/atenciones/${id}`, { method: 'DELETE' });

    store.atenciones = store.atenciones.filter(a => a.idatencion != id);
    const row = document.getElementById(`atencion-row-${id}`);
    if (row) row.remove();

    agregarActividad('rose', '🔒', `Atención de <strong>${atencion.paciente}</strong> cerrada`, 'Ahora');
    renderDashboard();
    toast('Atención cerrada y eliminada', 'warning');
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
  const estado        = document.getElementById('mc-estado')?.value?.toLowerCase();
  const nivelatencion = document.getElementById('mc-nivel')?.value || 'moderado';

  if (!idestudiante || !fecha || !hora) {
    toast('Completa los campos obligatorios', 'warning');
    return;
  }

  if (fecha < hoy()) {
    toast('No puedes agendar en una fecha pasada', 'warning');
    return;
  }

  const disponible = await validarHorarioUnico(fecha, hora);
  if (!disponible) {
    const libres = generarHorasDisponibles(fecha);
    const sugerencia = libres.length
      ? ` Próximo disponible: ${libres[0]}`
      : ' No hay horarios libres ese día.';
    toast(`❌ Horario ocupado.${sugerencia}`, 'warning');
    return;
  }

  const motivoTexto = document.getElementById('mc-motivo')?.value?.trim() || 'Consulta general';

  let idmotivo = 1;
  try {
    const motivos = await apiFetch(`${API}/motivosconsulta`);
    const encontrado = motivos.find(m => m.descripcion === motivoTexto || m.nombre === motivoTexto);
    idmotivo = encontrado ? encontrado.idmotivo : (motivos[0]?.idmotivo || 1);
  } catch (_) {}

  const fechahora = `${fecha}T${hora}:00`;

  try {
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante: parseInt(idestudiante),
        fechahora,
        estado: estado || 'pendiente',
        idmotivo,
        nivelatencion,
      })
    });

    toast('✅ Cita registrada correctamente');
    closeModal('modal-cita');
    await cargarDatos();
    renderCitas();
    renderDashboard();
  } catch (err) {
    console.error(err);
    toast('Error al guardar cita', 'warning');
  }
}

function actualizarHorasDisponibles(fecha) {
  actualizarHorasSelect('mc-hora', fecha);
}

// ═══════════════════════════════════════════════
// LISTENERS DE FECHA → HORA
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  const mcFecha = document.getElementById('mc-fecha');
  if (mcFecha) {
    mcFecha.addEventListener('change', (e) => {
      actualizarHorasDisponibles(e.target.value);
    });
  }

  const naFecha = document.getElementById('na-fecha');
  if (naFecha) {
    naFecha.addEventListener('change', (e) => {
      actualizarHorasSelect('na-hora', e.target.value);
    });
  }
});

// ═══════════════════════════════════════════════
// NUEVA ATENCIÓN — PASO A PASO
// ═══════════════════════════════════════════════
function resetNuevaAtencion() {
  ['na-nombres','na-apellidos','na-tipo-doc','na-telefono','na-fechanac',
   'na-condicion','na-motivo-texto','na-observaciones']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  const generoEl = document.getElementById('na-genero');
  if (generoEl) generoEl.value = '';

  const gradoEl   = document.getElementById('na-grado');
  const seccionEl = document.getElementById('na-seccion');
  if (gradoEl)   gradoEl.value   = '';
  if (seccionEl) seccionEl.value = '';

  const fechaEl = document.getElementById('na-fecha');
  if (fechaEl) {
    fechaEl.value = hoy();
    fechaEl.min   = hoy();
  }

  const nivelEl = document.getElementById('na-nivel');
  if (nivelEl) nivelEl.value = 'moderado';

  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  if (paso1) paso1.style.display = '';
  if (paso2) paso2.style.display = 'none';

  const ind1  = document.getElementById('paso-ind-1');
  const ind2  = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');
  if (ind1)  ind1.className  = 'paso-item active';
  if (ind2)  ind2.className  = 'paso-item';
  if (linea) linea.className = 'paso-linea';

  buildGradoSelect('na-grado');
  buildSeccionSelect('na-seccion');

  // ✅ Restricción de fecha de nacimiento para secundaria (11–17 años)
  aplicarRestriccionFechaNac();
}

function calcularEdad(fechaNacStr) {
  const nacimiento = new Date(fechaNacStr);
  const hoyD = new Date();
  let edad = hoyD.getFullYear() - nacimiento.getFullYear();
  const m = hoyD.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoyD.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function validarPaso1() {
  const campos = [
    'na-nombres',
    'na-apellidos',
    'na-doc-numero',
    'na-telefono',
    'na-fechanac',
    'na-genero',
    'na-grado',
    'na-seccion'
  ];

  let valido = true;

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn('No existe:', id);
      valido = false;
      return;
    }
    const valor = (el.value || '').trim();
    if (valor === '') {
      el.style.border = '2px solid red';
      valido = false;
    } else {
      el.style.border = '';
    }
  });

  // Validación DNI: exactamente 8 dígitos
  const dniEl = document.getElementById('na-doc-numero');
  const valorDNI = (dniEl?.value || '').trim();
  if (!/^\d{8}$/.test(valorDNI)) {
    if (dniEl) dniEl.style.border = '2px solid red';
    valido = false;
  } else {
    if (dniEl) dniEl.style.border = '';
  }

  // ✅ Validación fecha de nacimiento: rango secundaria (11–17 años)
  const fechaNacEl  = document.getElementById('na-fechanac');
  const fechaNacVal = (fechaNacEl?.value || '').trim();
  if (fechaNacVal) {
    const edad = calcularEdad(fechaNacVal);
    if (edad < 11 || edad > 17) {
      if (fechaNacEl) fechaNacEl.style.border = '2px solid red';
      toast('⚠️ La fecha de nacimiento no corresponde a una estudiante de secundaria (11–17 años)', 'warning');
      valido = false;
    } else {
      if (fechaNacEl) fechaNacEl.style.border = '';
    }
  }

  if (!valido) {
    toast('⚠️ Completa todos los campos correctamente', 'warning');
  }

  return valido;
}

function irPaso2() {
  if (!validarPaso1()) return;

  const nombres   = document.getElementById('na-nombres')?.value?.trim();
  const apellidos = document.getElementById('na-apellidos')?.value?.trim();
  const dni       = document.getElementById('na-doc-numero')?.value?.trim();

  document.getElementById('paso-ind-1').className = 'paso-item done';
  document.getElementById('paso-ind-2').className = 'paso-item active';
  document.getElementById('paso-linea').className = 'paso-linea done';

  document.getElementById('paso-1').style.display = 'none';
  document.getElementById('paso-2').style.display = '';

  document.getElementById('paso2-subtitulo').textContent =
    `Estudiante: ${nombres} ${apellidos} · DNI: ${dni}`;

  // Actualizar horas disponibles para la fecha actual al entrar al paso 2
  const fechaEl = document.getElementById('na-fecha');
  if (fechaEl) actualizarHorasSelect('na-hora', fechaEl.value);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function volverPaso1() {
  const paso1 = document.getElementById('paso-1');
  const paso2 = document.getElementById('paso-2');
  const ind1  = document.getElementById('paso-ind-1');
  const ind2  = document.getElementById('paso-ind-2');
  const linea = document.getElementById('paso-linea');

  if (paso1) paso1.style.display = '';
  if (paso2) paso2.style.display = 'none';
  if (ind1)  ind1.className  = 'paso-item active';
  if (ind2)  ind2.className  = 'paso-item';
  if (linea) linea.className = 'paso-linea';
}

// ═══════════════════════════════════════════════
// NUEVA ATENCIÓN — GUARDAR (CORREGIDO)
// Guarda estudiante + atención en la API,
// ya no usa localStorage.
// ═══════════════════════════════════════════════
async function guardarNuevaAtencion() {

  if (!validarPaso1()) return;

  const fecha       = document.getElementById('na-fecha')?.value;
  const hora        = document.getElementById('na-hora')?.value;
  const motivoTexto = document.getElementById('na-motivo-texto')?.value?.trim();

  if (!fecha || !hora) {
    toast('Indica fecha y hora de la sesión', 'warning');
    return;
  }

  if (!motivoTexto) {
    toast('Escribe el motivo de consulta', 'warning');
    return;
  }

  if (fecha < hoy()) {
    toast('No puedes agendar en una fecha pasada', 'warning');
    return;
  }

  const disponible = await validarHorarioUnico(fecha, hora);
  if (!disponible) {
    const libres = generarHorasDisponibles(fecha);
    const sugerencia = libres.length
      ? ` Próximo disponible: ${libres[0]}`
      : ' No hay horarios libres ese día.';
    toast(`❌ Horario ocupado.${sugerencia}`, 'warning');
    return;
  }

  const nombres   = document.getElementById('na-nombres')?.value?.trim();
  const apellidos = document.getElementById('na-apellidos')?.value?.trim();
  const dni       = document.getElementById('na-doc-numero')?.value?.trim();
  const telefono  = document.getElementById('na-telefono')?.value?.trim();
  const fechanac  = document.getElementById('na-fechanac')?.value;
  const genero    = document.getElementById('na-genero')?.value;
  const grado     = document.getElementById('na-grado')?.value;
  const seccion   = document.getElementById('na-seccion')?.value;
  const nivel     = document.getElementById('na-nivel')?.value || 'moderado';
  const obs       = document.getElementById('na-observaciones')?.value?.trim();

  try {
    // 1️⃣ Buscar si el estudiante ya existe (por DNI o nombre completo)
    let idestudiante;
    const estudiantesActuales = await apiFetch(`${API}/estudiantes`);
    const existente = (estudiantesActuales || []).find(e =>
      e.dni === dni ||
      (`${e.nombres} ${e.apellidos}`.toLowerCase() === `${nombres} ${apellidos}`.toLowerCase())
    );

    if (existente) {
      idestudiante = existente.idestudiante;
    } else {
      // Crear nuevo estudiante
      const nuevoEst = await apiFetch(`${API}/estudiantes`, {
        method: 'POST',
        body: JSON.stringify({
          nombres,
          apellidos,
          dni,
          telefono,
          fechanac,
          genero,
          grado,
          seccion,
          condicion: 'regular',
        })
      });
      idestudiante = nuevoEst.idestudiante;
    }

    // 2️⃣ Resolver idmotivo
    let idmotivo = 1;
    try {
      const motivos = await apiFetch(`${API}/motivosconsulta`);
      const encontrado = (motivos || []).find(m =>
        m.descripcion === motivoTexto || m.nombre === motivoTexto
      );
      idmotivo = encontrado ? encontrado.idmotivo : (motivos?.[0]?.idmotivo || 1);
    } catch (_) {}

    // 3️⃣ Registrar la atención
    const fechahora = `${fecha}T${hora}:00`;
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante,
        fechahora,
        nivelatencion: nivel,
        idmotivo,
        estado: 'pendiente',
        observaciones: obs || null,
      })
    });

    agregarActividad('purple', '📝', `Nueva atención: <strong>${nombres} ${apellidos}</strong>`, 'Ahora');
    toast(`✅ Atención registrada para ${nombres} ${apellidos}`);

    // 4️⃣ Recargar datos globales
    await cargarDatos();

    // 5️⃣ Preguntar si agendar segunda cita
    mostrarModalSegundaCita((quiere) => {
      if (quiere) {
        abrirFormularioSegundaCita(idestudiante, `${nombres} ${apellidos}`);
      } else {
        navigateTo('citas');
      }
    });

  } catch (err) {
    console.error('Error guardando nueva atención:', err);
    toast('Error al registrar la atención', 'warning');
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

  const max     = Math.max(...vals, 1);
  const chartEl = document.getElementById('chart-area');
  if (chartEl) {
    chartEl.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:12px;height:120px;">
        ${meses.map((m, i) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-secondary);">${vals[i]}</div>
            <div style="width:100%;background:${vals[i] > 0 ? 'var(--accent)' : 'var(--accent-soft)'};border-radius:6px 6px 0 0;height:${Math.round((vals[i]/max)*90)+10}px;transition:height .5s ease;"></div>
            <div style="font-size:11px;color:var(--text-muted);">${m}</div>
          </div>`).join('')}
      </div>`;
  }

  renderProgBars('rep-prog', [
    { label:'Tasa de atención activa',  val: Math.round(activos / Math.max(store.atenciones.length, 1) * 100), color:'var(--teal)' },
    { label:'Cobertura de estudiantes', val: Math.min(Math.round(total / 20 * 100), 100), color:'var(--accent)' },
    { label:'Atenciones cerradas',      val: Math.round(cerrados / Math.max(store.atenciones.length, 1) * 100), color:'var(--amber)' },
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
    'cfg-nombre':    'nombre',
    'cfg-psicologo': 'psicologo',
    'cfg-tel':       'tel',
    'cfg-email':     'email',
    'cfg-dir':       'dir'
  };
  Object.entries(configFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = store.config[key] || '';
  });
}

function guardarConfig() {
  const configFields = {
    'cfg-nombre':    'nombre',
    'cfg-psicologo': 'psicologo',
    'cfg-tel':       'tel',
    'cfg-email':     'email',
    'cfg-dir':       'dir'
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
document.addEventListener('DOMContentLoaded', function () {
  const searchInput   = document.getElementById('global-search');
  const searchResults = document.getElementById('search-results');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
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

  const res = store.estudiantes.filter(p => {
    const nombre = `${p.nombres} ${p.apellidos}`.toLowerCase();
    return nombre.includes(query) ||
      p.codigomatricula?.toLowerCase().includes(query) ||
      p.telefono?.includes(query) ||
      p.dni?.includes(query);
  }).slice(0, 5);

  if (res.length === 0 || !searchResultsEl) {
    searchResultsEl.style.display = 'none';
    return;
  }

  searchResultsEl.innerHTML = res.map(p =>
    `<div class="search-result-item" onclick="verEstudiante(${p.idestudiante})">
      <div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}" style="width:28px;height:28px;font-size:10px;">${initials(p.nombres+' '+p.apellidos)}</div>
      <div>
        <div>${p.nombres} ${p.apellidos}</div>
        <div class="sr-sub">${p.dni ? 'DNI: ' + p.dni + ' · ' : ''}${p.telefono || p.codigomatricula || '—'}</div>
      </div>
    </div>`
  ).join('');

  searchResultsEl.style.display = 'block';
}

document.addEventListener('click', function (e) {
  const searchWrap    = document.getElementById('search-wrap');
  const searchResults = document.getElementById('search-results');
  if (searchWrap && !searchWrap.contains(e.target) && searchResults) {
    searchResults.style.display = 'none';
  }
});

// ═══════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  const notifBtn = document.getElementById('notif-btn');
  const notifDot = document.getElementById('notif-dot');

  if (notifBtn) {
    notifBtn.addEventListener('click', function () {
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
      <input type="time" value="${d.from}" id="from-${d.key}" onchange="updateScheduleTime('${d.key}', 'from', this.value)"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
      <input type="time" value="${d.to}" id="to-${d.key}" onchange="updateScheduleTime('${d.key}', 'to', this.value)"
        style="border:1.5px solid var(--border);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:12px;background:var(--surface);outline:none;${!d.active?'opacity:.35;pointer-events:none;':''}">
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
      el.style.opacity       = days[i].active ? '1' : '.35';
      el.style.pointerEvents = days[i].active ? '' : 'none';
    }
  });
}

// ═══════════════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════════════
const CAL_STORAGE_KEY = 'psicontrol_cal_eventos';
let calYear, calMonth, calEventos = [], calNotifTimers = [];

const CAL_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CAL_TIPO_COLORS = {
  sesion:  { pill:'background:#EEEDFE;color:#3C3489;', dot:'#534AB7' },
  cita:    { pill:'background:#E1F5EE;color:#085041;', dot:'#1D9E75' },
  urgente: { pill:'background:#FCEBEB;color:#791F1F;', dot:'#E24B4A' },
  otro:    { pill:'background:#F1EFE8;color:#444441;', dot:'#888780' },
};

function renderCalendario() {
  const page = document.getElementById('page-calendario');
  if (!page) return;

  calEventos = JSON.parse(localStorage.getItem(CAL_STORAGE_KEY) || '[]');
  sincronizarAtencionesAlCalendario();

  if (!calYear) {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
  }

  page.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Calendario</div>
        <div class="page-subtitle">Sesiones y atenciones programadas</div>
      </div>
      <button class="btn-primary" onclick="calAbrirModal()">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo evento
      </button>
    </div>

    <div id="cal-notif-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>

    <div style="display:grid;grid-template-columns:1fr 260px;gap:16px;align-items:start;">
      <div class="card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="btn-secondary" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px;" onclick="calPrevMonth()">&#8249;</button>
            <div style="font-size:16px;font-weight:600;color:var(--text-primary);" id="cal-month-label"></div>
            <button class="btn-secondary" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px;" onclick="calNextMonth()">&#8250;</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;">
          ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d =>
            `<div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-muted);padding:4px 0;text-transform:uppercase;letter-spacing:.04em;">${d}</div>`
          ).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;" id="cal-grid"></div>
      </div>

      <div class="card" style="padding:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">Próximas sesiones</div>
        <div id="cal-upcoming"></div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-calendario">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title" id="cal-modal-titulo">Nuevo evento</div>
          <button class="modal-close" onclick="closeModal('modal-calendario')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Título *</label>
              <input type="text" id="cal-ev-titulo" placeholder="Ej: Sesión con Juan G.">
            </div>
            <div class="form-group">
              <label>Tipo</label>
              <select id="cal-ev-tipo">
                <option value="sesion">Sesión psicológica</option>
                <option value="cita">Cita de seguimiento</option>
                <option value="urgente">Urgente</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Notificar</label>
              <select id="cal-ev-notif">
                <option value="0">Al momento</option>
                <option value="15" selected>15 min antes</option>
                <option value="30">30 min antes</option>
                <option value="60">1 hora antes</option>
                <option value="1440">1 día antes</option>
              </select>
            </div>
            <div class="form-group">
              <label>Fecha *</label>
              <input type="date" id="cal-ev-fecha">
            </div>
            <div class="form-group">
              <label>Hora *</label>
              <input type="time" id="cal-ev-hora" value="08:00">
            </div>
            <div class="form-group full">
              <label>Observaciones</label>
              <textarea id="cal-ev-obs" placeholder="Notas adicionales..." style="min-height:56px;"></textarea>
            </div>
          </div>
          <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn-secondary" onclick="closeModal('modal-calendario')">Cancelar</button>
            <button class="btn-primary" onclick="calGuardarEvento()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;

  calRenderGrid();
  calRenderUpcoming();
  calRenderNotifBar();
  calScheduleNotifs();

  document.getElementById('modal-calendario')?.addEventListener('click', e => {
    if (e.target.id === 'modal-calendario') closeModal('modal-calendario');
  });
}

function sincronizarAtencionesAlCalendario() {
  store.atenciones.forEach(a => {
    if (!a.fechahora) return;
    const key    = `atencion_${a.idatencion}`;
    const existe = calEventos.find(e => e.key === key);
    if (!existe) {
      const dt   = new Date(a.fechahora);
      const fec  = dt.toISOString().split('T')[0];
      const hora = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      calEventos.push({
        id: key, key,
        titulo: a.paciente || 'Atención',
        tipo: a.nivelatencion === 'grave' ? 'urgente' : 'sesion',
        fecha: fec, hora,
        notif: 15,
        obs: a.motivoconsulta || '',
        fromAtencion: true
      });
    }
  });
  calSave();
}

function calSave() {
  localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(calEventos));
}

function calRenderGrid() {
  const label = document.getElementById('cal-month-label');
  const grid  = document.getElementById('cal-grid');
  if (!label || !grid) return;

  label.textContent = `${CAL_MESES[calMonth]} ${calYear}`;
  grid.innerHTML = '';

  const now        = new Date();
  const todayStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const first      = new Date(calYear, calMonth, 1);
  let startDow     = first.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth,   0).getDate();

  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, other: true });
  for (let d = 1; d <= daysInMonth; d++)   cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0)           cells.push({ day: cells.length - startDow - daysInMonth + 1, other: true });

  cells.forEach(({ day, other }) => {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = !other && dateStr === todayStr;
    const dayEvs  = other ? [] : calEventos.filter(e => e.fecha === dateStr);

    const cell = document.createElement('div');
    cell.style.cssText = `min-height:68px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:5px 6px;cursor:pointer;opacity:${other?'.3':'1'};${isToday?'border-color:var(--accent);':''};transition:border-color .15s;`;
    cell.onmouseover = () => { if (!isToday) cell.style.borderColor = 'var(--accent-soft)'; };
    cell.onmouseout  = () => { if (!isToday) cell.style.borderColor = 'var(--border)'; };

    const numEl = document.createElement('div');
    numEl.style.cssText = `font-size:12px;font-weight:600;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;${isToday?'background:var(--accent);color:#fff;':'color:var(--text-primary);'}`;
    numEl.textContent = day;
    cell.appendChild(numEl);

    dayEvs.slice(0, 2).forEach(ev => {
      const pill = document.createElement('div');
      const col  = CAL_TIPO_COLORS[ev.tipo] || CAL_TIPO_COLORS.otro;
      pill.style.cssText = `font-size:10px;padding:1px 5px;border-radius:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;margin-top:2px;${col.pill}`;
      pill.textContent = ev.titulo;
      pill.title = `${ev.hora} — ${ev.titulo}`;
      pill.onclick = (e) => { e.stopPropagation(); calAbrirEditar(ev); };
      cell.appendChild(pill);
    });
    if (dayEvs.length > 2) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:9px;color:var(--text-muted);padding-left:4px;margin-top:1px;';
      more.textContent = `+${dayEvs.length - 2} más`;
      cell.appendChild(more);
    }

    if (!other) cell.onclick = () => calAbrirModal(dateStr);
    grid.appendChild(cell);
  });
}

function calRenderUpcoming() {
  const ul = document.getElementById('cal-upcoming');
  if (!ul) return;
  const now  = new Date();
  const hoyS = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const prox = calEventos
    .filter(e => e.fecha >= hoyS)
    .sort((a, b) => (a.fecha + a.hora > b.fecha + b.hora ? 1 : -1))
    .slice(0, 6);

  if (!prox.length) {
    ul.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Sin próximas sesiones</div>';
    return;
  }
  ul.innerHTML = prox.map(ev => {
    const col = CAL_TIPO_COLORS[ev.tipo] || CAL_TIPO_COLORS.otro;
    return `<div onclick="calAbrirEditar(${JSON.stringify(ev).replace(/"/g,'&quot;')})"
      style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
      <div style="width:8px;height:8px;border-radius:50%;background:${col.dot};flex-shrink:0;margin-top:4px;"></div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text-primary);">${ev.titulo}</div>
        <div style="font-size:11px;color:var(--text-muted);">${calFmtFecha(ev.fecha)} · ${ev.hora}</div>
      </div>
    </div>`;
  }).join('');
}

function calRenderNotifBar() {
  const bar = document.getElementById('cal-notif-bar');
  if (!bar) return;
  const now  = new Date();
  const hoyS = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const hoyCal = calEventos.filter(e => e.fecha === hoyS);
  bar.innerHTML = '';

  const chip = document.createElement('div');
  chip.className = 'appt-badge c-purple';
  chip.textContent = `${hoyCal.length} sesión${hoyCal.length !== 1 ? 'es' : ''} hoy`;
  bar.appendChild(chip);

  hoyCal.slice(0, 3).forEach(ev => {
    const c = document.createElement('div');
    c.className = 'appt-badge c-teal';
    c.style.cursor = 'pointer';
    c.textContent = `${ev.hora} — ${ev.titulo.substring(0, 22)}${ev.titulo.length > 22 ? '…' : ''}`;
    c.onclick = () => calAbrirEditar(ev);
    bar.appendChild(c);
  });
}

function calScheduleNotifs() {
  calNotifTimers.forEach(t => clearTimeout(t));
  calNotifTimers = [];
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();

  const now = new Date();
  calEventos.forEach(ev => {
    const evTime    = new Date(`${ev.fecha}T${ev.hora || '08:00'}`);
    const notifTime = new Date(evTime.getTime() - (ev.notif || 0) * 60000);
    const diff      = notifTime - now;
    if (diff > 0 && diff < 86400000) {
      const t = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('PsiControl — Recordatorio', {
            body: `${ev.titulo} a las ${ev.hora}`
          });
        }
        toast(`🔔 Recordatorio: ${ev.titulo} a las ${ev.hora}`, 'info');
      }, diff);
      calNotifTimers.push(t);
    }
  });
}

let calEditId = null;

function calAbrirModal(fechaStr = null) {
  calEditId = null;
  document.getElementById('cal-modal-titulo').textContent = 'Nuevo evento';
  document.getElementById('cal-ev-titulo').value = '';
  document.getElementById('cal-ev-tipo').value   = 'sesion';
  document.getElementById('cal-ev-hora').value   = '08:00';
  document.getElementById('cal-ev-notif').value  = '15';
  document.getElementById('cal-ev-obs').value    = '';
  const now = new Date();
  const fechaDefault = fechaStr ||
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const fechaInput = document.getElementById('cal-ev-fecha');
  if (fechaInput) {
    fechaInput.value = fechaDefault;
    fechaInput.min   = hoy();
  }
  openModal('modal-calendario');
}

function calAbrirEditar(ev) {
  if (typeof ev === 'string') ev = JSON.parse(ev);
  calEditId = ev.id;
  document.getElementById('cal-modal-titulo').textContent = 'Editar evento';
  document.getElementById('cal-ev-titulo').value = ev.titulo;
  document.getElementById('cal-ev-tipo').value   = ev.tipo;
  document.getElementById('cal-ev-fecha').value  = ev.fecha;
  document.getElementById('cal-ev-hora').value   = ev.hora || '08:00';
  document.getElementById('cal-ev-notif').value  = String(ev.notif || 15);
  document.getElementById('cal-ev-obs').value    = ev.obs || '';
  const fechaInput = document.getElementById('cal-ev-fecha');
  if (fechaInput) fechaInput.min = hoy();
  openModal('modal-calendario');
}

function calGuardarEvento() {
  const titulo = document.getElementById('cal-ev-titulo')?.value?.trim();
  const fecha  = document.getElementById('cal-ev-fecha')?.value;
  if (!titulo || !fecha) { toast('Completa los campos obligatorios', 'warning'); return; }

  if (fecha < hoy()) {
    toast('No puedes crear un evento en una fecha pasada', 'warning');
    return;
  }

  const ev = {
    id:    calEditId || Date.now(),
    titulo,
    tipo:  document.getElementById('cal-ev-tipo').value,
    fecha,
    hora:  document.getElementById('cal-ev-hora').value,
    notif: parseInt(document.getElementById('cal-ev-notif').value),
    obs:   document.getElementById('cal-ev-obs').value,
  };

  if (calEditId) {
    const idx = calEventos.findIndex(e => e.id == calEditId);
    if (idx !== -1) calEventos[idx] = ev;
  } else {
    calEventos.push(ev);
  }

  calSave();
  closeModal('modal-calendario');
  calRenderGrid();
  calRenderUpcoming();
  calRenderNotifBar();
  calScheduleNotifs();
  agregarActividad('purple', '📅', `Evento de calendario: <strong>${titulo}</strong>`, 'Ahora');
  toast(calEditId ? 'Evento actualizado' : 'Evento guardado');
  calEditId = null;
}

function calFmtFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function calPrevMonth() {
  if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
  calRenderGrid();
}

function calNextMonth() {
  if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
  calRenderGrid();
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {

  const docInput      = document.getElementById('na-doc-numero');
  const telefonoInput = document.getElementById('na-telefono');

  if (docInput) {
    docInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });
  }

  if (telefonoInput) {
    telefonoInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
    });
  }

  const Validators = {
    dni:       v => /^[0-9]{8}$/.test(v.trim()),
    ce:        v => /^[a-zA-Z0-9]{9,12}$/.test(v.trim()),
    pasaporte: v => /^[a-zA-Z0-9]{6,12}$/.test(v.trim())
  };

  function validarDocumento(tipo, valor) {
    return Validators[tipo] ? Validators[tipo](valor) : false;
  }

  buildSchedule();
  cargarDatos();
  navigateTo('dashboard');

  console.log('✅ PsiControl inicializado correctamente');
});