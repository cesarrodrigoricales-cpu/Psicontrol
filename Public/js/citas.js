// ═══════════════════════════════════════════════════════════════
// CITAS.JS — Atenciones + Validaciones
// ═══════════════════════════════════════════════════════════════

const CONFIG_CITAS = {
  HORA_INICIO: 8,
  HORA_FIN:    17,
  DURACION_SESION_MIN: 30,
  MAX_ATENCIONES_DIA: 12,
  MAX_CITAS_PENDIENTES_POR_ESTUDIANTE: 2,
  DIAS_BLOQUEADOS: [0, 6],

  FERIADOS: [
    '2026-01-01','2026-04-02','2026-04-03','2026-05-01',
    '2026-06-07','2026-06-24','2026-06-29','2026-07-23',
    '2026-07-28','2026-07-29','2026-08-06','2026-08-30',
    '2026-10-08','2026-11-01','2026-11-10','2026-12-08',
    '2026-12-09','2026-12-25',
  ],
  VACACIONES: [
    { inicio: '2026-07-13', fin: '2026-07-24' },
    { inicio: '2026-10-05', fin: '2026-10-09' },
    { inicio: '2026-12-21', fin: '2027-03-14' },
  ],
};

function _horaAMinutos(horaStr) {
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + m;
}

function validarNoEsPasado(fecha, hora) {
  const ahora    = new Date();
  const citaDate = new Date(`${fecha}T${hora}:00`);
  if (citaDate < ahora) {
    return { ok: false, mensaje: '⏰ No puedes agendar en una fecha u hora pasada.' };
  }
  return { ok: true };
}

function validarNoDiasBloqueados(fecha) {
  const diaSemana = new Date(fecha + 'T12:00:00').getDay();
  if (CONFIG_CITAS.DIAS_BLOQUEADOS.includes(diaSemana)) {
    const nombres = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return { ok: false, mensaje: `📅 No se puede agendar en ${nombres[diaSemana]}. Solo días hábiles.` };
  }
  return { ok: true };
}

function validarNoFeriado(fecha) {
  if (CONFIG_CITAS.FERIADOS.includes(fecha)) {
    return { ok: false, mensaje: '🎉 Esta fecha es feriado nacional. Elige otro día.' };
  }
  for (const vac of CONFIG_CITAS.VACACIONES) {
    if (fecha >= vac.inicio && fecha <= vac.fin) {
      return { ok: false, mensaje: `🏖️ Esta fecha cae en vacaciones escolares (${vac.inicio} al ${vac.fin}).` };
    }
  }
  return { ok: true };
}

function validarHorarioAtencion(hora) {
  const minutos   = _horaAMinutos(hora);
  const minInicio = CONFIG_CITAS.HORA_INICIO * 60;
  const minFin    = CONFIG_CITAS.HORA_FIN * 60 - CONFIG_CITAS.DURACION_SESION_MIN;
  if (minutos < minInicio) {
    return { ok: false, mensaje: `🕗 El horario de atención comienza a las ${String(CONFIG_CITAS.HORA_INICIO).padStart(2,'0')}:00.` };
  }
  if (minutos > minFin) {
    const horaLimite = Math.floor(minFin / 60);
    const minLimite  = minFin % 60;
    return { ok: false, mensaje: `🕔 La última cita disponible es a las ${String(horaLimite).padStart(2,'0')}:${String(minLimite).padStart(2,'0')}.` };
  }
  return { ok: true };
}


function validarMaxAtencionesDia(fecha, idAtencionExcluir, atenciones) {
  atenciones        = atenciones || store.atenciones;
  idAtencionExcluir = idAtencionExcluir || null;
  const citasDia = (atenciones || []).filter(a => {
    if (!a.fechahora) return false;
    if (ESTADOS_ARCHIVADOS.includes(a.estado)) return false;
    if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
    return a.fechahora.startsWith(fecha);
  });
  if (citasDia.length >= CONFIG_CITAS.MAX_ATENCIONES_DIA) {
    return { ok: false, mensaje: `📋 Se alcanzó el límite de ${CONFIG_CITAS.MAX_ATENCIONES_DIA} atenciones para este día.` };
  }
  return { ok: true };
}

