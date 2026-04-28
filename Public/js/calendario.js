// ═══════════════════════════════════════════════
// CALENDARIO.JS — Calendario de sesiones
// ═══════════════════════════════════════════════

const CAL_STORAGE_KEY = 'psicontrol_cal_eventos';
let calYear, calMonth, calEventos = [], calNotifTimers = [];

const CAL_MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const CAL_TIPO_COLORS = {
  sesion:  { pill:'background:#EEEDFE;color:#3C3489;', dot:'#534AB7' },
  cita:    { pill:'background:#E1F5EE;color:#085041;', dot:'#1D9E75' },
  urgente: { pill:'background:#FCEBEB;color:#791F1F;', dot:'#E24B4A' },
  otro:    { pill:'background:#F1EFE8;color:#444441;', dot:'#888780' },
};

// RENDER PRINCIPAL
function renderCalendario() {
  const page = document.getElementById('page-calendario');
  if (!page) return;

  calEventos = JSON.parse(localStorage.getItem(CAL_STORAGE_KEY) || '[]');
  sincronizarAtencionesAlCalendario();

  if (!calYear) {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
  }

  page.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Calendario</div>
        <div class="page-subtitle">Sesiones y atenciones programadas</div>
      </div>
      <button class="btn-primary" onclick="calAbrirModal()">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Nuevo evento
      </button>
    </div>

    <div id="cal-notif-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;"></div>

    <div style="display:grid;grid-template-columns:1fr 260px;gap:16px;align-items:start;">
      <div class="card" style="padding:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="btn-secondary" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px;" onclick="calPrevMonth()">&#8249;</button>
            <div style="font-size:16px;font-weight:600;color:var(--text-primary);" id="cal-month-label"></div>
            <button class="btn-secondary" style="width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;font-size:16px;" onclick="calNextMonth()">&#8250;</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:6px;">
          ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d =>
            `<div style="text-align:center;font-size:11px;font-weight:600;color:var(--text-muted);padding:4px 0;text-transform:uppercase;letter-spacing:.04em;">${d}</div>`
          ).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;" id="cal-grid"></div>
      </div>

      <div class="card" style="padding:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">Próximas sesiones</div>
        <div id="cal-upcoming"></div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-calendario">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <div class="modal-title" id="cal-modal-titulo">Nuevo evento</div>
          <button class="modal-close" onclick="closeModal('modal-calendario')">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Título *</label>
              <input type="text" id="cal-ev-titulo" placeholder="Ej: Sesión con Juan G.">
            </div>
            <div class="form-group">
              <label>Tipo</label>
              <select id="cal-ev-tipo">
                <option value="sesion">Sesión psicológica</option>
                <option value="cita">Cita de seguimiento</option>
                <option value="urgente">Urgente</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Notificar</label>
              <select id="cal-ev-notif">
                <option value="0">Al momento</option>
                <option value="15" selected>15 min antes</option>
                <option value="30">30 min antes</option>
                <option value="60">1 hora antes</option>
                <option value="1440">1 día antes</option>
              </select>
            </div>
            <div class="form-group">
              <label>Fecha *</label>
              <input type="date" id="cal-ev-fecha">
            </div>
            <div class="form-group">
              <label>Hora *</label>
              <input type="time" id="cal-ev-hora" value="08:00">
            </div>
            <div class="form-group full">
              <label>Observaciones</label>
              <textarea id="cal-ev-obs" placeholder="Notas adicionales..." style="min-height:56px;"></textarea>
            </div>
          </div>
          <div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">
            <button class="btn-secondary" onclick="closeModal('modal-calendario')">Cancelar</button>
            <button class="btn-primary" onclick="calGuardarEvento()">Guardar</button>
          </div>
        </div>
      </div>
    </div>`;

  calRenderGrid();
  calRenderUpcoming();
  calRenderNotifBar();
  calScheduleNotifs();

  document.getElementById('modal-calendario')?.addEventListener('click', e => {
    if (e.target.id === 'modal-calendario') closeModal('modal-calendario');
  });
}

// SINCRONIZAR ATENCIONES → CALENDARIO
function sincronizarAtencionesAlCalendario() {
  store.atenciones.forEach(a => {
    if (!a.fechahora) return;
    const key    = `atencion_${a.id}`;
    const existe = calEventos.find(e => e.key === key);
    if (!existe) {
      const dt   = new Date(a.fechahora);
      const fec  = dt.toISOString().split('T')[0];
      const hora = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      calEventos.push({
        id: key, key,
        titulo: a.paciente || 'Atención',
        tipo: a.nivelatencion === 'grave' ? 'urgente' : 'sesion',
        fecha: fec, hora,
        notif: 15,
        obs: a.motivoconsulta || '',
        fromAtencion: true
      });
    }
  });
  calSave();
}

function calSave() {
  localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(calEventos));
}

// RENDER GRILLA
function calRenderGrid() {
  const label = document.getElementById('cal-month-label');
  const grid  = document.getElementById('cal-grid');
  if (!label || !grid) return;

  label.textContent = `${CAL_MESES[calMonth]} ${calYear}`;
  grid.innerHTML = '';

  const now        = new Date();
  const todayStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const first      = new Date(calYear, calMonth, 1);
  let startDow     = first.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth,   0).getDate();

  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, other: true });
  for (let d = 1; d <= daysInMonth; d++)   cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0)           cells.push({ day: cells.length - startDow - daysInMonth + 1, other: true });

  cells.forEach(({ day, other }) => {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = !other && dateStr === todayStr;
    const dayEvs  = other ? [] : calEventos.filter(e => e.fecha === dateStr);

    const cell = document.createElement('div');
    cell.style.cssText = `min-height:68px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:5px 6px;cursor:pointer;opacity:${other?'.3':'1'};${isToday?'border-color:var(--accent);':''}transition:border-color .15s;`;
    cell.onmouseover = () => { if (!isToday) cell.style.borderColor = 'var(--accent-soft)'; };
    cell.onmouseout  = () => { if (!isToday) cell.style.borderColor = 'var(--border)'; };

    const numEl = document.createElement('div');
    numEl.style.cssText = `font-size:12px;font-weight:600;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;${isToday?'background:var(--accent);color:#fff;':'color:var(--text-primary);'}`;
    numEl.textContent = day;
    cell.appendChild(numEl);

    dayEvs.slice(0, 2).forEach(ev => {
      const pill = document.createElement('div');
      const col  = CAL_TIPO_COLORS[ev.tipo] || CAL_TIPO_COLORS.otro;
      pill.style.cssText = `font-size:10px;padding:1px 5px;border-radius:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;margin-top:2px;${col.pill}`;
      pill.textContent = ev.titulo;
      pill.title = `${ev.hora} — ${ev.titulo}`;
      pill.onclick = (e) => { e.stopPropagation(); calAbrirEditar(ev); };
      cell.appendChild(pill);
    });

    if (dayEvs.length > 2) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:9px;color:var(--text-muted);padding-left:4px;margin-top:1px;';
      more.textContent = `+${dayEvs.length - 2} más`;
      cell.appendChild(more);
    }

    if (!other) cell.onclick = () => calAbrirModal(dateStr);
    grid.appendChild(cell);
  });
}

// PRÓXIMAS SESIONES
function calRenderUpcoming() {
  const ul = document.getElementById('cal-upcoming');
  if (!ul) return;

  const now  = new Date();
  const hoyS = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const prox = calEventos
    .filter(e => e.fecha >= hoyS)
    .sort((a, b) => (a.fecha + a.hora > b.fecha + b.hora ? 1 : -1))
    .slice(0, 6);

  if (!prox.length) {
    ul.innerHTML = '<div style="font-size:12px;color:var(--text-muted);">Sin próximas sesiones</div>';
    return;
  }

  ul.innerHTML = prox.map(ev => {
    const col = CAL_TIPO_COLORS[ev.tipo] || CAL_TIPO_COLORS.otro;
    return `<div onclick="calAbrirEditar(${JSON.stringify(ev).replace(/"/g,'&quot;')})"
      style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
      <div style="width:8px;height:8px;border-radius:50%;background:${col.dot};flex-shrink:0;margin-top:4px;"></div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text-primary);">${ev.titulo}</div>
        <div style="font-size:11px;color:var(--text-muted);">${calFmtFecha(ev.fecha)} · ${ev.hora}</div>
      </div>
    </div>`;
  }).join('');
}

// BARRA DE NOTIFICACIONES DE HOY
function calRenderNotifBar() {
  const bar = document.getElementById('cal-notif-bar');
  if (!bar) return;

  const now  = new Date();
  const hoyS = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const hoyCal = calEventos.filter(e => e.fecha === hoyS);
  bar.innerHTML = '';

  const chip = document.createElement('div');
  chip.className = 'appt-badge c-purple';
  chip.textContent = `${hoyCal.length} sesión${hoyCal.length !== 1 ? 'es' : ''} hoy`;
  bar.appendChild(chip);

  hoyCal.slice(0, 3).forEach(ev => {
    const c = document.createElement('div');
    c.className = 'appt-badge c-teal';
    c.style.cursor = 'pointer';
    c.textContent = `${ev.hora} — ${ev.titulo.substring(0, 22)}${ev.titulo.length > 22 ? '…' : ''}`;
    c.onclick = () => calAbrirEditar(ev);
    bar.appendChild(c);
  });
}

// NOTIFICACIONES DEL NAVEGADOR
function calScheduleNotifs() {
  calNotifTimers.forEach(t => clearTimeout(t));
  calNotifTimers = [];
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();

  const now = new Date();
  calEventos.forEach(ev => {
    const evTime    = new Date(`${ev.fecha}T${ev.hora || '08:00'}`);
    const notifTime = new Date(evTime.getTime() - (ev.notif || 0) * 60000);
    const diff      = notifTime - now;
    if (diff > 0 && diff < 86400000) {
      const t = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('PsiControl — Recordatorio', {
            body: `${ev.titulo} a las ${ev.hora}`
          });
        }
        toast(`🔔 Recordatorio: ${ev.titulo} a las ${ev.hora}`, 'info');
      }, diff);
      calNotifTimers.push(t);
    }
  });
}

// MODAL — CREAR / EDITAR
let calEditId = null;

function calAbrirModal(fechaStr = null) {
  calEditId = null;
  document.getElementById('cal-modal-titulo').textContent = 'Nuevo evento';
  document.getElementById('cal-ev-titulo').value = '';
  document.getElementById('cal-ev-tipo').value   = 'sesion';
  document.getElementById('cal-ev-hora').value   = '08:00';
  document.getElementById('cal-ev-notif').value  = '15';
  document.getElementById('cal-ev-obs').value    = '';

  const now = new Date();
  const fechaDefault = fechaStr ||
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const fechaInput = document.getElementById('cal-ev-fecha');
  if (fechaInput) {
    fechaInput.value = fechaDefault;
    fechaInput.min   = hoy();
  }
  openModal('modal-calendario');
}

function calAbrirEditar(ev) {
  if (typeof ev === 'string') ev = JSON.parse(ev);
  calEditId = ev.id;
  document.getElementById('cal-modal-titulo').textContent = 'Editar evento';
  document.getElementById('cal-ev-titulo').value = ev.titulo;
  document.getElementById('cal-ev-tipo').value   = ev.tipo;
  document.getElementById('cal-ev-fecha').value  = ev.fecha;
  document.getElementById('cal-ev-hora').value   = ev.hora || '08:00';
  document.getElementById('cal-ev-notif').value  = String(ev.notif || 15);
  document.getElementById('cal-ev-obs').value    = ev.obs || '';
  const fechaInput = document.getElementById('cal-ev-fecha');
  if (fechaInput) fechaInput.min = hoy();
  openModal('modal-calendario');
}

function calGuardarEvento() {
  const titulo = document.getElementById('cal-ev-titulo')?.value?.trim();
  const fecha  = document.getElementById('cal-ev-fecha')?.value;
  if (!titulo || !fecha) { toast('Completa los campos obligatorios', 'warning'); return; }

  if (fecha < hoy()) {
    toast('No puedes crear un evento en una fecha pasada', 'warning');
    return;
  }

  const ev = {
    id:    calEditId || Date.now(),
    titulo,
    tipo:  document.getElementById('cal-ev-tipo').value,
    fecha,
    hora:  document.getElementById('cal-ev-hora').value,
    notif: parseInt(document.getElementById('cal-ev-notif').value),
    obs:   document.getElementById('cal-ev-obs').value,
  };

  if (calEditId) {
    const idx = calEventos.findIndex(e => e.id == calEditId);
    if (idx !== -1) calEventos[idx] = ev;
  } else {
    calEventos.push(ev);
  }

  calSave();
  closeModal('modal-calendario');
  calRenderGrid();
  calRenderUpcoming();
  calRenderNotifBar();
  calScheduleNotifs();
  agregarActividad('purple', '📅', `Evento de calendario: <strong>${titulo}</strong>`, 'Ahora');
  toast(calEditId ? 'Evento actualizado' : 'Evento guardado');
  calEditId = null;
}

// NAVEGACIÓN DE MESES
function calPrevMonth() {
  if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
  calRenderGrid();
}

function calNextMonth() {
  if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
  calRenderGrid();
}

// FORMATO FECHA DEL CALENDARIO
function calFmtFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}