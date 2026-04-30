// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
function renderDashboard() {
  const now   = new Date();
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const fechaHoyEl   = document.getElementById('fecha-hoy');
  const fechaCitasEl = document.getElementById('fecha-citas-hoy');
  if (fechaHoyEl)   fechaHoyEl.textContent   = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()} · Bienvenida`;
  if (fechaCitasEl) fechaCitasEl.textContent = `Hoy, ${now.getDate()} de ${meses[now.getMonth()]}`;

  const pendientes = store.atenciones.filter(a => a.estado === 'pendiente').length;

  const statElements = {
    'stat-registros' : store.estudiantes.filter(e => store.atenciones.some(a => a.idestudiante === e.id)).length,
    'stat-citas'     : pendientes,
    'stat-pacientes' : store.estudiantes.filter(e => store.atenciones.some(a => a.idestudiante === e.id)).length,
    'stat-reportes'  : store.reportes,
    'stat-reg-delta' : '↑ ' + store.estudiantes.filter(e => store.atenciones.some(a => a.idestudiante === e.id)).length + ' registros',
    'stat-cita-delta': '↑ ' + pendientes + ' pendientes',
    'badge-historial': store.estudiantes.filter(e =>store.atenciones.some(a => a.idestudiante === e.id)).length,
    'badge-citas'    : pendientes
  };

  Object.entries(statElements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const apptEl = document.getElementById('appt-list-dash');
  if (apptEl) {
    const recientes = store.atenciones.slice(0, 4);
    if (recientes.length === 0) {
      apptEl.innerHTML = '<div class="empty-state"><div class="es-icon">📅</div><div class="es-text">No hay atenciones registradas</div></div>';
    } else {
      apptEl.innerHTML = recientes.map(a => {
        const hora = fmtHora(a.fechahora);
        return `<div class="appt-item" onclick="verAtencionDetalle(${a.id})">
          <div class="appt-time"><div class="appt-hour">${hora}</div></div>
          <div class="appt-divider"></div>
          <div class="appt-avatar ${colorAvatar(a.paciente)}">${initials(a.paciente)}</div>
          <div class="appt-info">
            <div class="appt-name">${a.paciente}</div>
            <div class="appt-type">${a.motivoconsulta || '—'} · ${a.nivelatencion || '—'}</div>
          </div>
          ${estadoBadge(a.estado)}
        </div>`;
      }).join('');
    }
  }

  const actEl = document.getElementById('activity-feed');
  if (actEl) {
    actEl.innerHTML = store.actividad.slice(0, 5).map(a =>
      `<div class="activity-item">
        <div class="act-dot c-${a.tipo}">${a.icon}</div>
        <div class="act-body">
          <div class="act-text">${a.texto}</div>
          <div class="act-time">${a.tiempo}</div>
        </div>
      </div>`
    ).join('');
  }

  const total = store.atenciones.length || 1;
  const conf  = store.atenciones.filter(a => a.estado === 'activo').length;
  const asist = Math.round((conf / total) * 100);

  renderProgBars('prog-wrap', [
    { label:'Atenciones activas',    val: asist, color:'var(--teal)' },
    { label:'Registros completados', val: Math.min(Math.round(store.estudiantes.length / 20 * 100), 100), color:'var(--accent)' },
    { label:'Satisfacción general',  val: 91,    color:'var(--amber)' },
  ]);
}

function renderProgBars(id, items) {
  const container = document.getElementById(id);
  if (!container) return;
  container.innerHTML = items.map(i =>
    `<div>
      <div class="prog-row"><span style="color:var(--text-secondary);">${i.label}</span><span style="font-weight:600;color:${i.color};">${i.val}%</span></div>
      <div class="prog-bar"><div class="prog-fill" style="width:${i.val}%;background:${i.color};"></div></div>
    </div>`
  ).join('');
}