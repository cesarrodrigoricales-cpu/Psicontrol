// CONSTANTES DE SESIÓN
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

const ESTADOS_ARCHIVADOS = ['asistio', 'no_asistio', 'reprogramado', 'cerrado'];

function citaVencida(fechahora) {
  if (!fechahora) return false;
  return new Date(fechahora).getTime() < Date.now();
}

// UTILS DE FECHA Y FORMATO
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
  return String(h).padStart(2, '0') + ':' + m + ' ' + period;
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
  const clases = {
    pendiente:    'c-amber',
    asistio:      'c-teal',
    no_asistio:   'c-rose',
    reprogramado: 'c-purple',
    cerrado:      'c-slate',
    activo:       'c-teal',
    derivado:     'c-rose',
  };
  const labels = {
    pendiente:    'Pendiente',
    asistio:      'Asistió',
    no_asistio:   'No asistió',
    reprogramado: 'Reprogramado',
    cerrado:      'Cerrado',
    activo:       'En curso',
    derivado:     'Derivado',
  };
  return '<span class="appt-badge ' + (clases[e] || 'c-amber') + '">' + (labels[e] || capitalize(e)) + '</span>';
}

function nivelBadge(n) {
  const map = { leve:'🟢', moderado:'🟡', grave:'🔴' };
  return '<span title="' + n + '">' + (map[n] || '⚪') + '</span>';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// VALIDACIONES
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
  minDate.setFullYear(hoyDate.getFullYear() - 18);
  el.max = maxDate.toISOString().split('T')[0];
  el.min = minDate.toISOString().split('T')[0];
}

function slotBase(ms) {
  return Math.floor(ms / DURACION_SESION_MS) * DURACION_SESION_MS;
}

function validarCronologiaEstudiante(idestudiante, nuevaFecha, nuevaHora, idAtencionExcluir, atencionesOverride) {
  idAtencionExcluir = idAtencionExcluir || null;
  const atenciones = atencionesOverride || store.atenciones;

  const delEst = atenciones
    .filter(function(a) {
      if (String(a.idestudiante) !== String(idestudiante)) return false;
      if (ESTADOS_ARCHIVADOS.includes(a.estado)) return false;
      if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
      return !!a.fechahora;
    })
    .sort(function(a, b) { return new Date(a.fechahora) - new Date(b.fechahora); });

  if (delEst.length === 0) return { ok: true };

  const ultimaCita = delEst[delEst.length - 1];
  const ultimaMs   = new Date(ultimaCita.fechahora).getTime();
  const nuevaMs    = new Date(nuevaFecha + 'T' + nuevaHora + ':00').getTime();

  if (nuevaMs <= ultimaMs) {
    return {
      ok: false,
      motivo: 'cronologia',
      ultimaFecha: fmtFecha(ultimaCita.fechahora),
      ultimaHora:  fmtHora(ultimaCita.fechahora),
    };
  }

  if (delEst.length >= 2) {
    const penultimaCita  = delEst[delEst.length - 2];
    const penultimaFecha = penultimaCita.fechahora.split('T')[0];

    if (nuevaFecha <= penultimaFecha) {
      return {
        ok: false,
        motivo: 'fecha_minima',
        fechaMinima:    penultimaFecha,
        fechaMinimaFmt: fmtFecha(penultimaCita.fechahora),
        ultimaFecha:    fmtFecha(ultimaCita.fechahora),
        ultimaHora:     fmtHora(ultimaCita.fechahora),
      };
    }
  }

  return { ok: true };
}

