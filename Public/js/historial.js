// ═══════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════
async function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';

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
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">📭</div><div class="es-text">No se encontraron registros</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = filtrados.map(p => {
      const atencionEst = store.atenciones.find(a => a.idestudiante == p.id);
      const gradoMostrar   = p.grado   || atencionEst?.grado   || '—';
      const seccionMostrar = p.seccion || atencionEst?.seccion || '';
      const gradoSeccion   = gradoMostrar !== '—' ? `${gradoMostrar}${seccionMostrar ? ' ' + seccionMostrar : ''}` : '—';

      return `<tr class="hist-row" onclick="toggleHistorialPaciente(${p.id}, this)">
        <td>
          <div class="td-name">
            <div class="td-avatar ${colorAvatar(p.nombres+p.apellidos)}">${initials(p.nombres+' '+p.apellidos)}</div>
            ${p.nombres} ${p.apellidos}
          </div>
        </td>
        <td>${p.dni || '—'}</td>
        <td>${p.telefono || '—'}</td>
        <td>${gradoSeccion}</td>
        <td>${p.condicion || '—'}</td>
        <td><span class="appt-badge c-teal">${p.genero || '—'}</span></td>
        <td>${fmtFecha(p.fechanac)}</td>
        <td>
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="event.stopPropagation();toggleHistorialPaciente(${p.id}, this.closest('tr'))">
            Ver historial
          </button>
        </td>
      </tr>
      <tr class="hist-detail-row" id="hist-detail-${p.id}" style="display:none;">
        <td colspan="8" style="padding:0;">
          <div class="hist-detail-panel" id="hist-detail-panel-${p.id}">
            <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">Cargando historial...</div>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Error renderizando historial:', err);
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="es-icon">⚠️</div><div class="es-text">Error cargando datos</div></div></td></tr>';
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

  const p = store.estudiantes.find(x => x.id == id);
  if (!p) return;

  let atencionesEst = store.atenciones.filter(a => a.idestudiante == id);
  try {
    const todas = await apiFetch(`${API}/atenciones`);
    atencionesEst = (todas || []).filter(a => a.idestudiante == id);
  } catch (_) {}

  const motivoTexto = atencionesEst.length > 0
    ? (atencionesEst[0].motivoconsulta || atencionesEst[0].motivo || '—')
    : '—';

  const gradoMostrar   = p.grado   || atencionesEst[0]?.grado   || '—';
  const seccionMostrar = p.seccion || atencionesEst[0]?.seccion || '';

  const contactosHtml = p.contactosEmergencia && p.contactosEmergencia.length > 0
    ? `<div style="margin-top:16px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">
          📞 Contactos de emergencia
        </div>
        <div style="display:grid;gap:8px;">
          ${p.contactosEmergencia.map(c => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:12px;">
              <div style="font-size:20px;">${c.parentesco === 'Madre' ? '👩' : c.parentesco === 'Padre' ? '👨' : '👤'}</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${c.nombre}</div>
                <div style="font-size:11px;color:var(--text-muted);">${c.parentesco} · ${c.celular}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

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
          <div class="hist-info-label">Grado y Sección</div>
          <div class="hist-info-value">${gradoMostrar !== '—' ? `${gradoMostrar}${seccionMostrar ? ' ' + seccionMostrar : ''}` : '—'}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Condición</div>
          <div class="hist-info-value">${p.condicion || '—'}</div>
        </div>
      </div>

      ${contactosHtml}

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
                        ${a.motivoconsulta || '—'} · ${a.grado || p.grado || '—'}${(a.seccion || p.seccion) ? ' ' + (a.seccion || p.seccion) : ''}
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
  const p = store.estudiantes.find(x => x.id == id);
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