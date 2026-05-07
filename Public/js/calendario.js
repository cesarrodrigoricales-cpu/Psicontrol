// ═══════════════════════════════════════════════
// CALENDARIO.JS — FullCalendar
// PsiControl · Sistema de Atención Psicológica
// ═══════════════════════════════════════════════

const CAL_STORAGE_KEY = 'psicontrol_cal_eventos';
let calEventos = [];
let calInstance = null;
let calEditId   = null;

const CAL_TIPO_COLORS = {
  sesion:  '#534AB7',
  cita:    '#1D9E75',
  urgente: '#E24B4A',
  otro:    '#888780',
};

// ── RENDER PRINCIPAL ────────────────────────────
function renderCalendario() {
  const page = document.getElementById('page-calendario');
  if (!page) return;

  // ✅ Limpiar localStorage de eventos viejos de atenciones
  // para que se re-sincronicen correctamente
  const stored = JSON.parse(localStorage.getItem(CAL_STORAGE_KEY) || '[]');
  calEventos = stored.filter(e => !e.fromAtencion); // quitar los de atenciones
  sincronizarAtencionesAlCalendario();              // re-sincronizar limpios

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

    <div class="card" style="padding:16px;">
      <div id="fullcalendar"></div>
    </div>

    <!-- MODAL -->
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
          <div style="margin-top:16px;display:flex;gap:10px;justify-content:space-between;">
            <button class="btn-secondary" id="cal-btn-eliminar"
              style="color:var(--rose);border-color:var(--rose);display:none;"
              onclick="calEliminarEvento()">Eliminar</button>
            <div style="display:flex;gap:10px;margin-left:auto;">
              <button class="btn-secondary" onclick="closeModal('modal-calendario')">Cancelar</button>
              <button class="btn-primary" onclick="calGuardarEvento()">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const el = document.getElementById('fullcalendar');
  calInstance = new FullCalendar.Calendar(el, {
    initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
    locale: 'es',
    height: 'auto',
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  window.innerWidth < 768 ? 'listWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek'
    },
    buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' },
    events: calEventosParaFC(),
    eventClick(info) {
      const ev = calEventos.find(e => String(e.id) === info.event.id);
      if (ev) calAbrirEditar(ev);
    },
    dateClick(info) {
      if (info.dateStr < hoy()) return;
      calAbrirModal(info.dateStr);
    },
    eventColor: '#534AB7',
  });

  calInstance.render();
  calRenderNotifBar();

  document.getElementById('modal-calendario')?.addEventListener('click', e => {
    if (e.target.id === 'modal-calendario') closeModal('modal-calendario');
  });
}

// ── CONVERTIR EVENTOS AL FORMATO FULLCALENDAR ───
function calEventosParaFC() {
  return calEventos.map(ev => ({
    id:    String(ev.id),
    title: ev.titulo,
    start: `${ev.fecha}T${ev.hora || '08:00'}`,
    color: CAL_TIPO_COLORS[ev.tipo] || CAL_TIPO_COLORS.otro,
  }));
}

// ── SINCRONIZAR ATENCIONES → CALENDARIO ─────────
function sincronizarAtencionesAlCalendario() {
  store.atenciones.forEach(a => {
    if (!a.fechahora) return;

    const key = `atencion_${a.id}`;

    // ✅ Evitar duplicados
    const existe = calEventos.find(e => e.key === key);
    if (existe) return;

    // ✅ Parsear fecha y hora correctamente
    const dt = new Date(a.fechahora);
    if (isNaN(dt)) return;

    const fec  = dt.toISOString().split('T')[0];
    const hora = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;

    // ✅ Nombre del estudiante correcto
    const estudiante = store.estudiantes.find(e => e.id == a.idestudiante);
    const nombreMostrar = estudiante
      ? `${estudiante.nombres} ${estudiante.apellidos}`
      : (a.paciente || 'Atención');

    calEventos.push({
      id:  key,
      key,
      titulo: nombreMostrar,
      tipo:   a.nivelatencion === 'grave' ? 'urgente' : 'sesion',
      fecha:  fec,
      hora,
      notif: 15,
      obs:   a.motivoconsulta || a.motivo || '',
      fromAtencion: true
    });
  });

  calSave();
}

function calSave() {
  localStorage.setItem(CAL_STORAGE_KEY, JSON.stringify(calEventos));
}