// REGLA 2: Horario único global
async function validarHorarioUnico(fecha, hora, idAtencionExcluir, atencionesOverride) {
  idAtencionExcluir = idAtencionExcluir || null;
  let atenciones;
  try {
    atenciones = atencionesOverride || await apiFetch(API + '/atenciones');
  } catch (err) {
    console.error('validarHorarioUnico: fallo al consultar API, se permite continuar', err);
    return true;
  }

  const nuevaMs   = new Date(fecha + 'T' + hora + ':00').getTime();
  const nuevoSlot = slotBase(nuevaMs);

  const choca = (atenciones || []).some(function(a) {
    if (!a.fechahora) return false;
    if (ESTADOS_ARCHIVADOS.includes(a.estado)) return false;
    if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
    const existSlot = slotBase(new Date(a.fechahora).getTime());
    return existSlot === nuevoSlot;
  });

  return !choca;
}

// Genera horas disponibles combinando ambas reglas
function generarHorasDisponibles(fecha, idAtencionExcluir, idestudiante) {
  idAtencionExcluir = idAtencionExcluir || null;
  idestudiante      = idestudiante      || null;
  if (!fecha) return [];

  const horas = [];

  for (let h = 8; h <= 17; h++) {
    const minutos = ['00', '30'];
    for (let mi = 0; mi < minutos.length; mi++) {
      const m = minutos[mi];
      if (h === 17 && m === '30') continue;

      const hora      = String(h).padStart(2,'0') + ':' + m;
      const slotMs    = new Date(fecha + 'T' + hora + ':00').getTime();
      const nuevoSlot = slotBase(slotMs);

      const ocupado = store.atenciones.some(function(a) {
        if (!a.fechahora) return false;
        if (ESTADOS_ARCHIVADOS.includes(a.estado)) return false;
        if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
        const existSlot = slotBase(new Date(a.fechahora).getTime());
        return existSlot === nuevoSlot;
      });

      if (ocupado) continue;

      if (idestudiante) {
        const cronOk = validarCronologiaEstudiante(idestudiante, fecha, hora, idAtencionExcluir, null);
        if (!cronOk.ok) continue;
      }

      horas.push(hora);
    }
  }

  return horas;
}

// Fecha mínima para el input según citas del estudiante
function calcularFechaMinima(idestudiante, idAtencionExcluir, atencionesOverride) {
  idAtencionExcluir = idAtencionExcluir || null;
  const atenciones  = atencionesOverride || store.atenciones;

  const delEst = atenciones
    .filter(function(a) {
      if (String(a.idestudiante) !== String(idestudiante)) return false;
      if (ESTADOS_ARCHIVADOS.includes(a.estado)) return false;
      if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
      return !!a.fechahora;
    })
    .sort(function(a, b) { return new Date(a.fechahora) - new Date(b.fechahora); });

  if (delEst.length >= 2) {
    const penultima = delEst[delEst.length - 2];
    const d = new Date(penultima.fechahora);
    d.setDate(d.getDate() + 1);
    const minFecha = d.toISOString().split('T')[0];
    return minFecha > hoy() ? minFecha : hoy();
  }

  if (delEst.length === 1) {
    const ultima = delEst[0].fechahora.split('T')[0];
    return ultima > hoy() ? ultima : hoy();
  }

  return hoy();
}

// GRADOS Y SECCIONES
const GRADOS    = ['1°','2°','3°','4°','5°'];
const SECCIONES = ['A','B','C','D'];

function buildGradoSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Grado --</option>' +
    GRADOS.map(function(g) { return '<option value="' + g + '">' + g + '°</option>'; }).join('');
}

function buildSeccionSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Sección --</option>' +
    SECCIONES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
}

// TOAST
function toast(msg, tipo) {
  tipo = tipo || 'success';
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toastEl = document.createElement('div');
  toastEl.className = 'toast ' + tipo;
  toastEl.textContent = msg;
  container.appendChild(toastEl);
  setTimeout(function() { if (toastEl.parentNode) toastEl.remove(); }, 3000);
}

