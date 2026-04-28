// ═══════════════════════════════════════
// ATENCIONES / CITAS
// ═══════════════════════════════════════
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

  let lista;
  if (citaFiltro === 'todas') {
    lista = store.atenciones.filter(a => a.estado !== 'cerrado');
  } else if (citaFiltro === 'cerrado') {
    lista = store.atenciones.filter(a => a.estado === 'cerrado');
  } else {
    lista = store.atenciones.filter(a => a.estado === citaFiltro);
  }

  if (lista.length === 0) {
    const msg = citaFiltro === 'cerrado'
      ? 'No hay atenciones cerradas'
      : 'No hay atenciones para mostrar';
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">${msg}</div></div></td></tr>`;
    return;
  }

  const esCerradas = citaFiltro === 'cerrado';

  tbody.innerHTML = lista.map(a =>
    `<tr id="atencion-row-${a.id}">
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
        ${esCerradas
          ? `<span style="font-size:11px;color:var(--text-muted);font-style:italic;">Cerrada</span>`
          : `<div class="td-actions">
              ${a.estado !== 'activo' ? `<button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--teal);border-color:var(--teal);" onclick="confirmarAtencion(${a.id})">Confirmar</button>` : ''}
              <button class="btn-secondary" style="font-size:11px;padding:4px 10px;color:var(--rose);border-color:var(--rose);" onclick="cerrarAtencion(${a.id})">Cerrar</button>
            </div>`
        }
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
    const atencion = store.atenciones.find(a => a.id == id);
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
  if (!confirm('¿Cerrar esta atención? Se marcará como cerrada.')) return;

  try {
    const atencion = store.atenciones.find(a => a.id == id);
    if (!atencion) return;

    try {
      await apiFetch(`${API}/atenciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...atencion, estado: 'cerrado' })
      });
      const idx = store.atenciones.findIndex(a => a.id == id);
      if (idx !== -1) store.atenciones[idx].estado = 'cerrado';
    } catch (_) {
      await apiFetch(`${API}/atenciones/${id}`, { method: 'DELETE' });
      store.atenciones = store.atenciones.filter(a => a.id != id);
    }

    agregarActividad('rose', '🔒', `Atención de <strong>${atencion.paciente}</strong> cerrada`, 'Ahora');
    renderCitas();
    renderDashboard();
    toast('Atención cerrada correctamente', 'warning');
  } catch (err) {
    console.error('Error cerrando atención:', err);
  }
}

function verAtencionDetalle(id) {
  const a = store.atenciones.find(x => x.id == id);
  if (!a) return;
  toast(`${a.paciente} · ${fmtFecha(a.fechahora)} ${fmtHora(a.fechahora)}`, 'info');
}

// ═══════════════════════════════════════
// GUARDAR CITA (modal de atenciones)
// ═══════════════════════════════════════
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

  const disponible = await validarHorarioUnico(fecha, hora, null, store.atenciones);
  if (!disponible) {
    const libres = generarHorasDisponibles(fecha);
    const sugerencia = libres.length
      ? ` Próximo disponible: ${libres[0]}`
      : ' No hay horarios libres ese día.';
    toast(`❌ Horario ocupado.${sugerencia}`, 'warning');
    return;
  }

  const cronOk = validarCronologiaEstudiante(idestudiante, fecha, hora, null, store.atenciones);
  if (!cronOk.ok) {
    toast(`❌ Debes agendar DESPUÉS de la última cita del estudiante (${cronOk.ultimaFecha} ${cronOk.ultimaHora})`, 'warning');
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

// ═══════════════════════════════════════
// MODAL SEGUNDA CITA
// ═══════════════════════════════════════
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

async function abrirFormularioSegundaCita(idestudiante, nombreCompleto) {
  try {
    const frescas = await apiFetch(`${API}/atenciones`);
    store.atenciones = frescas || [];
  } catch (_) {}

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

  const btnGuardar = document.getElementById('btn-guardar-segunda');
  const btnNuevo = btnGuardar.cloneNode(true);
  btnGuardar.parentNode.replaceChild(btnNuevo, btnGuardar);

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

    const disponible = await validarHorarioUnico(fecha, hora, null, store.atenciones);
    if (!disponible) {
      const libres = generarHorasDisponibles(fecha);
      const sugerencia = libres.length
        ? ` Próximo disponible: ${libres[0]}`
        : ' No hay horarios libres ese día.';
      toast(`❌ Horario ocupado.${sugerencia}`, 'warning');
      return;
    }

    const cronOk = validarCronologiaEstudiante(idestudiante, fecha, hora, null, store.atenciones);
    if (!cronOk.ok) {
      toast(`❌ Debes agendar DESPUÉS de la última cita (${cronOk.ultimaFecha} ${cronOk.ultimaHora})`, 'warning');
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