function validarMaxCitasPendientesEstudiante(idestudiante, idAtencionExcluir, atenciones) {
  atenciones        = atenciones || store.atenciones;
  idAtencionExcluir = idAtencionExcluir || null;
  const pendientes = (atenciones || []).filter(a => {
    if (String(a.idestudiante) !== String(idestudiante)) return false;
    if (a.estado !== 'pendiente' && a.estado !== 'activo') return false;
    if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
    return true;
  });
  if (pendientes.length >= CONFIG_CITAS.MAX_CITAS_PENDIENTES_POR_ESTUDIANTE) {
    return { ok: false, mensaje: `⚠️ Este estudiante ya tiene ${pendientes.length} cita(s) pendiente(s). Confirma o cancela las anteriores antes de agendar otra.` };
  }
  return { ok: true };
}

function validarNoDuplicado(idestudiante, fecha, hora, idAtencionExcluir, atenciones) {
  atenciones        = atenciones || store.atenciones;
  idAtencionExcluir = idAtencionExcluir || null;
  const fechahora   = `${fecha}T${hora}`;
  const duplicado = (atenciones || []).find(a => {
    if (String(a.idestudiante) !== String(idestudiante)) return false;
    if (ESTADOS_ARCHIVADOS.includes(a.estado)) return false;
    if (idAtencionExcluir && String(a.id) === String(idAtencionExcluir)) return false;
    return a.fechahora && a.fechahora.startsWith(fechahora);
  });
  if (duplicado) {
    return { ok: false, mensaje: `🔁 Este estudiante ya tiene una cita registrada el ${fmtFecha(fecha)} a las ${hora}.` };
  }
  return { ok: true };
}

function validarEstudianteActivo(idestudiante) {
  const estudiante = (store.estudiantes || []).find(e => String(e.id) === String(idestudiante));
  if (!estudiante) {
    return { ok: false, mensaje: '👤 No se encontró al estudiante en el sistema.' };
  }
  if (estudiante.condicion === 'inactivo' || estudiante.condicion === 'egresado') {
    return { ok: false, mensaje: `⛔ El estudiante ${estudiante.nombres} ${estudiante.apellidos} está ${estudiante.condicion}. No se puede agendar.` };
  }
  return { ok: true, estudiante };
}

function validarPuedeReprogramar(atencion) {
  if (!atencion) return { ok: false, mensaje: '❌ No se encontró la cita.' };
  if (ESTADOS_ARCHIVADOS.includes(atencion.estado)) {
    const textos = {
      asistio:      'ya fue registrada como asistida',
      no_asistio:   'ya fue registrada como inasistencia',
      reprogramado: 'ya fue reprogramada anteriormente',
      cerrado:      'fue cancelada',
    };
    return { ok: false, mensaje: `🔒 Esta cita ${textos[atencion.estado] || 'ya está archivada'} y no puede modificarse.` };
  }
  return { ok: true };
}

function validarPuedeRegistrarAsistencia(atencion) {
  if (!atencion) return { ok: false, mensaje: '❌ No se encontró la cita.' };
  if (ESTADOS_ARCHIVADOS.includes(atencion.estado)) {
    return { ok: false, mensaje: '🔒 Esta cita ya está archivada.' };
  }
  if (!citaVencida(atencion.fechahora)) {
    return { ok: false, mensaje: `⏳ Esta cita aún no ha ocurrido (${fmtFecha(atencion.fechahora)} ${fmtHora(atencion.fechahora)}). No puedes registrar asistencia antes de la fecha.` };
  }
  return { ok: true };
}

