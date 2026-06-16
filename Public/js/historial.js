// HISTORIAL.JS

async function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">Cargando...</td></tr>';

  try {
    const [todasAtenciones, todosEstudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes`)
    ]);
    store.atenciones  = todasAtenciones  || [];
    store.estudiantes = todosEstudiantes || [];

    const idsConAtencion = [...new Set(store.atenciones.map(a => a.idestudiante))];
    let lista = store.estudiantes.filter(e => idsConAtencion.includes(e.id));

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
      const atencionEst     = store.atenciones.find(a => a.idestudiante == p.id);
      const gradoMostrar    = p.grado   || atencionEst?.grado   || '—';
      const seccionMostrar  = p.seccion || atencionEst?.seccion || '—';
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

  // ─── Contactos de emergencia ───────────────────────────────────────────
  // Combina ambos formatos:
  // 1. Array contactosEmergencia (guardado desde el modal de edición)
  // 2. Campos sueltos telefonoemergencia + parentescoemergencia (guardado desde nueva atención)
  let contactosList = [];

  if (p.contactosEmergencia?.length > 0) {
    contactosList = p.contactosEmergencia;
  } else if (p.telefonoemergencia || p.telefono_emergencia) {
    // Campos sueltos del formulario de nueva atención
    const tel = p.telefonoemergencia || p.telefono_emergencia || '';
    const par = p.parentescoemergencia || p.parentesco_emergencia || '';
    if (tel) contactosList = [{ nombre: '', parentesco: par, celular: tel }];
  }

  const contactosHtml = contactosList.length > 0
    ? `<div style="margin-top:16px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">
          📞 Contacto de emergencia
        </div>
        <div style="display:grid;gap:8px;">
          ${contactosList.map(c => {
            const icono = c.parentesco === 'Madre' ? '👩'
                        : c.parentesco === 'Padre' ? '👨' : '👤';
            const nombreMostrar = c.nombre || (c.parentesco ? c.parentesco : 'Contacto');
            return `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:12px;">
              <div style="font-size:20px;">${icono}</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${nombreMostrar}</div>
                <div style="font-size:11px;color:var(--text-muted);">${c.parentesco || '—'} · ${c.celular || '—'}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  // ─── Estado icon según nuevos estados ─────────────────────────────────
  function iconEstado(estado) {
    const m = {
      asistio:      '✅',
      no_asistio:   '❌',
      reprogramado: '🔄',
      cerrado:      '🔒',
      pendiente:    '⏳',
      activo:       '✅',
    };
    return m[estado] || '⏳';
  }

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
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button class="btn-secondary" style="font-size:11px;padding:5px 12px;"
            onclick="abrirEditarEstudiante(${id})">
            ✏️ Editar
          </button>
          <button class="btn-secondary" style="font-size:11px;padding:5px 12px;"
            onclick="document.getElementById('hist-detail-${id}').style.display='none';
                     document.querySelector('.hist-row-open')?.classList.remove('hist-row-open')">
            Cerrar ✕
          </button>
        </div>
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
            ${p.genero === 'Masculino' ? '👦 Masculino'
            : p.genero === 'Femenino'  ? '👧 Femenino'
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
                    <div style="font-size:20px;">${iconEstado(a.estado)}</div>
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

// ── EDITAR ESTUDIANTE ──────────────────────────────────

function abrirEditarEstudiante(id) {
  const p = store.estudiantes.find(x => x.id == id);
  if (!p) return;

  let modal = document.getElementById('modal-editar-estudiante');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-editar-estudiante';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  // Combinar ambos formatos al abrir el modal de edición
  let contactosIniciales = [];
  if (p.contactosEmergencia?.length > 0) {
    contactosIniciales = p.contactosEmergencia.map(c => ({ ...c }));
  } else if (p.telefonoemergencia || p.telefono_emergencia) {
    const tel = p.telefonoemergencia || p.telefono_emergencia || '';
    const par = p.parentescoemergencia || p.parentesco_emergencia || '';
    if (tel) contactosIniciales = [{ nombre: '', parentesco: par, celular: tel }];
  }
  if (contactosIniciales.length === 0) {
    contactosIniciales = [{ nombre: '', parentesco: '', celular: '' }];
  }

  window._editContactos = contactosIniciales;

  const renderFilasContactos = () => window._editContactos.map((c, i) => `
    <div class="contacto-row" id="contacto-row-${i}"
         style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;">
      <div class="form-group" style="flex:2;margin:0;">
        <label style="font-size:11px;">Nombre</label>
        <input type="text" class="cont-nombre" data-i="${i}"
               value="${c.nombre || ''}" placeholder="Nombre del contacto">
      </div>
      <div class="form-group" style="flex:1.5;margin:0;">
        <label style="font-size:11px;">Parentesco</label>
        <select class="cont-parentesco" data-i="${i}">
          <option value="">-- --</option>
          ${['Madre','Padre','Apoderado','Hermano/a','Tío/a','Abuelo/a','Otro'].map(op =>
            `<option value="${op}" ${c.parentesco === op ? 'selected' : ''}>${op}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group" style="flex:1.5;margin:0;">
        <label style="font-size:11px;">Celular</label>
        <input type="tel" class="cont-celular" data-i="${i}" maxlength="9"
               value="${c.celular || ''}" placeholder="999999999"
               oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)">
      </div>
      <button onclick="eliminarContactoRow(${i})"
              style="background:none;border:1px solid #e57373;color:#e57373;
                     border-radius:6px;padding:6px 10px;cursor:pointer;
                     font-size:13px;flex-shrink:0;margin-bottom:1px;"
              title="Eliminar">✕</button>
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="modal" style="max-width:580px;">
      <div class="modal-header">
        <div class="modal-title">✏️ Editar estudiante</div>
        <button class="modal-close" onclick="closeModal('modal-editar-estudiante')">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-form-grid">
          <div class="form-group">
            <label>Nombres *</label>
            <input type="text" id="edit-nombres" value="${p.nombres || ''}">
          </div>
          <div class="form-group">
            <label>Apellidos *</label>
            <input type="text" id="edit-apellidos" value="${p.apellidos || ''}">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="tel" id="edit-telefono" maxlength="9"
              value="${p.telefono || ''}"
              oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)">
          </div>
          <div class="form-group">
            <label>Género</label>
            <select id="edit-genero">
              <option value="">-- Selecciona --</option>
              ${['Masculino','Femenino','Otro'].map(op =>
                `<option value="${op}" ${p.genero === op ? 'selected' : ''}>${op}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Condición</label>
            <select id="edit-condicion">
              <option value="activo"   ${p.condicion === 'activo'   ? 'selected' : ''}>Activo</option>
              <option value="inactivo" ${p.condicion === 'inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>

        <div style="margin-top:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-muted);
                          text-transform:uppercase;letter-spacing:.05em;">
              📞 Contactos de emergencia
            </label>
            <button onclick="agregarContactoRow()"
                    style="background:none;border:1px solid var(--primary);
                           color:var(--primary);border-radius:6px;
                           padding:4px 12px;cursor:pointer;font-size:12px;">
              + Agregar
            </button>
          </div>
          <div id="contactos-wrapper">
            ${renderFilasContactos()}
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeModal('modal-editar-estudiante')">Cancelar</button>
          <button class="btn-primary" onclick="guardarEdicionEstudiante(${id})">
            💾 Guardar cambios
          </button>
        </div>
      </div>
    </div>`;

  modal.classList.add('open');
}

function leerContactosDelDOM() {
  const nombres     = [...document.querySelectorAll('.cont-nombre')].map(el => el.value.trim());
  const parentescos = [...document.querySelectorAll('.cont-parentesco')].map(el => el.value);
  const celulares   = [...document.querySelectorAll('.cont-celular')].map(el => el.value.trim());
  return nombres.map((nombre, i) => ({
    nombre,
    parentesco: parentescos[i] || '',
    celular:    celulares[i]   || ''
  }));
}

function agregarContactoRow() {
  window._editContactos = leerContactosDelDOM();
  window._editContactos.push({ nombre: '', parentesco: '', celular: '' });

  const wrapper = document.getElementById('contactos-wrapper');
  if (!wrapper) return;

  const i = window._editContactos.length - 1;
  const div = document.createElement('div');
  div.className = 'contacto-row';
  div.id = `contacto-row-${i}`;
  div.style.cssText = 'display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;';
  div.innerHTML = `
    <div class="form-group" style="flex:2;margin:0;">
      <label style="font-size:11px;">Nombre</label>
      <input type="text" class="cont-nombre" data-i="${i}"
             value="" placeholder="Nombre del contacto">
    </div>
    <div class="form-group" style="flex:1.5;margin:0;">
      <label style="font-size:11px;">Parentesco</label>
      <select class="cont-parentesco" data-i="${i}">
        <option value="">-- --</option>
        ${['Madre','Padre','Apoderado','Hermano/a','Tío/a','Abuelo/a','Otro'].map(op =>
          `<option value="${op}">${op}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group" style="flex:1.5;margin:0;">
      <label style="font-size:11px;">Celular</label>
      <input type="tel" class="cont-celular" data-i="${i}" maxlength="9"
             value="" placeholder="999999999"
             oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)">
    </div>
    <button onclick="eliminarContactoRow(${i})"
            style="background:none;border:1px solid #e57373;color:#e57373;
                   border-radius:6px;padding:6px 10px;cursor:pointer;
                   font-size:13px;flex-shrink:0;margin-bottom:1px;"
            title="Eliminar">✕</button>
  `;
  wrapper.appendChild(div);
}

function eliminarContactoRow(i) {
  window._editContactos = leerContactosDelDOM();
  window._editContactos.splice(i, 1);

  const wrapper = document.getElementById('contactos-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = window._editContactos.map((c, idx) => `
    <div class="contacto-row" id="contacto-row-${idx}"
         style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;">
      <div class="form-group" style="flex:2;margin:0;">
        <label style="font-size:11px;">Nombre</label>
        <input type="text" class="cont-nombre" data-i="${idx}"
               value="${c.nombre || ''}" placeholder="Nombre del contacto">
      </div>
      <div class="form-group" style="flex:1.5;margin:0;">
        <label style="font-size:11px;">Parentesco</label>
        <select class="cont-parentesco" data-i="${idx}">
          <option value="">-- --</option>
          ${['Madre','Padre','Apoderado','Hermano/a','Tío/a','Abuelo/a','Otro'].map(op =>
            `<option value="${op}" ${c.parentesco === op ? 'selected' : ''}>${op}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group" style="flex:1.5;margin:0;">
        <label style="font-size:11px;">Celular</label>
        <input type="tel" class="cont-celular" data-i="${idx}" maxlength="9"
               value="${c.celular || ''}" placeholder="999999999"
               oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)">
      </div>
      <button onclick="eliminarContactoRow(${idx})"
              style="background:none;border:1px solid #e57373;color:#e57373;
                     border-radius:6px;padding:6px 10px;cursor:pointer;
                     font-size:13px;flex-shrink:0;margin-bottom:1px;"
              title="Eliminar">✕</button>
    </div>
  `).join('');
}

async function guardarEdicionEstudiante(id) {
  const p = store.estudiantes.find(x => x.id == id);
  if (!p) return;

  const nombres   = document.getElementById('edit-nombres')?.value?.trim();
  const apellidos = document.getElementById('edit-apellidos')?.value?.trim();
  const telefono  = document.getElementById('edit-telefono')?.value?.trim();
  const genero    = document.getElementById('edit-genero')?.value;
  const condicion = document.getElementById('edit-condicion')?.value;

  if (!nombres || !apellidos) {
    toast('Nombres y apellidos son obligatorios', 'warning');
    return;
  }

  const contactosEmergencia = leerContactosDelDOM()
    .filter(c => c.nombre || c.celular);

  try {
    await apiFetch(`${API}/estudiantes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...p,
        nombres, apellidos, telefono,
        genero, condicion,
        contactosEmergencia,
        // Limpiar campos sueltos viejos para no duplicar
        telefonoemergencia:   contactosEmergencia[0]?.celular   || '',
        parentescoemergencia: contactosEmergencia[0]?.parentesco || '',
      })
    });

    const idx = store.estudiantes.findIndex(x => x.id == id);
    if (idx !== -1) {
      store.estudiantes[idx] = {
        ...p, nombres, apellidos, telefono,
        genero, condicion,
        contactosEmergencia,
        telefonoemergencia:   contactosEmergencia[0]?.celular   || '',
        parentescoemergencia: contactosEmergencia[0]?.parentesco || '',
      };
    }

    closeModal('modal-editar-estudiante');
    toast('✅ Estudiante actualizado correctamente');
    await cargarHistorialPaciente(id);
  } catch (err) {
    console.error(err);
    toast('Error al guardar cambios', 'warning');
  }
}

function filterHistorial() {
  const searchEl = document.getElementById('hist-search');
  if (searchEl) renderHistorial(searchEl.value);
}