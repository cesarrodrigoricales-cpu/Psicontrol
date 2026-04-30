// HISTORIAL.JS

async function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';

  try {
    // Cargar atenciones y estudiantes frescos
    const [todasAtenciones, todosEstudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes`)
    ]);
    store.atenciones  = todasAtenciones  || [];
    store.estudiantes = todosEstudiantes || [];

    // ✅ Solo estudiantes que tienen al menos una atención
    const idsConAtencion = [...new Set(store.atenciones.map(a => a.idestudiante))];
    let lista = store.estudiantes.filter(e => idsConAtencion.includes(e.id));

    // Filtro de búsqueda
    if (filtro) {
      const f = filtro.toLowerCase();
      lista = lista.filter(p => {
        const nombre = `${p.nombres} ${p.apellidos}`.toLowerCase();
        return nombre.includes(f)           ||
          p.dni?.includes(f)                ||
          p.grado?.toString().includes(f)   ||
          p.seccion?.toLowerCase().includes(f);
      });
    }

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📭</div><div class="es-text">No hay estudiantes atendidos aún</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(p => {
      const atencionEst    = store.atenciones.find(a => a.idestudiante == p.id);
      const gradoMostrar   = p.grado   || atencionEst?.grado   || '—';
      const seccionMostrar = p.seccion || atencionEst?.seccion || '—';
      const totalAtenciones = store.atenciones.filter(a => a.idestudiante == p.id).length;

      const generoIcono = p.genero === 'Masculino' ? '👦 Masculino'
                        : p.genero === 'Femenino'  ? '👧 Femenino'
                        : p.genero || '—';

      return `
      <tr class="hist-row" onclick="toggleHistorialPaciente(${p.id}, this)">
        <td>
          <div class="td-name">
            <div class="td-avatar ${colorAvatar(p.nombres + p.apellidos)}">
              ${initials(p.nombres + ' ' + p.apellidos)}
            </div>
            <div>
              <div style="font-weight:600;">${p.apellidos}, ${p.nombres}</div>
              <div style="font-size:11px;color:var(--text-muted);">
                ${p.condicion === 'activo' ? '🟢 Activo' : '⚪ ' + (p.condicion || 'Sin estado')}
                · ${totalAtenciones} atención(es)
              </div>
            </div>
          </div>
        </td>
        <td>${p.dni || '—'}</td>
        <td>${gradoMostrar !== '—' ? gradoMostrar + '°' : '—'}</td>
        <td>${seccionMostrar}</td>
        <td>${generoIcono}</td>
        <td>${fmtFecha(p.fechanac)}</td>
        <td>
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;"
            onclick="event.stopPropagation();toggleHistorialPaciente(${p.id}, this.closest('tr'))">
            Ver historial
          </button>
        </td>
      </tr>
      <tr class="hist-detail-row" id="hist-detail-${p.id}" style="display:none;">
        <td colspan="7" style="padding:0;">
          <div class="hist-detail-panel" id="hist-detail-panel-${p.id}">
            <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">Cargando historial...</div>
          </div>
        </td>
      </tr>`;
    }).join('');

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

  const p = store.estudiantes.find(x => x.id == id);
  if (!p) return;

  let atencionesEst = [];
  try {
    const todas = await apiFetch(`${API}/atenciones`);
    atencionesEst = (todas || []).filter(a => a.idestudiante == id);
  } catch (_) {
    atencionesEst = store.atenciones.filter(a => a.idestudiante == id);
  }

  const gradoMostrar   = p.grado   || atencionesEst[0]?.grado   || '—';
  const seccionMostrar = p.seccion || atencionesEst[0]?.seccion || '—';
  const motivoTexto    = atencionesEst.length > 0
    ? (atencionesEst[0].motivoconsulta || atencionesEst[0].motivo || '—')
    : '—';

  const contactosHtml = p.contactosEmergencia?.length > 0
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
        <div class="hist-detail-avatar ${colorAvatar(p.nombres + p.apellidos)}">
          ${initials(p.nombres + ' ' + p.apellidos)}
        </div>
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${p.apellidos}, ${p.nombres}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Motivo principal: ${motivoTexto}</div>
        </div>
        <button class="btn-secondary" style="margin-left:auto;font-size:11px;padding:5px 12px;"
          onclick="document.getElementById('hist-detail-${id}').style.display='none';
                   document.querySelector('.hist-row-open')?.classList.remove('hist-row-open')">
          Cerrar ✕
        </button>
      </div>

      <div class="hist-detail-grid">
        <div class="hist-info-block">
          <div class="hist-info-label">DNI</div>
          <div class="hist-info-value">${p.dni || '—'}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Fecha de nacimiento</div>
          <div class="hist-info-value">${fmtFecha(p.fechanac)}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Género</div>
          <div class="hist-info-value">
            ${p.genero === 'Masculino' ? ' Masculino'
            : p.genero === 'Femenino'  ? ' Femenino'
            : p.genero || '—'}
          </div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Grado y Sección</div>
          <div class="hist-info-value">
            ${gradoMostrar !== '—' ? gradoMostrar + '° ' + seccionMostrar : '—'}
          </div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Teléfono</div>
          <div class="hist-info-value">${p.telefono || '—'}</div>
        </div>
        <div class="hist-info-block">
          <div class="hist-info-label">Condición</div>
          <div class="hist-info-value">
            ${p.condicion === 'activo'
              ? '<span style="color:#2d7a3a;font-weight:600;">🟢 Activo</span>'
              : '<span style="color:var(--text-muted);">⚪ ' + (p.condicion || '—') + '</span>'}
          </div>
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
                    <div style="font-size:20px;">
                      ${a.estado === 'activo' ? '✅' : a.estado === 'pendiente' ? '⏳' : '🔒'}
                    </div>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:var(--text-primary);">
                        ${fmtFecha(a.fechahora)} · ${fmtHora(a.fechahora)}
                      </div>
                      <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                        ${a.motivoconsulta || a.motivo || '—'} ·
                        ${(a.grado || p.grado) ? (a.grado || p.grado) + '°' : '—'}
                        ${a.seccion || p.seccion || ''}
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