async function validarTodaLaCita({ fecha, hora, idestudiante, idAtencionExcluir, atenciones }) {
  atenciones        = atenciones || store.atenciones;
  idAtencionExcluir = idAtencionExcluir || null;

  const checks = [
    () => validarNoEsPasado(fecha, hora),
    () => validarNoDiasBloqueados(fecha),
    () => validarNoFeriado(fecha),
    () => validarHorarioAtencion(hora),
    () => validarEstudianteActivo(idestudiante),
    () => validarMaxAtencionesDia(fecha, idAtencionExcluir, atenciones),
    () => validarMaxCitasPendientesEstudiante(idestudiante, idAtencionExcluir, atenciones),
    () => validarNoDuplicado(idestudiante, fecha, hora, idAtencionExcluir, atenciones),
    async () => {
      const libre = await validarHorarioUnico(fecha, hora, idAtencionExcluir, atenciones);
      if (!libre) {
        const libres     = generarHorasDisponibles(fecha, idAtencionExcluir, null);
        const sugerencia = libres.length ? ` Próximo disponible: ${libres[0]}` : ' No hay horarios libres ese día.';
        return { ok: false, mensaje: `❌ Ese horario ya está ocupado.${sugerencia}` };
      }
      return { ok: true };
    },
    () => {
      const r = validarCronologiaEstudiante(idestudiante, fecha, hora, idAtencionExcluir, atenciones);
      if (!r.ok) {
        if (r.motivo === 'fecha_minima') {
          return { ok: false, mensaje: `❌ Para la 3ra cita en adelante, agenda después del ${r.fechaMinimaFmt}.` };
        }
        return { ok: false, mensaje: `❌ Debes agendar DESPUÉS de la última cita (${r.ultimaFecha} ${r.ultimaHora}).` };
      }
      return { ok: true };
    },
  ];

  for (const check of checks) {
    const resultado = await check();
    if (!resultado.ok) {
      toast(resultado.mensaje, 'warning');
      return resultado;
    }
  }
  return { ok: true };
}

// ══════════════════════════════════════════════════════════════════
// SECCIÓN 2: FUNCIONES DE CITAS / ATENCIONES
// ══════════════════════════════════════════════════════════════════

function limpiarFechahora(fh) {
  if (!fh) return fh;
  return fh.replace('T', ' ').replace(/\.\d+Z?$/, '').replace('Z', '');
}

function limpiarAtencion(a) {
  return Object.assign({}, a, { fechahora: limpiarFechahora(a.fechahora) });
}

