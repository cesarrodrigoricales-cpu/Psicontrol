// ═══════════════════════════════════════════════
// DASHBOARD.JS — PsiControl · Primaria
// ═══════════════════════════════════════════════

function initDashboard() {
  const today = new Date();
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                 'septiembre','octubre','noviembre','diciembre'];

  const fechaEl = document.getElementById('fecha-hoy');
  if (fechaEl)
    fechaEl.textContent =
      `${dias[today.getDay()]}, ${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;

  const citasEl = document.getElementById('dash-fecha-citas');
  if (citasEl) citasEl.textContent = 'Sesiones registradas recientemente';

  const pendientes = store.atenciones.filter(a => a.estado === 'pendiente');
  const activas    = store.atenciones.filter(a => a.estado === 'activo');
  const urgentes   = store.atenciones.filter(a =>
    (a.nivelatencion === 'urgente' || a.nivelatencion === 'grave') && a.estado !== 'cerrado'
  );

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('s-estudiantes', store.estudiantes.length);
  set('s-pendientes',  pendientes.length);
  set('s-activas',     activas.length);
  set('s-urgentes',    urgentes.length);
  set('nb-hist',       store.estudiantes.length);
  set('nb-citas',      pendientes.length);

  // ── Atenciones recientes ──────────────────────
  const apptEl = document.getElementById('dash-appt-list');
  if (apptEl) {
    const rec = [...store.atenciones]
      .sort((a, b) => new Date(b.fechahora) - new Date(a.fechahora))
      .slice(0, 4);

    apptEl.innerHTML = rec.length
      ? rec.map(a => {
          const est    = getEst(a.idestudiante);
          const nombre = est ? nombreCompleto(est) : (a.paciente || '—');
          const ini    = est ? iniciales(est) : '?';
          return `<div class="activity-item">
            <div style="width:36px;height:36px;border-radius:9px;background:var(--accent-soft);color:var(--accent);
                        font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${ini}</div>
            <div class="act-text"><strong>${nombre}</strong><br>${a.motivoconsulta || a.motivo || '—'}</div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <div class="act-time">${fmtFecha(a.fechahora)}</div>
              ${estadoBadge(a.estado)}
            </div>
          </div>`;
        }).join('')
      : '<div class="empty-state"><div class="es-icon">📅</div><div class="es-text">Sin atenciones</div></div>';
  }

  // ── Activity feed ─────────────────────────────
  const actEl = document.getElementById('activity-feed');
  if (actEl) {
    actEl.innerHTML = store.actividad.slice(0, 5).map(a => `
      <div class="activity-item">
        <div class="act-dot" style="background:var(--${a.tipo || 'accent'});"></div>
        <div class="act-text">${a.texto}</div>
        <div class="act-time">${a.tiempo}</div>
      </div>`).join('');
  }

  // ── Motivos ───────────────────────────────────
  const motivos = calcularMotivos();
  const progEl  = document.getElementById('prog-wrap');
  if (progEl) {
    progEl.innerHTML = motivos.map(m => `
      <div class="prog-item">
        <div class="prog-label-row">
          <span class="prog-label">${m.label}</span>
          <span class="prog-pct">${m.pct}%</span>
        </div>
        <div class="prog-track">
          <div class="prog-fill" style="width:${m.pct}%;background:${m.color};"></div>
        </div>
      </div>`).join('');
  }
}

function calcularMotivos() {
  const total  = store.atenciones.length || 1;
  const conteo = {};
  store.atenciones.forEach(a => {
    const m = (a.motivoconsulta || a.motivo || 'Otro').split(' ').slice(0, 2).join(' ');
    conteo[m] = (conteo[m] || 0) + 1;
  });
  const colores = ['var(--rose)', 'var(--amber)', 'var(--accent)', 'var(--green)', 'var(--text3)'];
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, n], i) => ({
      label,
      pct:   Math.round((n / total) * 100),
      color: colores[i] || 'var(--text3)'
    }));
}