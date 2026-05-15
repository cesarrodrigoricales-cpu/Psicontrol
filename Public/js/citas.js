// CITAS.JS
function limpiarFechahora(fh) {
  if (!fh) return fh;
  return fh.replace('T', ' ').replace(/\.\d+Z?$/, '').replace('Z', '');
}

function limpiarAtencion(a) {
  return Object.assign({}, a, { fechahora: limpiarFechahora(a.fechahora) });
}


// ATENCIONES / CITAS

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

  // Filtros de vista
  // 'todas'       → pendientes (activas)
  // 'archivadas'  → asistio + no_asistio + reprogramado + cerrado
  // cualquier otro estado → ese estado específico
  let lista;
  if (citaFiltro === 'todas') {
    lista = store.atenciones.filter(function(a) { return a.estado === 'pendiente' || a.estado === 'activo'; });
  } else if (citaFiltro === 'archivadas') {
    lista = store.atenciones.filter(function(a) { return ESTADOS_ARCHIVADOS.includes(a.estado); });
  } else {
    lista = store.atenciones.filter(function(a) { return a.estado === citaFiltro; });
  }

  if (lista.length === 0) {
    const msgs = {
      todas:       'No hay citas activas',
      archivadas:  'No hay citas archivadas',
      asistio:     'No hay citas con asistencia',
      no_asistio:  'No hay inasistencias',
      reprogramado:'No hay citas reprogramadas',
      cerrado:     'No hay citas cerradas',
    };
    const msg = msgs[citaFiltro] || 'No hay atenciones para mostrar';
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">' + msg + '</div></div></td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(function(a) {
    const gradoRaw     = String(a.grado || '').replace('to', '').trim();
    const gradoMostrar = gradoRaw ? (gradoRaw.includes('°') ? gradoRaw : gradoRaw + '°') : '—';
    const seccionMostrar = a.seccion || '—';

    const esArchivada = ESTADOS_ARCHIVADOS.includes(a.estado);
    // 'activo' es un estado legado: siempre se trata como vencida para mostrar los botones correctos
    const vencida     = !esArchivada && (citaVencida(a.fechahora) || a.estado === 'activo');

    // Botones según estado y si la cita venció
    let acciones = '';
    if (esArchivada) {
      acciones = '<span style="font-size:11px;color:var(--text-muted);font-style:italic;">' + estadoTextoCorto(a.estado) + '</span>';
    } else if (vencida) {
      // Cita pendiente vencida → registrar asistencia
      acciones = '<div class="td-actions">' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--teal);border-color:var(--teal);" onclick="registrarAsistencia(' + a.id + ')">✅ Asistió</button>' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="registrarNoAsistencia(' + a.id + ')">❌ No asistió</button>' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--purple);border-color:var(--purple);" onclick="abrirReprogramacion(' + a.id + ')">🔄 Reprogramar</button>' +
        '</div>';
    } else {
      // Cita pendiente futura → solo cancelar
      acciones = '<div class="td-actions">' +
        '<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="cancelarAtencion(' + a.id + ')">Cancelar</button>' +
        '</div>';
    }

    // Sin badge extra de vencida — los botones ya indican la acción
    const badgeVencida = '';

    return '<tr id="atencion-row-' + a.id + '">' +
      '<td>' + fmtFecha(a.fechahora) + '</td>' +
      '<td style="font-weight:600;">' + fmtHora(a.fechahora) + '</td>' +
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
  }).join('');
}

function estadoTextoCorto(estado) {
  const t = { asistio:'Asistió', no_asistio:'No asistió', reprogramado:'Reprogramado', cerrado:'Cancelada', activo:'Activo' };
  return t[estado] || estado;
}

function filterCitas(tipo) {
  citaFiltro = tipo;
  renderCitas();
}