async function cargarYRenderCitas() {
  try {
    const data = await apiFetch(API + '/atenciones');
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

  let lista;
  if (citaFiltro === 'todas') {
    lista = store.atenciones.filter(a => a.estado === 'pendiente' || a.estado === 'activo');
  } else if (citaFiltro === 'archivadas') {
    lista = store.atenciones.filter(a => ESTADOS_ARCHIVADOS.includes(a.estado));
  } else {
    lista = store.atenciones.filter(a => a.estado === citaFiltro);
  }

  if (lista.length === 0) {
    // CORRECCIÓN #2: objeto msgs sin claves duplicadas
    const msgs = {
      todas:        'No hay citas activas',
      archivadas:   'No hay citas archivadas',
      asistio:      'No hay citas con asistencia',
      no_asistio:   'No hay inasistencias',
      reprogramado: 'No hay citas reprogramadas',
      cerrado:      'No hay citas cerradas',
    };
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">' +
      (msgs[citaFiltro] || 'No hay atenciones') + '</div></div></td></tr>';
    return;
  }

  const hoyStr = hoy(); // "YYYY-MM-DD"

  function fechSolo(fh) {
    if (!fh) return '';
    return fh.replace('T', ' ').substring(0, 10);
  }

  const citasHoy      = lista.filter(a => fechSolo(a.fechahora) === hoyStr);
  const citasProximas = lista.filter(a => fechSolo(a.fechahora) > hoyStr);
  const citasVencidas = lista.filter(a => fechSolo(a.fechahora) < hoyStr);

  // Ordenar
  const sortAsc = (a, b) => new Date(a.fechahora) - new Date(b.fechahora);
  citasHoy.sort(sortAsc);
  citasProximas.sort(sortAsc);
  citasVencidas.sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora)); // más reciente primero

  // CORRECCIÓN #1: buildRow con una sola declaración de variables y bloque acciones limpio
  function buildRow(a, esHoy) {
    const gradoRaw       = String(a.grado || '').replace('to', '').trim();
    const gradoMostrar   = gradoRaw ? (gradoRaw.includes('°') ? gradoRaw : gradoRaw + '°') : '—';
    const seccionMostrar = a.seccion || '—';
    const esArchivada    = ESTADOS_ARCHIVADOS.includes(a.estado);
    const vencida        = !esArchivada && (citaVencida(a.fechahora) || a.estado === 'activo');

    let acciones = '';
    if (esArchivada) {
      acciones = '<span style="font-size:11px;color:var(--text-muted);font-style:italic;">' + estadoTextoCorto(a.estado) + '</span>';
    } else if (vencida || esHoy) {
      acciones =
        '<div class="td-actions">' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--teal);border-color:var(--teal);" onclick="registrarAsistencia(' + a.id + ')">✅ Asistió</button>' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="registrarNoAsistencia(' + a.id + ')">❌ No asistió</button>' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--purple);border-color:var(--purple);" onclick="abrirReprogramacion(' + a.id + ')">🔄 Reprogramar</button>' +
        '</div>';
    } else {
      acciones =
        '<div class="td-actions">' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--purple);border-color:var(--purple);" onclick="abrirReprogramacion(' + a.id + ')">🔄 Reprogramar</button>' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="cancelarAtencion(' + a.id + ')">Cancelar</button>' +
        '</div>';
    }

    // Hora resaltada si es hoy
    const horaStyle = esHoy
      ? 'font-weight:700;color:var(--teal);font-size:15px;'
      : 'font-weight:600;';

    return '<tr id="atencion-row-' + a.id + '">' +
      '<td>' + fmtFecha(a.fechahora) + '</td>' +
      '<td style="' + horaStyle + '">' + fmtHora(a.fechahora) + '</td>' +
      '<td>' + (a.motivoconsulta || '—') + '</td>' +
      '<td>' + gradoMostrar + ' ' + seccionMostrar + '</td>' +
      '<td>' + nivelBadge(a.nivelatencion) + '</td>' +
      '<td>' + estadoBadge(a.estado) + '</td>' +
      '<td>' +
        '<div class="td-name">' +
          '<div class="td-avatar ' + colorAvatar(a.paciente) + '">' + initials(a.paciente) + '</div>' +
          '<div>' +
            '<div>' + a.paciente + '</div>' +
            (a.dni ? '<div style="font-size:11px;color:var(--text-muted);">DNI: ' + a.dni + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + acciones + '</td>' +
    '</tr>';
  }

  function sectionHeader(icono, titulo, color, count) {
    return '<tr>' +
      '<td colspan="8" style="padding:18px 8px 6px;border-bottom:none;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + color + ';display:inline-block;"></span>' +
          '<span style="font-size:13px;font-weight:600;color:' + color + ';">' + icono + ' ' + titulo + '</span>' +
          '<span style="font-size:11px;color:var(--text-muted);background:var(--bg-secondary,#f3f4f6);padding:1px 8px;border-radius:99px;">' + count + '</span>' +
        '</div>' +
        '<div style="height:2px;background:' + color + ';opacity:0.18;border-radius:2px;margin-top:6px;"></div>' +
      '</td>' +
    '</tr>';
  }

  function emptyRow(msg) {
    return '<tr><td colspan="8" style="padding:10px 20px;font-size:12px;color:var(--text-muted);font-style:italic;">' + msg + '</td></tr>';
  }

  // CORRECCIÓN #3: indentación correcta de `let html`
  let html = '';

  // ── HOY ── (primero)
  html += sectionHeader('📅', 'Hoy', 'var(--teal, #1D9E75)', citasHoy.length);
  if (citasHoy.length === 0) {
    html += emptyRow('Sin citas programadas para hoy');
  } else {
    html += citasHoy.map(a => buildRow(a, true)).join('');
  }

  // ── VENCIDAS ── (segundo, si las hay)
  if (citasVencidas.length > 0) {
    html += sectionHeader('⚠️', 'Vencidas — pendientes de registro', 'var(--rose, #e74c3c)', citasVencidas.length);
    html += citasVencidas.map(a => buildRow(a, true)).join('');
  }

  // ── PRÓXIMAS ── (al final)
  if (citasProximas.length > 0) {
    html += sectionHeader('🗓️', 'Próximas citas', 'var(--text-muted, #888)', citasProximas.length);
    html += citasProximas.map(a => buildRow(a, false)).join('');
  }

  tbody.innerHTML = html;
}

function estadoTextoCorto(estado) {
  const t = { asistio:'Asistió', no_asistio:'No asistió', reprogramado:'Reprogramado', cerrado:'Cancelada', activo:'Activo' };
  return t[estado] || estado;
}