// MODALS
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

    const selPaciente = document.getElementById('mc-paciente');
    if (selPaciente) {
      const nuevo = selPaciente.cloneNode(true);
      selPaciente.parentNode.replaceChild(nuevo, selPaciente);
      actualizarSelectEstudiantes();

      document.getElementById('mc-paciente').addEventListener('change', function() {
        const est = store.estudiantes.find(function(e) { return e.id === parseInt(this.value); }.bind(this));
        const gradoSel   = document.getElementById('mc-grado');
        const seccionSel = document.getElementById('mc-seccion');

        if (est) {
          const gradoVal = String(est.grado || '').replace('°','').replace('to','').trim();
          if (gradoSel)   gradoSel.value   = gradoVal;
          if (seccionSel) seccionSel.value = est.seccion || '';

          const fechaEl = document.getElementById('mc-fecha');
          if (fechaEl) {
            const minFecha = calcularFechaMinima(est.id);
            fechaEl.min = minFecha;
            if (fechaEl.value < minFecha) fechaEl.value = minFecha;
            actualizarHorasSelectConEstudiante('mc-hora', fechaEl.value, est.id);
          }
        } else {
          if (gradoSel)   gradoSel.value   = '';
          if (seccionSel) seccionSel.value = '';
          const fechaEl = document.getElementById('mc-fecha');
          if (fechaEl) {
            fechaEl.min = hoy();
            actualizarHorasDisponibles(fechaEl.value);
          }
        }
      });

      const fechaEl2 = document.getElementById('mc-fecha');
      if (fechaEl2) {
        fechaEl2.addEventListener('change', function() {
          const idEst = parseInt(document.getElementById('mc-paciente')?.value);
          if (idEst) {
            actualizarHorasSelectConEstudiante('mc-hora', this.value, idEst);
          } else {
            actualizarHorasSelect('mc-hora', this.value);
          }
        });
      }
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function actualizarSelectEstudiantes() {
  const sel = document.getElementById('mc-paciente');
  if (!sel) return;

  const idsConAtencion = new Set(store.atenciones.map(function(a) { return a.idestudiante; }));
  const conAtencion    = store.estudiantes.filter(function(e) { return idsConAtencion.has(e.id); });

  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>';
  conAtencion
    .sort(function(a, b) {
      return (a.apellidos + ' ' + a.nombres).localeCompare(b.apellidos + ' ' + b.nombres);
    })
    .forEach(function(e) {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.apellidos + ', ' + e.nombres + ' · DNI: ' + (e.dni || '—');
      sel.appendChild(opt);
    });
}

function actualizarHorasSelect(selectId, fecha, idExcluir) {
  idExcluir = idExcluir || null;
  const sel = document.getElementById(selectId);
  if (!sel || !fecha) return;
  const disponibles = generarHorasDisponibles(fecha, idExcluir, null);
  if (disponibles.length === 0) {
    sel.innerHTML = '<option value="">— Sin horarios disponibles —</option>';
  } else {
    sel.innerHTML = '<option value="">-- Selecciona hora --</option>' +
      disponibles.map(function(h) { return '<option value="' + h + '">' + h + '</option>'; }).join('');
  }
}

function actualizarHorasSelectConEstudiante(selectId, fecha, idestudiante, idExcluir) {
  idExcluir = idExcluir || null;
  const sel = document.getElementById(selectId);
  if (!sel || !fecha) return;
  const disponibles = generarHorasDisponibles(fecha, idExcluir, idestudiante);
  if (disponibles.length === 0) {
    sel.innerHTML = '<option value="">— Sin horarios disponibles —</option>';
  } else {
    sel.innerHTML = '<option value="">-- Selecciona hora --</option>' +
      disponibles.map(function(h) { return '<option value="' + h + '">' + h + '</option>'; }).join('');
  }
}

function actualizarHorasDisponibles(fecha) {
  actualizarHorasSelect('mc-hora', fecha);
}

// ACTIVIDAD
function agregarActividad(tipo, icon, texto, tiempo) {
  store.actividad.unshift({ tipo: tipo, icon: icon, texto: texto, tiempo: tiempo });
  if (store.actividad.length > 20) store.actividad.pop();
}