// ACCIONES DE CITA
async function registrarAsistencia(id) {
  try {
    const atencion = store.atenciones.find(function(a) { return a.id == id; });
    if (!atencion) return;

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

// REPROGRAMACIÓN
async function abrirReprogramacion(id) {
  const atencion = store.atenciones.find(function(a) { return a.id == id; });
  if (!atencion) return;

  // Refrescar atenciones
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

  const minFecha = calcularFechaMinima(atencion.idestudiante, id);
  const fechaEl  = document.getElementById('rp-fecha');
  if (fechaEl) {
    fechaEl.min   = minFecha;
    fechaEl.value = minFecha;
    fechaEl.onchange = function() {
      actualizarHorasSelectConEstudiante('rp-hora', this.value, atencion.idestudiante, id);
    };
    actualizarHorasSelectConEstudiante('rp-hora', minFecha, atencion.idestudiante, id);
  }

  modal.classList.add('open');

  // Reemplazar botón para evitar listeners duplicados
  const btnOld = document.getElementById('btn-guardar-reprogramar');
  const btnNew  = btnOld.cloneNode(true);
  btnOld.parentNode.replaceChild(btnNew, btnOld);

  document.getElementById('btn-guardar-reprogramar').onclick = async function() {
    const fecha  = document.getElementById('rp-fecha')?.value;
    const hora   = document.getElementById('rp-hora')?.value;

    if (!fecha || !hora) {
      toast('Indica la nueva fecha y hora', 'warning');
      return;
    }
    if (fecha < hoy()) {
      toast('No puedes agendar en una fecha pasada', 'warning');
      return;
    }

    // Regla 2: horario libre global (excluyendo la cita original)
    const disponible = await validarHorarioUnico(fecha, hora, id, store.atenciones);
    if (!disponible) {
      const libres = generarHorasDisponibles(fecha, id, null);
      const sugerencia = libres.length ? ' Próximo disponible: ' + libres[0] : ' No hay horarios libres ese día.';
      toast('❌ Horario ocupado.' + sugerencia, 'warning');
      return;
    }

    // Regla 1: cronología (excluyendo la cita original)
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
      // 1. Marcar la cita original como 'reprogramado'
      await apiFetch(API + '/atenciones/' + id, {
        method: 'PUT',
        body: JSON.stringify(limpiarAtencion(Object.assign({}, atencion, { estado: 'reprogramado' })))
      });

      // 2. Crear la nueva cita
      const fechahora = fecha + 'T' + hora + ':00';
      await apiFetch(API + '/atenciones', {
        method: 'POST',
        body: JSON.stringify({
          idestudiante:  atencion.idestudiante,
          fechahora:     fechahora,
          nivelatencion: atencion.nivelatencion || 'moderado',
          idmotivo:      atencion.idmotivo      || 1,
          estado:        'pendiente',
          grado:         atencion.grado         || '',
          seccion:       atencion.seccion       || '',
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

function verAtencionDetalle(id) {
  const a = store.atenciones.find(function(x) { return x.id == id; });
  if (!a) return;
  toast(a.paciente + ' · ' + fmtFecha(a.fechahora) + ' ' + fmtHora(a.fechahora), 'info');
}

// GUARDAR CITA (modal de atenciones)
async function guardarCita() {
  const idestudiante  = document.getElementById('mc-paciente')?.value?.trim();
  const fecha         = document.getElementById('mc-fecha')?.value;
  const hora          = document.getElementById('mc-hora')?.value?.trim();
  const nivelatencion = document.getElementById('mc-nivel')?.value || 'moderado';

  if (!idestudiante || !fecha || !hora) {
    toast('Completa los campos obligatorios', 'warning');
    return;
  }

  if (fecha < hoy()) {
    toast('No puedes agendar en una fecha pasada', 'warning');
    return;
  }

  // Regla 2: horario libre global
  const disponible = await validarHorarioUnico(fecha, hora, null, store.atenciones);
  if (!disponible) {
    const libres = generarHorasDisponibles(fecha, null, null);
    const sugerencia = libres.length ? ' Próximo disponible: ' + libres[0] : ' No hay horarios libres ese día.';
    toast('❌ Horario ocupado.' + sugerencia, 'warning');
    return;
  }

  // Regla 1: cronología del estudiante
  const cronOk = validarCronologiaEstudiante(idestudiante, fecha, hora, null, store.atenciones);
  if (!cronOk.ok) {
    if (cronOk.motivo === 'fecha_minima') {
      toast('❌ Para la 3ra cita en adelante, debes agendar después del ' + cronOk.fechaMinimaFmt, 'warning');
    } else {
      toast('❌ Debes agendar DESPUÉS de la última cita del estudiante (' + cronOk.ultimaFecha + ' ' + cronOk.ultimaHora + ')', 'warning');
    }
    return;
  }

  const motivoTexto = document.getElementById('mc-motivo')?.value?.trim() || 'Consulta general';
  let idmotivo = 1;
  try {
    const motivos   = await apiFetch(API + '/motivosconsulta');
    const encontrado = motivos.find(function(m) { return m.descripcion === motivoTexto || m.nombre === motivoTexto; });
    idmotivo = encontrado ? encontrado.idmotivo : (motivos[0]?.idmotivo || 1);
  } catch (_) {}

  const gradoModal   = document.getElementById('mc-grado')?.value   || '';
  const seccionModal = document.getElementById('mc-seccion')?.value || '';
  const estModal     = store.estudiantes.find(function(e) { return e.id == parseInt(idestudiante); });
  const gradoFinal   = gradoModal   || estModal?.grado   || '';
  const seccionFinal = seccionModal || estModal?.seccion || '';

  const fechahora = fecha + 'T' + hora + ':00';

  try {
    await apiFetch(API + '/atenciones', {
      method: 'POST',
      body: JSON.stringify({
        idestudiante: parseInt(idestudiante),
        fechahora:    fechahora,
        estado:       'pendiente',
        idmotivo:     idmotivo,
        nivelatencion:nivelatencion,
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

// MODAL SEGUNDA CITA
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

  // Buscar motivo de la primera cita del estudiante
  const citasDelEst = store.atenciones
    .filter(function(a) { return String(a.idestudiante) === String(idestudiante) && !!a.fechahora; })
    .sort(function(a, b) { return new Date(a.fechahora) - new Date(b.fechahora); });
  const primeraCita  = citasDelEst[0];
  const motivoPrimera = primeraCita?.motivoconsulta || primeraCita?.motivo || null;

  const subtituloEl = document.getElementById('sc-subtitulo');
  if (subtituloEl) {
    subtituloEl.innerHTML =
      '<strong>Estudiante:</strong> ' + nombreCompleto +
      (motivoPrimera
        ? '<br><span style="margin-top:4px;display:inline-block;"><strong>Motivo 1ra cita:</strong> ' + motivoPrimera + '</span>'
        : '');
  }

  const minFecha = calcularFechaMinima(idestudiante);
  const fechaEl  = document.getElementById('sc-fecha');
  if (fechaEl) {
    fechaEl.min   = minFecha;
    fechaEl.value = minFecha;
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
    const fecha  = document.getElementById('sc-fecha')?.value;
    const hora   = document.getElementById('sc-hora')?.value;
    const obs    = document.getElementById('sc-observaciones')?.value?.trim();

    if (!fecha || !hora) {
      toast('Indica la fecha y hora de la segunda cita', 'warning');
      return;
    }
    if (fecha < hoy()) {
      toast('No puedes agendar en una fecha pasada', 'warning');
      return;
    }

    // Regla 2: horario libre global
    const disponible = await validarHorarioUnico(fecha, hora, null, store.atenciones);
    if (!disponible) {
      const libres = generarHorasDisponibles(fecha, null, null);
      const sugerencia = libres.length ? ' Próximo disponible: ' + libres[0] : ' No hay horarios libres ese día.';
      toast('❌ Horario ocupado.' + sugerencia, 'warning');
      return;
    }

    // Regla 1: cronología del estudiante
    const cronOk = validarCronologiaEstudiante(idestudiante, fecha, hora, null, store.atenciones);
    if (!cronOk.ok) {
      if (cronOk.motivo === 'fecha_minima') {
        toast('❌ Para la 3ra cita en adelante, debes agendar después del ' + cronOk.fechaMinimaFmt, 'warning');
      } else {
        toast('❌ Debes agendar DESPUÉS de la última cita (' + cronOk.ultimaFecha + ' ' + cronOk.ultimaHora + ')', 'warning');
      }
      return;
    }

    const estSC     = store.estudiantes.find(function(e) { return e.id == parseInt(idestudiante); });
    const gradoSC   = estSC?.grado   || '';
    const seccionSC = estSC?.seccion || '';

    try {
      const fechahora = fecha + 'T' + hora + ':00';
      await apiFetch(API + '/atenciones', {
        method: 'POST',
        body: JSON.stringify({
          idestudiante:  parseInt(idestudiante),
          fechahora:     fechahora,
          nivelatencion: 'moderado',
          idmotivo:      1,
          estado:        'pendiente',
          observaciones: obs || null,
          grado:         gradoSC,
          seccion:       seccionSC,
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