function filterCitas(tipo) {
  citaFiltro = tipo;
  renderCitas();
}

async function registrarAsistencia(id) {
  try {
    const atencion = store.atenciones.find(function(a) { return a.id == id; });
    if (!atencion) return;

    const check = validarPuedeRegistrarAsistencia(atencion);
    if (!check.ok) { toast(check.mensaje, 'warning'); return; }

    await apiFetch(API + '/atenciones/' + id, {
      method: 'PUT',
      body: JSON.stringify(limpiarAtencion(Object.assign({}, atencion, { estado: 'asistio' })))
    });

    const idx = store.atenciones.findIndex(function(a) { return a.id == id; });
    if (idx !== -1) store.atenciones[idx].estado = 'asistio';

    agregarActividad('teal', '✅', 'Asistencia registrada: <strong>' + atencion.paciente + '</strong>', 'Ahora');
    renderCitas();
    renderDashboard();
    toast('✅ Asistencia registrada correctamente');
  } catch (err) {
    console.error('Error registrando asistencia:', err);
    toast('Error al registrar asistencia', 'warning');
  }
}

async function registrarNoAsistencia(id) {
  if (!confirm('¿Confirmar que el estudiante NO asistió a esta cita?')) return;
  try {
    const atencion = store.atenciones.find(function(a) { return a.id == id; });
    if (!atencion) return;

    await apiFetch(API + '/atenciones/' + id, {
      method: 'PUT',
      body: JSON.stringify(limpiarAtencion(Object.assign({}, atencion, { estado: 'no_asistio' })))
    });

    const idx = store.atenciones.findIndex(function(a) { return a.id == id; });
    if (idx !== -1) store.atenciones[idx].estado = 'no_asistio';

    agregarActividad('rose', '❌', 'Inasistencia registrada: <strong>' + atencion.paciente + '</strong>', 'Ahora');
    renderCitas();
    renderDashboard();
    toast('Inasistencia registrada', 'warning');
  } catch (err) {
    console.error('Error registrando inasistencia:', err);
    toast('Error al registrar inasistencia', 'warning');
  }
}

async function cancelarAtencion(id) {
  if (!confirm('¿Cancelar esta cita? Se marcará como cerrada.')) return;
  try {
    const atencion = store.atenciones.find(function(a) { return a.id == id; });
    if (!atencion) return;

    try {
      await apiFetch(API + '/atenciones/' + id, {
        method: 'PUT',
        body: JSON.stringify(limpiarAtencion(Object.assign({}, atencion, { estado: 'cerrado' })))
      });
      const idx = store.atenciones.findIndex(function(a) { return a.id == id; });
      if (idx !== -1) store.atenciones[idx].estado = 'cerrado';
    } catch (_) {
      await apiFetch(API + '/atenciones/' + id, { method: 'DELETE' });
      store.atenciones = store.atenciones.filter(function(a) { return a.id != id; });
    }

    agregarActividad('rose', '🔒', 'Cita cancelada: <strong>' + atencion.paciente + '</strong>', 'Ahora');
    renderCitas();
    renderDashboard();
    toast('Cita cancelada', 'warning');
  } catch (err) {
    console.error('Error cancelando cita:', err);
    toast('Error al cancelar la cita', 'warning');
  }
}

