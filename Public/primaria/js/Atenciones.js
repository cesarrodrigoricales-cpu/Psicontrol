// ═══════════════════════════════════════════════
// ATENCIONES.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

let citaFiltro = 'todas';

async function renderCitas(filtro) {
  citaFiltro = filtro;

  try {
    const data = await apiFetch(`${API}/atenciones`);
    store.atenciones = data || [];
  } catch (_) {}

  let lista;
  if      (filtro === 'todas')   lista = store.atenciones.filter(a => a.estado !== 'cerrado');
  else if (filtro === 'cerrado') lista = store.atenciones.filter(a => a.estado === 'cerrado');
  else                           lista = store.atenciones.filter(a => a.estado === filtro);

  const tbody = document.getElementById('citas-tbody');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📅</div><div class="es-text">Sin atenciones</div></div></td></tr>';
    return;
  }

  const sorted = [...lista].sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora));

  tbody.innerHTML = sorted.map(a => {
    const est    = getEst(a.idestudiante);
    const nombre = est ? nombreCompleto(est) : (a.paciente || '—');
    const ini    = est ? iniciales(est) : '?';
    const grado  = est?.grado || a.grado || '—';

    return `<tr>
      <td>${fmtFecha(a.fechahora)}</td>
      <td>${fmtHora(a.fechahora)}</td>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div style="width:28px;height:28px;border-radius:7px;background:var(--accent-soft);color:var(--accent);
                    font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;">${ini}</div>
        ${nombre}
      </div></td>
      <td><span class="grado-badge">${grado}${grado !== '—' ? '°' : ''}</span></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.motivoconsulta || a.motivo || '—'}</td>
      <td>${nivelBadge(a.nivelatencion)}</td>
      <td>${estadoBadge(a.estado)}</td>
      <td>
        <div style="display:flex;gap:6px;">
          ${est ? `<button class="action-btn" onclick="verEstudiante(${est.id})">Ver</button>` : ''}
          <button class="action-btn danger" onclick="eliminarAtencion(${a.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filtrarCitas(f) { renderCitas(f); }

async function eliminarAtencion(id) {
  if (!confirm('¿Eliminar esta atención?')) return;
  try {
    await apiFetch(`${API}/atenciones/${id}`, { method: 'DELETE' });
    store.atenciones = store.atenciones.filter(a => a.id !== id);
    renderCitas(citaFiltro);
    initDashboard();
    toast('🗑 Atención eliminada');
  } catch (err) {
    console.error('Error eliminando:', err);
  }
}

// ── Modal sesión rápida ───────────────────────────
function populateEstSelect(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona un estudiante --</option>' +
    store.estudiantes.map(e =>
      `<option value="${e.id}">${nombreCompleto(e)} — ${e.grado ? e.grado + '°' : ''}</option>`
    ).join('');
}

async function guardarSesion() {
  const estId  = parseInt(document.getElementById('ms-estudiante')?.value);
  const motivo = document.getElementById('ms-motivo')?.value?.trim();
  const fecha  = document.getElementById('ms-fecha')?.value;
  const hora   = document.getElementById('ms-hora')?.value;

  if (!estId || !motivo || !fecha || !hora) {
    toast('⚠️ Completa todos los campos obligatorios');
    return;
  }

  const est = getEst(estId);
  try {
    await apiFetch(`${API}/atenciones`, {
      method: 'POST',
      body: JSON.stringify({
        idestudiante:  estId,
        fechahora:     `${fecha}T${hora}:00`,
        estado:        document.getElementById('ms-estado')?.value || 'pendiente',
        nivelatencion: document.getElementById('ms-nivel')?.value  || 'moderado',
        idmotivo:      1,
        grado:         est?.grado   || '',
        seccion:       est?.seccion || '',
      })
    });
    closeModal('modal-sesion');
    toast('✅ Sesión registrada correctamente');
    await cargarDatos();
    renderCitas(citaFiltro);
  } catch (err) {
    console.error('Error guardando sesión:', err);
  }
}