// ═══════════════════════════════════════════════
// HISTORIAL.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

async function renderHistorial(filtro = '') {
  const tbody = document.getElementById('hist-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text3);">Cargando...</td></tr>';

  try {
    const [todasAtenciones, todosEstudiantes] = await Promise.all([
      apiFetch(`${API}/atenciones`),
      apiFetch(`${API}/estudiantes/primaria`)
    ]);
    store.atenciones  = todasAtenciones  || [];
    store.estudiantes = todosEstudiantes || [];

    const idsConAtencion = [...new Set(store.atenciones.map(a => a.idestudiante))];
    let lista = store.estudiantes.filter(e => idsConAtencion.includes(e.id));

    if (filtro) {
      const f = filtro.toLowerCase();
      lista = lista.filter(e =>
        nombreCompleto(e).toLowerCase().includes(f) ||
        (e.dni     || '').includes(f)               ||
        (e.grado   || '').toString().includes(f)    ||
        (e.seccion || '').toLowerCase().includes(f)
      );
    }

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">📋</div><div class="es-text">Sin estudiantes</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(e => {
      const ults = store.atenciones
        .filter(a => a.idestudiante == e.id)
        .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora))[0];

      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--accent-soft);color:var(--accent);
                      font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">${iniciales(e)}</div>
          <span style="font-weight:600;color:var(--text);">${nombreCompleto(e)}</span>
        </div></td>
        <td>${e.dni || '—'}</td>
        <td><span class="grado-badge">📚 ${e.grado ? e.grado + '°' : '—'}</span></td>
        <td>${e.seccion || '—'}</td>
        <td>${e.telefono || '—'}</td>
        <td>${ults ? fmtFecha(ults.fechahora) : '—'}</td>
        <td><button class="action-btn" onclick="verEstudiante(${e.id})">Ver expediente</button></td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Error renderizando historial:', err);
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="es-icon">⚠️</div><div class="es-text">Error cargando datos</div></div></td></tr>';
  }
}

function filtrarHistorial(q) {
  renderHistorial(q);
}

// ── Ver expediente del estudiante ─────────────────
function verEstudiante(id) {
  const e = getEst(id);
  if (!e) return;

  const sesiones = store.atenciones
    .filter(a => a.idestudiante == id)
    .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora));

  const tituloEl = document.getElementById('me-titulo');
  const bodyEl   = document.getElementById('me-body');
  if (tituloEl) tituloEl.textContent = 'Expediente — ' + nombreCompleto(e);

  if (bodyEl) bodyEl.innerHTML = `
    <div class="student-profile">
      <div class="sp-header">
        <div class="sp-avatar">${iniciales(e)}</div>
        <div>
          <div class="sp-name">${nombreCompleto(e)}</div>
          <div class="sp-grade">${e.grado ? e.grado + '°' : '—'} — Sección ${e.seccion || '—'}</div>
        </div>
      </div>
      <div class="sp-grid">
        <div class="sp-cell"><div class="sp-cell-label">DNI</div>        <div class="sp-cell-val">${e.dni       || '—'}</div></div>
        <div class="sp-cell"><div class="sp-cell-label">Teléfono</div>   <div class="sp-cell-val">${e.telefono  || '—'}</div></div>
        <div class="sp-cell"><div class="sp-cell-label">Género</div>     <div class="sp-cell-val">${e.genero    || '—'}</div></div>
        <div class="sp-cell"><div class="sp-cell-label">Nacimiento</div> <div class="sp-cell-val">${fmtFecha(e.fechanac)}</div></div>
      </div>
      <div class="sp-sessions">
        <div class="sp-sess-title">Historial de sesiones (${sesiones.length})</div>
        ${sesiones.length
          ? sesiones.map(s => `
            <div class="sp-sess-item">
              <div style="flex:1;">
                <div style="font-weight:600;color:var(--text);font-size:12.5px;">${s.motivoconsulta || s.motivo || '—'}</div>
                <div style="font-size:11.5px;color:var(--text3);margin-top:2px;">${fmtFecha(s.fechahora)} · ${fmtHora(s.fechahora)}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                ${nivelBadge(s.nivelatencion)} ${estadoBadge(s.estado)}
              </div>
            </div>`).join('')
          : '<div style="color:var(--text3);font-size:13px;">Sin sesiones registradas.</div>'
        }
      </div>
    </div>`;
  openModal('modal-estudiante');
}