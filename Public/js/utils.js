// ═══════════════════════════════════════
// CONSTANTES DE SESIÓN
// ═══════════════════════════════════════
const DURACION_SESION_MIN = 30;
const DURACION_SESION_MS  = DURACION_SESION_MIN * 60 * 1000;

// DATA STORE
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

// ═══════════════════════════════════════
// UTILS DE FECHA Y FORMATO
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
// VALIDACIONES
// ═══════════════════════════════════════
function validarDNI(dni) {
  if (!dni) return true;
  return /^\d{8}$/.test(dni.trim());
}

function bloquearFechasPasadas(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.min = hoy();
}

function aplicarRestriccionFechaNac() {
  const el = document.getElementById('na-fechanac');
  if (!el) return;
  const hoyDate = new Date();
  const maxDate = new Date(hoyDate);
  maxDate.setFullYear(hoyDate.getFullYear() - 11);
  const minDate = new Date(hoyDate);
  minDate.setFullYear(hoyDate.getFullYear() - 17);
  el.max = maxDate.toISOString().split('T')[0];
  el.min = minDate.toISOString().split('T')[0];
}

function slotBase(ms) {
  return Math.floor(ms / DURACION_SESION_MS) * DURACION_SESION_MS;
}

function validarCronologiaEstudiante(idestudiante, nuevaFecha, nuevaHora, idAtencionExcluir = null, atencionesOverride = null) {
  const atenciones = atencionesOverride ?? store.atenciones;

  const delEst = atenciones.filter(a => {
    if (String(a.idestudiante) !== String(idestudiante)) return false;
    if (a.estado === 'cerrado') return false;
    if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
    return !!a.fechahora;
  });

  if (delEst.length === 0) return { ok: true };

  const ultimaCita = delEst.reduce((max, a) => {
    const t = new Date(a.fechahora).getTime();
    return t > max.t ? { t, a } : max;
  }, { t: 0, a: null });

  const nuevaMs  = new Date(`${nuevaFecha}T${nuevaHora}:00`).getTime();
  const ultimaMs = ultimaCita.t;

  if (nuevaMs <= ultimaMs) {
    return {
      ok: false,
      ultimaFecha: fmtFecha(ultimaCita.a.fechahora),
      ultimaHora:  fmtHora(ultimaCita.a.fechahora),
    };
  }

  return { ok: true };
}

async function validarHorarioUnico(fecha, hora, idAtencionExcluir = null, atencionesOverride = null) {
  let atenciones;
  try {
    atenciones = atencionesOverride ?? await apiFetch(`${API}/atenciones`);
  } catch (err) {
    console.error('validarHorarioUnico: fallo al consultar API, se permite continuar', err);
    return true;
  }

  const nuevaMs   = new Date(`${fecha}T${hora}:00`).getTime();
  const nuevoSlot = slotBase(nuevaMs);

  const choca = (atenciones || []).some(a => {
    if (!a.fechahora)           return false;
    if (a.estado === 'cerrado') return false;
    if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
    const existSlot = slotBase(new Date(a.fechahora).getTime());
    return existSlot === nuevoSlot;
  });

  return !choca;
}

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
        if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
        const existSlot = slotBase(new Date(a.fechahora).getTime());
        return existSlot === nuevoSlot;
      });

      if (!ocupado) horas.push(hora);
    }
  }

  return horas;
}

// ═══════════════════════════════════════
// GRADOS Y SECCIONES
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function toast(msg, tipo = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toastEl = document.createElement('div');
  toastEl.className = `toast ${tipo}`;
  toastEl.textContent = msg;
  container.appendChild(toastEl);
  setTimeout(() => { if (toastEl.parentNode) toastEl.remove(); }, 3000);
}

// ═══════════════════════════════════════
// MODALS
// ═══════════════════════════════════════
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

function actualizarSelectEstudiantes() {
  const sel = document.getElementById('mc-paciente');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>' +
    store.estudiantes.map(e => {
      const dni   = e.dni ? ` · DNI: ${e.dni}` : '';
      const label = `${e.codigomatricula || '—'} | ${e.nombres} ${e.apellidos}${dni}`;
      return `<option value="${e.id}">${label}</option>`;
    }).join('');
}

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

// ═══════════════════════════════════════
// ACTIVIDAD
// ═══════════════════════════════════════
function agregarActividad(tipo, icon, texto, tiempo) {
  store.actividad.unshift({ tipo, icon, texto, tiempo });
  if (store.actividad.length > 20) store.actividad.pop();
}