async function abrirReprogramacion(id) {
  const atencion = store.atenciones.find(function(a) { return a.id == id; });
  if (!atencion) return;

  const checkRep = validarPuedeReprogramar(atencion);
  if (!checkRep.ok) { toast(checkRep.mensaje, 'warning'); return; }

  try {
    const frescas = await apiFetch(API + '/atenciones');
    store.atenciones = frescas || [];
  } catch (_) {}

  let modal = document.getElementById('modal-reprogramar');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'modal-reprogramar';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal" style="max-width:500px;">' +
        '<div class="modal-header">' +
          '<div class="modal-title">🔄 Reprogramar cita</div>' +
          '<button class="modal-close" onclick="closeModal(\'modal-reprogramar\')">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div id="rp-subtitulo" style="font-size:13px;color:var(--text-muted);margin-bottom:16px;"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
            '<div class="form-group"><label>Nueva fecha *</label><input type="date" id="rp-fecha"></div>' +
            '<div class="form-group"><label>Nueva hora *</label><select id="rp-hora"><option value="">-- Selecciona hora --</option></select></div>' +
            '<div class="form-group full"><label>Motivo del cambio</label><input type="text" id="rp-motivo" placeholder="Ej: El estudiante no pudo asistir..."></div>' +
          '</div>' +
          '<div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">' +
            '<button class="btn-secondary" onclick="closeModal(\'modal-reprogramar\')">Cancelar</button>' +
            '<button class="btn-primary" id="btn-guardar-reprogramar">Guardar nueva cita</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }

  document.getElementById('rp-subtitulo').textContent =
    'Estudiante: ' + atencion.paciente + ' · Cita original: ' + fmtFecha(atencion.fechahora) + ' ' + fmtHora(atencion.fechahora);

  // Fecha mínima = día siguiente a la cita original o calcularFechaMinima, lo que sea mayor
  const fechaCitaOriginal = atencion.fechahora.split('T')[0];
  const diaSiguiente = new Date(new Date(fechaCitaOriginal + 'T12:00:00').getTime() + 86400000)
    .toISOString().split('T')[0];
  const minFechaCronologia = calcularFechaMinima(atencion.idestudiante, id);
  const minFecha = diaSiguiente > minFechaCronologia ? diaSiguiente : minFechaCronologia;

  const fechaEl = document.getElementById('rp-fecha');
  if (fechaEl) {
    fechaEl.min      = minFecha;
    fechaEl.value    = minFecha;
    fechaEl.onchange = function() {
      actualizarHorasSelectConEstudiante('rp-hora', this.value, atencion.idestudiante, id);
    };
    actualizarHorasSelectConEstudiante('rp-hora', minFecha, atencion.idestudiante, id);
  }

  modal.classList.add('open');

  const btnOld = document.getElementById('btn-guardar-reprogramar');
  const btnNew = btnOld.cloneNode(true);
  btnOld.parentNode.replaceChild(btnNew, btnOld);

  document.getElementById('btn-guardar-reprogramar').onclick = async function() {
    const fecha = document.getElementById('rp-fecha')?.value;
    const hora  = document.getElementById('rp-hora')?.value;

    if (!fecha || !hora) { toast('Indica la nueva fecha y hora', 'warning'); return; }
    if (fecha < hoy())   { toast('No puedes agendar en una fecha pasada', 'warning'); return; }

    const disponible = await validarHorarioUnico(fecha, hora, id, store.atenciones);
    if (!disponible) {
      const libres     = generarHorasDisponibles(fecha, id, null);
      const sugerencia = libres.length ? ' Próximo disponible: ' + libres[0] : ' No hay horarios libres ese día.';
      toast('❌ Horario ocupado.' + sugerencia, 'warning');
      return;
    }

    const cronOk = validarCronologiaEstudiante(atencion.idestudiante, fecha, hora, id, store.atenciones);
    if (!cronOk.ok) {
      if (cronOk.motivo === 'fecha_minima') {
        toast('❌ Para la 3ra cita en adelante, debes agendar después del ' + cronOk.fechaMinimaFmt, 'warning');
      } else {
        toast('❌ Debes agendar DESPUÉS de la última cita (' + cronOk.ultimaFecha + ' ' + cronOk.ultimaHora + ')', 'warning');
      }
      return;
    }

    try {
      await apiFetch(API + '/atenciones/' + id, {
        method: 'PUT',
        body: JSON.stringify(limpiarAtencion(Object.assign({}, atencion, { estado: 'reprogramado' })))
      });

      const fechahora = fecha + 'T' + hora + ':00';
      await apiFetch(API + '/atenciones', {
        method: 'POST',
        body: JSON.stringify({
          idestudiante:  atencion.idestudiante,
          fechahora,
          nivelatencion: atencion.nivelatencion || 'moderado',
          idmotivo:      atencion.idmotivo      || 1,
          estado:        'pendiente',
          grado:         atencion.grado         || '',
          seccion:       atencion.seccion        || '',
        })
      });

      agregarActividad('purple', '🔄', 'Cita reprogramada: <strong>' + atencion.paciente + '</strong>', 'Ahora');
      toast('🔄 Cita reprogramada correctamente');
      closeModal('modal-reprogramar');
      await cargarDatos();
      renderCitas();
      renderDashboard();
    } catch (err) {
      console.error('Error reprogramando cita:', err);
      toast('Error al reprogramar la cita', 'warning');
    }
  };
}