// ── BARRA DE HOY ─────────────────────────────────
function calRenderNotifBar() {
  const bar = document.getElementById('cal-notif-bar');
  if (!bar) return;

  const hoyS   = hoy();
  const hoyCal = calEventos.filter(e => e.fecha === hoyS);
  bar.innerHTML = '';

  const chip = document.createElement('div');
  chip.className = 'appt-badge c-purple';
  chip.textContent = `${hoyCal.length} sesión${hoyCal.length !== 1 ? 'es' : ''} hoy`;
  bar.appendChild(chip);

  hoyCal.slice(0, 3).forEach(ev => {
    const c = document.createElement('div');
    c.className   = 'appt-badge c-teal';
    c.style.cursor = 'pointer';
    c.textContent = `${ev.hora} — ${ev.titulo.substring(0, 22)}${ev.titulo.length > 22 ? '…' : ''}`;
    c.onclick = () => calAbrirEditar(ev);
    bar.appendChild(c);
  });
}

// ── MODAL CREAR ──────────────────────────────────
function calAbrirModal(fechaStr = null) {
  calEditId = null;
  document.getElementById('cal-modal-titulo').textContent = 'Nuevo evento';
  document.getElementById('cal-ev-titulo').value = '';
  document.getElementById('cal-ev-tipo').value   = 'sesion';
  document.getElementById('cal-ev-hora').value   = '08:00';
  document.getElementById('cal-ev-notif').value  = '15';
  document.getElementById('cal-ev-obs').value    = '';
  document.getElementById('cal-ev-fecha').value  = fechaStr || hoy();
  document.getElementById('cal-btn-eliminar').style.display = 'none';
  openModal('modal-calendario');
}

// ── MODAL EDITAR ─────────────────────────────────
function calAbrirEditar(ev) {
  if (typeof ev === 'string') ev = JSON.parse(ev);
  if (ev.fromAtencion) {
    toast('Este evento viene de una atención registrada. Edítalo desde Atenciones.', 'info');
    return;
  }
  calEditId = ev.id;
  document.getElementById('cal-modal-titulo').textContent = 'Editar evento';
  document.getElementById('cal-ev-titulo').value = ev.titulo;
  document.getElementById('cal-ev-tipo').value   = ev.tipo;
  document.getElementById('cal-ev-fecha').value  = ev.fecha;
  document.getElementById('cal-ev-hora').value   = ev.hora || '08:00';
  document.getElementById('cal-ev-notif').value  = String(ev.notif || 15);
  document.getElementById('cal-ev-obs').value    = ev.obs || '';
  document.getElementById('cal-btn-eliminar').style.display = 'inline-flex';
  openModal('modal-calendario');
}

// ── GUARDAR ──────────────────────────────────────
function calGuardarEvento() {
  const titulo = document.getElementById('cal-ev-titulo')?.value?.trim();
  const fecha  = document.getElementById('cal-ev-fecha')?.value;
  if (!titulo || !fecha) { toast('Completa los campos obligatorios', 'warning'); return; }
  if (fecha < hoy()) { toast('No puedes crear un evento en una fecha pasada', 'warning'); return; }

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

  if (calInstance) {
    calInstance.removeAllEvents();
    calInstance.addEventSource(calEventosParaFC());
  }

  calRenderNotifBar();
  toast(calEditId ? 'Evento actualizado' : 'Evento guardado');
  calEditId = null;
}

// ── ELIMINAR ─────────────────────────────────────
function calEliminarEvento() {
  if (!calEditId) return;
  if (!confirm('¿Eliminar este evento?')) return;

  calEventos = calEventos.filter(e => e.id != calEditId);
  calSave();
  closeModal('modal-calendario');

  if (calInstance) {
    calInstance.removeAllEvents();
    calInstance.addEventSource(calEventosParaFC());
  }

  calRenderNotifBar();
  toast('Evento eliminado', 'warning');
  calEditId = null;
}

// ✅ LIMPIAR todo el localStorage del calendario
// Útil para resetear datos corruptos
function limpiarCalendario() {
  if (!confirm('¿Limpiar todos los eventos del calendario? Los de atenciones se recuperarán automáticamente.')) return;
  localStorage.removeItem(CAL_STORAGE_KEY);
  calEventos = [];
  sincronizarAtencionesAlCalendario();
  if (calInstance) {
    calInstance.removeAllEvents();
    calInstance.addEventSource(calEventosParaFC());
  }
  calRenderNotifBar();
  toast('Calendario limpiado correctamente');
}