async function guardarCita() {
  const idestudiante  = document.getElementById('mc-paciente')?.value?.trim();
  const fecha         = document.getElementById('mc-fecha')?.value;
  const hora          = document.getElementById('mc-hora')?.value?.trim();
  const nivelatencion = document.getElementById('mc-nivel')?.value || 'moderado';

  if (!idestudiante || !fecha || !hora) {
    toast('Completa los campos obligatorios', 'warning');
    return;
  }

  const resultado = await validarTodaLaCita({ fecha, hora, idestudiante: parseInt(idestudiante) });
  if (!resultado.ok) return;

  const motivoTexto = document.getElementById('mc-motivo')?.value?.trim() || 'Consulta general';
  let idmotivo = 1;
  try {
    const motivos    = await apiFetch(API + '/motivosconsulta');
    const encontrado = motivos.find(function(m) { return m.descripcion === motivoTexto || m.nombre === motivoTexto; });
    idmotivo = encontrado ? encontrado.idmotivo : (motivos[0]?.idmotivo || 1);
  } catch (_) {}

  const gradoModal   = document.getElementById('mc-grado')?.value   || '';
  const seccionModal = document.getElementById('mc-seccion')?.value || '';
  const estModal     = store.estudiantes.find(function(e) { return e.id == parseInt(idestudiante); });
  const gradoFinal   = gradoModal   || estModal?.grado   || '';
  const seccionFinal = seccionModal || estModal?.seccion || '';

  try {
    await apiFetch(API + '/atenciones', {
      method: 'POST',
      body: JSON.stringify({
        idestudiante: parseInt(idestudiante),
        fechahora:    fecha + 'T' + hora + ':00',
        estado:       'pendiente',
        idmotivo,
        nivelatencion,
        grado:        gradoFinal,
        seccion:      seccionFinal,
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

function mostrarModalSegundaCita(callback) {
  let modal = document.getElementById('modal-segunda-cita');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'modal-segunda-cita';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal" style="max-width:420px;">' +
        '<div class="modal-header">' +
          '<div class="modal-title">📅 ¿Agendar segunda cita?</div>' +
          '<button class="modal-close" onclick="closeModal(\'modal-segunda-cita\')">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p style="color:var(--text-secondary);font-size:14px;margin-bottom:20px;line-height:1.6;">' +
            'El estudiante ha sido registrado con su primera sesión.<br>' +
            '¿Deseas agendar también una <strong>segunda cita</strong> ahora?' +
          '</p>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
            '<button class="btn-secondary" id="btn-solo-primera" style="font-size:13px;">No, solo guardar la primera</button>' +
            '<button class="btn-primary" id="btn-agendar-segunda" style="font-size:13px;">📅 Sí, agendar segunda cita</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }

  modal.classList.add('open');

  document.getElementById('btn-solo-primera').onclick = function() {
    modal.classList.remove('open');
    callback(false);
  };
  document.getElementById('btn-agendar-segunda').onclick = function() {
    modal.classList.remove('open');
    callback(true);
  };
  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.classList.remove('open');
      callback(false);
    }
  };
}

async function abrirFormularioSegundaCita(idestudiante, nombreCompleto) {
  try {
    const frescas = await apiFetch(API + '/atenciones');
    store.atenciones = frescas || [];
  } catch (_) {}

  let modal = document.getElementById('modal-form-segunda-cita');
  if (!modal) {
    modal = document.createElement('div');
    modal.id        = 'modal-form-segunda-cita';
    modal.className = 'modal-overlay';
    modal.innerHTML =
      '<div class="modal" style="max-width:500px;">' +
        '<div class="modal-header">' +
          '<div class="modal-title">📅 Segunda cita</div>' +
          '<button class="modal-close" onclick="closeModal(\'modal-form-segunda-cita\')">✕</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div id="sc-subtitulo" style="font-size:13px;color:var(--text-muted);margin-bottom:16px;"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
            '<div class="form-group"><label>Fecha *</label><input type="date" id="sc-fecha"></div>' +
            '<div class="form-group"><label>Hora *</label><select id="sc-hora"><option value="">-- Selecciona hora --</option></select></div>' +
            '<div class="form-group full"><label>Motivo de consulta</label><input type="text" id="sc-motivo" placeholder="Ej: Seguimiento, ansiedad, etc."></div>' +
            '<div class="form-group full"><label>Observaciones</label><textarea id="sc-observaciones" placeholder="Observaciones..." style="min-height:60px;"></textarea></div>' +
          '</div>' +
          '<div style="margin-top:18px;display:flex;gap:10px;justify-content:flex-end;">' +
            '<button class="btn-secondary" onclick="closeModal(\'modal-form-segunda-cita\')">Cancelar</button>' +
            '<button class="btn-primary" id="btn-guardar-segunda">Guardar segunda cita</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }

  const citasDelEst = store.atenciones
    .filter(function(a) { return String(a.idestudiante) === String(idestudiante) && !!a.fechahora; })
    .sort(function(a, b) { return new Date(a.fechahora) - new Date(b.fechahora); });
  const motivoPrimera = citasDelEst[0]?.motivoconsulta || citasDelEst[0]?.motivo || null;

  const subtituloEl = document.getElementById('sc-subtitulo');
  if (subtituloEl) {
    subtituloEl.innerHTML = '<strong>Estudiante:</strong> ' + nombreCompleto +
      (motivoPrimera ? '<br><span style="margin-top:4px;display:inline-block;"><strong>Motivo 1ra cita:</strong> ' + motivoPrimera + '</span>' : '');
  }

  const minFecha = calcularFechaMinima(idestudiante);
  const fechaEl  = document.getElementById('sc-fecha');
  if (fechaEl) {
    fechaEl.min      = minFecha;
    fechaEl.value    = minFecha;
    fechaEl.onchange = function() {
      actualizarHorasSelectConEstudiante('sc-hora', this.value, idestudiante);
    };
    actualizarHorasSelectConEstudiante('sc-hora', minFecha, idestudiante);
  }

  modal.classList.add('open');

  const btnGuardar = document.getElementById('btn-guardar-segunda');
  const btnNuevo   = btnGuardar.cloneNode(true);
  btnGuardar.parentNode.replaceChild(btnNuevo, btnGuardar);

  document.getElementById('btn-guardar-segunda').onclick = async function() {
    const fecha = document.getElementById('sc-fecha')?.value;
    const hora  = document.getElementById('sc-hora')?.value;
    const obs   = document.getElementById('sc-observaciones')?.value?.trim();

    if (!fecha || !hora) { toast('Indica la fecha y hora de la segunda cita', 'warning'); return; }

    const resultado = await validarTodaLaCita({ fecha, hora, idestudiante: parseInt(idestudiante) });
    if (!resultado.ok) return;

    const estSC = store.estudiantes.find(function(e) { return e.id == parseInt(idestudiante); });

    try {
      await apiFetch(API + '/atenciones', {
        method: 'POST',
        body: JSON.stringify({
          idestudiante:  parseInt(idestudiante),
          fechahora:     fecha + 'T' + hora + ':00',
          nivelatencion: 'moderado',
          idmotivo:      1,
          estado:        'pendiente',
          observaciones: obs || null,
          grado:         estSC?.grado   || '',
          seccion:       estSC?.seccion || '',
        })
      });

      agregarActividad('teal', '📅', 'Segunda cita registrada para <strong>' + nombreCompleto + '</strong>', 'Ahora');
      toast('✓ Segunda cita agendada para ' + nombreCompleto);
      closeModal('modal-form-segunda-cita');
      await cargarDatos();
      renderCitas();
      renderDashboard();
    } catch (err) {
      console.error(err);
      toast('Error al guardar segunda cita', 'warning');
    }
  };
}

function verAtencionDetalle(id) {
  const a = store.atenciones.find(function(x) { return x.id == id; });
  if (!a) return;
  toast(a.paciente + ' · ' + fmtFecha(a.fechahora) + ' ' + fmtHora(a.fechahora), 'info');
}